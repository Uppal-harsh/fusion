'use client'
import { useMemo, useState, useEffect } from 'react'
import { TrendingUp, CheckCircle, AlertCircle, BarChart3, LineChart as LucideLineChart } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Engine, MODEL_PERSONAS, type ModelKey, type ResponsesByModel, type ScoresByModel, type TaskType } from '@/lib/engine'
import ShinyText from './ui/shiny-text'

const LOADING_STEPS = ["Generating answer...", "Comparing answers...", "Analysing..."]

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

  const [loadingIndex, setLoadingIndex] = useState(0)

  // Cycle through loading steps
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      setLoadingIndex((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [isRunning])

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

  const modelNames = (Object.keys(MODEL_PERSONAS) as ModelKey[]).map(k => MODEL_PERSONAS[k].name)
  const trendLineData = qualityTrend.map((score, i) => ({
    model: modelNames[i] ? modelNames[i].split(' ')[0] : `M${i + 1}`,
    score,
  }))

  return (
    <div className="h-full min-h-0 flex flex-col gap-3 p-3 md:gap-4 md:p-6 overflow-hidden bg-background">
      {/* Top Section - Stats/Visualization/Benchmark - 65% */}
      <div className="min-h-0 flex-[1.7] surface-panel p-4 md:p-6 grid grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-4 md:gap-5 overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <LucideLineChart className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Performance Metrics & Benchmark</h3>
          </div>
          <BarChart3 className="w-4 h-4 text-muted-foreground/40" />
        </div>

        {/* Stats Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl bg-muted/40 p-4 border border-border/60 transition-colors hover:border-border"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-xl bg-background border border-border/60 ${stat.color}`}>
                  <stat.icon className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-foreground tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Chart + Consensus Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0 overflow-hidden">
          {/* Interactive Chart */}
          <div className="flex flex-col gap-3 surface-subpanel p-4 min-h-0 overflow-hidden">
            <div className="w-full inline-flex items-center justify-center px-2 py-1.5 rounded-xl bg-primary/8 border border-primary/15">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Benchmark Trend</p>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height={120}>
                <LineChart
                  data={trendLineData}
                  margin={{ top: 8, right: 8, left: -28, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="model"
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <ReferenceLine y={75} stroke="var(--border)" strokeDasharray="4 2" />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      fontSize: 11,
                    }}
                    formatter={(v: number) => [`${v}%`, 'Score']}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#f59e0b"
                    strokeWidth={2.5}
                    dot={{ fill: '#f59e0b', r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: '#f59e0b', stroke: 'var(--card)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Model Consensus */}
          <div className="flex flex-col gap-3 surface-subpanel p-4 min-h-0 overflow-hidden">
            <div className="w-full inline-flex items-center justify-center px-2 py-1.5 rounded-xl bg-primary/8 border border-primary/15">
              <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Model Consensus</p>
            </div>
            <div className="space-y-2.5 min-h-0 overflow-y-auto pr-1">
              {(consensusBars.length ? consensusBars : [
                { name: 'No data yet', width: 0 },
              ]).map((model, idx) => (
                <div key={model.name}>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs text-foreground font-medium">{model.name}</span>
                    <span className="text-[10px] text-muted-foreground font-semibold">{model.width}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ease-out ${idx === 0 ? 'bg-primary' : idx === 1 ? 'bg-primary/70' : 'bg-primary/45'}`}
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
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Response Time</p>
            <p className="text-sm font-semibold text-foreground">{isRunning ? 'Running...' : 'Offline local'}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Model Count</p>
            <p className="text-sm font-semibold text-foreground">{responseCount || 4} Active</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Success Rate</p>
            <p className="text-sm font-semibold text-foreground">{Math.max(0, 100 - variance)}%</p>
          </div>
        </div>
      </div>

      {/* Bottom Section - Fused Answer - 35% */}
      <div className="min-h-0 flex-1 surface-panel p-4 md:p-6 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-foreground tracking-tight">Fused Answer</h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] font-semibold text-primary">{isRunning ? 'Processing' : 'Live'}</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
          {error ? (
            <p className="text-sm text-destructive leading-relaxed">{error}</p>
          ) : isRunning ? (
            <div className="flex flex-col gap-2 pt-2">
              <ShinyText 
                text={LOADING_STEPS[loadingIndex]} 
                speed={1.5} 
                color="oklch(0.60 0.01 60)" 
                shineColor="oklch(0.78 0.13 75)"
                className="text-lg font-bold tracking-tight"
              />
              <p className="text-[11px] text-muted-foreground/60 italic animate-pulse">
                Merging inputs from {responseCount || 4} models...
              </p>
            </div>
          ) : (
            answerLines.map((line, idx) => (
              <p key={`${line}-${idx}`} className="text-sm text-foreground leading-relaxed">
                {line}
              </p>
            ))
          )}

          <div className="mt-auto pt-3 border-t border-border/20">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Synthesis Metadata</span>
              <span className="text-[10px] text-muted-foreground/60">Target: {topModel}</span>
              <span className="text-[10px] text-muted-foreground/60">Reliability: {confidence}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
