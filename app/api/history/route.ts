import { NextResponse } from 'next/server'
import { getHistory } from '@/lib/server/history-db'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') || '20')
  const items = await getHistory(limit)
  return NextResponse.json({ items })
}
