'use client'
import { Send, Zap, Brain, Gauge } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MODEL_PERSONAS, type TaskType } from '@/lib/engine'

const models = [
  { key: 'gpt4', icon: Brain, color: 'bg-primary/12 text-primary border-primary/35' },
  { key: 'claude', icon: Zap, color: 'bg-muted text-foreground border-border' },
  { key: 'gemini', icon: Gauge, color: 'bg-muted/70 text-muted-foreground border-border' },
  { key: 'llama', icon: Brain, color: 'bg-muted/70 text-muted-foreground border-border' },
] as const

const taskTypes: TaskType[] = ['general', 'coding', 'research', 'reasoning', 'creative']

type InputAreaProps = {
  onRun: (query: string, taskType: TaskType) => Promise<void> | void
  isRunning: boolean
}

export default function InputArea({ onRun, isRunning }: InputAreaProps) {
  const [input, setInput] = useState('')
  const [taskType, setTaskType] = useState<TaskType>('general')

  const handleSend = async () => {
    if (input.trim()) {
      await onRun(input, taskType)
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
              key={model.key}
              variant="outline"
              className={`flex items-center gap-2 text-xs ${model.color}`}
            >
              <model.icon className="w-3.5 h-3.5" />
              {MODEL_PERSONAS[model.key].name}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Task Profile
        </h2>
        <div className="flex flex-wrap gap-2">
          {taskTypes.map((type) => (
            <Button
              key={type}
              variant={taskType === type ? 'default' : 'outline'}
              className="text-xs capitalize"
              onClick={() => setTaskType(type)}
            >
              {type}
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
              if (e.key === 'Enter' && !e.shiftKey && !isRunning) {
                e.preventDefault()
                void handleSend()
              }
            }}
            placeholder="Enter a prompt to compare model outputs..."
            rows={3}
            className="resize-none"
            disabled={isRunning}
          />
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <p className="text-xs text-muted-foreground">Shift + Enter for new line</p>
            <Button
              size="sm"
              onClick={() => void handleSend()}
              disabled={!input.trim() || isRunning}
            >
              {isRunning ? 'Running...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
