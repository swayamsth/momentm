"use client";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Footprints, Flame, Moon, TrendingUp, Plus, Clock, Dumbbell, Salad, ArrowRight, Utensils,
} from "lucide-react";
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid,
  RadialBarChart, RadialBar, PolarAngleAxis,
} from "recharts";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api";

const ACTIVITY_TYPES = ["Run", "Swim", "Cycle", "Strength", "Skipping"];
const WEEKLY_GOAL = 5;

const ACTIVITY_METRICS: Record<string, { label: string; placeholder: string; unit: string }> = {
  Run:      { label: "Steps",       placeholder: "e.g. 8000",  unit: "steps" },
  Swim:     { label: "Laps",        placeholder: "e.g. 20",    unit: "laps"  },
  Cycle:    { label: "Distance",    placeholder: "e.g. 15",    unit: "km"    },
  Strength: { label: "Sets",        placeholder: "e.g. 12",    unit: "sets"  },
  Skipping: { label: "Jump count",  placeholder: "e.g. 500",   unit: "jumps" },
};

interface ActivityLog {
  id: number;
  activity: string;
  duration: number;
  steps: number;
  calories: number;
  logged_at: string;
  is_verified?: boolean;
  verification_status?: string;
}

interface SleepLog {
  id: number;
  hours: number;
  date: string;
}

interface NutritionLog {
  id: number;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  date: string;
}


function Stat({ icon: Icon, label, value, unit, onClick }: any) {
  return (
    <Card className={cn("glass border-0 p-5 group", onClick && "cursor-pointer hover:bg-accent/40 transition-colors")} onClick={onClick}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs text-muted-foreground uppercase tracking-widest">{label}</div>
        {Icon && <Icon className="w-4 h-4 text-muted-foreground/50" />}
      </div>
      <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}<span className="text-base font-normal text-muted-foreground ml-1.5">{unit}</span></div>
      {onClick && <div className="text-[11px] text-muted-foreground/60 mt-2 group-hover:text-primary transition-colors">Tap to log →</div>}
    </Card>
  );
}

function isToday(loggedAt: string): boolean {
  const today = new Date();
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const todayStr = `${monthNames[today.getMonth()]} ${String(today.getDate()).padStart(2, "0")}`;
  return loggedAt.startsWith(todayStr);
}

function parseLoggedAt(loggedAt: string): Date | null {
  try {
    const year = new Date().getFullYear();
    return new Date(`${loggedAt} ${year}`);
  } catch {
    return null;
  }
}

function calcStreak(logs: ActivityLog[]): number {
  if (logs.length === 0) return 0;
  const dateStrings = new Set<string>();
  for (const log of logs) {
    const d = parseLoggedAt(log.logged_at);
    if (d) dateStrings.add(d.toDateString());
  }
  let streak = 0;
  const check = new Date();
  check.setHours(0, 0, 0, 0);
  while (dateStrings.has(check.toDateString())) {
    streak++;
    check.setDate(check.getDate() - 1);
  }
  if (streak === 0) {
    check.setDate(check.getDate() - 1);
    while (dateStrings.has(check.toDateString())) {
      streak++;
      check.setDate(check.getDate() - 1);
    }
  }
  return streak;
}

function countWeeklyWorkouts(logs: ActivityLog[]): number {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  return logs.filter((a) => {
    const d = parseLoggedAt(a.logged_at);
    return d && d >= weekAgo;
  }).length;
}

function calcConsistencyScore(weeklyWorkouts: number): number {
  return Math.min(Math.round((weeklyWorkouts / WEEKLY_GOAL) * 100), 100);
}

function getConsistencyLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 70) return "Great";
  if (score >= 50) return "Good";
  if (score >= 30) return "Fair";
  return "Keep going";
}

