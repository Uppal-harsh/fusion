'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import type { TaskType } from '@/lib/engine'
import { ThemeToggle } from '@/components/theme-toggle'
import Image from 'next/image'
import FallingRays from '@/components/ui/falling-rays'
import { useTheme } from 'next-themes'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

const MODEL_DESCRIPTIONS: Record<string, string> = {
  'GPT-4o': 'OpenAI flagship — strong reasoning & coding',
  'Claude 3.7 Sonnet': 'Anthropic 3.x Sonnet tier',
  'Gemini 2.5 Pro': 'Google — multimodal powerhouse',
  'Ollama 3': 'Local-first / Meta — fast & efficient'
}

const SUGGESTIONS = [
  'Compare how GPT-4o vs Claude handles logical paradoxes',
  'Which model explains quantum entanglement best?',
  'Ask all 4 models to debug this React hook...',
  'Who gives the most creative short story?',
]

type Props = {
  onSubmit: (query: string, taskType: TaskType) => void
}

export default function LandingPage({ onSubmit }: Props) {
  const { theme } = useTheme()
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Auto-focus after mount
    const t = setTimeout(() => textareaRef.current?.focus(), 400)
    return () => clearTimeout(t)
  }, [])

  const handleSubmit = () => {
    const q = input.trim()
    if (!q) return
    onSubmit(q, 'general')
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // Use the brand orange for light mode rays
  const rayColor1 = theme === 'light' ? '#d97706' : '#fbbf24'
  const rayColor2 = theme === 'light' ? '#b45309' : '#d97706'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      <FallingRays 
        color1={rayColor1} 
        color2={rayColor2} 
        rayCount={30} 
        className={theme === 'light' ? "opacity-20" : "opacity-40"}
      />
      {/* Subtle radial glow behind the card */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 48%, oklch(0.78 0.13 75 / 0.07) 0%, transparent 70%)',
        }}
      />

      {/* Top right actions */}
      <div className="absolute top-6 right-6 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <ThemeToggle />
            </div>
          </TooltipTrigger>
          <TooltipContent side="left">
            Change appearance
          </TooltipContent>
        </Tooltip>
      </div>

      <div className="relative w-full max-w-2xl px-6 flex flex-col items-center gap-10">
        {/* Logo + tagline */}
        <motion.div
          className="flex flex-col items-center gap-3 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: 'easeOut' }}
        >
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-2xl overflow-hidden border border-primary/20 shadow-lg shadow-primary/5">
              <Image 
                src="/logo.png" 
                alt="Fusion Logo" 
                fill 
                className="object-cover"
                priority
              />
            </div>
            <span className="text-5xl font-brand font-[800] tracking-tight text-foreground">Fusion</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            Compare GPT-4o, Claude, Gemini & Llama side-by-side.<br />
            Get a synthesized best answer in seconds.
          </p>
        </motion.div>

        {/* Input card — this element will be the hero of the transition */}
        <motion.div
          layoutId="fusion-input-card"
          className="w-full surface-input-dock p-4"
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.55, ease: 'easeOut' }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Ask anything — I'll run it across all 4 models..."
            rows={3}
            className="w-full bg-transparent resize-none outline-none text-sm text-foreground placeholder:text-muted-foreground/40 leading-relaxed"
          />
          <div className="flex items-center justify-between pt-3 border-t border-border/30 mt-1 gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-muted-foreground/40 font-medium whitespace-nowrap">
                Shift + Enter for new line
              </span>
              {!input.trim() && (
                <button
                  onClick={() => onSubmit('', 'general')}
                  className="text-[10px] text-muted-foreground/60 hover:text-primary transition-colors font-bold uppercase tracking-widest"
                >
                  Skip to Dashboard
                </button>
              )}
            </div>
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="flex items-center gap-2 px-4 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold disabled:opacity-30 hover:opacity-90 active:scale-95 transition-all shadow-md shadow-primary/20"
            >
              <span>Run Comparison</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          className="flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setInput(s); textareaRef.current?.focus() }}
              className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-muted/40 text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-primary/5 transition-all duration-200"
            >
              {s}
            </button>
          ))}
        </motion.div>

        {/* Model badges row */}
        <motion.div
          className="flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          {['GPT-4o', 'Claude 3.7 Sonnet', 'Gemini 2.5 Pro', 'Ollama 3'].map((m) => (
            <Tooltip key={m}>
              <TooltipTrigger asChild>
                <span className="cursor-help text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 px-2.5 py-1 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors">
                  {m}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                {MODEL_DESCRIPTIONS[m]}
              </TooltipContent>
            </Tooltip>
          ))}
        </motion.div>
      </div>
    </motion.div>
  )
}
