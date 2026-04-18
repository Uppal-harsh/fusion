'use client'
import { MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType, Engine } from '@/lib/engine'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Brain, Zap, Gauge } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

const ICON_MAP = {
  gpt4: Brain,
  claude: Zap,
  gemini: Gauge,
  llama: Brain,
} as const

// ─── Typewriter hook ───────────────────────────────────────────────
function useTypewriter(text: string | undefined, speed = 12) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const prevText = useRef<string | undefined>(undefined)

  useEffect(() => {
    // Reset when text changes (new query)
    if (text !== prevText.current) {
      prevText.current = text
      setDisplayed('')
      setDone(false)

      if (!text) return

      let i = 0
      const interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          clearInterval(interval)
          setDone(true)
        }
      }, speed)

      return () => clearInterval(interval)
    }
  }, [text, speed])

  return { displayed, done }
}

// ─── Individual row with typewriter ───────────────────────────────
function ModelRow({
  modelKey,
  response,
  score,
  taskType,
  isRunning,
}: {
  modelKey: ModelKey
  response: string | undefined
  score: ReturnType<typeof Object.values<any>>[number] | undefined
  taskType: TaskType
  isRunning: boolean
}) {
  const model = MODEL_PERSONAS[modelKey]
  const Icon = ICON_MAP[modelKey]
  const isError = response?.startsWith('Error')
  const overall = score ? (score._overall || Engine.computeOverallScore(score, taskType)) : null

  const { displayed, done } = useTypewriter(isError ? undefined : response, 8)

  return (
    <div className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
      {/* Icon */}
      <div className={cn(
        "mt-0.5 shrink-0 p-1.5 rounded-lg border transition-colors duration-300",
        isRunning && !response
          ? "border-amber-500/40 bg-amber-500/8"
          : done
          ? "border-primary/20 bg-primary/5"
          : "border-border/30 bg-muted/30"
      )}>
        <Icon className={cn(
          "w-3 h-3 transition-colors duration-300",
          isRunning && !response ? "text-amber-500 animate-pulse" : done ? "text-primary" : "text-muted-foreground/50"
        )} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/60">
            {model.name}
          </span>
          {overall !== null && (
            <span className={cn(
              "text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 transition-all duration-500",
              isError
                ? "text-destructive bg-destructive/5 border-destructive/20"
                : "text-primary bg-primary/5 border-primary/15"
            )}>
              {isError ? 'ERR' : `${overall}%`}
            </span>
          )}
        </div>

        {/* Response body */}
        {isRunning && !response ? (
          // Generating skeleton — wavy animated bars
          <div className="space-y-1.5 pt-0.5">
            <div className="h-2 bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%] animate-shimmer rounded-full" style={{ width: '80%' }} />
            <div className="h-2 bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 bg-[length:200%_100%] animate-shimmer rounded-full" style={{ width: '60%', animationDelay: '150ms' }} />
          </div>
        ) : isError ? (
          <p className="text-[11px] leading-relaxed text-destructive/70 line-clamp-2">{response}</p>
        ) : response ? (
          <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-3">
            {displayed}
            {!done && (
              <span className="inline-block w-[1px] h-3 bg-primary ml-0.5 align-middle animate-blink" />
            )}
          </p>
        ) : (
          <p className="text-[10px] text-muted-foreground/25 italic">—</p>
        )}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────
type RawResponsesProps = {
  responses: ResponsesByModel | null
  scores: ScoresByModel | null
  taskType: TaskType
  isRunning: boolean
}

export default function RawResponses({ responses, scores, taskType, isRunning }: RawResponsesProps) {
  const modelKeys = Object.keys(MODEL_PERSONAS) as ModelKey[]

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="flex flex-col divide-y divide-border/30">
        {modelKeys.map((modelKey) => (
          <ModelRow
            key={modelKey}
            modelKey={modelKey}
            response={responses?.[modelKey]}
            score={scores?.[modelKey]}
            taskType={taskType}
            isRunning={isRunning}
          />
        ))}
      </div>
    </ScrollArea>
  )
}
