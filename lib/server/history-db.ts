import { supabase } from '@/lib/supabase'
import type { ModelKey, ScoresByModel, TaskType } from '@/lib/engine'
import { getSupabaseAdmin } from '@/lib/server/supabase'

export type HistoryRankingItem = {
  modelKey: ModelKey
  model: string
  overall: number
  grounding: number
  hallucinationRisk: 'low' | 'medium' | 'high'
  biasScore: number
  consensus: number
}

export type HistoryBenchmark = {
  taskType: TaskType
  evaluatedDimensions: string[]
  responseCount: number
  totalTokens?: number
  totalLatencyMs?: number
  modelTelemetry?: Record<
    string,
    {
      tokensUsed: number
      latencyMs: number
      provider: string
      source: 'api' | 'fallback'
    }
  >
}

export type HistoryEntry = {
  id: string
  created_at: string
  query: string
  task_type: TaskType
  top_model: string
  confidence: number
  synthesized_answer: string
  responses: ResponsesByModel
  scores: ScoresByModel
  benchmark: HistoryBenchmark
}

export type UserSettings = {
  theme: 'system' | 'light' | 'dark'
  defaultTaskType: TaskType
  autoRun: boolean
  compactView: boolean
}

export type UserProfileSummary = {
  email: string
  name: string | null
  image: string | null
  createdAt: string | null
  totalRuns: number
  averageConfidence: number
  lastRunAt: string | null
}

export type BenchmarkHistoryPoint = {
  id: string
  createdAt: string
  taskType: TaskType
  confidence: number
  topModel: string
  responseCount: number
  evaluatedDimensions: string[]
  totalTokens: number
  totalLatencyMs: number
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('history')
    .insert([
      {
        query: entry.query,
        task_type: entry.task_type,
        top_model: entry.top_model,
        confidence: entry.confidence,
        synthesized_answer: entry.synthesized_answer,
        responses: entry.responses,
        scores: entry.scores
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error adding history entry:', error)
    return null
  }
  return data as HistoryEntry
}

export async function getHistory(limit = 20) {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching history:', error)
    return []
  }
  return data as HistoryEntry[]
}

export async function getAllHistory() {
  const { data, error } = await supabase
    .from('history')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all history:', error)
    return []
  }
  return data as HistoryEntry[]
}
