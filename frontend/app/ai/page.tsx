


"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Heart, Brain, Moon, Utensils, Send, Trash2, Plus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; messages: Message[]; createdAt: number };
type Recommendation = { id: string; icon: any; title: string; body: string; tag: string; color: string };

const ICON_KEYS = ["Moon", "Utensils", "Heart", "Brain"];
const ICONS_MAP = { Moon, Utensils, Heart, Brain };

const RECOMMENDATIONS_TEMPLATES = [
  { title: "Shift bedtime by 25 minutes", body: "Your recovery score drops 18% on nights you sleep after 11:30pm. Try winding down by 11:05pm.", tag: "Sleep", color: "oklch(0.55 0.18 300)" },
  { title: "Add 20g protein to breakfast", body: "Morning workouts on protein-rich days show 12% higher output. We suggest Greek yogurt + almonds.", tag: "Nutrition", color: "oklch(0.78 0.16 75)" },
  { title: "Add a Zone 2 run on Wednesday", body: "Your weekly cardio mix is heavy on intensity. A 35-min easy run will improve aerobic base.", tag: "Training", color: "oklch(0.62 0.22 25)" },
  { title: "Try a 10-min mindfulness session", body: "Stress markers peak Tuesdays. A short midday session has worked well for similar profiles.", tag: "Mind", color: "oklch(0.6 0.22 255)" },
  { title: "Extend warm-up by 5 minutes", body: "Extended warm-ups reduce injury risk by 23%. Add dynamic stretching before strength training.", tag: "Training", color: "oklch(0.62 0.22 25)" },
  { title: "Track hydration levels", body: "Proper hydration during workouts improves endurance by up to 15%. Aim for 500ml per hour.", tag: "Nutrition", color: "oklch(0.78 0.16 75)" },
];

