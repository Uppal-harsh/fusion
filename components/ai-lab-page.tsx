'use client'

import { useState } from 'react'
import InputArea from './input-area'
import { Beaker, BookOpen, ExternalLink, Sliders, Activity, Cpu } from 'lucide-react'
import ShinyText from './ui/shiny-text'
import { Engine, MODEL_PERSONAS, type ModelKey, type TaskType, type ResponsesByModel, type ScoresByModel } from '@/lib/engine'

const DOCS_DATA: Record<string, {
  name: string;
  links: { title: string; url: string; category: string }[];
}> = {
  openai: {
    name: 'OpenAI (ChatGPT)',
    links: [
      { title: 'What are tokens?', url: 'https://help.openai.com/en/articles/4936856-what-are-tokens-and-how-to-count-them', category: 'Tokens' },
      { title: 'Introduction', url: 'https://platform.openai.com/docs/introduction', category: 'General' },
      { title: 'Text Generation', url: 'https://platform.openai.com/docs/guides/text-generation', category: 'General' },
      { title: 'Function Calling', url: 'https://platform.openai.com/docs/guides/function-calling', category: 'Functions' },
      { title: 'Rate Limits', url: 'https://platform.openai.com/docs/guides/rate-limits', category: 'Rate Limits' },
      { title: 'Latency Optimization', url: 'https://platform.openai.com/docs/guides/latency-optimization', category: 'Performance' },
      { title: 'Prompt Engineering', url: 'https://platform.openai.com/docs/guides/prompt-engineering', category: 'Prompting' },
    ]
  },
  gemini: {
    name: 'Google DeepMind (Gemini)',
    links: [
      { title: 'Documentation Home', url: 'https://ai.google.dev/docs', category: 'General' },
      { title: 'Models Overview', url: 'https://ai.google.dev/gemini-api/docs/models', category: 'General' },
      { title: 'Prompting Guide', url: 'https://ai.google.dev/gemini-api/docs/prompting', category: 'Prompting' },
      { title: 'Tokens & Limits', url: 'https://ai.google.dev/gemini-api/docs/tokens', category: 'Tokens' },
      { title: 'Rate Limits', url: 'https://ai.google.dev/gemini-api/docs/rate-limits', category: 'Rate Limits' },
      { title: 'Function Calling', url: 'https://ai.google.dev/gemini-api/docs/function-calling', category: 'Functions' },
      { title: 'Safety Settings', url: 'https://ai.google.dev/gemini-api/docs/safety-settings', category: 'Safety' },
    ]
  },
  claude: {
    name: 'Anthropic (Claude)',
    links: [
      { title: 'Introduction', url: 'https://docs.anthropic.com/en/docs/intro', category: 'General' },
      { title: 'Prompt Engineering', url: 'https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering', category: 'Prompting' },
      { title: 'Token Counting', url: 'https://docs.anthropic.com/en/docs/build-with-claude/token-counting', category: 'Tokens' },
      { title: 'Rate Limits', url: 'https://docs.anthropic.com/en/docs/build-with-claude/rate-limits', category: 'Rate Limits' },
      { title: 'Streaming', url: 'https://docs.anthropic.com/en/docs/build-with-claude/streaming', category: 'Performance' },
      { title: 'Tool Use / Functions', url: 'https://docs.anthropic.com/en/docs/build-with-claude/tools', category: 'Functions' },
      { title: 'System Prompts', url: 'https://docs.anthropic.com/en/docs/build-with-claude/system-prompts', category: 'Prompting' },
    ]
  },
  qwen: {
    name: 'Alibaba Cloud (Qwen)',
    links: [
      { title: 'What is Qwen?', url: 'https://help.aliyun.com/en/model-studio/getting-started/what-is-qwen', category: 'General' },
      { title: 'Prompt Engineering', url: 'https://help.aliyun.com/en/model-studio/user-guide/prompt-engineering', category: 'Prompting' },
      { title: 'Tokens', url: 'https://help.aliyun.com/en/model-studio/user-guide/tokens', category: 'Tokens' },
      { title: 'Rate Limits', url: 'https://help.aliyun.com/en/model-studio/user-guide/rate-limits', category: 'Rate Limits' },
      { title: 'API Reference', url: 'https://help.aliyun.com/en/model-studio/user-guide/api-reference', category: 'General' },
      { title: 'Function Calling', url: 'https://help.aliyun.com/en/model-studio/user-guide/function-calling', category: 'Functions' },
    ]
  },
  llama: {
    name: 'Meta AI (Llama)',
    links: [
      { title: 'Llama Portal', url: 'https://ai.meta.com/llama/', category: 'General' },
      { title: 'Docs Overview', url: 'https://llama.meta.com/docs/overview', category: 'General' },
      { title: 'How to Prompt', url: 'https://llama.meta.com/docs/how-to-prompt', category: 'Prompting' },
      { title: 'Tokenization', url: 'https://llama.meta.com/docs/tokenization', category: 'Tokens' },
      { title: 'Safety Limits', url: 'https://llama.meta.com/docs/safety', category: 'Safety' },
      { title: 'Inference', url: 'https://llama.meta.com/docs/inference', category: 'Performance' },
      { title: 'Performance Stats', url: 'https://llama.meta.com/docs/performance', category: 'Performance' },
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    links: [
      { title: 'Docs Home', url: 'https://platform.deepseek.com/docs', category: 'General' },
      { title: 'Models Overview', url: 'https://platform.deepseek.com/docs/models', category: 'General' },
      { title: 'Prompting Guide', url: 'https://platform.deepseek.com/docs/prompting', category: 'Prompting' },
      { title: 'Token Usage', url: 'https://platform.deepseek.com/docs/token-usage', category: 'Tokens' },
      { title: 'Rate Limits', url: 'https://platform.deepseek.com/docs/rate-limits', category: 'Rate Limits' },
      { title: 'Response Format', url: 'https://platform.deepseek.com/docs/response-format', category: 'General' },
      { title: 'Quick Start', url: 'https://platform.deepseek.com/docs/quick-start', category: 'General' },
    ]
  }
}

const CATEGORIES = ['All', 'Tokens', 'Prompting', 'Rate Limits', 'Performance', 'Safety', 'Functions', 'General']

export default function AILabPage() {
  const [temperature, setTemperature] = useState<number>(0.7)
  const [throttling, setThrottling] = useState<number>(0.9)
  
  const [selectedDoc, setSelectedDoc] = useState<string>('openai')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  
  const [isRunning, setIsRunning] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  // Document Summary State
  const [activeSummaryUrl, setActiveSummaryUrl] = useState<string | null>(null)
  const [summaryData, setSummaryData] = useState<any>(null)
  const [isSummarizing, setIsSummarizing] = useState(false)
  
  const handleRunLab = async (query: string, taskType: TaskType) => {
    if (!query.trim() || isRunning) return
    setIsRunning(true)
    setError(null)
    setAnalysis(null)
    
    try {
      // 1. Get real data from the Engine first (same as dashboard)
      const MODEL_KEYS = Object.keys(MODEL_PERSONAS) as ModelKey[]
      const responseEntries = await Promise.all(
        MODEL_KEYS.map(async (modelKey) => {
          const response = await Engine.getModelResponse(modelKey, query, taskType)
          return [modelKey, response] as const
        })
      )
      const nextResponses = Object.fromEntries(responseEntries) as ResponsesByModel

      const scoreEntries = await Promise.all(
        MODEL_KEYS.map(async (modelKey) => {
          const score = await Engine.scoreResponse(modelKey, nextResponses[modelKey], query, taskType)
          return [modelKey, score] as const
        })
      )
      const nextScores = Object.fromEntries(scoreEntries) as ScoresByModel
      Engine.addConsensusScores(nextScores, nextResponses, taskType)

      // 2. Pass context to AI Lab Analyzer API
      const res = await fetch('/api/ai-lab', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query, responses: nextResponses, scores: nextScores }),
      })
      
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to run lab analysis.')
      
      setAnalysis(data.analysis)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsRunning(false)
    }
  }

  const handleSummarize = async (modelName: string, category: string, url: string) => {
    if (activeSummaryUrl === url && summaryData) return // Already loaded
    setActiveSummaryUrl(url)
    setSummaryData(null)
    setIsSummarizing(true)

    try {
      const res = await fetch('/api/summarize-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelName, category, url })
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to analyze document')
      setSummaryData(data)
    } catch (err) {
      setSummaryData({ error: err instanceof Error ? err.message : 'Unknown error occurred' })
    } finally {
      setIsSummarizing(false)
    }
  }

  const currentDocs = DOCS_DATA[selectedDoc].links.filter(l => activeCategory === 'All' || l.category === activeCategory)

  return (
    <div className="flex-1 flex overflow-hidden lg:flex-row flex-col bg-background">
      
      {/* ── LEFT PANEL: Controls & Analysis ── */}
      <div className="w-full lg:w-[60%] flex flex-col border-r border-border/40">
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <div className="mb-4">
            <h2 className="text-2xl font-brand font-bold tracking-tight flex items-center gap-2">
              <Beaker className="w-6 h-6 text-primary" />
              AI Parameter Lab
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Configure parameters and run analysis to optimize token efficiency and model selection.</p>
          </div>

          {/* Sliders Box */}
          <div className="p-6 rounded-2xl border border-border/60 bg-muted/20 space-y-6">
            <div className="flex items-center gap-2 mb-2 text-foreground">
              <Sliders className="w-4 h-4 text-primary" />
              <h3 className="font-bold uppercase tracking-wider text-sm">Simulation Constraints</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <label className="text-muted-foreground uppercase tracking-widest text-xs">Temperature</label>
                  <span className="text-primary">{temperature.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="2" step="0.05" 
                  value={temperature} onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full touch-none accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm font-semibold">
                  <label className="text-muted-foreground uppercase tracking-widest text-xs">Throttling (Top-P)</label>
                  <span className="text-primary">{throttling.toFixed(2)}</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05" 
                  value={throttling} onChange={(e) => setThrottling(parseFloat(e.target.value))}
                  className="w-full touch-none accent-primary h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Analysis Result Box */}
          <div className="p-1 rounded-2xl bg-gradient-to-br from-primary/30 via-primary/10 to-background border border-primary/20 shadow-lg shadow-primary/5">
            <div className="bg-card p-6 rounded-[14px] min-h-[250px] flex items-center justify-center">
              {isRunning ? (
                 <div className="flex flex-col items-center gap-4 py-8">
                  <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <ShinyText text="Simulating model responses & extracting token matrices..." speed={1.5} className="text-sm font-semibold" />
                 </div>
              ) : error ? (
                <div className="text-destructive font-semibold text-sm">{error}</div>
              ) : analysis ? (
                <div className="w-full space-y-6">
                  {/* Token Recommendation Box */}
                  <div className="flex gap-4 items-start pb-6 border-b border-border/60">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary mt-1">
                      <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-1 tracking-tight">Best Model for Token Conservation</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        To maximize efficiency using <strong className="text-foreground">{analysis.tokenAnalysis.estimatedInput} input</strong>  & <strong className="text-foreground">{analysis.tokenAnalysis.estimatedOutput} output</strong> tokens, we recommend 
                        using <strong className="text-primary px-1.5 py-0.5 bg-primary/10 rounded">{analysis.modelInsights[0]?.model || 'Claude 3.5 Sonnet'}</strong>.  
                      </p>
                      <p className="text-xs text-muted-foreground/80 mt-2 font-medium">Efficiency Score: {analysis.tokenAnalysis.efficiencyScore}%</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Diagnostic Details</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Hallucination Risk:</span>
                        <p className="font-semibold text-foreground capitalize flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" />
                          {analysis.reliability.riskExplanation.split('.')[0]}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <span className="text-muted-foreground">Parameter Impact (Temp {temperature}):</span>
                        <p className="font-semibold text-foreground">{analysis.parameterSimulation.temperature}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-2 py-10 opacity-60">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-foreground font-semibold">Ready for Lab Analysis</p>
                  <p className="text-sm text-muted-foreground max-w-[250px] mx-auto">Enter a prompt below to see token efficiency & optimization recommendations across models.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Input Area anchored to bottom */}
        <div className="flex-shrink-0 border-t border-border/40 p-1 bg-muted/10">
          <InputArea onRun={handleRunLab} isRunning={isRunning} />
        </div>
      </div>

      {/* ── RIGHT PANEL: Documentation Vault ── */}
      <div className="w-full lg:w-[40%] flex flex-col bg-sidebar border-l border-border/60 z-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)]">
        <div className="p-6 pb-4 border-b border-border/60 bg-sidebar/95 backdrop-blur z-20">
          <div className="flex items-center gap-2 text-foreground mb-1">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="font-bold tracking-tight uppercase text-sm">Documentation Vault</h3>
          </div>
          <p className="text-xs text-muted-foreground">Access official guides and intelligent summaries.</p>
        </div>
        
        {/* Model Selector */}
        <div className="px-6 pt-5 pb-3">
          <div className="flex rounded-xl bg-muted/50 p-1 border border-border/60 overflow-x-auto mask-edges [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {Object.keys(DOCS_DATA).map(key => (
              <button 
                key={key}
                onClick={() => {
                  setSelectedDoc(key)
                  setActiveSummaryUrl(null)
                }}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${selectedDoc === key ? 'bg-background shadow-sm text-primary shadow-black/20' : 'text-muted-foreground hover:text-foreground'}`}
              >
                {DOCS_DATA[key].name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pb-4 border-b border-border/60">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat)
                  setActiveSummaryUrl(null)
                }}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border ${activeCategory === cat ? 'bg-primary/10 border-primary text-primary' : 'bg-transparent border-border/60 text-muted-foreground hover:border-primary/50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {currentDocs.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-10 italic">No links found for this category.</div>
          ) : (
            currentDocs.map((link, i) => (
              <div key={i} className={`p-4 rounded-xl border transition-all ${activeSummaryUrl === link.url ? 'border-primary/40 bg-primary/[0.02]' : 'border-border/60 bg-background/50 hover:border-border'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[9px] uppercase tracking-widest font-bold text-primary/80 mb-1 block">{link.category}</span>
                    <a href={link.url} target="_blank" rel="noreferrer" className="text-sm font-bold text-foreground hover:underline flex items-center gap-1.5 leading-tight">
                      {link.title} <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>

    </div>
  )
}

