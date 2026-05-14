"use client";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Footprints, Flame, Moon, TrendingUp, Sparkles, Plus, Check, X, Award, Settings, LogOut, Clock, Dumbbell, Star,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ── Use env var so it works in Docker (backend:8000) and locally (127.0.0.1:8000)
const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const ACTIVITY_TYPES = [
  "Run", "Swim", "Cycle", "Skipping", "Strength", "Sports", "Walk", "Yoga", "HIIT", "Other"
];

const consistency = [
  { day: "Mon", v: 80 }, { day: "Tue", v: 92 }, { day: "Wed", v: 65 },
  { day: "Thu", v: 88 }, { day: "Fri", v: 95 }, { day: "Sat", v: 72 }, { day: "Sun", v: 90 },
];

interface ActivityLog {
  id: number;
  activity: string;
  duration: number;
  steps: number;
  calories: number;
  logged_at: string;
}

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

// Check if a logged_at string (e.g. "May 04, 19:30") is from today
function isToday(loggedAt: string): boolean {
  const today = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayStr = `${monthNames[today.getMonth()]} ${String(today.getDate()).padStart(2, "0")}`;
  return loggedAt.startsWith(todayStr);
}

// Parse "May 04, 19:30" → a Date object (uses current year)
function parseLoggedAt(loggedAt: string): Date | null {
  try {
    const year = new Date().getFullYear();
    return new Date(`${loggedAt} ${year}`);
  } catch {
    return null;
  }
}

// Calculate streak from activity logs (consecutive days with at least one log)
function calcStreak(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0;

  // Collect unique calendar dates from logs
  const dateStrings = new Set<string>();
  for (const log of logs) {
    const d = parseLoggedAt(log.logged_at);
    if (d) dateStrings.add(d.toDateString());
  }

  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);

  // Walk backwards from today; stop as soon as a day has no activity
  while (dateStrings.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }

  // If today has no log yet, also check starting from yesterday
  if (streak === 0) {
    check.setDate(check.getDate() - 1);
    while (dateStrings.has(check.toDateString())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }

  return streak;
}

// Mirror the backend points formula (calc_session_points in views.py)
function calcSessionPoints(duration: number, steps: number, calories: number): number {
  const base = Math.round(Math.sqrt(duration) * 5);
  const intensity = Math.min(Math.floor(steps / 500), 10) + Math.min(Math.floor(calories / 100), 10);
  return base + intensity;
}

// Calculate total points from all activity logs
// Mirrors the leaderboard logic: first log of day bonus, duplicate activity penalty
function calcTotalPoints(logs: ActivityLog[]): number {
  // Group logs by calendar date
  const byDate: Record<string, ActivityLog[]> = {};
  for (const log of logs) {
    const d = parseLoggedAt(log.logged_at);
    if (!d) continue;
    const key = d.toDateString();
    if (!byDate[key]) byDate[key] = [];
    byDate[key].push(log);
  }

  let total = 0;
  for (const dayLogs of Object.values(byDate)) {
    total += 10; // first log bonus per day
    const seen = new Set<string>();
    for (const log of dayLogs) {
      let pts = calcSessionPoints(log.duration, log.steps, log.calories);
      if (seen.has(log.activity.toLowerCase())) {
        pts = Math.floor(pts * 0.5); // duplicate penalty
      }
      seen.add(log.activity.toLowerCase());
      total += pts;
    }
  }
  return total;
}

