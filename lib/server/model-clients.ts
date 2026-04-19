import 'server-only'

import { Engine, MODEL_PERSONAS, type ModelKey, type TaskType } from '@/lib/engine'

export type ModelResponseTelemetry = {
  text: string
  tokensUsed: number
  latencyMs: number
  provider: 'openai' | 'anthropic' | 'google' | 'groq' | 'local-fallback'
  source: 'api' | 'fallback'
}

type ClientConfig = {
  model: string
  temperature?: number
}

const MODEL_CONFIG: Record<ModelKey, ClientConfig> = {
  gpt4: { model: 'gpt-4o-mini', temperature: 0.2 },
  claude: { model: 'claude-3-7-sonnet-20250219', temperature: 0.2 },
  gemini: { model: 'gemini-1.5-pro', temperature: 0.2 },
  llama: { model: 'llama-3.3-70b-versatile', temperature: 0.2 },
}

function withTaskInstruction(query: string, taskType: TaskType) {
  const taskInstruction = {
    coding: 'Focus on correctness, complexity, edge cases, and safe implementation details.',
    research: 'Separate verified facts from assumptions and include verification guidance.',
    reasoning: 'Show chain-of-thought style structure without revealing hidden reasoning; provide concise explicit steps.',
    creative: 'Be imaginative while staying coherent and useful.',
    general: 'Be clear, practical, and uncertainty-aware.',
  }[taskType]

  return `You are one model in a response comparator. ${taskInstruction}\n\nUser query: ${query}`
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

export const OPENROUTER_MODEL_MAP: Record<ModelKey, string> = {
  gpt4: 'openai/gpt-4-turbo',
  claude: 'anthropic/claude-3.7-sonnet',
  gemini: 'google/gemini-2.5-pro',
  llama: 'meta-llama/llama-3.1-70b-instruct',
}

async function callOpenRouter(modelKey: ModelKey, query: string, taskType: TaskType) {
  if (!OPENROUTER_API_KEY) return null

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fusion.ai',
        'X-Title': 'Fusion AI',
      },
        body: JSON.stringify({
        model: OPENROUTER_MODEL_MAP[modelKey],
        max_tokens: 512,
        messages: [
          {
            role: 'system',
            content: 'Provide a concise, factual response. Avoid preamble. Focus on accuracy.',
          },
          {
            role: 'user',
            content: withTaskInstruction(query, taskType),
          },
        ],
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      console.warn(`[model-clients] OpenRouter failed for ${modelKey}: ${response.status} ${response.statusText}`)
      return null
    }

    const json = await response.json()
    const text = json?.choices?.[0]?.message?.content?.trim()
    if (!text) return null
    
    const tokensUsed = Number(json?.usage?.total_tokens ?? 0)
    return { text, tokensUsed }
  } catch (err) {
    console.error(`[model-clients] Error calling OpenRouter for ${modelKey}:`, err)
    return null
  }
}

export async function getModelResponseWithTelemetry(modelKey: ModelKey, query: string, taskType: TaskType): Promise<ModelResponseTelemetry> {
  const start = Date.now()

  const external = await callOpenRouter(modelKey, query, taskType)
  
  if (external && external.text.length > 0) {
    return {
      text: external.text,
      tokensUsed: Number.isFinite(external.tokensUsed) ? external.tokensUsed : 0,
      latencyMs: Date.now() - start,
      provider: 'groq', // Keep original for now to avoid breaking stats mapping if it exists
      source: 'api',
    }
  }

  const fallback = await Engine.getModelResponse(modelKey, query, taskType)
  return {
    text: `${fallback}\n\n[Fallback mode] OpenRouter request failed or key missing.`,
    tokensUsed: 0,
    latencyMs: Date.now() - start,
    provider: 'local-fallback',
    source: 'fallback',
  }
}

export async function getModelResponse(modelKey: ModelKey, query: string, taskType: TaskType) {
  const result = await getModelResponseWithTelemetry(modelKey, query, taskType)
  return result.text
}
