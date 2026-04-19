"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import InputArea from '@/components/input-area'
import StatsPanel from '@/components/stats-panel'
import GoogleAuthModal from '@/components/google-auth-modal'
import RawResponses from '@/components/raw-responses'
import {
  type ResponsesByModel,
  type ScoresByModel,
  type TaskType,
} from '@/lib/engine'

type CompareApiResult = {
  responses: ResponsesByModel
  scores: ScoresByModel
  synthesizedAnswer: string
  topModel: string
  confidence: number
}

type HistoryItem = {
  id: string
  createdAt: string
  query: string
  taskType: TaskType
  topModel: string
  confidence: number
}

type StreamEventPayloads = {
  model_response: {
    modelKey: keyof ResponsesByModel
    response: string
  }
  model_score: {
    modelKey: keyof ScoresByModel
    score: ScoresByModel[keyof ScoresByModel]
  }
  final: CompareApiResult
  error: { message: string }
}

export default function Home() {
  const { status } = useSession()
  const isAuthenticated = status === 'authenticated'
  const [query, setQuery] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')
  const [responses, setResponses] = useState<ResponsesByModel | null>(null)
  const [scores, setScores] = useState<ScoresByModel | null>(null)
  const [synthesizedAnswer, setSynthesizedAnswer] = useState('Run a prompt to generate a fused answer.')
  const [topModel, setTopModel] = useState('N/A')
  const [confidence, setConfidence] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const requestLogin = useCallback(() => {
    setIsAuthModalOpen(true)
  }, [])

  const loadHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/history?limit=12', { cache: 'no-store' })
      if (!response.ok) return
      const data = (await response.json()) as { items: HistoryItem[] }
      setHistoryItems(data.items || [])
    } catch {
      // Ignore polling errors to avoid interrupting compare flow.
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      setHistoryItems([])
      return
    }

    loadHistory()
    const id = window.setInterval(loadHistory, 7000)
    return () => window.clearInterval(id)
  }, [isAuthenticated, loadHistory])

  useEffect(() => {
    if (isAuthenticated) {
      setIsAuthModalOpen(false)
    }
  }, [isAuthenticated])

  const handleRun = async (nextQuery: string, nextTaskType: TaskType) => {
    const trimmedQuery = nextQuery.trim()
    if (!trimmedQuery || isRunning) return

    if (!isAuthenticated) {
      setError('Sign in with Google to run comparisons.')
      setIsAuthModalOpen(true)
      return
    }

    setIsRunning(true)
    setError(null)
    setQuery(trimmedQuery)
    setTaskType(nextTaskType)
    setResponses(null)
    setScores(null)
    setSynthesizedAnswer('Streaming model responses...')
    setTopModel('N/A')
    setConfidence(0)

    try {
      const response = await fetch('/api/compare/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: trimmedQuery,
          taskType: nextTaskType,
        }),
      })

      if (!response.ok) {
        throw new Error('Request failed')
      }

      if (!response.body) {
        throw new Error('Stream unavailable')
      }

      const decoder = new TextDecoder()
      const reader = response.body.getReader()
      let buffer = ''
      let eventName = ''

      const partialResponses: Partial<ResponsesByModel> = {}
      const partialScores: Partial<ScoresByModel> = {}

      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const chunks = buffer.split('\n\n')
        buffer = chunks.pop() || ''

        for (const chunk of chunks) {
          const lines = chunk.split('\n')
          let data = ''
          eventName = ''

          for (const line of lines) {
            if (line.startsWith('event:')) {
              eventName = line.replace('event:', '').trim()
            } else if (line.startsWith('data:')) {
              data += line.replace('data:', '').trim()
            }
          }

          if (!eventName || !data) continue

          if (eventName === 'model_response') {
            const payload = JSON.parse(data) as StreamEventPayloads['model_response']
            partialResponses[payload.modelKey] = payload.response
            setResponses({ ...partialResponses } as ResponsesByModel)
            continue
          }

          if (eventName === 'model_score') {
            const payload = JSON.parse(data) as StreamEventPayloads['model_score']
            partialScores[payload.modelKey] = payload.score
            setScores({ ...partialScores } as ScoresByModel)
            continue
          }

          if (eventName === 'final') {
            const payload = JSON.parse(data) as StreamEventPayloads['final']
            setResponses(payload.responses)
            setScores(payload.scores)
            setSynthesizedAnswer(payload.synthesizedAnswer)
            setTopModel(payload.topModel)
            setConfidence(payload.confidence)
            loadHistory()
            continue
          }

          if (eventName === 'error') {
            const payload = JSON.parse(data) as StreamEventPayloads['error']
            throw new Error(payload.message)
          }
        }
      }
    } catch {
      setError('Failed to run the comparison engine. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const responseCount = useMemo(() => (responses ? Object.values(responses).filter(Boolean).length : 0), [responses])

  return (
    <>
      <div className="h-screen flex overflow-hidden bg-background text-foreground">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with breadcrumbs */}
          <Header />

          {/* Main content area - Responsive */}
          <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
            {/* Middle section - 40% on desktop, full on mobile */}
            <div className="w-full lg:w-[40%] flex flex-col border-r border-b lg:border-b-0 border-border/40 overflow-hidden bg-muted/10">
              <RawResponses
                responses={responses}
                scores={scores}
                taskType={taskType}
                isRunning={isRunning}
              />
              <div className="flex-shrink-0 border-t border-border/40 shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                <InputArea
                  onRun={handleRun}
                  isRunning={isRunning}
                  responses={responses}
                  isAuthenticated={isAuthenticated}
                  onRequireLogin={requestLogin}
                />
              </div>
            </div>
            {/* Right section - 60% on desktop, full on mobile */}
            <div className="w-full lg:w-[60%] flex flex-col overflow-hidden">
              <StatsPanel
                query={query}
                taskType={taskType}
                scores={scores}
                responses={responses}
                synthesizedAnswer={synthesizedAnswer}
                topModel={topModel}
                confidence={confidence}
                responseCount={responseCount}
                isRunning={isRunning}
                error={error}
                historyItems={historyItems}
              />
            </div>
          </div>
        </div>
      </div>
      <GoogleAuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  )
}
