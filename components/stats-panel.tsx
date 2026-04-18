'use client'
import { TrendingUp, CheckCircle, AlertCircle, BarChart3, LineChart } from 'lucide-react'

export default function StatsPanel() {
  const stats = [
    { label: 'Avg Quality', value: '94%', icon: TrendingUp, color: 'text-primary' },
    { label: 'Consensus', value: '87%', icon: CheckCircle, color: 'text-foreground' },
    { label: 'Variance', value: '13%', icon: AlertCircle, color: 'text-muted-foreground' },
  ]

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
              {[40, 65, 85, 75, 90, 70, 88].map((height, idx) => (
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
              {[
                { name: 'cgpt', width: 85, color: 'bg-primary/80' },
                { name: 'ollama', width: 80, color: 'bg-primary/60' },
                { name: 'qwen', width: 75, color: 'bg-primary/40' },
              ].map((model) => (
                <div key={model.name}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs text-foreground font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.width}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted border border-border overflow-hidden">
                    <div
                      className={`h-full rounded-full ${model.color} transition-all duration-300`}
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
            <p className="text-sm font-semibold text-foreground">2.4s avg</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Model Count</p>
            <p className="text-sm font-semibold text-foreground">3 Active</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Success Rate</p>
            <p className="text-sm font-semibold text-foreground">99.2%</p>
          </div>
        </div>
      </div>

      {/* Bottom Section - Fused Answer - 35% */}
      <div className="min-h-0 flex-1 surface-panel p-4 md:p-6 flex flex-col gap-3 overflow-hidden">
        <div className="flex items-center justify-between flex-shrink-0">
          <h3 className="text-sm font-bold text-foreground">Fused Answer</h3>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-medium text-primary">Live</span>
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-0">
          {/* Main Answer */}
          <p className="text-sm text-foreground leading-relaxed line-clamp-3 hover:line-clamp-none transition-all duration-200">
            Fused answer synthesized from all model responses. This consensus output provides the most accurate and balanced result based on analyzing agreements and differences across all providers.
          </p>

          {/* Source Note */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-xs text-muted-foreground">
              Consensus breakdown moved to the Performance Metrics section for side-by-side benchmark comparison.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
