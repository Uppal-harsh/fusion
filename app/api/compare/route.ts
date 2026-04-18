import { NextResponse } from 'next/server'
import { z } from 'zod'
import type { ModelKey, TaskType } from '@/lib/engine'
import { runCompare } from '@/lib/server/compare-service'

export const runtime = 'nodejs'

const requestSchema = z.object({
  query: z.string().min(2).max(4000),
  taskType: z.enum(['coding', 'research', 'reasoning', 'creative', 'general']).default('general'),
  models: z.array(z.enum(['gpt4', 'claude', 'gemini', 'llama'])).optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsed = requestSchema.safeParse(body)

    if (!parsed.success) {
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
    const result = await runCompare(query, taskType, parsed.data.models as ModelKey[] | undefined)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json(
      {
        error: 'Comparison pipeline failed unexpectedly.',
      },
      { status: 500 }
    )
  }
}
