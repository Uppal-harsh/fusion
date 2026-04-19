import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { modelName, category, url } = await req.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      return NextResponse.json({ error: "GEMINI_API_KEY is not configured in .env.local" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const systemPrompt = `You are the Fusion AI Documentation Expert.
Your job is to provide a concise, developer-centric summary of official AI model documentation based on your extensive knowledge base. 
Do NOT try to browse the web. Use your built-in knowledge about the AI model to explain what this documentation page covers.

---
## INPUT CONTEXT
Model: ${modelName}
Topic / Category: ${category}
Documentation URL: ${url}

---
## OUTPUT FORMAT (STRICT JSON)
You must return a raw JSON object matching exactly this structure. DO NOT wrap it in markdown blockticks like \`\`\`json. Return bare text:
{
  "summary": "A fully detailed summary explaining exactly what the topic covers for this model."
}`;

    // Concatenate directly to bypass strict SDK structure requirements that may trigger errors
    const prompt = `${systemPrompt}\n\nAnalyze the provided documentation topic and return the JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text() || "{}";
    
    // Fallback cleanup just in case the model ignores the "bare text" instruction
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const data = JSON.parse(cleaned);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Docs Summary Error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal error" }, { status: 500 });
  }
}
