import { NextRequest, NextResponse } from 'next/server'
import { addHistoryEntry, getAllHistory, getHistory } from '@/lib/server/history-db'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20
  const all = searchParams.get('all') === 'true'

  try {
    const data = all ? await getAllHistory() : await getHistory(limit)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = await addHistoryEntry(body)
    return NextResponse.json(entry)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to add history entry' }, { status: 500 })
  }
}
