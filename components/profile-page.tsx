'use client'

import { User, Beaker, BookOpen, Clock, Star, TrendingUp, Award, Calendar } from 'lucide-react'

export default function ProfilePage() {
  const stats = [
    { label: 'Research Sessions', value: '142', icon: BookOpen, trend: '+12 this week' },
    { label: 'Prompts Analyzed', value: '389', icon: TrendingUp, trend: '+28 this week' },
    { label: 'AI Lab Runs', value: '47', icon: Beaker, trend: '+5 today' },
    { label: 'Avg. Efficiency Score', value: '84%', icon: Award, trend: 'Top 10%' },
  ]

  const activity = [
    { query: 'Explain transformer architecture vs RNNs', time: '2 hours ago', model: 'GPT-4o', score: 91 },
    { query: 'Generate a REST API in Go with fiber', time: '5 hours ago', model: 'Claude', score: 88 },
    { query: 'What are the best practices for RAG pipelines?', time: 'Yesterday', model: 'Gemini', score: 85 },
    { query: 'Compare React and Svelte performance benchmarks', time: '2 days ago', model: 'GPT-4o', score: 79 },
    { query: 'Write a Python script to parse large CSVs', time: '3 days ago', model: 'Claude', score: 93 },
  ]

  const badges = [
    { name: 'Power Researcher', desc: '100+ sessions', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { name: 'Lab Pioneer', desc: 'First AI Lab run', color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { name: 'Efficiency Expert', desc: '80%+ avg score', color: 'text-green-500 bg-green-500/10 border-green-500/20' },
    { name: 'Early Adopter', desc: 'Joined Beta', color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
  ]

  return (
    <div className="flex-1 overflow-y-auto p-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Hero Card */}
        <div className="relative p-8 rounded-3xl border border-border bg-gradient-to-br from-primary/5 via-card to-card overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
          <div className="relative flex items-start gap-6">
            {/* Avatar */}
            <div className="relative">
              <div className="w-24 h-24 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/20 text-4xl font-black text-primary shadow-xl shadow-primary/10">
                H
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 rounded-full border-2 border-card shadow-sm" />
            </div>
            {/* Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Harsh Uppal</h1>
                  <p className="text-muted-foreground text-sm mt-0.5">@harshuppal · Pro Account</p>
                </div>
                <span className="px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20 flex items-center gap-1.5">
                  <Star className="w-3 h-3" /> Pro
                </span>
              </div>
              <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Joined April 2026</span>
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Last active 2h ago</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="p-5 rounded-2xl border border-border bg-card space-y-3">
              <div className="flex items-center justify-between">
                <stat.icon className="w-4 h-4 text-primary" />
                <span className="text-[10px] text-green-500 font-bold bg-green-500/10 px-2 py-0.5 rounded-full">{stat.trend}</span>
              </div>
              <div>
                <p className="text-3xl font-black tracking-tighter">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="lg:col-span-2 p-6 rounded-2xl border border-border bg-card space-y-5">
            <h3 className="font-bold tracking-tight uppercase text-xs text-muted-foreground">Recent Research</h3>
            <div className="space-y-3">
              {activity.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-black text-primary mt-0.5">
                    {item.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug line-clamp-1">{item.query}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{item.time}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                      <span className="text-[10px] text-primary font-bold">{item.model}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Badges */}
          <div className="p-6 rounded-2xl border border-border bg-card space-y-5">
            <h3 className="font-bold tracking-tight uppercase text-xs text-muted-foreground">Achievements</h3>
            <div className="space-y-3">
              {badges.map((badge) => (
                <div key={badge.name} className={`p-3 rounded-xl border ${badge.color} flex items-center gap-3`}>
                  <Award className="w-4 h-4 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold">{badge.name}</p>
                    <p className="text-[10px] opacity-80">{badge.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
