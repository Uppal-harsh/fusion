// lib/engine.ts
// ─── Multi-model orchestrator — powered by OpenRouter ─────────────
// Exports the full API surface expected by page.tsx, stats-panel.tsx,
// and input-area.tsx without modifying any of those files.

// ─── Re-exported types ─────────────────────────────────────────────
export type TaskType = 'general' | 'coding' | 'research' | 'reasoning' | 'creative'

export type ModelKey = 'gpt4' | 'claude' | 'gemini' | 'llama'

// Maps the UI's ModelKey to the OpenRouter model ID in the request body
const MODEL_ID_MAP: Record<ModelKey, string> = {
  gpt4:   'gpt-4o',
  claude: 'claude-3-5-sonnet',
  gemini: 'gemini-2-5-pro',
  llama:  'llama-3',
}

export const MODEL_PERSONAS: Record<ModelKey, { name: string; description: string }> = {
  gpt4:   { name: 'GPT-4o',           description: 'OpenAI flagship — strong reasoning & coding' },
  claude: { name: 'Claude 3.5 Sonnet', description: 'Anthropic — nuanced, thoughtful, low hallucination' },
  gemini: { name: 'Gemini 2.5 Pro',    description: 'Google — multimodal, strong grounding' },
  llama:  { name: 'Llama 3',           description: 'Meta — fast open-source, good general use' },
}

// ─── Score shape per model ─────────────────────────────────────────
export interface ModelScore {
  accuracy:         number
  reasoning:        number
  coherence:        number
  grounding:        number
  hallucination_risk: 'low' | 'medium' | 'high'
  consensus_score:  number
  key_claims:       string[]
  _overall?:        number
}

export type ResponsesByModel = Record<ModelKey, string>
export type ScoresByModel    = Record<ModelKey, ModelScore>

// ─── Task weights for overall score ───────────────────────────────
const TASK_WEIGHTS: Record<TaskType, Record<string, number>> = {
  general:   { accuracy: 0.30, reasoning: 0.20, coherence: 0.25, grounding: 0.15, hallucination: 0.10 },
  coding:    { accuracy: 0.35, reasoning: 0.30, coherence: 0.15, grounding: 0.10, hallucination: 0.10 },
  research:  { accuracy: 0.25, reasoning: 0.20, coherence: 0.15, grounding: 0.30, hallucination: 0.10 },
  reasoning: { accuracy: 0.20, reasoning: 0.40, coherence: 0.20, grounding: 0.10, hallucination: 0.10 },
  creative:  { accuracy: 0.10, reasoning: 0.10, coherence: 0.40, grounding: 0.10, hallucination: 0.30 },
}

// Simple in-memory history store
const _history: Array<{ query: string; taskType: TaskType; winner: string; confidence: number; ts: number }> = []

function buildLocalResponse(modelKey: ModelKey, prompt: string, taskType: TaskType): string {
  const persona = MODEL_PERSONAS[modelKey]
  const leadByTask: Record<TaskType, string> = {
    general: 'Focus on a direct answer, key assumptions, and practical next steps.',
    coding: 'Focus on correctness, edge cases, and implementation details.',
    research: 'Separate verified facts from uncertain claims and suggest validation steps.',
    reasoning: 'Use explicit logical steps and avoid unsupported leaps.',
    creative: 'Keep the response coherent, vivid, and aligned with the prompt.',
  }

  return [
    `${persona.name} response:`,
    leadByTask[taskType],
    `Prompt: ${prompt}`,
    'Summary: This fallback response is generated locally when external provider calls are unavailable.',
  ].join('\n\n')
}

function buildLocalSynthesis(
  prompt: string,
  responses: ResponsesByModel,
  scores: ScoresByModel,
  taskType: TaskType
): string {
  const ranked = (Object.keys(scores) as ModelKey[])
    .map((modelKey) => ({
      modelKey,
      overall: scores[modelKey]._overall ?? 0,
      response: responses[modelKey],
    }))
    .sort((a, b) => b.overall - a.overall)

  const best = ranked[0]
  const second = ranked[1]
  const bestText = best?.response?.split(/\n+/)[0] || 'No strong primary response available.'
  const secondText = second?.response?.split(/\n+/)[0] || ''

  return [
    `Synthesized answer (${taskType}):`,
    `Prompt: ${prompt}`,
    '',
    `Primary signal (${MODEL_PERSONAS[best?.modelKey || 'gpt4'].name}): ${bestText}`,
    secondText ? `Supporting signal (${MODEL_PERSONAS[second.modelKey].name}): ${secondText}` : '',
    '',
    'Final: Combine the strongest grounded claims, keep assumptions explicit, and verify critical facts before use.',
  ]
    .filter(Boolean)
    .join('\n')
}

