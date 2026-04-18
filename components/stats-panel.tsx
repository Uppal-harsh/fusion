'use client'
import { useMemo, useState } from 'react'
import { TrendingUp, CheckCircle, AlertCircle, BarChart3, LineChart } from 'lucide-react'
import { Engine, MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType } from '@/lib/engine'

type StatsPanelProps = {
  query: string
  taskType: TaskType
  scores: ScoresByModel | null
  responses: ResponsesByModel | null
  synthesizedAnswer: string
  topModel: string
  confidence: number
  responseCount: number
  isRunning: boolean
  error: string | null
}

function average(values: number[]) {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function overallValues(scores: ScoresByModel | null, taskType: TaskType) {
  if (!scores) return []
  return Object.values(scores).map((score) => score._overall || Engine.computeOverallScore(score, taskType))
}

export default function StatsPanel({
  query,
  taskType,
  scores,
  responses,
  synthesizedAnswer,
  topModel,
  confidence,
  responseCount,
  isRunning,
  error,
}: StatsPanelProps) {
  const [selectedModel, setSelectedModel] = useState<ModelKey>('gpt4')
  const allScores = scores ? Object.values(scores) : []
  const avgQuality = average(overallValues(scores, taskType))
  const consensus = average(allScores.map((score) => score.consensus_score || 70))
  const variance = Math.max(0, 100 - confidence)

  const rankedModels = useMemo(() => {
    const models = Object.keys(MODEL_PERSONAS) as ModelKey[]
    if (!scores) return models
    return [...models].sort((left, right) => {
      const leftScore = scores[left]._overall || Engine.computeOverallScore(scores[left], taskType)
      const rightScore = scores[right]._overall || Engine.computeOverallScore(scores[right], taskType)
      return rightScore - leftScore
    })
  }, [scores, taskType])

  const selectedModelKey = rankedModels.includes(selectedModel) ? selectedModel : rankedModels[0]
  const selectedResponse = selectedModelKey && responses ? responses[selectedModelKey] : ''
  const selectedScore = selectedModelKey && scores ? scores[selectedModelKey] : null

  const stats = [
    { label: 'Avg Quality', value: `${avgQuality}%`, icon: TrendingUp, color: 'text-primary' },
    { label: 'Consensus', value: `${consensus}%`, icon: CheckCircle, color: 'text-foreground' },
    { label: 'Variance', value: `${variance}%`, icon: AlertCircle, color: 'text-muted-foreground' },
  ]

  const consensusBars = scores
    ? (Object.entries(scores)
        .map(([modelKey, score]) => ({
          name: MODEL_PERSONAS[modelKey as keyof typeof MODEL_PERSONAS].name,
          width: score.consensus_score || 0,
        }))
        .sort((a, b) => b.width - a.width))
    : []

  const qualityTrend = overallValues(scores, taskType).length ? overallValues(scores, taskType) : [40, 65, 85, 75, 90, 70, 88]

  const claimPreview = scores
    ? Object.values(scores)
        .flatMap((score) => score.key_claims)
        .filter(Boolean)
        .slice(0, 3)
    : []

  const answerLines = synthesizedAnswer.split('\n').filter((line) => line.trim())

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3 md:gap-4 md:p-6 overflow-hidden bg-background">
      {/* Top Section - Stats/Visualization/Benchmark - 65% */}
      <div className="min-h-0 flex-[1.7] surface-panel p-4 md:p-6 grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 md:gap-5 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LineChart className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Performance Metrics & Benchmark</h3>
          </div>
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`rounded-xl bg-muted/45 p-4 border border-border ${stat.color}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg bg-background border border-border">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart + Consensus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Interactive Chart */}
          <div className="flex flex-col gap-3 surface-subpanel p-4 min-h-0 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Benchmark Trend</p>
            <div className="flex-1 flex items-end justify-center gap-2 py-3 min-h-0">
              {qualityTrend.map((height, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-full rounded-t-lg bg-primary/65 hover:bg-primary/80 transition-colors duration-200 cursor-pointer group relative"
                  style={{ height: `${height}%`, minHeight: '20px' }}
                >
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded px-2 py-1 text-xs text-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {height}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Consensus */}
          <div className="flex flex-col gap-3 surface-subpanel p-4 min-h-0 overflow-hidden">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Model Consensus</p>
            <div className="space-y-2 min-h-0 overflow-y-auto pr-1">
              {(consensusBars.length ? consensusBars : [
                { name: 'No data yet', width: 0 },
              ]).map((model, idx) => (
                <div key={model.name}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-foreground font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.width}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted border border-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${idx === 0 ? 'bg-primary/80' : idx === 1 ? 'bg-primary/60' : 'bg-primary/40'} transition-all duration-300`}
                      style={{ width: `${model.width}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-4 py-3 surface-subpanel">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Response Time</p>
            <p className="text-sm font-semibold text-foreground">{isRunning ? 'Running...' : 'Offline local'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Model Count</p>
            <p className="text-sm font-semibold text-foreground">{responseCount || 4} Active</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-sm font-semibold text-foreground">{Math.max(0, 100 - variance)}%</p>
          </div>
        </div>
      </div>

      {/* Bottom Section - Fused Answer - 35% */}
      <div className="min-h-0 flex-1 surface-panel p-4 md:p-6 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-foreground">Fused Answer</h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">{isRunning ? 'Processing' : 'Live'}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
          {error ? (
            <p className="text-sm text-destructive leading-relaxed">{error}</p>
          ) : (
            answerLines.map((line, idx) => (
              <p key={`${line}-${idx}`} className="text-sm text-foreground leading-relaxed">
                {line}
              </p>
            ))
          )}

          {/* Source Note */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground">Top model: {topModel} | Confidence: {confidence}%</p>
            <p className="text-xs text-muted-foreground">Task: {taskType} {query ? `| Query length: ${query.length} chars` : ''}</p>
            {claimPreview.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">Claims sampled: {claimPreview.join(' | ')}</p>
            )}
          </div>

          <div className="pt-3 border-t border-border/30 flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Raw Model Responses</p>

            <div className="flex flex-wrap gap-2">
              {rankedModels.map((modelKey) => {
                const modelName = MODEL_PERSONAS[modelKey].name
                const overall = scores ? (scores[modelKey]._overall || Engine.computeOverallScore(scores[modelKey], taskType)) : null
                const isActive = selectedModelKey === modelKey

                return (
                  <button
                    key={modelKey}
                    onClick={() => setSelectedModel(modelKey)}
                    className={`text-xs rounded-md border px-2 py-1 transition-colors ${
                      isActive
                        ? 'bg-primary/20 border-primary/40 text-foreground'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {modelName}
                    {overall !== null ? ` (${overall}%)` : ''}
                  </button>
                )
              })}
            </div>

            <div className="rounded-md border border-border bg-muted/25 p-3 h-32 overflow-y-auto">
              {selectedResponse ? (
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{selectedResponse}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Run a prompt to view individual model responses.</p>
              )}
            </div>

            {selectedScore && (
              <p className="text-xs text-muted-foreground">
                {MODEL_PERSONAS[selectedModelKey].name}: {selectedScore.grounding_score}% grounding, {selectedScore.hallucination_risk} hallucination risk
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
