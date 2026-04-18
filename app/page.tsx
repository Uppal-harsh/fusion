"use client"

import { useMemo, useState } from 'react'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'
import InputArea from '@/components/input-area'
import StatsPanel from '@/components/stats-panel'
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
  const [query, setQuery] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')
  const [responses, setResponses] = useState<ResponsesByModel | null>(null)
  const [scores, setScores] = useState<ScoresByModel | null>(null)
  const [synthesizedAnswer, setSynthesizedAnswer] = useState('Run a prompt to generate a fused answer.')
  const [topModel, setTopModel] = useState('N/A')
  const [confidence, setConfidence] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async (nextQuery: string, nextTaskType: TaskType) => {
    const trimmedQuery = nextQuery.trim()
    if (!trimmedQuery || isRunning) return

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
    <div className="h-screen flex overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header with breadcrumbs */}
        <Header />
        
        {/* Main content area - Responsive */}
        <div className="flex-1 flex overflow-hidden lg:flex-row flex-col">
          {/* Middle section - 40% on desktop, full on mobile */}
          <div className="w-full lg:w-[40%] flex flex-col border-r border-b lg:border-b-0 border-border/50 overflow-hidden">
            <InputArea onRun={handleRun} isRunning={isRunning} />
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
            />
          </div>
        </div>
      </div>
    </div>
  )
}
