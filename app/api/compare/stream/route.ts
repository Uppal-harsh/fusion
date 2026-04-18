import { z } from 'zod'
import { Engine, MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType } from '@/lib/engine'
import { getModelResponse } from '@/lib/server/model-clients'
import { addHistoryEntry } from '@/lib/server/history-db'

export const runtime = 'nodejs'

const MODEL_KEYS = Object.keys(MODEL_PERSONAS) as ModelKey[]

const requestSchema = z.object({
  query: z.string().min(2).max(4000),
  taskType: z.enum(['coding', 'research', 'reasoning', 'creative', 'general']).default('general'),
  models: z.array(z.enum(['gpt4', 'claude', 'gemini', 'llama'])).optional(),
})

function sseEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)

  if (!parsed.success) {
    return new Response(sseEvent('error', { message: 'Invalid request payload.' }), {
      status: 400,
      headers: {
        'Content-Type': 'text/event-stream',
      },
    })
  }

  const query = parsed.data.query.trim()
  const taskType = parsed.data.taskType as TaskType
  const models = parsed.data.models?.length ? (parsed.data.models as ModelKey[]) : MODEL_KEYS

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const push = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(sseEvent(event, payload)))
      }

      try {
        push('status', { phase: 'start', query, taskType, models })

        const responses: Partial<ResponsesByModel> = {}

        for (const modelKey of models) {
          push('status', { phase: 'model_start', modelKey, modelName: MODEL_PERSONAS[modelKey].name })
          const responseText = await getModelResponse(modelKey, query, taskType)
          responses[modelKey] = responseText
          push('model_response', {
            modelKey,
            modelName: MODEL_PERSONAS[modelKey].name,
            response: responseText,
          })
        }

        const typedResponses = responses as ResponsesByModel

        const scores: Partial<ScoresByModel> = {}
        for (const modelKey of models) {
          const score = await Engine.scoreResponse(modelKey, typedResponses[modelKey], query, taskType)
          scores[modelKey] = score
          push('model_score', {
            modelKey,
            modelName: MODEL_PERSONAS[modelKey].name,
            score,
          })
        }

        const typedScores = scores as ScoresByModel
        Engine.addConsensusScores(typedScores, typedResponses, taskType)
        const synthesizedAnswer = await Engine.synthesize(query, typedResponses, typedScores, taskType)

        const ranking = models
          .map((modelKey) => ({
            modelKey,
            model: MODEL_PERSONAS[modelKey].name,
            overall: typedScores[modelKey]._overall || Engine.computeOverallScore(typedScores[modelKey], taskType),
            grounding: typedScores[modelKey].grounding,
            hallucinationRisk: typedScores[modelKey].hallucination_risk,
            biasScore: 0,
            consensus: typedScores[modelKey].consensus_score || 0,
          }))
          .sort((a, b) => b.overall - a.overall)

        const topModel = ranking[0]?.model || 'N/A'
        const confidence = Engine.computeConfidence(typedScores)

        await addHistoryEntry({
          query,
          taskType,
          topModel,
          confidence,
          synthesizedAnswer,
          ranking,
          scores: typedScores,
        })

        push('final', {
          query,
          taskType,
          responses: typedResponses,
          scores: typedScores,
          synthesizedAnswer,
          ranking,
          topModel,
          confidence,
          benchmark: {
            taskType,
            evaluatedDimensions: ['accuracy', 'reasoning', 'coherence', 'completeness', 'safety'],
            responseCount: models.length,
          },
        })

        controller.close()
      } catch {
        push('error', { message: 'SSE comparison pipeline failed unexpectedly.' })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
