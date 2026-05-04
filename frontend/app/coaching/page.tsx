"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Check, Star, Calendar, MessageSquare, Sparkles } from "lucide-react";

const tiers = [
  {
    name: "Free", price: "$0", desc: "Get started with the essentials.",
    features: ["Basic activity tracking", "Join up to 3 Loops", "Weekly AI insights", "Community feed"],
  },
  {
    name: "Premium", price: "$12", featured: true, desc: "Unlock the full Momentm experience.",
    features: ["Everything in Free", "Unlimited Loops & Challenges", "Daily AI recalibration", "Predictive performance graphs", "Priority badges & rewards", "1 free coaching session / mo"],
  },
  {
    name: "Pro", price: "$29", desc: "For serious athletes & teams.",
    features: ["Everything in Premium", "1-on-1 coach matching", "Custom training plans", "Advanced analytics export", "Team Loops"],
  },
];

const coaches = [
  { name: "Dr. Lena Park", focus: "Endurance & Recovery", rating: 4.9, sessions: 320, price: 65, color: "oklch(0.6 0.22 255)" },
  { name: "Marcus Cole", focus: "Strength & Hypertrophy", rating: 4.8, sessions: 410, price: 70, color: "oklch(0.62 0.22 25)" },
  { name: "Aria Tanaka", focus: "Mindfulness & Sleep", rating: 5.0, sessions: 198, price: 55, color: "oklch(0.55 0.18 300)" },
  { name: "Diego Ruiz", focus: "Nutrition Coaching", rating: 4.7, sessions: 256, price: 60, color: "oklch(0.7 0.16 155)" },
];

export default function CoachingPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Coaching & Plans</h1>
          <p className="text-sm text-muted-foreground">Upgrade your journey or work 1-on-1 with a pro.</p>
        </div>

        <Tabs defaultValue="pricing">
          <TabsList className="glass">
            <TabsTrigger value="pricing">Pricing</TabsTrigger>
            <TabsTrigger value="coaches">Find a Coach</TabsTrigger>
          </TabsList>

          <TabsContent value="pricing" className="mt-6">
            <div className="grid md:grid-cols-3 gap-4">
              {tiers.map((t) => (
                <Card key={t.name} className={`border-0 p-6 relative ${t.featured ? "glass-strong ring-2 ring-primary shadow-[var(--shadow-elegant)]" : "glass"}`}>
                  {t.featured && (
                    <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 gradient-bg text-primary-foreground">
                      <Sparkles className="w-3 h-3 mr-1" />Most popular
                    </Badge>
                  )}
                  <h3 className="font-semibold text-lg">{t.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                  <div className="mt-4 mb-6">
                    <span className="text-4xl font-semibold">{t.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                  </div>
                  <Button className={`w-full mb-6 ${t.featured ? "gradient-bg" : ""}`} variant={t.featured ? "default" : "outline"}>
                    {t.name === "Free" ? "Current plan" : "Upgrade"}
                  </Button>
                  <ul className="space-y-2.5">
                    {t.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="coaches" className="mt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {coaches.map((c) => (
                <Card key={c.name} className="glass border-0 p-5">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-semibold flex-shrink-0 text-primary-foreground" style={{ background: `linear-gradient(135deg, ${c.color}, oklch(0.7 0.18 250))` }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{c.name}</h3>
                          <Badge variant="secondary" className="mt-1 text-xs">{c.focus}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${c.price}</div>
                          <div className="text-xs text-muted-foreground">/session</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{c.rating}</span>
                        <span>·</span>
                        <span>{c.sessions} sessions</span>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="outline" className="flex-1"><MessageSquare className="w-3.5 h-3.5 mr-1" />Message</Button>
                        <Button size="sm" className="gradient-bg flex-1"><Calendar className="w-3.5 h-3.5 mr-1" />Book</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
