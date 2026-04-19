import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
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
  createdAt: string
  userEmail?: string
  query: string
  taskType: TaskType
  topModel: string
  confidence: number
  synthesizedAnswer: string
  ranking: HistoryRankingItem[]
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

type HistoryDb = {
  items: HistoryEntry[]
}

type SupabaseHistoryRow = {
  id: string
  created_at: string
  user_email: string
  query: string
  task_type: TaskType
  top_model: string
  confidence: number
  synthesized_answer: string
  ranking: HistoryRankingItem[]
  scores: ScoresByModel
  benchmark: HistoryBenchmark | null
}

const DEFAULT_BENCHMARK_DIMENSIONS = ['accuracy', 'reasoning', 'coherence', 'completeness', 'safety']

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  defaultTaskType: 'general',
  autoRun: false,
  compactView: false,
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'history.json')

function getFallbackBenchmark(taskType: TaskType): HistoryBenchmark {
  return {
    taskType,
    evaluatedDimensions: DEFAULT_BENCHMARK_DIMENSIONS,
    responseCount: 0,
  }
}

function normalizeLimit(limit: number) {
  return Math.max(1, Math.min(Number.isFinite(limit) ? limit : 20, 100))
}

function mapSupabaseHistoryRow(row: SupabaseHistoryRow): HistoryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    userEmail: row.user_email,
    query: row.query,
    taskType: row.task_type,
    topModel: row.top_model,
    confidence: row.confidence,
    synthesizedAnswer: row.synthesized_answer,
    ranking: row.ranking,
    scores: row.scores,
    benchmark: row.benchmark ?? getFallbackBenchmark(row.task_type),
  }
}

function normalizeTaskType(value: unknown): TaskType {
  const candidate = typeof value === 'string' ? value : ''
  if (candidate === 'coding' || candidate === 'research' || candidate === 'reasoning' || candidate === 'creative' || candidate === 'general') {
    return candidate
  }
  return 'general'
}

function sanitizeSettings(settings: Partial<UserSettings> | null | undefined): UserSettings {
  if (!settings) return DEFAULT_SETTINGS
  return {
    theme: settings.theme === 'light' || settings.theme === 'dark' || settings.theme === 'system' ? settings.theme : DEFAULT_SETTINGS.theme,
    defaultTaskType: normalizeTaskType(settings.defaultTaskType),
    autoRun: typeof settings.autoRun === 'boolean' ? settings.autoRun : DEFAULT_SETTINGS.autoRun,
    compactView: typeof settings.compactView === 'boolean' ? settings.compactView : DEFAULT_SETTINGS.compactView,
  }
}

async function ensureDb() {
  await mkdir(DATA_DIR, { recursive: true })
  try {
    await readFile(DB_FILE, 'utf8')
  } catch {
    const initial: HistoryDb = { items: [] }
    await writeFile(DB_FILE, JSON.stringify(initial, null, 2), 'utf8')
  }
}

async function readDb(): Promise<HistoryDb> {
  await ensureDb()
  const raw = await readFile(DB_FILE, 'utf8')
  try {
    const parsed = JSON.parse(raw) as HistoryDb
    return {
      items: (parsed.items || []).map((item) => ({
        ...item,
        benchmark: item.benchmark ?? getFallbackBenchmark(item.taskType),
      })),
    }
  } catch {
    return { items: [] }
  }
}

