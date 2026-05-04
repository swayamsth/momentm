"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, TrendingUp, Heart, Brain, Moon, Utensils, Send } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { useState } from "react";

const prediction = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  actual: i < 18 ? 60 + Math.sin(i / 3) * 10 + i * 0.8 : null,
  predicted: 60 + Math.sin(i / 3) * 10 + i * 0.9 + (i > 17 ? 4 : 0),
}));

const recs = [
  { icon: Moon, title: "Shift bedtime by 25 minutes", body: "Your recovery score drops 18% on nights you sleep after 11:30pm. Try winding down by 11:05pm.", tag: "Sleep", color: "oklch(0.55 0.18 300)" },
  { icon: Utensils, title: "Add 20g protein to breakfast", body: "Morning workouts on protein-rich days show 12% higher output. We suggest Greek yogurt + almonds.", tag: "Nutrition", color: "oklch(0.78 0.16 75)" },
  { icon: Heart, title: "Add a Zone 2 run on Wednesday", body: "Your weekly cardio mix is heavy on intensity. A 35-min easy run will improve aerobic base.", tag: "Training", color: "oklch(0.62 0.22 25)" },
  { icon: Brain, title: "Try a 10-min mindfulness session", body: "Stress markers peak Tuesdays. A short midday session has worked well for similar profiles.", tag: "Mind", color: "oklch(0.6 0.22 255)" },
];

export default function AIPage() {
  const [msg, setMsg] = useState("");
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
            <Badge className="gradient-bg text-primary-foreground"><TrendingUp className="w-3 h-3 mr-1" />Trending up</Badge>
          </div>
          <div className="h-64">
            <ResponsiveContainer>
              <AreaChart data={prediction}>
                <defs>
                  <linearGradient id="pa" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 250)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0 / 0.95)", border: "1px solid oklch(0.92 0.008 250)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="actual" stroke="oklch(0.6 0.22 255)" strokeWidth={2.5} fill="url(#pa)" />
                <Line type="monotone" dataKey="predicted" stroke="oklch(0.55 0.18 300)" strokeWidth={2.5} strokeDasharray="5 5" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          {recs.map((r) => (
            <Card key={r.title} className="glass border-0 p-5 hover:shadow-[var(--shadow-elegant)] transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `color-mix(in oklab, ${r.color} 15%, transparent)` }}>
                  <r.icon className="w-5 h-5" style={{ color: r.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">{r.tag}</Badge>
                  </div>
                  <h3 className="font-semibold mb-1">{r.title}</h3>
                  <p className="text-sm text-muted-foreground">{r.body}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost">Dismiss</Button>
                    <Button size="sm" className="gradient-bg">Apply</Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Card className="glass-strong border-0 p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />Ask Momentm AI</h3>
          <div className="space-y-3 mb-4">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground text-xs font-semibold flex-shrink-0">AI</div>
              <div className="glass rounded-2xl rounded-tl-sm p-3 text-sm max-w-md">
                Hey — based on your last 7 days, I'd recommend an easy run today. Your HRV is back to baseline.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Ask anything about your training..."
              className="flex-1 glass rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <Button onClick={() => setMsg("")} className="gradient-bg"><Send className="w-4 h-4" /></Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
