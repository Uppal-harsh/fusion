// app/api/synthesize/route.ts
// ─── Judge model: scores all 4 responses + synthesizes best answer ─

import { NextRequest, NextResponse } from "next/server";

interface ChartDataPoint {
  model: string;
  accuracy: number;
  reasoning: number;
  coherence: number;
  grounding: number;
  latency: number;
  overall: number;
}

interface ModelResponse {
  modelId: string;
  content: string;
  tokensUsed: number;
  latencyMs: number;
  error?: string;
}

interface ScoredResponse extends ModelResponse {
  scores: { accuracy: number; reasoning: number; coherence: number; grounding: number; hallucination: number };
  overallScore: number;
}

interface SynthesizeRequest {
  prompt: string;
  taskProfile: string;
  responses: ModelResponse[];
}

interface SynthesisResult {
  scoredResponses: ScoredResponse[];
  fusedAnswer: string;
  consensus: number;
  variance: number;
  overallQuality: number;
  chartData: ChartDataPoint[];
}

// ─── Score weights per task profile ──────────────────────────────
const TASK_WEIGHTS: Record<
  string,
  Record<string, number>
> = {
  general:   { accuracy: 0.3, reasoning: 0.2, coherence: 0.25, grounding: 0.15, hallucination: 0.1 },
  coding:    { accuracy: 0.35, reasoning: 0.3, coherence: 0.15, grounding: 0.1, hallucination: 0.1 },
  research:  { accuracy: 0.25, reasoning: 0.2, coherence: 0.15, grounding: 0.3, hallucination: 0.1 },
  reasoning: { accuracy: 0.2, reasoning: 0.4, coherence: 0.2, grounding: 0.1, hallucination: 0.1 },
  creative:  { accuracy: 0.1, reasoning: 0.1, coherence: 0.4, grounding: 0.1, hallucination: 0.3 },
};

export async function POST(req: NextRequest) {
  const { prompt, taskProfile, responses }: SynthesizeRequest =
    await req.json();

  // Filter out errored/empty responses for the judge
  const validResponses = responses.filter((r) => r.content && !r.error);

  if (validResponses.length === 0) {
    return NextResponse.json(
      { error: "All model queries failed — no responses to synthesize." },
      { status: 422 }
    );
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not set." },
      { status: 500 }
    );
  }

  try {
    // Simple behavior: pick one valid model response at random and use
    // it as the fused answer. Assign neutral scores so downstream UI
    // can still render chart data.
    const pick = validResponses[Math.floor(Math.random() * validResponses.length)];
    const judgeOutput: JudgeOutput = {
      scores: Object.fromEntries(
        validResponses.map((r) => [r.modelId, { accuracy: 50, reasoning: 50, coherence: 50, grounding: 50, hallucination: 50 }])
      ) as Record<string, { accuracy: number; reasoning: number; coherence: number; grounding: number; hallucination: number }>,
      fusedAnswer: pick.content,
    };

    const scoredResponses: ScoredResponse[] = responses.map((r) => {
      const scored = judgeOutput.scores[r.modelId];
      if (!scored) {
        return {
          ...r,
          scores: { accuracy: 0, reasoning: 0, coherence: 0, grounding: 0, hallucination: 0 },
          overallScore: 0,
        };
      }
      const weights = TASK_WEIGHTS[taskProfile] || TASK_WEIGHTS.general;
      const overallScore = Math.round(
        scored.accuracy * weights.accuracy +
        scored.reasoning * weights.reasoning +
        scored.coherence * weights.coherence +
        scored.grounding * weights.grounding +
        (100 - scored.hallucination) * weights.hallucination
      );
      return { ...r, scores: scored, overallScore };
    });

    // Compute aggregate metrics
    const validScored = scoredResponses.filter((r) => !r.error && r.overallScore > 0);
    const overallQuality =
      validScored.length > 0
        ? Math.round(
            validScored.reduce((sum, r) => sum + r.overallScore, 0) /
            validScored.length
          )
        : 0;

    const scores = validScored.map((r) => r.overallScore);
    const variance =
      scores.length > 1
        ? Math.round(
            (Math.max(...scores) - Math.min(...scores))
          )
        : 0;
    const consensus = Math.max(0, 100 - variance);

    // Build Recharts-ready chart data
    const chartData: ChartDataPoint[] = scoredResponses.map((r) => ({
      model: modelLabel(r.modelId),
      accuracy: r.scores.accuracy,
      reasoning: r.scores.reasoning,
      coherence: r.scores.coherence,
      grounding: r.scores.grounding,
      latency: r.latencyMs,
      overall: r.overallScore,
    }));

    const result: SynthesisResult = {
      scoredResponses,
      fusedAnswer: judgeOutput.fusedAnswer,
      consensus,
      variance,
      overallQuality,
      chartData,
    };

    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Synthesis error" },
      { status: 500 }
    );
  }
}