function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; first_name: string; last_name: string; two_factor_enabled?: boolean } | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [trendData, setTrendData] = useState<{ day: string; steps: number; calories: number }[]>([]);
  const [sleepLogs, setSleepLogs] = useState<SleepLog[]>([]);
  const [nutritionLogs, setNutritionLogs] = useState<NutritionLog[]>([]);

  // Activity log dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState("");
  const [activityName, setActivityName] = useState("Run");
  const [duration, setDuration] = useState(45);
  const [steps, setSteps] = useState(0);
  const [calories, setCalories] = useState(0);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [verificationResult, setVerificationResult] = useState<{ status: string; reason: string } | null>(null);

  // Sleep dialog
  const [sleepDialogOpen, setSleepDialogOpen] = useState(false);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [sleepLoading, setSleepLoading] = useState(false);

  // Nutrition dialog
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [nutritionMeal, setNutritionMeal] = useState("");
  const [nutritionProtein, setNutritionProtein] = useState(0);
  const [nutritionCarbs, setNutritionCarbs] = useState(0);
  const [nutritionFats, setNutritionFats] = useState(0);
  const [nutritionLoading, setNutritionLoading] = useState(false);

  // Auto-calculate calories from macros
  const nutritionCalories = nutritionProtein * 4 + nutritionCarbs * 4 + nutritionFats * 9;

  const [weeklyGoal, setWeeklyGoal] = useState(4);
  const [hasPendingRecalibration, setHasPendingRecalibration] = useState(false);

  const buildTrend = (data: ActivityLog[]) => {
    if (data.length === 0) return [];
    return data.slice(0, 14).reverse().map((log, i) => ({
      day: `D${i + 1}`,
      steps: log.steps,
      calories: log.calories,
    }));
  };

  const fetchAll = async (token: string) => {
    try {
      const [actRes, sleepRes, nutritionRes, planRes] = await Promise.all([
        fetch(`${API}/activities/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/sleep/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/nutrition/`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API}/plan/`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (actRes.ok) {
        const data: ActivityLog[] = await actRes.json();
        setActivities(data);
        setTrendData(buildTrend(data));
      }
      if (sleepRes.ok) setSleepLogs(await sleepRes.json());
      if (nutritionRes.ok) setNutritionLogs(await nutritionRes.json());
      if (planRes.ok) {
        const data = await planRes.json();
        const target = data.current_plan?.plan_data?.target_sessions;
        if (target) setWeeklyGoal(target);
        setHasPendingRecalibration(data.current_plan?.status === 'pending_review');
      }
    } catch {
      console.log("Could not fetch data");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));
    fetch(`${API}/dashboard/`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          const updatedUser = { ...JSON.parse(stored), two_factor_enabled: data.user.two_factor_enabled };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setUser(updatedUser);
        }
      }).catch(() => {});
    fetchAll(token);
  }, []);

  const handleLogActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogLoading(true);
    setLogError("");
    setVerificationResult(null);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    if (!screenshot) { setLogError("Please upload a screenshot of your fitness app."); setLogLoading(false); return; }
    try {
      const formData = new FormData();
      formData.append("activity", activityName);
      formData.append("duration", String(duration));
      formData.append("steps", String(steps));
      formData.append("calories", String(calories));
      formData.append("screenshot", screenshot);
      const res = await fetch(`${API}/activities/log/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        const updated = [data, ...activities];
        setActivities(updated);
        setTrendData(buildTrend(updated));
        setVerificationResult({ status: data.verification_status, reason: data.verification_reason });
        if (data.verification_status === "verified") {
          setTimeout(() => { setDialogOpen(false); setVerificationResult(null); }, 2000);
        }
        setActivityName("Run"); setDuration(45); setSteps(0); setCalories(0); setScreenshot(null);
      } else {
        setLogError(data.error || "Failed to log activity.");
      }
    } catch {
      setLogError("Cannot connect to server. Please try again.");
    } finally {
      setLogLoading(false);
    }
  };

  const handleLogSleep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSleepLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API}/sleep/log/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ hours: sleepHours, date: today }),
      });
      if (res.ok) {
        const data = await res.json();
        setSleepLogs([data, ...sleepLogs.filter(s => s.date !== today)]);
        setSleepDialogOpen(false);
      }
    } catch { console.log("Sleep log failed"); }
    finally { setSleepLoading(false); }
  };

  const handleLogNutrition = async (e: React.FormEvent) => {
    e.preventDefault();
    setNutritionLoading(true);
    const token = localStorage.getItem("access_token");
    if (!token) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API}/nutrition/log/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ calories: nutritionCalories, protein: nutritionProtein, carbs: nutritionCarbs, fats: nutritionFats, date: today }),
      });
      if (res.ok) {
        const data = await res.json();
        setNutritionLogs([data, ...nutritionLogs.filter(n => n.date !== today)]);
        setNutritionDialogOpen(false);
        setNutritionMeal("");
        setNutritionProtein(0);
        setNutritionCarbs(0);
        setNutritionFats(0);
      }
    } catch { console.log("Nutrition log failed"); }
    finally { setNutritionLoading(false); }
  };


  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const todayActivities = activities.filter((a) => isToday(a.logged_at));
  const totalStepsToday = todayActivities.reduce((sum, a) => sum + a.steps, 0);
  const totalCaloriesToday = todayActivities.reduce((sum, a) => sum + a.calories, 0);
  const currentStreak = calcStreak(activities);
  const weeklyWorkouts = countWeeklyWorkouts(activities);
  const consistencyScore = calcConsistencyScore(weeklyWorkouts);
  const consistencyLabel = getConsistencyLabel(consistencyScore);

  const todayStr = new Date().toISOString().split("T")[0];
  const todaySleep = sleepLogs.find(s => s.date === todayStr);
  const todayNutrition = nutritionLogs.find(n => n.date === todayStr);

  const displayName = user?.first_name || user?.email?.split("@")[0] || "there";

  if (!user) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-sm text-muted-foreground">Welcome back</div>
            <h1 className="text-3xl font-semibold tracking-tight">{getGreeting()}, {displayName} 👋</h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Log Activity */}
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setLogError(""); setScreenshot(null); setVerificationResult(null); }}>
              <DialogTrigger asChild>
                <Button size="lg" className="gradient-bg shadow-[var(--shadow-elegant)]">
                  <Plus className="w-4 h-4 mr-1" /> Log activity
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-strong border-0 max-h-[90vh] overflow-y-auto">
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
                        <SelectTrigger className="w-full mt-1"><SelectValue placeholder="Select activity" /></SelectTrigger>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Duration (min)</Label>
                      <Input type="number" min={1} value={duration || ""} onChange={(e) => { if (e.target.value !== "") setDuration(parseInt(e.target.value, 10) || 1); }} onBlur={(e) => { if (e.target.value === "") setDuration(1); }} required />
                    </div>
                    <div>
                      <Label>{ACTIVITY_METRICS[activityName]?.label ?? "Steps"}</Label>
                      <Input
                        type="number"
                        min={0}
                        placeholder={ACTIVITY_METRICS[activityName]?.placeholder ?? "0"}
                        value={steps || ""}
                        onChange={(e) => { if (e.target.value !== "") setSteps(parseInt(e.target.value, 10) || 0); }}
                        onBlur={(e) => { if (e.target.value === "") setSteps(0); }}
                      />
                      <p className="text-xs text-muted-foreground mt-1">{ACTIVITY_METRICS[activityName]?.unit}</p>
                    </div>
                    <div className="col-span-2">
                      <Label>Calories burned</Label>
                      <Input type="number" min={0} value={calories || ""} onChange={(e) => { if (e.target.value !== "") setCalories(parseInt(e.target.value, 10) || 0); }} onBlur={(e) => { if (e.target.value === "") setCalories(0); }} />
                    </div>
                    <div className="col-span-2">
                      <Label>Fitness app screenshot <span className="text-red-500">*</span></Label>
                      <p className="text-xs text-muted-foreground mb-1">A screenshot from any fitness app showing your workout data</p>
                      <Input type="file" accept="image/*" required onChange={(e) => setScreenshot(e.target.files?.[0] || null)} className="cursor-pointer" />
                      {screenshot && <p className="text-xs text-green-600 mt-1">✓ {screenshot.name}</p>}
                    </div>
                  </div>
                  {verificationResult && (
                    <div className={`p-3 rounded-lg ${verificationResult.status === "verified" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                      <p className={`text-sm font-medium ${verificationResult.status === "verified" ? "text-green-700" : "text-red-700"}`}>
                        {verificationResult.status === "verified" ? "✓ Verified!" : "✗ Not verified"}
                      </p>
                      <p className={`text-xs mt-0.5 ${verificationResult.status === "verified" ? "text-green-600" : "text-red-600"}`}>{verificationResult.reason}</p>
                    </div>
                  )}
                  <Button type="submit" className="w-full gradient-bg" disabled={logLoading}>
                    {logLoading ? "Verifying photos & saving..." : "Save activity"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Recalibration banner */}
        {hasPendingRecalibration && (
          <div
            onClick={() => router.push('/plan')}
            className="cursor-pointer rounded-2xl px-5 py-4 flex items-center justify-between gap-4 gradient-bg text-primary-foreground hover:opacity-90 transition-opacity shadow-[var(--shadow-elegant)]"
          >
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-background animate-pulse shrink-0" />
              <div>
                <p className="text-sm font-bold tracking-tight">Your plan has a new update</p>
                <p className="text-xs opacity-60 mt-0.5">Tap to review and accept or keep your current plan.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 opacity-70" />
          </div>
        )}

        {/* Stats row 1 — activity stats + weekly workouts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon={Footprints} label="Steps today" value={totalStepsToday.toLocaleString()} unit="steps" />
          <Stat icon={Flame} label="Calories burned" value={totalCaloriesToday.toLocaleString()} unit="kcal" />
          <Stat icon={TrendingUp} label="Streak" value={currentStreak} unit="days" />
          <Stat icon={Dumbbell} label="Workouts this week" value={Math.min(weeklyWorkouts, weeklyGoal)} unit={`/ ${weeklyGoal}`} />
        </div>

        {/* Stats row 2 — sleep + nutrition (clickable to log) */}
        <div className="grid grid-cols-2 gap-3">
          <Stat icon={Moon} label="Sleep last night" value={todaySleep ? todaySleep.hours : "—"} unit="hrs" onClick={() => setSleepDialogOpen(true)} />
          <Stat icon={Utensils} label="Nutrition today" value={todayNutrition ? todayNutrition.calories.toLocaleString() : "—"} unit="kcal" onClick={() => setNutritionDialogOpen(true)} />
        </div>

        {/* Sleep log dialog */}
        <Dialog open={sleepDialogOpen} onOpenChange={setSleepDialogOpen}>
          <DialogContent className="glass-strong border-0">
            <DialogHeader><DialogTitle>Log sleep</DialogTitle></DialogHeader>
            <form className="space-y-4 pt-2" onSubmit={handleLogSleep}>
              <div>
                <Label>Hours slept last night</Label>
                <Input type="number" min={0} max={24} step={0.5} value={sleepHours} onChange={(e) => setSleepHours(parseFloat(e.target.value) || 0)} required />
              </div>
              <Button type="submit" className="w-full gradient-bg" disabled={sleepLoading}>
                {sleepLoading ? "Saving..." : "Save sleep"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Nutrition log dialog */}
        <Dialog open={nutritionDialogOpen} onOpenChange={setNutritionDialogOpen}>
          <DialogContent className="glass-strong border-0">
            <DialogHeader><DialogTitle>Log nutrition</DialogTitle></DialogHeader>
            <form className="space-y-4 pt-2" onSubmit={handleLogNutrition}>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Meal name</Label>
                  <Input type="text" placeholder="e.g. Breakfast, Chicken salad..." value={nutritionMeal} onChange={(e) => setNutritionMeal(e.target.value)} required />
                </div>
                <div>
                  <Label>Protein (g)</Label>
                  <Input type="number" min={0} value={nutritionProtein || ""} onChange={(e) => setNutritionProtein(parseInt(e.target.value) || 0)} onBlur={(e) => { if (e.target.value === "") setNutritionProtein(0); }} />
                </div>
                <div>
                  <Label>Carbs (g)</Label>
                  <Input type="number" min={0} value={nutritionCarbs || ""} onChange={(e) => setNutritionCarbs(parseInt(e.target.value) || 0)} onBlur={(e) => { if (e.target.value === "") setNutritionCarbs(0); }} />
                </div>
                <div className="col-span-2">
                  <Label>Fats (g)</Label>
                  <Input type="number" min={0} value={nutritionFats || ""} onChange={(e) => setNutritionFats(parseInt(e.target.value) || 0)} onBlur={(e) => { if (e.target.value === "") setNutritionFats(0); }} />
                </div>
                <div className="col-span-2 p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Estimated calories</div>
                  <div className="text-2xl font-semibold">{nutritionCalories.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">kcal</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Protein×4 + Carbs×4 + Fats×9</div>
                </div>
              </div>
              <Button type="submit" className="w-full gradient-bg" disabled={nutritionLoading}>
                {nutritionLoading ? "Saving..." : "Save nutrition"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="glass border-0 p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Activity trend</h3>
                <p className="text-xs text-muted-foreground">Your last {trendData.length} logged sessions · steps & calories</p>
              </div>
            </div>
            <div className="h-72">
              {trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No activity logged yet</div>
              ) : (
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
              )}
            </div>
          </Card>

          <Card className="glass border-0 p-6">
            <h3 className="font-semibold mb-1">Consistency score</h3>
            <p className="text-xs text-muted-foreground mb-4">Based on weekly workout goal ({WEEKLY_GOAL} sessions)</p>
            <div className="relative h-44">
              <ResponsiveContainer>
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={[{ name: "score", value: consistencyScore, fill: "oklch(0.6 0.22 255)" }]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="value" cornerRadius={20} background={{ fill: "oklch(0.94 0.01 140)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="text-4xl font-semibold tracking-tight tabular-nums">{consistencyScore}<span className="text-lg text-muted-foreground font-normal">%</span></div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mt-1">{consistencyLabel}</div>
              </div>
            </div>
            <div className="mt-4">
              <Progress value={consistencyScore} />
              <p className="text-xs text-muted-foreground mt-2 text-center">{weeklyWorkouts} of {WEEKLY_GOAL} workouts completed this week</p>
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
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium">{log.activity}</div>
                      {log.verification_status === "verified" && (
                        <Badge className="text-[10px] bg-green-100 text-green-700 border-0">✓ Verified</Badge>
                      )}
                      {log.verification_status === "rejected" && (
                        <Badge className="text-[10px] bg-red-100 text-red-700 border-0">✗ Unverified</Badge>
                      )}
                    </div>
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
                      <div className="font-semibold">{log.steps.toLocaleString()}<span className="text-xs text-muted-foreground ml-0.5">{ACTIVITY_METRICS[log.activity]?.unit ?? "steps"}</span></div>
                      <div className="text-xs text-muted-foreground">{ACTIVITY_METRICS[log.activity]?.label ?? "Steps"}</div>
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

      </div>
    </AppShell>
  );
}

export default Dashboard;