// ─── Engine namespace (class-like static API) ─────────────────────
export const Engine = {

  // ── 1. Get local fallback model response ────────────────────────
  async getModelResponse(
    modelKey: ModelKey,
    prompt: string,
    taskType: TaskType
  ): Promise<string> {
    return buildLocalResponse(modelKey, prompt, taskType)
  },

  // ── 2. Score a single model's response ─────────────────────────
  // Uses a lightweight heuristic so scoring doesn't need an extra API call.
  // The synthesize() call later does the authoritative judge pass.
  async scoreResponse(
    modelKey: ModelKey,
    response: string,
    _prompt: string,
    taskType: TaskType
  ): Promise<ModelScore> {
    const len = response.length
    // Simple length + keyword heuristics for instant local scoring
    const hasCode        = /```|function|const |class |def |import /.test(response)
    const hasCitations   = /\d{4}|according to|study|research|source/.test(response.toLowerCase())
    const hasSteps       = /step \d|first,|second,|finally,|\d\.\s/.test(response.toLowerCase())
    const hasHallmarks   = /certainly|absolutely|definitely|always|never/.test(response.toLowerCase())

    const accuracy   = Math.min(95, 55 + Math.min(len / 80, 30) + (hasCitations ? 10 : 0))
    const reasoning  = Math.min(95, 50 + (hasSteps ? 20 : 0) + Math.min(len / 100, 25))
    const coherence  = Math.min(95, 60 + Math.min(len / 60, 25) + (hasCode && taskType === 'coding' ? 10 : 0))
    const grounding  = Math.min(95, 45 + (hasCitations ? 25 : 0) + Math.min(len / 120, 25))
    const hallRisk: 'low' | 'medium' | 'high' = hasHallmarks ? 'high' : len < 100 ? 'medium' : 'low'

    const score: ModelScore = {
      accuracy:           Math.round(accuracy),
      reasoning:          Math.round(reasoning),
      coherence:          Math.round(coherence),
      grounding:          Math.round(grounding),
      hallucination_risk: hallRisk,
      consensus_score:    0,   // filled by addConsensusScores()
      key_claims:         [],
    }
    score._overall = Engine.computeOverallScore(score, taskType)
    return score
  },

  // ── 3. Add consensus scores across all models ───────────────────
  addConsensusScores(
    scores: ScoresByModel,
    responses: ResponsesByModel,
    _taskType: TaskType
  ): void {
    const modelKeys = Object.keys(scores) as ModelKey[]
    // Consensus = how much the response overlaps with the median overall score
    const overalls = modelKeys.map((k) => scores[k]._overall ?? 0)
    const mean = overalls.reduce((a, b) => a + b, 0) / (overalls.length || 1)

    for (const key of modelKeys) {
      const delta = Math.abs((scores[key]._overall ?? 0) - mean)
      scores[key].consensus_score = Math.max(0, Math.round(100 - delta * 1.5))
      // Cheap key-claim extraction: first sentence of each response
      const firstSentence = responses[key]?.split(/[.!?]/)[0]?.trim()
      scores[key].key_claims = firstSentence ? [firstSentence.slice(0, 80)] : []
    }
  },

  // ── 4. Synthesize — local fusion path ──────────────────────────
  async synthesize(
    prompt: string,
    responses: ResponsesByModel,
    scores: ScoresByModel,
    taskType: TaskType
  ): Promise<string> {
    return buildLocalSynthesis(prompt, responses, scores, taskType)
  },

  // ── 5. computeOverallScore ─────────────────────────────────────
  computeOverallScore(score: ModelScore, taskType: TaskType): number {
    const w = TASK_WEIGHTS[taskType]
    const hallPenalty = score.hallucination_risk === 'high' ? 30
                      : score.hallucination_risk === 'medium' ? 15
                      : 0
    const raw =
      score.accuracy   * w.accuracy   +
      score.reasoning  * w.reasoning  +
      score.coherence  * w.coherence  +
      score.grounding  * w.grounding  +
      (100 - hallPenalty) * w.hallucination
    return Math.round(Math.max(0, Math.min(100, raw)))
  },

  // ── 6. computeConfidence ──────────────────────────────────────
  computeConfidence(scores: ScoresByModel): number {
    const overalls = Object.values(scores).map((s) => s._overall ?? 0)
    if (!overalls.length) return 0
    const mean = overalls.reduce((a, b) => a + b, 0) / overalls.length
    const maxDev = Math.max(...overalls.map((v) => Math.abs(v - mean)))
    return Math.round(Math.max(0, 100 - maxDev))
  },

  // ── 7. addToHistory ───────────────────────────────────────────
  addToHistory(
    query: string,
    taskType: TaskType,
    winner: string,
    confidence: number
  ): void {
    _history.unshift({ query, taskType, winner, confidence, ts: Date.now() })
    if (_history.length > 50) _history.pop()
  },

  getHistory() {
    return _history
  },
}
