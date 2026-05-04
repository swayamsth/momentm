"use client";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Footprints, Flame, Moon, TrendingUp, Sparkles, Plus, Check, X, Award, Settings, LogOut
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { useState, useEffect } from "react";

const trend = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  steps: 4000 + Math.round(Math.sin(i / 2) * 2000 + Math.random() * 1500 + i * 200),
  calories: 1800 + Math.round(Math.cos(i / 3) * 300 + Math.random() * 200),
}));

const consistency = [
  { day: "Mon", v: 80 }, { day: "Tue", v: 92 }, { day: "Wed", v: 65 },
  { day: "Thu", v: 88 }, { day: "Fri", v: 95 }, { day: "Sat", v: 72 }, { day: "Sun", v: 90 },
];

function Stat({ icon: Icon, label, value, unit, trend, color }: any) {
  return (
    <Card className="glass border-0 p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `color-mix(in oklab, ${color} 15%, transparent)` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <Badge variant="secondary" className="text-xs">+{trend}%</Badge>
      </div>
      <div className="text-2xl font-semibold tracking-tight">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </Card>
  );
}

export default function DashboardPage() {
  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; first_name: string; last_name: string; two_factor_enabled?: boolean } | null>(null);

  const [adjustments, setAdjustments] = useState([
    { id: 1, metric: "Daily steps", from: "8,000", to: "9,500", reason: "You've exceeded your goal 6 of 7 days." },
    { id: 2, metric: "Sleep window", from: "7h", to: "7h 30m", reason: "Recovery scores trending down on low-sleep days." },
  ]);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");

    if (!token || !stored) {
      router.push("/");
      return;
    }

    setUser(JSON.parse(stored));

    fetch("http://127.0.0.1:8000/api/dashboard/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          const updatedUser = { ...JSON.parse(stored), two_factor_enabled: data.user.two_factor_enabled };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      })
      .catch(() => console.log("Could not fetch user data"));
  }, []);

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch("http://127.0.0.1:8000/api/logout/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).catch(() => console.log("Logout error"));
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const displayName = user?.first_name || user?.email?.split("@")[0] || "there";

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-sm text-muted-foreground">Welcome back</div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {getGreeting()}, {displayName} 👋
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-500 focus:text-red-500"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="lg" className="gradient-bg shadow-[var(--shadow-elegant)]">
                <Plus className="w-4 h-4 mr-1" /> Log activity
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-0">
              <DialogHeader><DialogTitle>Log activity</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Activity</Label><Input defaultValue="Run" /></div>
                  <div><Label>Duration (min)</Label><Input type="number" defaultValue={45} /></div>
                  <div><Label>Steps</Label><Input type="number" defaultValue={8200} /></div>
                  <div><Label>Calories</Label><Input type="number" defaultValue={420} /></div>
                </div>
                <Button className="w-full gradient-bg">Save activity</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Footprints} label="Steps today" value="8,243" unit="steps" trend={12} color="oklch(0.6 0.22 255)" />
        <Stat icon={Flame} label="Calories burned" value="2,140" unit="kcal" trend={8} color="oklch(0.62 0.22 25)" />
        <Stat icon={Moon} label="Sleep" value="7.4" unit="hrs" trend={5} color="oklch(0.55 0.18 300)" />
        <Stat icon={TrendingUp} label="Streak" value="23" unit="days" trend={15} color="oklch(0.7 0.16 155)" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="glass border-0 p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold">Activity trend</h3>
              <p className="text-xs text-muted-foreground">Last 14 days · steps & calories</p>
            </div>
            <Badge className="gradient-bg text-primary-foreground">+18% vs prev</Badge>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.6 0.22 255)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.62 0.22 25)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.62 0.22 25)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 250)" vertical={false} />
                <XAxis dataKey="day" stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="oklch(0.5 0.02 260)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "oklch(1 0 0 / 0.95)", border: "1px solid oklch(0.92 0.008 250)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="steps" stroke="oklch(0.6 0.22 255)" strokeWidth={2.5} fill="url(#g1)" />
                <Area type="monotone" dataKey="calories" stroke="oklch(0.62 0.22 25)" strokeWidth={2.5} fill="url(#g2)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="glass border-0 p-6">
          <h3 className="font-semibold mb-1">Consistency score</h3>
          <p className="text-xs text-muted-foreground mb-4">This week</p>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer>
              <RadialBarChart innerRadius="60%" outerRadius="100%" data={[{ name: "score", value: 84, fill: "oklch(0.6 0.22 255)" }]} startAngle={90} endAngle={-270}>
                <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "oklch(0.94 0.01 250)" }} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center -mt-32 mb-12">
            <div className="text-4xl font-semibold">84<span className="text-lg text-muted-foreground">%</span></div>
            <div className="text-xs text-muted-foreground">Excellent</div>
          </div>
          <div className="flex justify-between gap-1">
            {consistency.map((c) => (
              <div key={c.day} className="flex-1 text-center">
                <div className="h-12 bg-muted rounded relative overflow-hidden">
                  <div className="absolute bottom-0 inset-x-0 gradient-bg rounded" style={{ height: `${c.v}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">{c.day[0]}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="glass-strong border-0 p-6">
        <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">AI-Driven Recalibration <Badge variant="secondary">2 new</Badge></h3>
              <p className="text-xs text-muted-foreground">Momentm AI suggests these adjustments based on your last 7 days.</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {adjustments.map((a) => (
            <div key={a.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-medium">{a.metric}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{a.reason}</div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground line-through">{a.from}</span>
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold gradient-text">{a.to}</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={() => setAdjustments(adjustments.filter((x) => x.id !== a.id))}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" className="gradient-bg" onClick={() => setAdjustments(adjustments.filter((x) => x.id !== a.id))}>
                  <Check className="w-4 h-4 mr-1" /> Approve
                </Button>
              </div>
            </div>
          ))}
          {adjustments.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">All caught up ✨</div>
          )}
        </div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { label: "Weekly workouts", value: 4, target: 5, color: "oklch(0.6 0.22 255)" },
          { label: "Mindful minutes", value: 70, target: 100, color: "oklch(0.7 0.16 155)" },
          { label: "Hydration (cups)", value: 6, target: 8, color: "oklch(0.55 0.18 300)" },
        ].map((g) => (
          <Card key={g.label} className="glass border-0 p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">{g.label}</div>
              <Award className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-semibold mb-3">{g.value}<span className="text-sm text-muted-foreground">/{g.target}</span></div>
            <Progress value={(g.value / g.target) * 100} />
          </Card>
        ))}
      </div>
    </div>
  );
}
