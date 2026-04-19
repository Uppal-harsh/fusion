import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserProfileSummary, upsertUserDetails } from '@/lib/server/history-db'
import { logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'profile_unauthorized',
      route: '/api/user/profile',
      statusCode: 401,
    })

    return NextResponse.json(
      {
        error: 'Unauthorized. Please sign in with Google.',
      },
      { status: 401 }
    )
  }

  const userEmail = session.user.email.trim().toLowerCase()
  await upsertUserDetails(userEmail, {
    name: session.user.name,
    image: session.user.image,
  })

  const profile = await getUserProfileSummary(userEmail)

  await logBackendEvent({
    userEmail,
    eventType: 'profile_viewed',
    route: '/api/user/profile',
    statusCode: 200,
    metadata: {
      totalRuns: profile.totalRuns,
    },
  })

  return NextResponse.json({
    profile,
    sessionUser: {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    },
  })
}
