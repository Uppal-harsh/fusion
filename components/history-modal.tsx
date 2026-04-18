'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Engine } from '@/lib/engine'
import type { HistoryEntry } from '@/lib/server/history-db'
import { Clock, Search, ChevronRight, BarChart2 } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (entry: HistoryEntry) => void
}

export default function HistoryModal({ open, onOpenChange, onSelect }: Props) {
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (open) {
      loadHistory()
    }
  }, [open])

  async function loadHistory() {
    setLoading(true)
    const data = await Engine.getHistory(50)
    setHistory(data)
    setLoading(false)
  }

  const filtered = history.filter(h => 
    h.query.toLowerCase().includes(search.toLowerCase()) ||
    h.top_model.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-0 overflow-hidden bg-card border-border/60">
        <DialogHeader className="p-6 pb-2 border-b border-border/40">
          <div className="flex items-center gap-3 text-primary mb-1">
            <Clock className="w-5 h-5" />
            <DialogTitle className="text-xl font-bold tracking-tight text-foreground">Research History</DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            Review and restore your previous multi-model comparisons.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-3 border-b border-border/40 bg-muted/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input 
              className="w-full bg-background border border-border/60 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              placeholder="Search past queries or models..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-medium uppercase tracking-widest">Accessing Supabase...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground italic text-sm">
              No matching history entries found.
            </div>
          ) : (
            filtered.map((entry) => (
              <button
                key={entry.id}
                onClick={() => {
                  onSelect(entry)
                  onOpenChange(false)
                }}
                className="w-full group flex items-start gap-4 p-4 rounded-2xl bg-muted/40 border border-border/40 hover:border-primary/40 hover:bg-muted transition-all text-left"
              >
                <div className="p-2.5 rounded-xl bg-background border border-border/60 group-hover:border-primary/20 text-muted-foreground group-hover:text-primary transition-colors">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate mb-1 leading-tight">
                    {entry.query}
                  </p>
                  <div className="flex items-center gap-x-3 gap-y-1 flex-wrap">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-1.5 py-0.5 rounded">
                      {entry.top_model}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {new Date(entry.created_at).toLocaleDateString()} at {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60">
                      Reliability: {entry.confidence}%
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-primary mt-1 transition-colors" />
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
