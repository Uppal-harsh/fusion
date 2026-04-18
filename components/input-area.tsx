'use client'
import { Send, Zap, Brain, Gauge } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const models = [
  { name: 'cgpt', icon: Brain, color: 'bg-primary/12 text-primary border-primary/35' },
  { name: 'ollama', icon: Zap, color: 'bg-muted text-foreground border-border' },
  { name: 'qwen', icon: Gauge, color: 'bg-muted/70 text-muted-foreground border-border' },
]

export default function InputArea() {
  const [input, setInput] = useState('')

  const handleSend = () => {
    if (input.trim()) {
      console.log('Sending:', input)
      setInput('')
    }
  }

  return (
    <div className="h-full flex flex-col p-6 gap-6">
      {/* Models/Responses with Icons */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          Response Providers
        </h2>
        <div className="flex flex-wrap gap-3">
          {models.map((model) => (
            <Button
              key={model.name}
              variant="outline"
              className={`flex items-center gap-2 text-xs ${model.color}`}
            >
              <model.icon className="w-3.5 h-3.5" />
              {model.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Input Area - ChatGPT Style */}
      <div className="flex-1 flex flex-col justify-end gap-2">
        <div className="surface-subpanel hover:border-border/90 focus-within:border-primary/50 transition-colors p-4 flex flex-col gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Type your response..."
            rows={3}
            className="resize-none"
          />
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">Shift + Enter for new line</p>
            <Button
              size="sm"
              onClick={handleSend}
              disabled={!input.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
