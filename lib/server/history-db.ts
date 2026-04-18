import 'server-only'

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ModelKey, ScoresByModel, TaskType } from '@/lib/engine'

export type HistoryRankingItem = {
  modelKey: ModelKey
  model: string
  overall: number
  grounding: number
  hallucinationRisk: 'low' | 'medium' | 'high'
  biasScore: number
  consensus: number
}

export type HistoryEntry = {
  id: string
  createdAt: string
  query: string
  taskType: TaskType
  topModel: string
  confidence: number
  synthesizedAnswer: string
  ranking: HistoryRankingItem[]
  scores: ScoresByModel
}

type HistoryDb = {
  items: HistoryEntry[]
}

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_FILE = path.join(DATA_DIR, 'history.json')

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
    return JSON.parse(raw) as HistoryDb
  } catch {
    return { items: [] }
  }
}

async function writeDb(db: HistoryDb) {
  await writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, 'id' | 'createdAt'>) {
  const db = await readDb()
  const next: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    ...entry,
  }
  db.items.unshift(next)
  if (db.items.length > 300) {
    db.items = db.items.slice(0, 300)
  }
  await writeDb(db)
  return next
}

export async function getHistory(limit = 20) {
  const db = await readDb()
  return db.items.slice(0, Math.max(1, Math.min(limit, 100)))
}

export async function getAllHistory() {
  const db = await readDb()
  return db.items
}
