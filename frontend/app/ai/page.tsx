"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Trash2, Plus, ChevronRight, Flame, Zap, Apple, Wind } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[]; createdAt: number };
type PlanSummary = {
  has_goal: boolean;
  goal?: { goal_text: string; timeframe_days: number; days_remaining: number };
  current_plan?: { plan_data: { target_sessions: number; summary: string } };
};

const QUICK_PROMPTS = [
  { icon: Flame,  label: "I'm feeling sore — should I rest today?" },
  { icon: Apple,  label: "What should I eat before my session?" },
  { icon: Zap,    label: "I missed 2 days — how do I catch up?" },
  { icon: Wind,   label: "How do I improve my recovery?" },
];

export default function AIPage() {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("http://127.0.0.1:8000/api/plan/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setPlan)
      .catch(() => {});
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("aiConversations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setConversations(parsed);
          setCurrentConvId(parsed[0].id);
          setMessages(parsed[0].messages);
          return;
        }
      }
    } catch {}
    const newId = `conv-${Date.now()}`;
    const initial: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
    setConversations([initial]);
    setCurrentConvId(newId);
    localStorage.setItem("aiConversations", JSON.stringify([initial]));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveConversations = (convs: Conversation[]) => {
    localStorage.setItem("aiConversations", JSON.stringify(convs));
  };

  const createNewConversation = () => {
    const updated = conversations.map(c => c.id === currentConvId ? { ...c, messages } : c);
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
    const next = [newConv, ...updated].slice(0, 3);
    setConversations(next);
    setCurrentConvId(newId);
    setMessages([]);
    saveConversations(next);
  };

  const loadConversation = (convId: string) => {
    const updated = conversations.map(c => c.id === currentConvId ? { ...c, messages } : c);
    setConversations(updated);
    saveConversations(updated);
    const conv = updated.find(c => c.id === convId);
    if (conv) { setCurrentConvId(convId); setMessages(conv.messages); }
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter(c => c.id !== convId);
    setConversations(updated);
    saveConversations(updated);
    if (currentConvId === convId) {
      if (updated.length > 0) { setCurrentConvId(updated[0].id); setMessages(updated[0].messages); }
      else {
        const newId = `conv-${Date.now()}`;
        const newConv: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
        setConversations([newConv]);
        setCurrentConvId(newId);
        setMessages([]);
        saveConversations([newConv]);
      }
    }
  };

  const handleSend = async (text?: string) => {
    const content = (text ?? msg).trim();
    if (!content) return;
    const newUserMsg: Message = { role: "user", content };
    const updatedMsgs = [...messages, newUserMsg];
    setMessages(updatedMsgs);
    setMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMsgs }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const aiMsg: Message = { role: "assistant", content: data.text || "Sorry, I couldn't respond." };
      const final = [...updatedMsgs, aiMsg];
      setMessages(final);

      if (currentConvId) {
        const updated = conversations.map(c => c.id === currentConvId ? { ...c, messages: final } : c);
        // Generate title on first message
        if (updatedMsgs.length === 1) {
          const titleRes = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: [{ role: "user", content: `Summarize in 2-4 words: "${content}". Reply with ONLY the title.` }] }),
          });
          if (titleRes.ok) {
            const t = await titleRes.json();
            const titled = updated.map(c => c.id === currentConvId ? { ...c, title: (t.text || content).trim().substring(0, 35) } : c);
            setConversations(titled);
            saveConversations(titled);
            return;
          }
        }
        setConversations(updated);
        saveConversations(updated);
      }
    } catch {
      setMessages([...updatedMsgs, { role: "assistant", content: "⚠️ Error connecting. Check your API." }]);
    } finally {
      setLoading(false);
    }
  };

  const weeksTotal = plan?.goal ? Math.ceil(plan.goal.timeframe_days / 7) : 0;
  const weeksDone = plan?.goal ? weeksTotal - Math.ceil(plan.goal.days_remaining / 7) : 0;

  return (
    <AppShell headerLeft={
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)] flex-shrink-0">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight leading-none">Momentm AI</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Personalized wellness suggestions tuned to your patterns.</p>
        </div>
      </div>
    }>
      <div className="space-y-6">

        {/* Plan banner */}
        {plan !== null && (
          !plan.has_goal ? (
            <Card className="glass-strong border-0 p-6 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Get your personalized training plan</p>
                <p className="text-sm text-muted-foreground mt-0.5">Tell us your goal and the AI builds a week-by-week plan with drill-level detail.</p>
              </div>
              <Link href="/plan">
                <Button className="gradient-bg shrink-0">
                  Set up my plan <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </Card>
          ) : plan.goal && (
            <Link href="/plan" className="block">
              <Card className="glass-strong border-0 p-5 flex items-center justify-between gap-4 hover:bg-accent/30 transition-colors cursor-pointer">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Plan · Week {weeksDone + 1} of {weeksTotal}</p>
                  <p className="font-semibold truncate">{plan.goal.goal_text}</p>
                  {plan.current_plan && (
                    <p className="text-sm text-muted-foreground mt-0.5">{plan.current_plan.plan_data.summary}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold tabular-nums">{plan.goal.days_remaining}</p>
                  <p className="text-xs text-muted-foreground">days left</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Card>
            </Link>
          )
        )}

        {/* Chat */}
        <Card className="glass-strong border-0 p-6 mt-4">
          {/* Conversation tabs */}
          <div className="mb-4 flex flex-wrap gap-2 pb-4 border-b">
            <Button size="sm" variant="ghost" onClick={createNewConversation} className="gap-2">
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            {conversations.map(conv => (
              <div key={conv.id} className="flex items-center gap-1">
                <Button
                  size="sm"
                  variant={currentConvId === conv.id ? "default" : "ghost"}
                  className={currentConvId === conv.id ? "gradient-bg" : ""}
                  onClick={() => loadConversation(conv.id)}
                >
                  {conv.title}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => deleteConversation(conv.id)} className="h-8 w-8 p-0">
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>

          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Ask Momentm AI
          </h3>

          {/* Messages */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">AI</div>
                <div className="glass rounded-2xl rounded-tl-sm p-3 text-sm max-w-md">
                  Hey! Ask me anything about your training, recovery, or nutrition.
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">AI</div>
                )}
                <div className={`rounded-2xl p-4 text-sm ${m.role === "user" ? "gradient-bg text-primary-foreground rounded-tr-sm max-w-2xl" : "glass rounded-tl-sm max-w-3xl"}`}>
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-muted shrink-0">U</div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0">AI</div>
                <div className="glass rounded-2xl rounded-tl-sm p-3 text-sm"><span className="animate-pulse">Thinking...</span></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick prompts — only shown when no messages */}
          {messages.length === 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              {QUICK_PROMPTS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.label)}
                  className="glass rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors flex items-center gap-2"
                >
                  <p.icon className="w-3.5 h-3.5 shrink-0" />
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={e => setMsg(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !loading && handleSend()}
              placeholder="Ask anything about your training..."
              className="flex-1 glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <Button onClick={() => handleSend()} disabled={loading || !msg.trim()} className="gradient-bg">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
