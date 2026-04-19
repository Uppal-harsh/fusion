// app/api/query/route.ts
// ─── Unified OpenRouter proxy — single route for all 4 models ─────

import { OpenRouter } from "@openrouter/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { ModelId, TaskProfile } from "@/lib/types";
import { auth } from '@/auth'
import { logBackendEvent } from '@/lib/server/event-log'

// ─── OpenRouter model identifiers ─────────────────────────────────
const OPENROUTER_MODELS: Record<ModelId, string> = {
  "gpt-4o":            "openai/gpt-4o",
  "claude-3-5-sonnet": "anthropic/claude-3.7-sonnet",
  "gemini-2-5-pro":    "google/gemini-2.5-pro",
  "llama-3":           "meta-llama/llama-3.3-70b-instruct",
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
  const session = await auth()
  if (!session?.user) {
    await logBackendEvent({
      eventType: 'query_unauthorized',
      route: '/api/query',
      statusCode: 401,
    })

    return NextResponse.json(
      { error: 'Unauthorized. Please sign in with Google.' },
      { status: 401 }
    )
  }

  const {
    modelId,
    prompt,
    taskProfile,
  }: { modelId: ModelId; prompt: string; taskProfile: TaskProfile } =
    await req.json();

  const userEmail = session.user.email?.trim().toLowerCase()

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    await logBackendEvent({
      userEmail,
      eventType: 'query_provider_not_configured',
      route: '/api/query',
      statusCode: 500,
    })

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
    await logBackendEvent({
      userEmail,
      eventType: 'query_invalid_model',
      route: '/api/query',
      statusCode: 400,
      metadata: { modelId },
    })

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

    await logBackendEvent({
      userEmail,
      eventType: 'query_completed',
      route: '/api/query',
      statusCode: 200,
      metadata: {
        modelId,
        taskProfile,
        tokensUsed,
        latencyMs: Date.now() - start,
      },
    })

    return NextResponse.json({
      modelId,
      content,
      tokensUsed,
      latencyMs: Date.now() - start,
    });
  } catch (err: unknown) {
    await logBackendEvent({
      userEmail,
      eventType: 'query_failed',
      route: '/api/query',
      statusCode: 500,
      metadata: {
        modelId,
        taskProfile,
        message: err instanceof Error ? err.message : 'Unknown error',
      },
    })

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