async function writeDb(db: HistoryDb) {
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>) {
  const supabase = getSupabaseAdmin()
  if (supabase && entry.userEmail) {
    const payload = {
      user_email: entry.userEmail,
      query: entry.query,
      task_type: entry.taskType,
      top_model: entry.topModel,
      confidence: entry.confidence,
      synthesized_answer: entry.synthesizedAnswer,
      ranking: entry.ranking,
      scores: entry.scores,
      benchmark: entry.benchmark,
    }

    const { data, error } = await supabase
      .from('fusion_history')
      .insert(payload)
      .select('id, created_at, user_email, query, task_type, top_model, confidence, synthesized_answer, ranking, scores, benchmark')
      .single()

    if (!error && data) {
      return mapSupabaseHistoryRow(data as SupabaseHistoryRow)
    }

    console.error('[history-db] failed to insert into Supabase, falling back to file storage', error?.message)
  }

  const db = await readDb()
  const next: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
    benchmark: entry.benchmark ?? getFallbackBenchmark(entry.taskType),
  }
  db.items.unshift(next)
  if (db.items.length > 300) {
    db.items = db.items.slice(0, 300)
  }
  await writeDb(db)
  return next
}

export async function getHistory(limit = 20, userEmail?: string) {
  const safeLimit = normalizeLimit(limit)
  const supabase = getSupabaseAdmin()

  if (supabase && userEmail) {
    const { data, error } = await supabase
      .from('fusion_history')
      .select('id, created_at, user_email, query, task_type, top_model, confidence, synthesized_answer, ranking, scores, benchmark')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(safeLimit)

    if (!error && data) {
      return (data as SupabaseHistoryRow[]).map(mapSupabaseHistoryRow)
    }

    console.error('[history-db] failed to fetch history from Supabase, falling back to file storage', error?.message)
  }

  const db = await readDb()
  const filtered = userEmail ? db.items.filter((item) => item.userEmail === userEmail) : db.items
  return filtered.slice(0, safeLimit)
}

export async function getAllHistory(userEmail?: string) {
  const supabase = getSupabaseAdmin()

  if (supabase && userEmail) {
    const { data, error } = await supabase
      .from('fusion_history')
      .select('id, created_at, user_email, query, task_type, top_model, confidence, synthesized_answer, ranking, scores, benchmark')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })

    if (!error && data) {
      return (data as SupabaseHistoryRow[]).map(mapSupabaseHistoryRow)
    }

    console.error('[history-db] failed to fetch all history from Supabase, falling back to file storage', error?.message)
  }

  const db = await readDb()
  return userEmail ? db.items.filter((item) => item.userEmail === userEmail) : db.items
}

export async function getBenchmarkHistory(userEmail: string, limit = 50): Promise<BenchmarkHistoryPoint[]> {
  const safeLimit = normalizeLimit(limit)
  const supabase = getSupabaseAdmin()

  if (supabase) {
    const { data, error } = await supabase
      .from('fusion_history')
      .select('id, created_at, task_type, top_model, confidence, benchmark')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(safeLimit)

    if (!error && data) {
      return (data as Array<{
        id: string
        created_at: string
        task_type: TaskType
        top_model: string
        confidence: number
        benchmark: HistoryBenchmark | null
      }>).map((row) => ({
        id: row.id,
        createdAt: row.created_at,
        taskType: row.task_type,
        confidence: row.confidence,
        topModel: row.top_model,
        responseCount: row.benchmark?.responseCount ?? 0,
        evaluatedDimensions: row.benchmark?.evaluatedDimensions ?? DEFAULT_BENCHMARK_DIMENSIONS,
        totalTokens: row.benchmark?.totalTokens ?? 0,
        totalLatencyMs: row.benchmark?.totalLatencyMs ?? 0,
      }))
    }

    console.error('[history-db] failed to fetch benchmark history from Supabase, falling back to file storage', error?.message)
  }

  const history = await getHistory(safeLimit, userEmail)
  return history.map((item) => ({
    id: item.id,
    createdAt: item.createdAt,
    taskType: item.taskType,
    confidence: item.confidence,
    topModel: item.topModel,
    responseCount: item.benchmark.responseCount,
    evaluatedDimensions: item.benchmark.evaluatedDimensions,
    totalTokens: item.benchmark.totalTokens ?? 0,
    totalLatencyMs: item.benchmark.totalLatencyMs ?? 0,
  }))
}

