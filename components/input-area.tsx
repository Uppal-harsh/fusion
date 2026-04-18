'use client'
import { Send, Brain, Zap, Gauge, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MODEL_PERSONAS, type TaskType } from '@/lib/engine'
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

const models = [
  { key: 'gpt4', icon: Brain, color: 'bg-primary/10 text-primary border-primary/25' },
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
      {/* Input Area */}
      <div className="flex-1 flex flex-col justify-end gap-2">
        <div className="surface-subpanel hover:border-primary/20 focus-within:border-primary/30 transition-all duration-300 p-0 flex flex-col overflow-hidden">
          
          <Accordion type="single" collapsible className="w-full border-b border-border/40">
            <AccordionItem value="settings" className="border-none">
              <AccordionTrigger className="px-4 py-3 hover:no-underline text-muted-foreground/80 hover:text-foreground transition-colors">
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium uppercase tracking-wider">Engine Configuration</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 bg-muted/20">
                <div className="flex flex-col gap-5 pt-2">
                  {/* Models/Responses with Icons */}
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Zap className="w-3 h-3 text-amber-500" />
                      Response Providers
                    </h2>
                    <div className="grid grid-cols-2 gap-2">
                      {models.map((model) => (
                        <div
                          key={model.key}
                          className={`flex items-center gap-2 text-[11px] h-9 px-3 p-2 rounded-xl border transition-all duration-200 cursor-default ${model.color} hover:bg-opacity-80`}
                        >
                          <model.icon className="w-3.5 h-3.5" />
                          <span className="font-medium">{MODEL_PERSONAS[model.key].name}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Gauge className="w-3 h-3 text-blue-500" />
                      Task Profile
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                      {taskTypes.map((type) => (
                        <Button
                          key={type}
                          variant={taskType === type ? 'default' : 'outline'}
                          size="sm"
                          className={cn(
                            "text-[10px] h-7 px-3 capitalize rounded-full transition-all duration-200",
                            taskType === type ? "shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"
                          )}
                          onClick={() => setTaskType(type)}
                        >
                          {type}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="p-4 flex flex-col gap-4">
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
              rows={4}
              className="resize-none border-none bg-transparent focus-visible:ring-0 text-sm leading-relaxed p-0 placeholder:text-muted-foreground/40"
              disabled={isRunning}
            />

            <div className="flex items-center justify-between pt-3 border-t border-border/20">
              <div className="flex items-center gap-3">
                <p className="text-[10px] text-muted-foreground/50 font-medium bg-muted/30 px-2 py-0.5 rounded-md border border-border/20">
                  Shift + Enter for new line
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-full px-5 h-9 font-medium shadow-lg shadow-primary/10 transition-transform active:scale-95"
                onClick={() => void handleSend()}
                disabled={!input.trim() || isRunning}
              >
                {isRunning ? (
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span className="text-xs">Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs">Run Comparison</span>
                    <Send className="w-3.5 h-3.5" />
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