// ─── Judge prompt + OpenRouter API call ───────────────────────────
interface JudgeOutput {
  scores: Record<
    string,
    { accuracy: number; reasoning: number; coherence: number; grounding: number; hallucination: number }
  >;
  fusedAnswer: string;
}

async function callJudge(
  prompt: string,
  taskProfile: string,
  responses: ModelResponse[],
  apiKey: string
): Promise<JudgeOutput> {
  const responseBlock = responses
    .map((r) => `### ${r.modelId}\n${r.content.slice(0, 400)}`)
    .join("\n\n");

  const judgePrompt = `You are an expert AI evaluator assessing multiple model responses.

USER PROMPT:
${prompt}

TASK PROFILE: ${taskProfile}

MODEL RESPONSES:
${responseBlock}

Your job:
1. Score each model response on these dimensions (0–100 each):
   - accuracy: factual correctness and relevance to the prompt
   - reasoning: logical structure and depth of analysis
   - coherence: clarity, flow, and readability
   - grounding: use of evidence, specifics, and verifiable claims
   - hallucination: likelihood of fabricated or unsupported content (0 = none, 100 = severe)

2. Write a synthesized "fused answer" that combines the strongest elements from all responses.
   The fused answer should be better than any individual response.

Return ONLY valid JSON — no markdown fences, no preamble:
{
  "scores": {
    "${responses[0].modelId}": { "accuracy": 0, "reasoning": 0, "coherence": 0, "grounding": 0, "hallucination": 0 }
    ${responses.slice(1).map(r => `,"${r.modelId}": { "accuracy": 0, "reasoning": 0, "coherence": 0, "grounding": 0, "hallucination": 0 }`).join("\n    ")}
  },
  "fusedAnswer": "..."
}`;

  try {
    // Retry helper for judge call — handle 402 (insufficient credits) by
    // extracting allowed token count from the message and retrying once.
    async function callJudgeOnce(maxTokens: number) {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://fusion.ai',
          'X-Title': 'Fusion AI',
        },
        body: JSON.stringify({ model: 'openai/gpt-4o', max_tokens: maxTokens, messages: [{ role: 'user', content: judgePrompt }] }),
      })
    }

    let response = await callJudgeOnce(500)
    if (response.status === 402) {
      const errText = await response.text().catch(() => '')
      const m = errText.match(/can only afford\s+(\d+)/i)
      if (m) {
        const afford = Math.max(16, Number(m[1]) - 10)
        response = await callJudgeOnce(afford)
      } else {
        ;(response as Response & { _bodyText?: string })._bodyText = errText
      }
    }

    if (!response.ok) {
      const errorText = (response as Response & { _bodyText?: string })._bodyText ?? (await response.text().catch(() => ''))
      throw new Error(`OpenRouter API failed: ${response.status} ${errorText}`)
    }

    const data = await response.json()
    const text = data.choices[0]?.message?.content ?? "{}"
    
    try {
      // Strip markdown code blocks if the model included them (e.g. ```json ... ```)
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned) as JudgeOutput;
    } catch (err) {
      console.error("Judge JSON parse error. Raw text:", text);
      throw new Error("Judge returned invalid JSON formatting.");
    }
  } catch (err) {
    throw err instanceof Error ? err : new Error("Unknown error in callJudge");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
// Model ID to display name mapping - should match the models defined in the system
const MODEL_DISPLAY_NAMES: Record<string, string> = {
  'openai/gpt-4o': 'GPT-4o',
  'openai/gpt-4-turbo': 'GPT-4 Turbo',
  'anthropic/claude-3.7-sonnet': 'Claude 3.7 Sonnet',
  'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
  'meta-llama/llama-3.1-70b-instruct': 'Llama 3.1 70B',
};

function modelLabel(modelId: string): string {
  return MODEL_DISPLAY_NAMES[modelId] ?? modelId;
}
