"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FitnessProfile = {
  age: number | null;
  weight_kg: number | null;
  fitness_level: "beginner" | "intermediate" | "advanced";
  days_per_week: number;
  time_per_session_min: number;
  equipment: string[];
  dietary_restrictions: string[];
  injuries: string;
};

const EQUIPMENT_OPTIONS = ["No equipment", "Dumbbells", "Barbell", "Resistance bands", "Full gym", "Boxing bag", "Pull-up bar"];
const DIET_OPTIONS = ["None", "Vegan", "Vegetarian", "Gluten free", "Dairy free", "Halal", "Kosher"];
const SESSION_TIMES = [20, 30, 45, 60, 90];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function SettingsPage() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [toggling2FA, setToggling2FA] = useState(false);
  const [fitness, setFitness] = useState<FitnessProfile>({
    age: null,
    weight_kg: null,
    fitness_level: "beginner",
    days_per_week: 4,
    time_per_session_min: 45,
    equipment: [],
    dietary_restrictions: [],
    injuries: "",
  });
  const [savingFitness, setSavingFitness] = useState(false);
  const [fitnessLoaded, setFitnessLoaded] = useState(false);

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/dashboard/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => { if (d.user) setTwoFactorEnabled(d.user.two_factor_enabled); })
      .catch(() => {});

    fetch("http://127.0.0.1:8000/api/fitness-profile/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => { setFitness(d); setFitnessLoaded(true); })
      .catch(() => setFitnessLoaded(true));
  }, []);

  const handleToggle2FA = async () => {
    setToggling2FA(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/toggle-2fa/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(d.two_factor_enabled);
        toast.success(d.message);
      } else {
        toast.error("Failed to update 2FA.");
      }
    } catch {
      toast.error("Cannot connect to server.");
    } finally {
      setToggling2FA(false);
    }
  };

  const toggleItem = (field: "equipment" | "dietary_restrictions", value: string) => {
    setFitness(prev => {
      const current = prev[field];
      return {
        ...prev,
        [field]: current.includes(value) ? current.filter(v => v !== value) : [...current, value],
      };
    });
  };

  const handleSaveFitness = async () => {
    setSavingFitness(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/fitness-profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(fitness),
      });
      if (res.ok) toast.success("Fitness profile saved.");
      else toast.error("Failed to save.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSavingFitness(false);
    }
  };

  return (
    <AppShell>
      <div className="max-w-2xl space-y-8">

        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and fitness profile.</p>
        </div>

        {/* ── Fitness Profile ── */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold">Fitness Profile</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Used to personalise your training plan and nutrition suggestions.</p>
          </div>

          <Card className="glass-strong border-0 p-6 space-y-6">

            {/* Age + Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Age</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={10} max={100}
                  placeholder="25"
                  value={fitness.age ?? ""}
                  onChange={e => setFitness(p => ({ ...p, age: e.target.value ? parseInt(e.target.value) : null }))}
                />
              </div>
              <div>
                <Label className="text-xs">Body weight (kg)</Label>
                <Input
                  className="mt-1.5"
                  type="number"
                  min={30} max={300}
                  step={0.5}
                  placeholder="75"
                  value={fitness.weight_kg ?? ""}
                  onChange={e => setFitness(p => ({ ...p, weight_kg: e.target.value ? parseFloat(e.target.value) : null }))}
                />
              </div>
            </div>

            {/* Fitness level */}
            <div>
              <Label className="text-xs">Fitness level</Label>
              <div className="flex gap-2 mt-1.5">
                {(["beginner", "intermediate", "advanced"] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setFitness(p => ({ ...p, fitness_level: level }))}
                    className={cn(
                      "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize",
                      fitness.fitness_level === level
                        ? "gradient-bg text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Days per week */}
            <div>
              <Label className="text-xs">Days available per week</Label>
              <div className="flex gap-2 mt-1.5">
                {DAYS_OPTIONS.map(d => (
                  <button
                    key={d}
                    onClick={() => setFitness(p => ({ ...p, days_per_week: d }))}
                    className={cn(
                      "w-10 h-10 rounded-xl text-sm font-medium border transition-colors",
                      fitness.days_per_week === d
                        ? "gradient-bg text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Time per session */}
            <div>
              <Label className="text-xs">Time per session</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {SESSION_TIMES.map(t => (
                  <button
                    key={t}
                    onClick={() => setFitness(p => ({ ...p, time_per_session_min: t }))}
                    className={cn(
                      "px-3 h-10 rounded-xl text-sm font-medium border transition-colors",
                      fitness.time_per_session_min === t
                        ? "gradient-bg text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {t} min
                  </button>
                ))}
              </div>
            </div>

            {/* Equipment */}
            <div>
              <Label className="text-xs">Equipment available</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {EQUIPMENT_OPTIONS.map(e => {
                  const selected = fitness.equipment.includes(e);
                  return (
                    <button
                      key={e}
                      onClick={() => toggleItem("equipment", e)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm border transition-colors flex items-center gap-1.5",
                        selected
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {e}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dietary restrictions */}
            <div>
              <Label className="text-xs">Dietary restrictions</Label>
              <div className="flex flex-wrap gap-2 mt-1.5">
                {DIET_OPTIONS.map(d => {
                  const selected = fitness.dietary_restrictions.includes(d);
                  return (
                    <button
                      key={d}
                      onClick={() => toggleItem("dietary_restrictions", d)}
                      className={cn(
                        "px-3 py-1.5 rounded-xl text-sm border transition-colors flex items-center gap-1.5",
                        selected
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "border-border text-muted-foreground hover:bg-accent"
                      )}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Injuries */}
            <div>
              <Label className="text-xs">Injuries or limitations <span className="text-muted-foreground">(optional)</span></Label>
              <Textarea
                className="mt-1.5 resize-none text-sm"
                rows={2}
                placeholder="e.g. bad left knee, shoulder impingement..."
                value={fitness.injuries}
                onChange={e => setFitness(p => ({ ...p, injuries: e.target.value }))}
                maxLength={300}
              />
            </div>

            <Button
              className="gradient-bg w-full"
              onClick={handleSaveFitness}
              disabled={savingFitness || !fitnessLoaded}
            >
              {savingFitness ? "Saving..." : "Save fitness profile"}
            </Button>
          </Card>
        </section>

        {/* ── Account ── */}
        <section className="space-y-4">
          <h2 className="text-base font-semibold">Account</h2>
          <Card className="glass-strong border-0 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Two-factor authentication</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {twoFactorEnabled ? "A code is sent to your email on every login" : "Add an extra layer of security to your account"}
                </p>
              </div>
              <button
                onClick={handleToggle2FA}
                disabled={toggling2FA}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  twoFactorEnabled ? "bg-primary" : "bg-muted-foreground/30"
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                )} />
              </button>
            </div>
          </Card>
        </section>

      </div>
    </AppShell>
  );
}
