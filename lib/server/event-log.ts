import 'server-only'

import { appendFile, mkdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { getSupabaseAdmin } from '@/lib/server/supabase'

export type BackendEvent = {
  id: string
  createdAt: string
  userEmail: string | null
  eventType: string
  route: string
  statusCode: number | null
  metadata: Record<string, unknown>
}

type SupabaseEventRow = {
  id: string
  created_at: string
  user_email: string | null
  event_type: string
  route: string
  status_code: number | null
  metadata: Record<string, unknown> | null
}

type LogPayload = {
  userEmail?: string | null
  eventType: string
  route: string
  statusCode?: number | null
  metadata?: Record<string, unknown>
}

const DATA_DIR = path.join(process.cwd(), 'data')
const FALLBACK_LOG_FILE = path.join(DATA_DIR, 'backend-events.jsonl')

function normalizeLimit(limit: number) {
  return Math.max(1, Math.min(Number.isFinite(limit) ? limit : 25, 100))
}

function mapSupabaseEventRow(row: SupabaseEventRow): BackendEvent {
  return {
    id: row.id,
    createdAt: row.created_at,
    userEmail: row.user_email,
    eventType: row.event_type,
    route: row.route,
    statusCode: row.status_code,
    metadata: row.metadata ?? {},
  }
}

async function appendFallbackLog(event: BackendEvent) {
  await mkdir(DATA_DIR, { recursive: true })
  await appendFile(FALLBACK_LOG_FILE, `${JSON.stringify(event)}\n`, 'utf8')
}

async function readFallbackLogs(userEmail: string, limit: number): Promise<BackendEvent[]> {
  try {
    const raw = await readFile(FALLBACK_LOG_FILE, 'utf8')
    const events = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as BackendEvent
        } catch {
          return null
        }
      })
      .filter((event): event is BackendEvent => Boolean(event))
      .filter((event) => event.userEmail?.toLowerCase() === userEmail.toLowerCase())
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    return events.slice(0, limit)
  } catch {
    return []
  }
}

export async function logBackendEvent(payload: LogPayload) {
  const event: BackendEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    userEmail: payload.userEmail ?? null,
    eventType: payload.eventType,
    route: payload.route,
    statusCode: payload.statusCode ?? null,
    metadata: payload.metadata ?? {},
  }

  const supabase = getSupabaseAdmin()
  if (supabase) {
    const { error } = await supabase.from('fusion_event_logs').insert({
      user_email: event.userEmail,
      event_type: event.eventType,
      route: event.route,
      status_code: event.statusCode,
      metadata: event.metadata,
    })

    if (!error) {
      return
    }

    console.error('[event-log] failed to write to Supabase, using fallback log file', error.message)
  }

  await appendFallbackLog(event)
}

export async function getUserBackendEvents(userEmail: string, limit = 25): Promise<BackendEvent[]> {
  const safeLimit = normalizeLimit(limit)
  const supabase = getSupabaseAdmin()

  if (supabase) {
    const { data, error } = await supabase
      .from('fusion_event_logs')
      .select('id, created_at, user_email, event_type, route, status_code, metadata')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .limit(safeLimit)

    if (!error && data) {
      return (data as SupabaseEventRow[]).map(mapSupabaseEventRow)
    }

    console.error('[event-log] failed to read from Supabase, using fallback log file', error?.message)
  }

  return readFallbackLogs(userEmail, safeLimit)
}
