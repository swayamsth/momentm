"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePremium } from "@/hooks/usePremium";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CalendarDays, ChevronDown, ChevronUp, Check, X, ArrowRight,
  Dumbbell, BedDouble, Salad, Pencil, Loader2, Sparkles, Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Drill = { name: string; sets?: number; duration_min?: number; rest_min?: number; notes?: string };
type Day = { day: string; is_rest: boolean; session_type: string; duration_min?: number; drills?: Drill[]; note?: string };
type PlanData = { goal_title?: string; summary: string; target_sessions: number; days: Day[]; nutrition: string[] };
type Plan = { id: number; week_number: number; week_start: string; status: string; is_recalibration: boolean; recalibration_note: string; plan_data: PlanData };
type Goal = { id: number; goal_text: string; timeframe_days: number; start_date: string; end_date: string; days_remaining: number };
type PlanResponse = { has_goal: boolean; goal?: Goal; current_plan?: Plan; past_plans?: Plan[]; is_premium?: boolean };
type NutritionLog = { calories: number; protein: number; carbs: number; fats: number; date: string };
type FitnessProfile = { age: number | null; weight_kg: number | null; days_per_week: number };

function computeTDEE(fp: FitnessProfile): number | null {
  if (!fp.weight_kg) return null;
  const bmr = 10 * fp.weight_kg + 6.25 * 170 - 5 * (fp.age ?? 25);
  const mult = fp.days_per_week <= 1 ? 1.2 : fp.days_per_week <= 3 ? 1.375 : fp.days_per_week <= 5 ? 1.55 : 1.725;
  return Math.round(bmr * mult);
}

function computeMacroTargets(weight: number, tdee: number) {
  const protein = Math.round(weight * 1.8);
  const fat = Math.round(tdee * 0.25 / 9);
  const carbs = Math.round((tdee - protein * 4 - fat * 9) / 4);
  return { protein, carbs, fat };
}

