import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { getUserSettings, updateUserSettings } from '@/lib/server/history-db'
import { logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

const settingsPatchSchema = z
  .object({
    theme: z.enum(['system', 'light', 'dark']).optional(),
    defaultTaskType: z.enum(['coding', 'research', 'reasoning', 'creative', 'general']).optional(),
    autoRun: z.boolean().optional(),
    compactView: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'No settings were provided to update.',
  })

export async function GET() {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'settings_unauthorized',
      route: '/api/user/settings',
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
  const settings = await getUserSettings(userEmail)

  await logBackendEvent({
    userEmail,
    eventType: 'settings_viewed',
    route: '/api/user/settings',
    statusCode: 200,
  })

  return NextResponse.json({ settings })
}

export async function PUT(request: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    await logBackendEvent({
      eventType: 'settings_update_unauthorized',
      route: '/api/user/settings',
      statusCode: 401,
    })

    return NextResponse.json(
      {
        error: 'Unauthorized. Please sign in with Google.',
      },
      { status: 401 }
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = settingsPatchSchema.safeParse(body)

  if (!parsed.success) {
    await logBackendEvent({
      userEmail: session.user.email.trim().toLowerCase(),
      eventType: 'settings_update_invalid_payload',
      route: '/api/user/settings',
      statusCode: 400,
    })

    return NextResponse.json(
      {
        error: 'Invalid settings payload.',
        details: parsed.error.flatten(),
      },
      { status: 400 }
    )
  }

  const userEmail = session.user.email.trim().toLowerCase()
  const settings = await updateUserSettings(userEmail, parsed.data)

  await logBackendEvent({
    userEmail,
    eventType: 'settings_updated',
    route: '/api/user/settings',
    statusCode: 200,
    metadata: {
      keys: Object.keys(parsed.data),
    },
  })

  return NextResponse.json({ settings })
}
