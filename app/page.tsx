"use client"

import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import InputArea from '@/components/input-area'
import StatsPanel from '@/components/stats-panel'
import RawResponses from '@/components/raw-responses'
import LandingPage from '@/components/landing-page'
import {
  Engine,
  MODEL_PERSONAS,
  type ModelKey,
  type ResponsesByModel,
  type ScoresByModel,
  type TaskType,
} from '@/lib/engine'

const MODEL_KEYS = Object.keys(MODEL_PERSONAS) as ModelKey[]

export default function Home() {
  const [phase, setPhase] = useState<'landing' | 'dashboard'>('landing')
  const [query, setQuery] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')
  const [responses, setResponses] = useState<ResponsesByModel | null>(null)
  const [scores, setScores] = useState<ScoresByModel | null>(null)
  const [synthesizedAnswer, setSynthesizedAnswer] = useState('Run a prompt to generate a fused answer.')
  const [topModel, setTopModel] = useState('N/A')
  const [confidence, setConfidence] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runComparison = async (nextQuery: string, nextTaskType: TaskType) => {
    const trimmedQuery = nextQuery.trim()
    if (!trimmedQuery || isRunning) return

    // Transition to dashboard first, then kick off the requests
    setPhase('dashboard')
    setIsRunning(true)
    setError(null)
    setQuery(trimmedQuery)
    setTaskType(nextTaskType)

    try {
      const responseEntries = await Promise.all(
        MODEL_KEYS.map(async (modelKey) => {
          const response = await Engine.getModelResponse(modelKey, trimmedQuery, nextTaskType)
          return [modelKey, response] as const
        })
      )
      const nextResponses = Object.fromEntries(responseEntries) as ResponsesByModel

      const scoreEntries = await Promise.all(
        MODEL_KEYS.map(async (modelKey) => {
          const score = await Engine.scoreResponse(modelKey, nextResponses[modelKey], trimmedQuery, nextTaskType)
          return [modelKey, score] as const
        })
      )
      const nextScores = Object.fromEntries(scoreEntries) as ScoresByModel

      Engine.addConsensusScores(nextScores, nextResponses, nextTaskType)

      const synthesis = await Engine.synthesize(trimmedQuery, nextResponses, nextScores, nextTaskType)
      const ranked = MODEL_KEYS
        .map((modelKey) => ({
          modelKey,
          score: nextScores[modelKey]._overall || Engine.computeOverallScore(nextScores[modelKey], nextTaskType),
        }))
        .sort((a, b) => b.score - a.score)
      const winner = ranked[0]
      const nextConfidence = Engine.computeConfidence(nextScores)

      setResponses(nextResponses)
      setScores(nextScores)
      setSynthesizedAnswer(synthesis)
      setTopModel(MODEL_PERSONAS[winner.modelKey].name)
      setConfidence(nextConfidence)
      Engine.addToHistory(trimmedQuery, nextTaskType, MODEL_PERSONAS[winner.modelKey].name, nextConfidence)
    } catch {
      setError('Failed to run the comparison engine. Please try again.')
    } finally {
      setIsRunning(false)
    }
  }

  const responseCount = useMemo(() => (responses ? Object.values(responses).filter(Boolean).length : 0), [responses])

  return (
    <>
      {/* ── Landing overlay ── */}
      <AnimatePresence>
        {phase === 'landing' && (
          <LandingPage onSubmit={runComparison} />
        )}
      </AnimatePresence>

      {/* ── Dashboard (always mounted, fades in behind landing) ── */}
      <motion.div
        className="h-screen flex overflow-hidden bg-background text-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'dashboard' ? 1 : 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
      >
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />

          <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
            {/* Left panel */}
            <div className="w-full lg:w-[40%] flex flex-col border-r border-b lg:border-b-0 border-border/40 overflow-hidden bg-background">
              <div className="flex-shrink-0 border-b border-border/40">
                <InputArea onRun={runComparison} isRunning={isRunning} />
              </div>
              <RawResponses
                responses={responses}
                scores={scores}
                taskType={taskType}
                isRunning={isRunning}
              />
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
        </div>
      </motion.div>
    </>
  )
}
