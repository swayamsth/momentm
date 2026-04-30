"use client";

import { useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

type AIResponse = {
  text: string;
};

interface ChatProps {
  onResponse?: (response: AIResponse) => void;
}

export default function Chat({ onResponse }: ChatProps) {
  const [goal, setGoal] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showChat, setShowChat] = useState(false);

  function normalizeAssistantText(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/^\s*[-*]\s+/gm, "")
      .replace(/\r/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function isHeadingLine(line: string) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (trimmed.endsWith(":")) return true;
    if (/^day\s*\d+/i.test(trimmed)) return true;
    if (/^(week|phase|summary|overview)\b/i.test(trimmed)) return true;
    return false;
  }

  async function handleGeneratePlan(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!goal) return;
    setShowChat(true);
    setMessages(prev => [
      ...prev,
      { role: "user", content: goal }
    ]);
    setLoading(true);
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [{ role: "user", content: goal }],
      }),
    });
    const data: AIResponse = await res.json();
    setMessages(prev => [
      ...prev,
      { role: "assistant", content: normalizeAssistantText(data.text) }
    ]);
    if (onResponse) {
      onResponse(data);
    }
    setGoal(""); // Clear input after submit
    setLoading(false);
  }

  return (
    <div className="bg-transparent flex flex-col w-full h-full min-h-0">
      {/* If chat not started, show only the initial input */}
      {!showChat ? (
        <div className="flex-1 flex items-center">
          <div className="w-full max-w-4xl mx-auto px-4">
            <div className="mb-3 text-left">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">Where should we start?</h1>
              <p className="text-sm md:text-base text-zinc-400">Describe your goals, challenges, or what you want to achieve.</p>
            </div>
            <form onSubmit={handleGeneratePlan} className="relative w-full py-2">
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/8 to-emerald-500/10 blur-xl" />
              <div className="relative">
                <input
                  className="bg-zinc-900/75 backdrop-blur-md text-white p-5 pr-16 rounded-3xl w-full focus:outline-none focus:ring-2 focus:ring-cyan-500/35 text-lg placeholder:text-zinc-400"
                  placeholder="Ask AI Coach"
                  value={goal}
                  onChange={e => setGoal(e.target.value)}
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700/80 transition"
                  disabled={loading}
                  aria-label="Send message"
                >
                  {loading ? "..." : <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'><path strokeLinecap='round' strokeLinejoin='round' d='M17.25 6.75L21 12m0 0l-3.75 5.25M21 12H3' /></svg>}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="relative flex flex-1 min-h-0 h-full flex-col">
          {/* CHAT WINDOW */}
          <div className="chat-scroll flex-1 min-h-0 overflow-y-auto space-y-6 py-3 pb-28 px-4">
            {messages.map((m, i) => (
              <div key={i} className="w-full max-w-4xl mx-auto">
                <div className={`flex w-full ${m.role === "assistant" ? "justify-start" : "justify-end"}`}>
                  {m.role === "assistant" ? (
                    <div className="w-full max-w-3xl px-1">
                      <div className="space-y-2 text-base md:text-lg leading-8">
                        {m.content.split("\n").map((line, idx) => (
                          <p
                            key={idx}
                            className={isHeadingLine(line) ? "font-semibold text-zinc-50" : "font-normal text-zinc-200"}
                          >
                            {line || "\u00a0"}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[85%] md:max-w-[80%] rounded-3xl px-6 py-4 text-base md:text-lg leading-8 whitespace-pre-wrap bg-zinc-800/90 text-zinc-100">
                      {m.content}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="w-full max-w-4xl mx-auto">
                <div className="text-base text-zinc-400 w-fit animate-pulse">AI is thinking…</div>
              </div>
            )}
          </div>
          {/* INPUT AREA for follow-up prompts */}
          <form
            onSubmit={e => {
              e.preventDefault();
              handleGeneratePlan();
            }}
            className="absolute bottom-0 left-0 right-0 z-10 w-full py-2 bg-zinc-950/90 backdrop-blur-sm"
          >
            <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-gradient-to-r from-cyan-500/10 via-blue-500/8 to-emerald-500/10 blur-xl" />
            <div className="relative w-full max-w-4xl mx-auto px-4">
              <input
                className="bg-zinc-900/75 backdrop-blur-md text-white p-5 pr-16 rounded-3xl w-full focus:outline-none focus:ring-2 focus:ring-cyan-500/35 text-lg placeholder:text-zinc-400"
                placeholder="Ask AI Coach"
                value={goal}
                onChange={e => setGoal(e.target.value)}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 flex items-center justify-center rounded-full bg-zinc-800/80 text-white hover:bg-zinc-700/80 transition"
                disabled={loading || !goal.trim()}
                aria-label="Send message"
              >
                {loading ? "..." : <svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' strokeWidth={1.5} stroke='currentColor' className='w-4 h-4'><path strokeLinecap='round' strokeLinejoin='round' d='M17.25 6.75L21 12m0 0l-3.75 5.25M21 12H3' /></svg>}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