export default function AIPage() {
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConvId, setCurrentConvId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [usedRecommendationIndices, setUsedRecommendationIndices] = useState<Set<number>>(new Set());
  const [predictionData, setPredictionData] = useState<any[]>([]);
  const [loadingPrediction, setLoadingPrediction] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize conversations on mount
  useEffect(() => {
    const initConversations = () => {
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
      } catch (e) {
        console.error("Failed to load conversations:", e);
      }

      // Create initial conversation
      const newId = `conv-${Date.now()}`;
      const initialConv: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
      setConversations([initialConv]);
      setCurrentConvId(newId);
      setMessages([]);
      localStorage.setItem("aiConversations", JSON.stringify([initialConv]));
    };

    initConversations();
  }, []);

  // Initialize predictions
  useEffect(() => {
    setPredictionData(
      Array.from({ length: 12 }, (_, i) => ({
        day: `Day ${i + 1}`,
        actual: i < 8 ? 60 + Math.sin(i / 3) * 10 + i * 0.8 : null,
        predicted: 60 + Math.sin(i / 3) * 10 + i * 0.9 + (i > 7 ? 4 : 0),
      }))
    );
    setLoadingPrediction(false);
  }, []);

  // Initialize recommendations separately
  useEffect(() => {
    generateRecommendations();
  }, []);

  const generateRecommendations = () => {
    setRecommendations((prev) => {
      if (prev.length >= 4) return prev;
      const newRecs = [...prev];
      const usedIndices = new Set(usedRecommendationIndices);

      while (newRecs.length < 4) {
        const available = Array.from({ length: RECOMMENDATIONS_TEMPLATES.length }, (_, i) => i).filter(
          (i) => !usedIndices.has(i)
        );

        if (available.length === 0) usedIndices.clear();

        const idx = available[Math.floor(Math.random() * available.length)];
        const template = RECOMMENDATIONS_TEMPLATES[idx];
        usedIndices.add(idx);

        const iconKey = ICON_KEYS[newRecs.length % ICON_KEYS.length];
        const icon = ICONS_MAP[iconKey as keyof typeof ICONS_MAP];

        newRecs.push({
          id: `rec-${Date.now()}-${Math.random()}`,
          icon,
          title: template.title,
          body: template.body,
          tag: template.tag,
          color: template.color,
        });
      }

      setUsedRecommendationIndices(usedIndices);
      return newRecs;
    });
  };

  const generateChatTitle = async (userMessage: string): Promise<string> => {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: `Summarize this in 2-4 words: "${userMessage}"\n\nRespond ONLY with the title.` }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return (data.text || "").trim().substring(0, 40) || userMessage.substring(0, 30);
      }
    } catch (error) {
      console.error("Title generation failed:", error);
    }
    return userMessage.substring(0, 30);
  };

  const saveConversation = () => {
    if (currentConvId) {
      const updated = conversations.map((c) => (c.id === currentConvId ? { ...c, messages } : c));
      setConversations(updated);
      localStorage.setItem("aiConversations", JSON.stringify(updated));
    }
  };

  const createNewConversation = () => {
    saveConversation();
    const newId = `conv-${Date.now()}`;
    const newConv: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
    const updated = [newConv, ...conversations].slice(0, 3);
    setConversations(updated);
    setCurrentConvId(newId);
    setMessages([]);
    localStorage.setItem("aiConversations", JSON.stringify(updated));
  };

  const loadConversation = (convId: string) => {
    saveConversation();
    const conv = conversations.find((c) => c.id === convId);
    if (conv) {
      setCurrentConvId(convId);
      setMessages(conv.messages);
    }
  };

  const deleteConversation = (convId: string) => {
    const updated = conversations.filter((c) => c.id !== convId);
    setConversations(updated);
    localStorage.setItem("aiConversations", JSON.stringify(updated));

    if (currentConvId === convId) {
      if (updated.length > 0) {
        loadConversation(updated[0].id);
      } else {
        const newId = `conv-${Date.now()}`;
        const newConv: Conversation = { id: newId, title: "New Chat", messages: [], createdAt: Date.now() };
        setConversations([newConv]);
        setCurrentConvId(newId);
        setMessages([]);
        localStorage.setItem("aiConversations", JSON.stringify([newConv]));
      }
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!msg.trim()) return;

    const newUserMessage: Message = { role: "user", content: msg };
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setMsg("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const aiMessage: Message = { role: "assistant", content: data.text || "Sorry, I couldn't respond." };
      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Save immediately after getting response
      if (currentConvId) {
        const updated = conversations.map((c) =>
          c.id === currentConvId ? { ...c, messages: finalMessages } : c
        );
        setConversations(updated);
        localStorage.setItem("aiConversations", JSON.stringify(updated));

        // Generate title only on first message
        if (updatedMessages.length === 1) {
          const title = await generateChatTitle(msg);
          const titleUpdated = updated.map((c) =>
            c.id === currentConvId ? { ...c, title } : c
          );
          setConversations(titleUpdated);
          localStorage.setItem("aiConversations", JSON.stringify(titleUpdated));
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...updatedMessages, { role: "assistant", content: "⚠️ Error connecting. Check your API." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleRecommendationAction = (recId: string) => {
    setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    setTimeout(() => generateRecommendations(), 0);
  };

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Momentm AI</h1>
            <p className="text-sm text-muted-foreground">Personalized wellness suggestions tuned to your patterns.</p>
          </div>
        </div>

        <Card className="glass-strong border-0 p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h3 className="font-semibold">Predictive performance</h3>
              <p className="text-xs text-muted-foreground">Projected fitness score · next 12 days</p>
            </div>
            <Badge className="gradient-bg text-primary-foreground">
              <TrendingUp className="w-3 h-3 mr-1" />
              Trending up
            </Badge>
          </div>
          <div className="h-64">
            {loadingPrediction ? (
              <div className="flex items-center justify-center h-full">
                <span className="animate-pulse">Loading...</span>
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={predictionData}>
                  <defs>
                    <linearGradient id="pa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 250)" vertical={false} />
                  <XAxis dataKey="day" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "oklch(1 0 0 / 0.95)", borderRadius: 12 }} />
                  <Area type="monotone" dataKey="actual" stroke="oklch(0.6 0.22 255)" strokeWidth={2.5} fill="url(#pa)" />
                  <Line type="monotone" dataKey="predicted" stroke="oklch(0.55 0.18 300)" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {recommendations.map((r) => {
            const IconComponent = r.icon;
            return (
              <Card key={r.id} className="glass border-0 p-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklab, ${r.color} 15%, transparent)` }}>
                    <IconComponent className="w-5 h-5" style={{ color: r.color }} />
                  </div>
                  <div className="flex-1">
                    <Badge variant="secondary" className="text-xs mb-1">
                      {r.tag}
                    </Badge>
                    <h3 className="font-semibold mb-1">{r.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{r.body}</p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => handleRecommendationAction(r.id)}>
                        Dismiss
                      </Button>
                      <Button size="sm" className="gradient-bg" onClick={() => handleRecommendationAction(r.id)}>
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Card className="glass-strong border-0 p-6">
          <div className="mb-4 flex flex-wrap gap-2 pb-4 border-b">
            <Button size="sm" variant="ghost" onClick={createNewConversation} className="gap-2">
              <Plus className="w-4 h-4" /> New Chat
            </Button>
            {conversations.map((conv) => (
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

          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {messages.length === 0 && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  AI
                </div>
                <div className="glass rounded-2xl rounded-tl-sm p-3 text-sm max-w-md">
                  What should we do today?
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold">
                    AI
                  </div>
                )}
                <div
                  className={`rounded-2xl p-4 text-sm ${
                    m.role === "user"
                      ? "gradient-bg text-primary-foreground rounded-tr-sm max-w-2xl"
                      : "glass rounded-tl-sm max-w-3xl"
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                </div>
                {m.role === "user" && <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold bg-muted">U</div>}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold">
                  AI
                </div>
                <div className="glass rounded-2xl rounded-tl-sm p-3 text-sm">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && handleSendMessage()}
              placeholder="Ask anything about your training..."
              className="flex-1 glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <Button onClick={handleSendMessage} disabled={loading || !msg.trim()} className="gradient-bg">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}