import 'server-only'

import { Engine, MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType } from '@/lib/engine'
import { getModelResponseWithTelemetry } from '@/lib/server/model-clients'
import { addHistoryEntry, type HistoryRankingItem } from '@/lib/server/history-db'

export const MODEL_KEYS = Object.keys(MODEL_PERSONAS) as ModelKey[]

export type CompareResult = {
  query: string
  taskType: TaskType
  responses: ResponsesByModel
  scores: ScoresByModel
  ranking: HistoryRankingItem[]
  synthesizedAnswer: string
  topModel: string
  confidence: number
  benchmark: {
    taskType: TaskType
    evaluatedDimensions: string[]
    responseCount: number
    totalTokens: number
    totalLatencyMs: number
    modelTelemetry: Record<string, { tokensUsed: number; latencyMs: number; provider: string; source: 'api' | 'fallback' }>
  }
}

export async function runCompare(query: string, taskType: TaskType, selectedModels?: ModelKey[], userEmail?: string) {
  const models = selectedModels?.length ? selectedModels : MODEL_KEYS

  const telemetryEntries = await Promise.all(
    models.map(async (modelKey) => {
      const telemetry = await getModelResponseWithTelemetry(modelKey, query, taskType)
      return [modelKey, telemetry] as const
    })
  )

  const responseEntries = telemetryEntries.map(([modelKey, telemetry]) => [modelKey, telemetry.text] as const)
  const responses = Object.fromEntries(responseEntries) as ResponsesByModel

  const modelTelemetry = Object.fromEntries(
    telemetryEntries.map(([modelKey, telemetry]) => [
      modelKey,
      {
        tokensUsed: telemetry.tokensUsed,
        latencyMs: telemetry.latencyMs,
        provider: telemetry.provider,
        source: telemetry.source,
      },
    ])
  ) as Record<string, { tokensUsed: number; latencyMs: number; provider: string; source: 'api' | 'fallback' }>

  const totalTokens = telemetryEntries.reduce((sum, [, telemetry]) => sum + telemetry.tokensUsed, 0)
  const totalLatencyMs = telemetryEntries.reduce((sum, [, telemetry]) => sum + telemetry.latencyMs, 0)

  const scoreEntries = await Promise.all(
    models.map(async (modelKey) => {
      const score = await Engine.scoreResponse(modelKey, responses[modelKey], query, taskType)
      return [modelKey, score] as const
    })
  )

  const scores = Object.fromEntries(scoreEntries) as ScoresByModel
  Engine.addConsensusScores(scores, responses, taskType)

  const synthesizedAnswer = await Engine.synthesize(query, responses, scores, taskType)

  const ranking: HistoryRankingItem[] = models
    .map((modelKey) => ({
      modelKey,
      model: MODEL_PERSONAS[modelKey].name,
      overall: scores[modelKey]._overall || Engine.computeOverallScore(scores[modelKey], taskType),
      grounding: scores[modelKey].grounding,
      hallucinationRisk: scores[modelKey].hallucination_risk,
      biasScore: 0,
      consensus: scores[modelKey].consensus_score || 0,
    }))
    .sort((a, b) => b.overall - a.overall)

  const topModel = ranking[0]?.model || 'N/A'
  const confidence = Engine.computeConfidence(scores)

  const result: CompareResult = {
    query,
    taskType,
    responses,
    scores,
    ranking,
    synthesizedAnswer,
    topModel,
    confidence,
    benchmark: {
      taskType,
      evaluatedDimensions: ['accuracy', 'reasoning', 'coherence', 'completeness', 'safety'],
      responseCount: models.length,
      totalTokens,
      totalLatencyMs,
      modelTelemetry,
    },
  }

  await addHistoryEntry({
    userEmail,
    query,
    taskType,
    topModel,
    confidence,
    synthesizedAnswer,
    ranking,
    scores,
    benchmark: result.benchmark,
  })

  return result
}