export default function PlanPage() {
  const { isPremium: localPremium } = usePremium();
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting_up, setSettingUp] = useState(false);
  const [responding, setResponding] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [showSetup, setShowSetup] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [timeframeValue, setTimeframeValue] = useState("3");
  const [timeframeUnit, setTimeframeUnit] = useState<"weeks" | "months">("months");
  const [nutritionToday, setNutritionToday] = useState<NutritionLog | null>(null);
  const [fitnessProfile, setFitnessProfile] = useState<FitnessProfile | null>(null);
  const [weeklyActivityCount, setWeeklyActivityCount] = useState(0);

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    const t = token();
    const headers = { Authorization: `Bearer ${t}` };
    Promise.all([
      fetch("http://127.0.0.1:8000/api/plan/", { headers }).then(r => r.json()),
      fetch("http://127.0.0.1:8000/api/nutrition/", { headers }).then(r => r.ok ? r.json() : []),
      fetch("http://127.0.0.1:8000/api/fitness-profile/", { headers }).then(r => r.ok ? r.json() : null),
      fetch("http://127.0.0.1:8000/api/activities/", { headers }).then(r => r.ok ? r.json() : []),
    ]).then(([plan, nutrition, fp, activities]) => {
      setData(plan);
      if (!plan.has_goal) setShowSetup(true);
      const today = new Date().toISOString().split("T")[0];
      setNutritionToday(Array.isArray(nutrition) ? nutrition.find((n: NutritionLog) => n.date === today) ?? null : null);
      setFitnessProfile(fp);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      setWeeklyActivityCount(Array.isArray(activities) ? activities.filter((a: { logged_at: string }) => new Date(a.logged_at) >= weekAgo).length : 0);
    }).catch(() => toast.error("Failed to load plan."))
      .finally(() => setLoading(false));
  }, []);

  const handleSetup = async () => {
    if (!goalText.trim()) { toast.error("Please describe your goal."); return; }
    const val = parseInt(timeframeValue);
    if (isNaN(val) || val < 1) { toast.error("Please enter a valid timeframe."); return; }
    const days = timeframeUnit === "months" ? val * 30 : val * 7;
    if (days < 7 || days > 365) { toast.error("Timeframe must be between 1 week and 12 months."); return; }
    setSettingUp(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/plan/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ goal_text: goalText, timeframe_days: days }),
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Failed to create plan."); return; }
      setData(d);
      setShowSetup(false);
      toast.success("Your plan is ready!");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSettingUp(false);
    }
  };

  const handleRespond = async (action: "accept" | "deny") => {
    setResponding(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/plan/respond/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) { toast.error("Failed to respond."); return; }
      const refreshed = await fetch("http://127.0.0.1:8000/api/plan/", {
        headers: { Authorization: `Bearer ${token()}` },
      }).then(r => r.json());
      setData(refreshed);
      toast.success(action === "accept" ? "Plan updated!" : "Kept your previous plan.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setResponding(false);
    }
  };


  const toggleWeek = (id: number) => {
    setExpandedWeeks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) return (
    <AppShell>
      <div className="space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
      </div>
    </AppShell>
  );

  // ── Setup flow ────────────────────────────────────────────────────────────────
  if (showSetup || !data?.has_goal) {
    return (
      <AppShell>
        <div className="max-w-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">Set up your plan</h1>
              <p className="text-sm text-muted-foreground">Tell us your goal — AI builds your week-by-week plan.</p>
            </div>
          </div>

          <Card className="glass-strong border-0 p-6 space-y-5">
            <div>
              <Label className="text-sm font-medium">What's your goal?</Label>
              <Textarea
                className="mt-2 resize-none"
                rows={4}
                placeholder="e.g. I want to learn boxing in 90 days, starting from zero..."
                value={goalText}
                onChange={e => setGoalText(e.target.value)}
                maxLength={500}
              />
              <p className="text-[11px] text-muted-foreground mt-1 text-right">{goalText.length}/500</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Timeframe</Label>
              <div className="flex items-center gap-2 mt-2">
                <Input
                  className="w-24"
                  type="number"
                  min={1}
                  max={12}
                  value={timeframeValue}
                  onChange={e => setTimeframeValue(e.target.value)}
                  placeholder="3"
                />
                <div className="flex rounded-lg border border-border overflow-hidden text-sm">
                  {(["weeks", "months"] as const).map(u => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setTimeframeUnit(u)}
                      className={cn(
                        "px-3 py-2 transition-colors",
                        timeframeUnit === u ? "gradient-bg text-primary-foreground" : "text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ≈ {timeframeUnit === "months" ? parseInt(timeframeValue || "0") * 30 : parseInt(timeframeValue || "0") * 7} days
              </p>
            </div>
            <Button
              className="gradient-bg w-full"
              onClick={handleSetup}
              disabled={setting_up || !goalText.trim()}
            >
              {setting_up ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating your plan...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate my plan</>
              )}
            </Button>
          </Card>
        </div>
      </AppShell>
    );
  }

  const { goal, current_plan, past_plans, is_premium: backendPremium } = data!;
  const is_premium = backendPremium || localPremium;
  const pendingPlan = current_plan?.status === "pending_review" ? current_plan : null;
  const activePlan = current_plan?.status === "active" ? current_plan : null;
  const weeksTotal = goal ? Math.ceil(goal.timeframe_days / 7) : 0;
  const weeksDone = goal ? weeksTotal - Math.ceil(goal.days_remaining / 7) : 0;

  const tdee = fitnessProfile ? computeTDEE(fitnessProfile) : null;
  const macroTargets = fitnessProfile?.weight_kg && tdee ? computeMacroTargets(fitnessProfile.weight_kg, tdee) : null;
  const targetSessions = activePlan?.plan_data?.target_sessions ?? 4;

  return (
    <AppShell>
      <div className="grid lg:grid-cols-[1fr_272px] gap-6 items-start">
      <div className="space-y-6">

        {/* ── Goal header ── */}
        <Card className="glass-strong border-0 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Goal</p>
              <h1 className="text-xl font-semibold leading-snug">
                {current_plan?.plan_data?.goal_title ?? goal?.goal_text}
              </h1>
              {current_plan?.plan_data?.goal_title && (
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{goal?.goal_text}</p>
              )}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" /> {goal?.days_remaining} days remaining
                </span>
                <span className="text-xs text-muted-foreground">
                  Week {weeksDone + 1} of {weeksTotal}
                </span>
              </div>
              {/* Progress bar */}
              <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full gradient-bg rounded-full transition-all"
                  style={{ width: `${Math.min(100, (weeksDone / weeksTotal) * 100)}%` }}
                />
              </div>
            </div>
            <Button
              size="sm" variant="ghost"
              className="shrink-0 h-8 px-2 text-xs"
              onClick={() => { setGoalText(goal?.goal_text ?? ""); setTimeframeValue(String(Math.round((goal?.timeframe_days ?? 90) / 30))); setTimeframeUnit("months"); setShowSetup(true); }}
            >
              <Pencil className="w-3 h-3 mr-1" /> Reset
            </Button>
          </div>
        </Card>

        {/* ── Recalibration banner ── */}
        {pendingPlan && (
          <Card className="border-0 p-5 bg-primary/5">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">Your plan has been recalibrated</p>
                <p className="text-sm text-muted-foreground mt-0.5">{pendingPlan.recalibration_note}</p>
                <PlanCard plan={pendingPlan} />
                <div className="flex gap-2 mt-4">
                  <Button size="sm" className="gradient-bg" onClick={() => handleRespond("accept")} disabled={responding}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Accept changes
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRespond("deny")} disabled={responding}>
                    <X className="w-3.5 h-3.5 mr-1" /> Keep current plan
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* ── This week ── */}
        {activePlan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Week {activePlan.week_number} — Day {(activePlan.week_number - 1) * 7 + 1} to {activePlan.week_number * 7}
              </h2>
            </div>
            <PlanCard plan={activePlan} />
          </div>
        )}

        {/* ── Premium CTA ── */}
        {!is_premium && activePlan && (
          <Card className="glass border-0 overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Unlock weekly auto-recalibration</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Premium members get their plan automatically adjusted every 7 days based on activity, sleep, and nutrition — no manual effort needed.</p>
                </div>
              </div>
              <div className="space-y-1.5">
                {["Plan auto-adjusted every 7 days", "Tracks sleep, activity & nutrition", "Accept or keep your current plan"].map(f => (
                  <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                  </div>
                ))}
              </div>
              <Link href="/payment">
                <Button className="w-full gradient-bg shadow-[var(--shadow-elegant)] hover:opacity-90">
                  Upgrade to Premium <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {/* ── Past weeks ── */}
        {past_plans && past_plans.filter(p => p.id !== activePlan?.id).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Past Weeks</h2>
            {past_plans.filter(p => p.id !== activePlan?.id).map(p => (
              <Card key={p.id} className="glass border-0 overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-accent/30 transition-colors"
                  onClick={() => toggleWeek(p.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">Week {p.week_number}</span>
                    <Badge variant="outline" className="text-xs">{p.status}</Badge>
                    {p.is_recalibration && <Badge className="gradient-bg border-0 text-primary-foreground text-xs">Recalibrated</Badge>}
                  </div>
                  {expandedWeeks.has(p.id) ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </button>
                {expandedWeeks.has(p.id) && (
                  <div className="px-5 pb-5">
                    <PlanCard plan={p} />
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Sidebar ── */}
      <div className="space-y-4 lg:sticky lg:top-6">

        {/* Progress card */}
        <Card className="glass-strong border-0 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Goal Progress</span>
          </div>

          {/* Progress ring */}
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <svg width={72} height={72} className="-rotate-90">
                <circle cx={36} cy={36} r={28} fill="none" stroke="var(--border)" strokeWidth={6} />
                <circle cx={36} cy={36} r={28} fill="none"
                  stroke="oklch(0.6 0.22 255)" strokeWidth={6} strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 28}
                  strokeDashoffset={2 * Math.PI * 28 * (1 - Math.min(1, (weeksDone / weeksTotal)))}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {Math.round((weeksDone / weeksTotal) * 100)}%
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div><span className="font-semibold">{goal?.days_remaining}</span> <span className="text-muted-foreground text-xs">days left</span></div>
              <div><span className="font-semibold">Week {weeksDone + 1}</span> <span className="text-muted-foreground text-xs">of {weeksTotal}</span></div>
            </div>
          </div>

          {/* Sessions this week */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-muted-foreground">Sessions this week</span>
              <span className="font-semibold">{weeklyActivityCount} / {targetSessions}</span>
            </div>
            <Progress value={Math.min(100, (weeklyActivityCount / targetSessions) * 100)} />
          </div>
        </Card>

        {/* Nutrition card */}
        {tdee ? (
          <Card className="glass-strong border-0 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-green-500" />
              <span className="text-sm font-semibold">Today's Nutrition</span>
            </div>

            {nutritionToday ? (
              <>
                {/* Calories */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Calories</span>
                    <span className="font-semibold">{nutritionToday.calories.toLocaleString()} <span className="text-muted-foreground font-normal">/ {tdee.toLocaleString()} kcal</span></span>
                  </div>
                  <Progress value={Math.min(100, (nutritionToday.calories / tdee) * 100)} />
                </div>

                {/* Macros */}
                {macroTargets && (
                  <div className="space-y-2.5">
                    {([
                      { label: "Protein", actual: nutritionToday.protein, target: macroTargets.protein, color: "bg-blue-500" },
                      { label: "Carbs",   actual: nutritionToday.carbs,   target: macroTargets.carbs,   color: "bg-orange-400" },
                      { label: "Fat",     actual: nutritionToday.fats,    target: macroTargets.fat,     color: "bg-yellow-400" },
                    ] as const).map(m => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="font-medium">{m.actual}g <span className="text-muted-foreground font-normal">/ {m.target}g</span></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all", m.color)} style={{ width: `${Math.min(100, (m.actual / m.target) * 100)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-2 space-y-1">
                <p className="text-xs text-muted-foreground">Nothing logged today</p>
                <p className="text-xs text-muted-foreground">Target: <span className="font-medium text-foreground">{tdee.toLocaleString()} kcal</span></p>
                {macroTargets && (
                  <p className="text-xs text-muted-foreground">{macroTargets.protein}g protein · {macroTargets.carbs}g carbs · {macroTargets.fat}g fat</p>
                )}
              </div>
            )}
          </Card>
        ) : (
          <Card className="glass border-0 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Nutrition Targets</span>
            </div>
            <p className="text-xs text-muted-foreground">Set your age and weight in <a href="/settings" className="text-primary hover:underline">settings</a> to see personalised calorie and macro targets.</p>
          </Card>
        )}

      </div>
      </div>
    </AppShell>
  );
}

// ── Plan card component ────────────────────────────────────────────────────────

function PlanCard({ plan }: { plan: Plan }) {
  const { plan_data } = plan;
  return (
    <div className="space-y-3 mt-4">
      {plan_data.summary && (
        <p className="text-sm text-muted-foreground italic">{plan_data.summary}</p>
      )}
      <div className="space-y-2">
        {plan_data.days?.map((day, i) => (
          <DayRow key={i} day={day} />
        ))}
      </div>
      {plan_data.nutrition && plan_data.nutrition.length > 0 && (
        <div className="glass rounded-xl p-4 mt-2">
          <div className="flex items-center gap-2 mb-2">
            <Salad className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium">Nutrition this week</span>
          </div>
          <ul className="space-y-1">
            {plan_data.nutrition.map((n, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="text-green-500 mt-0.5">·</span>{n}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DayRow({ day }: { day: Day }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={cn("rounded-xl overflow-hidden", day.is_rest ? "glass opacity-60" : "glass")}>
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
        onClick={() => !day.is_rest && setOpen(o => !o)}
        disabled={day.is_rest}
      >
        <span className="text-xs text-muted-foreground w-10 shrink-0 font-mono">{day.day}</span>
        {day.is_rest
          ? <BedDouble className="w-4 h-4 text-muted-foreground shrink-0" />
          : <Dumbbell className="w-4 h-4 text-primary shrink-0" />
        }
        <span className="text-sm font-medium flex-1">{day.session_type}</span>
        {!day.is_rest && day.duration_min && (
          <span className="text-xs text-muted-foreground shrink-0">{day.duration_min} min</span>
        )}
        {!day.is_rest && (
          open ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        )}
      </button>
      {open && day.drills && day.drills.length > 0 && (
        <div className="px-4 pb-3 space-y-2 border-t border-border/50">
          {day.drills.map((drill, i) => (
            <div key={i} className="flex items-start gap-2 pt-2">
              <span className="text-xs text-muted-foreground w-4 shrink-0 mt-0.5">{i + 1}.</span>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{drill.name}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {drill.sets && <span className="text-xs text-muted-foreground">{drill.sets} sets</span>}
                  {drill.duration_min && <span className="text-xs text-muted-foreground">· {drill.duration_min} min</span>}
                  {drill.rest_min && <span className="text-xs text-muted-foreground">· {drill.rest_min} min rest</span>}
                </div>
                {drill.notes && <p className="text-xs text-muted-foreground mt-0.5 italic">{drill.notes}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
