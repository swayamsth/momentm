"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays, ChevronDown, ChevronUp, Check, X,
  Dumbbell, BedDouble, Salad, Pencil, Loader2, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Drill = { name: string; sets?: number; duration_min?: number; rest_min?: number; notes?: string };
type Day = { day: string; is_rest: boolean; session_type: string; duration_min?: number; drills?: Drill[]; note?: string };
type PlanData = { summary: string; target_sessions: number; days: Day[]; nutrition: string[] };
type Plan = { id: number; week_number: number; week_start: string; status: string; is_recalibration: boolean; recalibration_note: string; plan_data: PlanData };
type Goal = { id: number; goal_text: string; timeframe_days: number; start_date: string; end_date: string; days_remaining: number };
type PlanResponse = { has_goal: boolean; goal?: Goal; current_plan?: Plan; past_plans?: Plan[]; is_premium?: boolean };

export default function PlanPage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [setting_up, setSettingUp] = useState(false);
  const [responding, setResponding] = useState(false);
  const [recalibrating, setRecalibrating] = useState(false);
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [showSetup, setShowSetup] = useState(false);
  const [goalText, setGoalText] = useState("");
  const [timeframeValue, setTimeframeValue] = useState("3");
  const [timeframeUnit, setTimeframeUnit] = useState<"weeks" | "months">("months");

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/plan/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); if (!d.has_goal) setShowSetup(true); })
      .catch(() => toast.error("Failed to load plan."))
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

  const handleRecalibrate = async () => {
    setRecalibrating(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/plan/recalibrate/", {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (!res.ok) { toast.error(d.error || "Failed to recalibrate."); return; }
      const refreshed = await fetch("http://127.0.0.1:8000/api/plan/", {
        headers: { Authorization: `Bearer ${token()}` },
      }).then(r => r.json());
      setData(refreshed);
      toast.success("Recalibration ready — review your updated plan.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setRecalibrating(false);
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

  const { goal, current_plan, past_plans, is_premium } = data!;
  const pendingPlan = current_plan?.status === "pending_review" ? current_plan : null;
  const activePlan = current_plan?.status === "active" ? current_plan : null;
  const weeksTotal = goal ? Math.ceil(goal.timeframe_days / 7) : 0;
  const weeksDone = goal ? weeksTotal - Math.ceil(goal.days_remaining / 7) : 0;

  return (
    <AppShell>
      <div className="max-w-2xl space-y-6">

        {/* ── Goal header ── */}
        <Card className="glass-strong border-0 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Active Goal</p>
              <h1 className="text-xl font-semibold leading-snug">{goal?.goal_text}</h1>
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
              {is_premium && !pendingPlan && (
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={handleRecalibrate} disabled={recalibrating}>
                  {recalibrating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
                  Recalibrate
                </Button>
              )}
            </div>
            <PlanCard plan={activePlan} />
          </div>
        )}

        {/* ── Premium upsell for recalibration ── */}
        {!is_premium && activePlan && (
          <Card className="glass border-0 p-4 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-sm font-medium">Weekly recalibration is a Premium feature</p>
              <p className="text-xs text-muted-foreground mt-0.5">Upgrade to get your plan auto-adjusted every week based on your activity.</p>
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
