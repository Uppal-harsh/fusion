import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserBackendEvents, logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json(
      {
        error: 'Unauthorized. Please sign in with Google.',
      },
      { status: 401 }
    )
  }

  const userEmail = session.user.email.trim().toLowerCase()
  const url = new URL(request.url)
  const limit = Number(url.searchParams.get('limit') || '25')

  const items = await getUserBackendEvents(userEmail, limit)

  await logBackendEvent({
    userEmail,
    eventType: 'user_activity_viewed',
    route: '/api/user/activity',
    statusCode: 200,
    metadata: {
      limit,
      count: items.length,
    },
  })

  return NextResponse.json({ items })
}
