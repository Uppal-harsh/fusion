import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getBenchmarkHistory } from '@/lib/server/history-db'
import { logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'benchmarks_unauthorized',
      route: '/api/history/benchmarks',
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
  const limit = Number(url.searchParams.get('limit') || '50')
  const userEmail = session.user.email.trim().toLowerCase()
  const items = await getBenchmarkHistory(userEmail, limit)

  await logBackendEvent({
    userEmail,
    eventType: 'benchmarks_viewed',
    route: '/api/history/benchmarks',
    statusCode: 200,
    metadata: {
      limit,
      count: items.length,
    },
  })

  return NextResponse.json({ items })
}
