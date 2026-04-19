import { NextRequest, NextResponse } from 'next/server'
import { addHistoryEntry, getHistory } from '@/lib/server/history-db'
import { auth } from '@/auth'
import { logBackendEvent } from '@/lib/server/event-log'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'history_unauthorized',
      route: '/api/history',
      statusCode: 401,
    })

    return NextResponse.json(
      {
        error: 'Unauthorized. Please sign in with Google.',
      },
      { status: 401 }
    )
  }

  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') || '20')
  const userEmail = session.user.email.trim().toLowerCase()
  const items = await getHistory(limit, userEmail)

  await logBackendEvent({
    userEmail,
    eventType: 'history_viewed',
    route: '/api/history',
    statusCode: 200,
    metadata: {
      limit,
      count: items.length,
    },
  })

  return NextResponse.json({ items })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const entry = await addHistoryEntry(body)
    return NextResponse.json(entry)
  } catch {
    return NextResponse.json({ error: 'Failed to add history entry' }, { status: 500 })
  }
}
