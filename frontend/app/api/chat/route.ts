import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// Simple in-memory cache
const cache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: NextRequest) {
  try {
    // Check API key first
    if (!process.env.OPENAI_API_KEY) {
      console.error("OPENAI_API_KEY not set");
      return NextResponse.json({
        text: "⚠️ AI service is not configured. Please check API key.",
      });
    }

    // Initialize client after API key check
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    const { messages } = (await req.json()) as { messages: Message[] };

    const lastUserMessage =
      messages.filter(m => m.role === "user").slice(-1)[0]?.content || "";

    if (!lastUserMessage.trim()) {
      return NextResponse.json({
        text: "Please provide a fitness goal or activity.",
      });
    }

    // Check cache first
    const cacheKey = lastUserMessage.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const systemPrompt = `You are a friendly, knowledgeable fitness coach having a natural conversation. Provide helpful, encouraging fitness advice in plain text only.

Based on the user's goals, create a personalized workout plan. Respond in a natural, conversational way like a real trainer would - be encouraging, explain things clearly, and build rapport.

Structure your response like a normal conversation:
- Start with a personalized acknowledgment
- Explain the workout plan with clear progression
- Include tips for form, nutrition, and recovery
- End with encouraging words and motivation

Use plain text only - no markdown, no special formatting, no JSON. Just natural conversation.`;

    // =========================
    // OPENAI CALL (GPT-4o-mini only)
    // =========================
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 3000,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: lastUserMessage },
      ],
    });

    let responseText = completion.choices[0]?.message?.content || "";

    // Cache the result
    cache.set(cacheKey, {
      data: responseText,
      timestamp: Date.now()
    });

    return NextResponse.json({ text: responseText });
  } catch (error) {
    console.error("AI ERROR:", error);

    // Provide specific error messages
    let errorMessage = "⚠️ Unable to generate fitness insights right now.";
    if (error instanceof Error) {
      if (error.message.includes("API key") || error.message.includes("authentication")) {
        errorMessage = "⚠️ AI service configuration error. Check API key.";
      } else if (error.message.includes("rate limit") || error.message.includes("429")) {
        errorMessage = "⚠️ AI service is busy. Please wait and try again.";
      } else if (error.message.includes("model") || error.message.includes("not found")) {
        errorMessage = "⚠️ AI model unavailable. Using fallback response.";
        // Return a mock response for model errors
        return NextResponse.json({
          text: "Sample Plan:\nWeek 1\nMonday: 30 min walking\nTuesday: 3x10 push-ups\n\nWeek 2\nWednesday: 35 min walking",
        });
      }
    }

    return NextResponse.json({
      text: errorMessage,
    });
  }
}