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

    // Check if this is a follow-up question (more than 1 user message)
    const userMessageCount = messages.filter(m => m.role === "user").length;
    const isFollowUp = userMessageCount > 1;

    // Check cache first
    const cacheKey = lastUserMessage.toLowerCase().trim();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data);
    }

    const systemPrompt = isFollowUp ? 
      `You are a knowledgeable fitness coach providing practical help. Provide helpful fitness advice in plain text only.

IMPORTANT FORMATTING RULES:
- NO markdown formatting (no **, __, ##, etc.)
- NO asterisks or special characters
- Use line breaks to separate sections
- Use plain text only
- For lists, write each item on new line

FOLLOW-UP RESPONSE MODE:
- Focus purely on explaining and helping with the current question
- NO encouraging compliments or motivational speeches
- NO closing statements like "You've got this!" or similar
- Just provide practical, direct information
- Be concise and helpful`
    : 
      `You are a friendly, knowledgeable fitness coach. Provide helpful fitness advice in plain text only.

IMPORTANT FORMATTING RULES:
- NO markdown formatting (no **, __, ##, etc.)
- NO asterisks or special characters
- Use line breaks to separate sections and exercises
- Each workout day/exercise should be on its own line or new paragraph
- Use plain text only - numbers, letters, and line breaks
- For lists, just write item on new line
- For emphasis, use CAPITAL LETTERS instead of bold

INITIAL RESPONSE MODE:
- Start with a personalized acknowledgment
- Explain the workout plan with clear progression
- Include tips for form, nutrition, and recovery
- End with encouraging words and motivation
- Be friendly and build rapport

Example format:
Strength Training (4 days a week):
Day 1: Upper Body
Bench Press: 3 sets of 8-10 reps
Bent Over Rows: 3 sets of 8-10 reps
(continue with line breaks between items)`;

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