// app/api/query/route.ts
// ─── Unified OpenRouter proxy — single route for all 4 models ─────

import { NextRequest, NextResponse } from "next/server";
import { auth } from '@/auth'
import { logBackendEvent } from '@/lib/server/event-log'

// ─── Task-specific system prompts ─────────────────────────────────
function systemPromptForTask(task: string): string {
  const prompts: Record<string, string> = {
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
  return prompts[task] || prompts.general;
}

/** Align HTTP status with OpenRouter so clients see 402/400 instead of a generic 500. */
function statusFromOpenRouter(upstream: number): number {
  if ([400, 401, 402, 404, 413, 429].includes(upstream)) return upstream;
  if (upstream >= 500) return 502;
  return 502;
}

function formatOpenRouterError(upstreamStatus: number, body: string): string {
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    const msg = parsed?.error?.message;
    if (typeof msg === "string" && msg.trim()) return msg.trim();
  } catch {
    /* use fallback */
  }
  return `OpenRouter request failed (${upstreamStatus})`;
}

export async function POST(req: NextRequest) {
  const session = await auth()
  
  // Allow development mode or any authenticated session
  if (!session?.user && process.env.NODE_ENV !== 'development') {
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
  }: { modelId: string; prompt: string; taskProfile: string } =
    await req.json();

  const userEmail = session?.user?.email?.trim().toLowerCase() ?? 'guest@fusion.ai'

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

  if (!modelId) {
    await logBackendEvent({
      userEmail,
      eventType: 'query_invalid_model',
      route: '/api/query',
      statusCode: 400,
      metadata: { modelId },
    })

    return NextResponse.json(
      { error: `modelId is required` },
      { status: 400 }
    );
  }

  const start = Date.now();

  try {
    // Helper to call OpenRouter with optional retry on 402 (insufficient credits)
    async function callOpenRouter(maxTokens: number) {
      return await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://fusion.ai',
          'X-Title': 'Fusion AI',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: maxTokens,
          messages: [
            { role: 'system', content: systemPromptForTask(taskProfile) },
            { role: 'user', content: prompt },
          ],
        }),
      })
    }

    let response = await callOpenRouter(512)
    if (response.status === 402) {
      const text = await response.text().catch(() => '')
      const m = text.match(/can only afford\s+(\d+)/i)
      if (m) {
        const afford = Math.max(16, Number(m[1]) - 10)
        // retry once with lower token allowance
        response = await callOpenRouter(afford)
      } else {
        // Reset body text for later error handling
        (response as Response & { _bodyText?: string })._bodyText = text
      }
    }

    if (!response.ok) {
      const errorText = await response.text()
      const message = formatOpenRouterError(response.status, errorText)
      const statusOut = statusFromOpenRouter(response.status)

      await logBackendEvent({
        userEmail,
        eventType: 'query_failed',
        route: '/api/query',
        statusCode: statusOut,
        metadata: {
          modelId,
          taskProfile,
          message,
          openRouterStatus: response.status,
        },
      })

      return NextResponse.json(
        {
          modelId,
          content: message,
          tokensUsed: 0,
          latencyMs: Date.now() - start,
          error: message,
        },
        { status: statusOut }
      )
    }

    const json = await response.json()
    const content = json.choices[0]?.message?.content ?? ""
    const tokensUsed = json.usage?.total_tokens ?? 0

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
    console.error('[query] error:', err)
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
        content: `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
        tokensUsed: 0,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
