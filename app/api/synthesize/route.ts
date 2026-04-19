// app/api/synthesize/route.ts
// ─── Judge model: scores all 4 responses + synthesizes best answer ─

import { OpenRouter } from "@openrouter/sdk";
import { NextRequest, NextResponse } from "next/server";
import type {
  ChartDataPoint,
  ModelResponse,
  ScoredResponse,
  SynthesisResult,
  SynthesizeRequest,
  TaskProfile,
} from "@/lib/types";

// ─── Score weights per task profile ──────────────────────────────
const TASK_WEIGHTS: Record<
  TaskProfile,
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
    const judgeOutput = await callJudge(prompt, taskProfile, validResponses, apiKey);

    // Merge scores back onto original responses (including errored ones)
    const scoredResponses: ScoredResponse[] = responses.map((r) => {
      const scored = judgeOutput.scores[r.modelId];
      if (!scored) {
        // Model had an error — assign zero scores
        return {
          ...r,
          scores: { accuracy: 0, reasoning: 0, coherence: 0, grounding: 0, hallucination: 0 },
          overallScore: 0,
        };
      }
      const weights = TASK_WEIGHTS[taskProfile];
      const overallScore = Math.round(
        scored.accuracy * weights.accuracy +
        scored.reasoning * weights.reasoning +
        scored.coherence * weights.coherence +
        scored.grounding * weights.grounding +
        // hallucination is inverted: lower = better → higher score contribution
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
  taskProfile: TaskProfile,
  responses: ModelResponse[],
  apiKey: string
): Promise<JudgeOutput> {
  const openrouter = new OpenRouter({
    apiKey: apiKey,
  });
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

  const response = await openrouter.chat.send({
    chatRequest: {
      model: "openai/gpt-4o",
      maxTokens: 500,
      messages: [{ role: "user", content: judgePrompt }],
    },
  });

  const text = response.choices[0]?.message?.content ?? "{}";
  
  try {
    // Strip markdown code blocks if the model included them (e.g. ```json ... ```)
    const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned) as JudgeOutput;
  } catch (err) {
    console.error("Judge JSON parse error. Raw text:", text);
    throw new Error("Judge returned invalid JSON formatting.");
  }
}

// ─── Helpers ──────────────────────────────────────────────────────
function modelLabel(modelId: string): string {
  const labels: Record<string, string> = {
    "gpt-4o": "GPT-4o",
    "claude-3-5-sonnet": "Claude",
    "gemini-2-5-pro": "Gemini",
    "llama-3": "Llama 3",
  };
  return labels[modelId] ?? modelId;
}
