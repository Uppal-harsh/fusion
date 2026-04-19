"use client"

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import InputArea from '@/components/input-area'
import StatsPanel from '@/components/stats-panel'
import GoogleAuthModal from '@/components/google-auth-modal'
import RawResponses from '@/components/raw-responses'
import LandingPage from '@/components/landing-page'
import HistoryModal from '@/components/history-modal'
import AILabPage from '@/components/ai-lab-page'
import SettingsPage from '@/components/settings-page'
import ProfilePage from '@/components/profile-page'
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

  const startNewResearch = () => {
    setPhase('landing')
    setQuery('')
    setResponses(null)
    setScores(null)
    setSynthesizedAnswer('')
    setError(null)
  }

  const runComparison = async (nextQuery: string, nextTaskType: TaskType) => {
    const trimmedQuery = nextQuery.trim()
    if (!trimmedQuery || isRunning) return

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

      setResponses(nextResponses)
      setScores(nextScores)
      setSynthesizedAnswer(synthesis)
      setTopModel(MODEL_PERSONAS[winner.modelKey].name)
      setConfidence(nextConfidence)
      
      // Save to Supabase History
      await Engine.addToHistory(
        trimmedQuery, 
        nextTaskType, 
        MODEL_PERSONAS[winner.modelKey].name, 
        nextConfidence,
        synthesis,
        nextResponses,
        nextScores
      )
    } catch {
      setError('Failed to run the comparison engine. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const restoreHistory = (entry: HistoryEntry) => {
    setPhase('dashboard')
    setQuery(entry.query)
    setTaskType(entry.task_type)
    setResponses(entry.responses)
    setScores(entry.scores)
    setSynthesizedAnswer(entry.synthesized_answer)
    setTopModel(entry.top_model)
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
          <LandingPage onSubmit={runComparison} />
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
                  <InputArea onRun={runComparison} isRunning={isRunning} />
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
    </>
  )
}
