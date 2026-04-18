import 'server-only'

import { Engine, MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType } from '@/lib/engine'
import { getModelResponse } from '@/lib/server/model-clients'
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
  }
}

export async function runCompare(query: string, taskType: TaskType, selectedModels?: ModelKey[]) {
  const models = selectedModels?.length ? selectedModels : MODEL_KEYS

  const responseEntries = await Promise.all(
    models.map(async (modelKey) => {
      const responseText = await getModelResponse(modelKey, query, taskType)
      return [modelKey, responseText] as const
    })
  )

  const responses = Object.fromEntries(responseEntries) as ResponsesByModel

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
    },
  }

  await addHistoryEntry({
    query,
    taskType,
    topModel,
    confidence,
    synthesizedAnswer,
    ranking,
    scores,
  })

  return result
}