// Count activities logged in the last 7 days
function countWeeklyWorkouts(logs: ActivityLog[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  return logs.filter((a) => {
    const d = parseLoggedAt(a.logged_at);
    return d && d >= weekAgo;
  }).length;
}

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; first_name: string; last_name: string; two_factor_enabled?: boolean } | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [trendData, setTrendData] = useState<{ day: string; steps: number; calories: number }[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");

  const [activityName, setActivityName] = useState("Run");
  const [duration, setDuration] = useState(45);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);

  const [adjustments, setAdjustments] = useState([
    { id: 1, metric: "Daily steps", from: "8,000", to: "9,500", reason: "You've exceeded your goal 6 of 7 days." },
    { id: 2, metric: "Sleep window", from: "7h", to: "7h 30m", reason: "Recovery scores trending down on low-sleep days." },
  ]);

  const buildTrend = (data: ActivityLog[]) => {
    const trend = data.slice(0, 14).reverse().map((log, i) => ({
      day: `D${i + 1}`,
      steps: log.steps,
      calories: log.calories,
    }));
    if (trend.length < 14) {
      const padded = Array.from({ length: 14 - trend.length }, (_, i) => ({
        day: `D${i + 1}`,
        steps: 4000 + Math.round(Math.sin(i / 2) * 2000 + Math.random() * 1500),
        calories: 1800 + Math.round(Math.cos(i / 3) * 300 + Math.random() * 200),
      }));
      return [...padded, ...trend].map((d, i) => ({ ...d, day: `D${i + 1}` }));
    }
    return trend;
  };

  const fetchActivities = async (token: string) => {
    try {
      const res = await fetch(`${API}/activities/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: ActivityLog[] = await res.json();
        setActivities(data);
        setTrendData(buildTrend(data));
      }
    } catch {
      console.log("Could not fetch activities");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));
    fetch(`${API}/dashboard/`, {
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
      .catch(() => {});
    fetchActivities(token);
  }, []);

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogLoading(true);
    setLogError("");
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/activities/log/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ activity: activityName, duration, steps, calories }),
      });
      const data = await res.json();
      if (res.ok) {
        const updated = [data, ...activities];
        setActivities(updated);
        setTrendData(buildTrend(updated));
        setDialogOpen(false);
        setActivityName("Run");
        setDuration(45);
        setSteps(0);
        setCalories(0);
      } else {
        setLogError(data.error || "Failed to log activity.");
      }
    } catch {
      setLogError("Cannot connect to server. Please try again.");
    } finally {
      setLogLoading(false);
    }
  };

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch(`${API}/logout/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).catch(() => {});
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

  // Today's cumulative totals (resets at midnight automatically)
  const todayActivities = activities.filter((a) => isToday(a.logged_at));
  const totalStepsToday = todayActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalCaloriesToday = todayActivities.reduce((sum, a) => sum + a.calories, 0);

  // Real calculated values from activity data
  const currentStreak = calcStreak(activities);
  const weeklyWorkouts = countWeeklyWorkouts(activities);
  const totalPoints = calcTotalPoints(activities);

  const displayName = user?.first_name || user?.email?.split("@")[0] || "there";

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
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
                <Button variant="outline" size="sm"><Settings className="w-4 h-4" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => router.push("/settings")}>
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setLogError(""); }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gradient-bg shadow-[var(--shadow-elegant)]">
                  <Plus className="w-4 h-4 mr-1" /> Log activity
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-0">
                <DialogHeader><DialogTitle>Log activity</DialogTitle></DialogHeader>
                {logError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-600">{logError}</p>
                  </div>
                )}
                <form className="space-y-4 pt-2" onSubmit={handleLogActivity}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label>Activity type</Label>
                      <Select value={activityName} onValueChange={setActivityName}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue placeholder="Select activity" />
                        </SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration (min)</Label>
                      <Input
                        type="number"
                        min={1}
                        value={duration || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "") setDuration(parseInt(val, 10) || 1);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") setDuration(1);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Steps</Label>
                      <Input
                        type="number"
                        min={0}
                        value={steps || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "") setSteps(parseInt(val, 10) || 0);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") setSteps(0);
                        }}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Calories burned</Label>
                      <Input
                        type="number"
                        min={0}
                        value={calories || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val !== "") setCalories(parseInt(val, 10) || 0);
                        }}
                        onBlur={(e) => {
                          if (e.target.value === "") setCalories(0);
                        }}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full gradient-bg" disabled={logLoading}>
                    {logLoading ? "Saving..." : "Save activity"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Stat icon={Footprints} label="Steps today" value={totalStepsToday.toLocaleString()} unit="steps" trend={12} color="oklch(0.6 0.22 255)" />
          <Stat icon={Flame} label="Calories burned" value={totalCaloriesToday.toLocaleString()} unit="kcal" trend={8} color="oklch(0.62 0.22 25)" />
          <Stat icon={TrendingUp} label="Streak" value={currentStreak} unit="days" trend={15} color="oklch(0.7 0.16 155)" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Stat icon={Moon} label="Sleep" value="7.4" unit="hrs" trend={5} color="oklch(0.55 0.18 300)" />
          <Stat icon={Star} label="Total points" value={totalPoints.toLocaleString()} unit="pts" trend={10} color="oklch(0.75 0.18 85)" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="glass border-0 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Activity trend</h3>
                <p className="text-xs text-muted-foreground">Last 14 logs · steps & calories</p>
              </div>
              <Badge className="gradient-bg text-primary-foreground">+18% vs prev</Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={trendData}>
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
            <div className="relative h-44">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: "score", value: 84, fill: "oklch(0.6 0.22 255)" }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "oklch(0.94 0.01 140)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-4xl font-semibold tracking-tight tabular-nums">84<span className="text-lg text-muted-foreground font-normal">%</span></div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">Excellent</div>
              </div>
            </div>
            <div className="flex justify-between gap-1 mt-4">
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

        {/* Recent Activities */}
        {activities.length > 0 && (
          <Card className="glass border-0 p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Dumbbell className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">Recent activities</h3>
                <p className="text-xs text-muted-foreground">Your last {Math.min(activities.length, 5)} logged sessions</p>
              </div>
            </div>
            <div className="space-y-3">
              {activities.slice(0, 5).map((log) => (
                <div key={log.id} className="glass rounded-xl p-4 flex flex-wrap items-center gap-4">
                  <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center flex-shrink-0">
                    <Footprints className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="text-sm font-medium">{log.activity}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {log.logged_at}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{log.duration}<span className="text-xs text-muted-foreground ml-0.5">min</span></div>
                      <div className="text-xs text-muted-foreground">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{log.steps.toLocaleString()}<span className="text-xs text-muted-foreground ml-0.5">steps</span></div>
                      <div className="text-xs text-muted-foreground">Steps</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{log.calories}<span className="text-xs text-muted-foreground ml-0.5">kcal</span></div>
                      <div className="text-xs text-muted-foreground">Calories</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* AI Recalibration */}
        <Card className="glass-strong border-0 p-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold flex items-center gap-2">
                  AI-Driven Recalibration <Badge variant="secondary">2 new</Badge>
                </h3>
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

        {/* Goal Progress */}
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { label: "Weekly workouts", value: Math.min(weeklyWorkouts, 5), target: 5, color: "oklch(0.6 0.22 255)" },
            { label: "Mindful minutes", value: 70, target: 100, color: "oklch(0.7 0.16 155)" },
            { label: "Hydration (cups)", value: 6, target: 8, color: "oklch(0.55 0.18 300)" },
          ].map((g) => (
            <Card key={g.label} className="glass border-0 p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-medium">{g.label}</div>
                <Award className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold mb-3">
                {g.value}<span className="text-sm text-muted-foreground">/{g.target}</span>
              </div>
              <Progress value={Math.min((g.value / g.target) * 100, 100)} />
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

export default Dashboard;