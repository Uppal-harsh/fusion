// app/api/query/route.ts
// ─── Unified OpenRouter proxy — single route for all 4 models ─────

import { OpenRouter } from "@openrouter/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ModelId, TaskProfile } from "@/lib/types";

// ─── OpenRouter model identifiers ─────────────────────────────────
const OPENROUTER_MODELS: Record<ModelId, string> = {
  "gpt-4o": "openai/gpt-4o",
  "claude-3-5-sonnet": "anthropic/claude-sonnet-3.5",
  "gemini-2-5-pro": "google/gemini-2.5-pro",
  "llama-3": "meta-llama/llama-3.1-8b-instruct",
};

// ─── Task-specific system prompts ─────────────────────────────────
function systemPromptForTask(task: TaskProfile): string {
  const prompts: Record<TaskProfile, string> = {
    general:
      "You are a helpful, accurate, and concise assistant.",
    coding:
      "You are an expert software engineer. Provide clean, well-commented code with explanations.",
    research:
      "You are a rigorous research assistant. Cite reasoning, acknowledge uncertainty, and be thorough.",
    reasoning:
      "You are a logical reasoning expert. Think step by step, show your work, and be precise.",
    creative:
      "You are a creative writer. Be imaginative, original, and expressive.",
  };
  return prompts[task];
}


export async function POST(req: NextRequest) {
  const {
    modelId,
    prompt,
    taskProfile,
  }: { modelId: ModelId; prompt: string; taskProfile: TaskProfile } =
    await req.json();

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY not set" },
      { status: 500 }
    );
  }

  const openrouter = new OpenRouter({
    apiKey: apiKey,
  });

  const openRouterModel = OPENROUTER_MODELS[modelId];
  if (!openRouterModel) {
    return NextResponse.json(
      { error: `Unknown modelId: ${modelId}` },
      { status: 400 }
    );
  }

  const start = Date.now();

  try {
    const response = await openrouter.chat.send({
      chatRequest: {
        model: openRouterModel,
        maxTokens: 1024,
        messages: [
          { role: "system", content: systemPromptForTask(taskProfile) },
          { role: "user", content: prompt },
        ],
      },
    });

    const content = response.choices[0]?.message?.content ?? "";
    const tokensUsed = response.usage?.totalTokens ?? 0;

    return NextResponse.json({
      modelId,
      content,
      tokensUsed,
      latencyMs: Date.now() - start,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        modelId,
        content: "",
        tokensUsed: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
