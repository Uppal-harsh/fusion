import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ModelKey, TaskType } from '@/lib/engine'
import { runCompare } from '@/lib/server/compare-service'
import { auth } from '@/auth'
import { upsertUserDetails } from '@/lib/server/history-db'
import { logBackendEvent } from '@/lib/server/event-log'

export const runtime = 'nodejs'

const requestSchema = z.object({
  query: z.string().min(2).max(4000),
  taskType: z.enum(['coding', 'research', 'reasoning', 'creative', 'general']).default('general'),
  models: z.array(z.enum(['gpt4', 'claude', 'gemini', 'llama'])).optional(),
})

export async function POST(request: Request) {
  let userEmail: string | undefined

  try {
    const session = await auth()
    if (!session?.user) {
      await logBackendEvent({
        eventType: 'compare_unauthorized',
        route: '/api/compare',
        statusCode: 401,
      })

      return NextResponse.json(
        {
          error: 'Unauthorized. Please sign in with Google.',
        },
        { status: 401 }
      )
    }

    userEmail = session.user.email?.trim().toLowerCase()
    if (!userEmail) {
      await logBackendEvent({
        eventType: 'compare_missing_email',
        route: '/api/compare',
        statusCode: 400,
      })

      return NextResponse.json(
        {
          error: 'Your Google account did not provide an email address.',
        },
        { status: 400 }
      )
    }

    await upsertUserDetails(userEmail, {
      name: session.user.name,
      image: session.user.image,
    })

    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
      await logBackendEvent({
        userEmail,
        eventType: 'compare_invalid_payload',
        route: '/api/compare',
        statusCode: 400,
      })

      return NextResponse.json(
        {
          error: 'Invalid request payload.',
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const query = parsed.data.query.trim()
    const taskType = parsed.data.taskType as TaskType
    const result = await runCompare(query, taskType, parsed.data.models as ModelKey[] | undefined, userEmail)

    await logBackendEvent({
      userEmail,
      eventType: 'compare_completed',
      route: '/api/compare',
      statusCode: 200,
      metadata: {
        taskType,
        responseCount: result.benchmark.responseCount,
        topModel: result.topModel,
        confidence: result.confidence,
        totalTokens: result.benchmark.totalTokens ?? 0,
        totalLatencyMs: result.benchmark.totalLatencyMs ?? 0,
      },
    })

    return NextResponse.json(result)
  } catch (error) {
    await logBackendEvent({
      userEmail,
      eventType: 'compare_failed',
      route: '/api/compare',
      statusCode: 500,
      metadata: {
        message: error instanceof Error ? error.message : 'unknown_error',
      },
    })

    return NextResponse.json(
      {
        error: 'Comparison pipeline failed unexpectedly.',
      },
      { status: 500 }
    )
  }
}
