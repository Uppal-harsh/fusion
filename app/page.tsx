"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import InputArea from '@/components/input-area'
import StatsPanel from '@/components/stats-panel'
import GoogleAuthModal from '@/components/google-auth-modal'
import HistoryModal from '@/components/history-modal'
import LandingPage from '@/components/landing-page'
import AILabPage from '@/components/ai-lab-page'
import SettingsPage from '@/components/settings-page'
import ProfilePage from '@/components/profile-page'
import RawResponses from '@/components/raw-responses'
import type { HistoryEntry } from '@/lib/server/history-db'
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
  const [phase, setPhase] = useState<'landing' | 'dashboard' | 'ailab' | 'settings' | 'profile'>('landing')
  const [query, setQuery] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')
  const [responses, setResponses] = useState<ResponsesByModel | null>(null)
  const [scores, setScores] = useState<ScoresByModel | null>(null)
  const [synthesizedAnswer, setSynthesizedAnswer] = useState('Run a prompt to generate a fused answer.')
  const [topModel, setTopModel] = useState('N/A')
  const [confidence, setConfidence] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
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

  const startNewResearch = useCallback(() => {
    setPhase('dashboard')
    setQuery('')
    setResponses(null)
    setScores(null)
    setSynthesizedAnswer('Run a prompt to generate a fused answer.')
    setTopModel('N/A')
    setConfidence(0)
    setError(null)
  }, [])

  const handleRun = async (nextQuery: string, nextTaskType: TaskType) => {
    const trimmedQuery = nextQuery.trim()
    if (isRunning) return

    // If skip was requested (empty query), just show the dashboard
    if (!trimmedQuery) {
      setPhase('dashboard')
      return
    }

    if (!isAuthenticated) {
      setError('Sign in with Google to run comparisons.')
      setIsAuthModalOpen(true)
      return
    }

    // Transition to dashboard first, then kick off the requests
    setPhase('dashboard')
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run the comparison engine. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const restoreHistory = (entry: HistoryEntry) => {
    setPhase('dashboard')
    setQuery(entry.query)
    setTaskType(entry.taskType)
    setResponses(entry.responses || null)
    setScores(entry.scores)
    setSynthesizedAnswer(entry.synthesizedAnswer)
    setTopModel(entry.topModel)
    setConfidence(entry.confidence)
  }

  const responseCount = useMemo(() => (responses ? Object.values(responses).filter(Boolean).length : 0), [responses])

  return (
    <>
      <HistoryModal
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onSelect={restoreHistory}
      />
      {/* ── Landing overlay ── */}
      <AnimatePresence>
        {phase === 'landing' && (
          <LandingPage onSubmit={handleRun} />
        )}
      </AnimatePresence>

      {/* ── Main App Layout (always mounted, fades in behind landing) ── */}
      <motion.div
        className="h-screen flex overflow-hidden bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'landing' ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
      >
        <Sidebar
          onHistoryClick={() => setHistoryOpen(true)}
          onAILabClick={() => setPhase('ailab')}
          onHomeClick={() => setPhase('dashboard')}
          onNewClick={startNewResearch}
          onSettingsClick={() => setPhase('settings')}
          onProfileClick={() => setPhase('profile')}
          activePhase={phase}
        />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          {phase === 'ailab' ? (
            <AILabPage />
          ) : phase === 'settings' ? (
            <SettingsPage onProfileClick={() => setPhase('profile')} />
          ) : phase === 'profile' ? (
            <ProfilePage />
          ) : (
            <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
              {/* Left panel */}
              <div className="w-full lg:w-[40%] flex flex-col border-r border-b lg:border-b-0 border-border/40 overflow-hidden bg-background">
                <div className="flex-1 overflow-hidden">
                  <RawResponses
                    responses={responses}
                    scores={scores}
                    taskType={taskType}
                    isRunning={isRunning}
                  />
                </div>
                <div className="flex-shrink-0 border-t border-border/40">
                  <InputArea
                    onRun={handleRun}
                    isRunning={isRunning}
                  />
                </div>
              </div>

              {/* Right panel */}
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
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>
      <GoogleAuthModal open={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </>
  )
}
