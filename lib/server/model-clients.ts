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
  claude: { model: 'claude-3-5-sonnet-20241022', temperature: 0.2 },
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

async function callOpenAI(query: string, taskType: TaskType) {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_CONFIG.gpt4.model,
      temperature: MODEL_CONFIG.gpt4.temperature,
      messages: [
        {
          role: 'system',
          content: 'Provide a concise, factual response with explicit assumptions and no fabricated citations.',
        },
        {
          role: 'user',
          content: withTaskInstruction(query, taskType),
        },
      ],
    }),
  })

  if (!response.ok) return null
  const json = await response.json()
  const text = json?.choices?.[0]?.message?.content?.trim()
  if (!text) return null
  const tokensUsed = Number(json?.usage?.total_tokens ?? 0)
  return { text, tokensUsed }
}

async function callAnthropic(query: string, taskType: TaskType) {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_CONFIG.claude.model,
      max_tokens: 700,
      temperature: MODEL_CONFIG.claude.temperature,
      system: 'Provide a balanced response with uncertainty markers for unverified claims.',
      messages: [
        {
          role: 'user',
          content: withTaskInstruction(query, taskType),
        },
      ],
    }),
  })

  if (!response.ok) return null
  const json = await response.json()
  const text = json?.content?.[0]?.text?.trim()
  if (!text) return null
  const inputTokens = Number(json?.usage?.input_tokens ?? 0)
  const outputTokens = Number(json?.usage?.output_tokens ?? 0)
  return {
    text,
    tokensUsed: inputTokens + outputTokens,
  }
}

async function callGemini(query: string, taskType: TaskType) {
  const key = process.env.GOOGLE_API_KEY
  if (!key) return null

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_CONFIG.gemini.model}:generateContent?key=${key}`
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      generationConfig: {
        temperature: MODEL_CONFIG.gemini.temperature,
        maxOutputTokens: 700,
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: withTaskInstruction(query, taskType),
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) return null
  const json = await response.json()
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!text) return null
  const tokensUsed = Number(
    json?.usageMetadata?.totalTokenCount ??
      (Number(json?.usageMetadata?.promptTokenCount ?? 0) + Number(json?.usageMetadata?.candidatesTokenCount ?? 0))
  )
  return { text, tokensUsed }
}

async function callGroq(query: string, taskType: TaskType) {
  const key = process.env.GROQ_API_KEY
  if (!key) return null

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL_CONFIG.llama.model,
      temperature: MODEL_CONFIG.llama.temperature,
      messages: [
        {
          role: 'system',
          content: 'Respond in a practical tone, avoid unsupported claims, and structure output clearly.',
        },
        {
          role: 'user',
          content: withTaskInstruction(query, taskType),
        },
      ],
    }),
  })

  if (!response.ok) return null
  const json = await response.json()
  const text = json?.choices?.[0]?.message?.content?.trim()
  if (!text) return null
  const tokensUsed = Number(json?.usage?.total_tokens ?? 0)
  return { text, tokensUsed }
}

export async function getModelResponseWithTelemetry(modelKey: ModelKey, query: string, taskType: TaskType): Promise<ModelResponseTelemetry> {
  const start = Date.now()

  try {
    const external =
      modelKey === 'gpt4'
        ? await callOpenAI(query, taskType)
        : modelKey === 'claude'
          ? await callAnthropic(query, taskType)
          : modelKey === 'gemini'
            ? await callGemini(query, taskType)
            : await callGroq(query, taskType)

    if (external && external.text.length > 0) {
      return {
        text: external.text,
        tokensUsed: Number.isFinite(external.tokensUsed) ? external.tokensUsed : 0,
        latencyMs: Date.now() - start,
        provider: modelKey === 'gpt4' ? 'openai' : modelKey === 'claude' ? 'anthropic' : modelKey === 'gemini' ? 'google' : 'groq',
        source: 'api',
      }
    }
  } catch {
    // Fall through to local response when provider is unavailable.
  }

  const fallback = await Engine.getModelResponse(modelKey, query, taskType)
  return {
    text: `${fallback}\n\n[Fallback mode] ${MODEL_PERSONAS[modelKey].name} credentials unavailable or request failed.`,
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