export async function upsertUserDetails(
  userEmail: string,
  details: { name?: string | null; image?: string | null }
) {
  const supabase = getSupabaseAdmin()
  if (!supabase) return

  const { error } = await supabase.from('fusion_users').upsert(
    {
      email: userEmail,
      name: details.name ?? null,
      image_url: details.image ?? null,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'email',
    }
  )

  if (error) {
    console.error('[history-db] failed to upsert fusion_users row', error.message)
  }
}

export async function getUserSettings(userEmail: string): Promise<UserSettings> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return DEFAULT_SETTINGS

  const { data, error } = await supabase
    .from('fusion_user_settings')
    .select('theme, default_task_type, auto_run, compact_view')
    .eq('user_email', userEmail)
    .maybeSingle()

  if (error) {
    console.error('[history-db] failed to fetch user settings', error.message)
    return DEFAULT_SETTINGS
  }

  if (!data) {
    const { error: insertError } = await supabase.from('fusion_user_settings').upsert(
      {
        user_email: userEmail,
        theme: DEFAULT_SETTINGS.theme,
        default_task_type: DEFAULT_SETTINGS.defaultTaskType,
        auto_run: DEFAULT_SETTINGS.autoRun,
        compact_view: DEFAULT_SETTINGS.compactView,
      },
      {
        onConflict: 'user_email',
      }
    )

    if (insertError) {
      console.error('[history-db] failed to create default user settings', insertError.message)
    }

    return DEFAULT_SETTINGS
  }

  return sanitizeSettings({
    theme: data.theme,
    defaultTaskType: data.default_task_type,
    autoRun: data.auto_run,
    compactView: data.compact_view,
  })
}

export async function updateUserSettings(userEmail: string, patch: Partial<UserSettings>) {
  const current = await getUserSettings(userEmail)
  const next = sanitizeSettings({
    ...current,
    ...patch,
  })

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    return next
  }

  const { error } = await supabase.from('fusion_user_settings').upsert(
    {
      user_email: userEmail,
      theme: next.theme,
      default_task_type: next.defaultTaskType,
      auto_run: next.autoRun,
      compact_view: next.compactView,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'user_email',
    }
  )

  if (error) {
    console.error('[history-db] failed to update user settings', error.message)
  }

  return next
}

export async function getUserProfileSummary(userEmail: string): Promise<UserProfileSummary> {
  const supabase = getSupabaseAdmin()

  if (supabase) {
    const [{ data: userRow }, { count }, { data: runRows }] = await Promise.all([
      supabase
        .from('fusion_users')
        .select('email, name, image_url, created_at')
        .eq('email', userEmail)
        .maybeSingle(),
      supabase
        .from('fusion_history')
        .select('id', { count: 'exact', head: true })
        .eq('user_email', userEmail),
      supabase
        .from('fusion_history')
        .select('confidence, created_at')
        .eq('user_email', userEmail)
        .order('created_at', { ascending: false })
        .limit(500),
    ])

    const typedRuns =
      (runRows as Array<{
        confidence: number
        created_at: string
      }> | null) ?? []

    const runCount = count ?? typedRuns.length
    const averageConfidence =
      typedRuns.length > 0
        ? typedRuns.reduce((total, row) => total + row.confidence, 0) / typedRuns.length
        : 0

    return {
      email: userRow?.email ?? userEmail,
      name: userRow?.name ?? null,
      image: userRow?.image_url ?? null,
      createdAt: userRow?.created_at ?? null,
      totalRuns: runCount,
      averageConfidence,
      lastRunAt: typedRuns[0]?.created_at ?? null,
    }
  }

  const history = await getAllHistory(userEmail)
  const averageConfidence = history.length
    ? history.reduce((total, item) => total + item.confidence, 0) / history.length
    : 0

  return {
    email: userEmail,
    name: null,
    image: null,
    createdAt: null,
    totalRuns: history.length,
    averageConfidence,
    lastRunAt: history[0]?.createdAt ?? null,
  }
}
