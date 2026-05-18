"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const EQUIPMENT_OPTIONS = ["No equipment", "Dumbbells", "Barbell", "Resistance bands", "Full gym", "Boxing bag", "Pull-up bar"];
const DIET_OPTIONS = ["None", "Vegan", "Vegetarian", "Gluten free", "Dairy free", "Halal", "Kosher"];
const SESSION_TIMES = [20, 30, 45, 60, 90];
const DAYS_OPTIONS = [2, 3, 4, 5, 6];

export default function OnboardingPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  const [age, setAge] = useState<number | null>(null);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [fitnessLevel, setFitnessLevel] = useState<"beginner" | "intermediate" | "advanced">("beginner");
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [timePerSession, setTimePerSession] = useState(45);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [dietaryRestrictions, setDietaryRestrictions] = useState<string[]>([]);
  const [injuries, setInjuries] = useState("");

  const token = () => localStorage.getItem("access_token") ?? "";

  const toggleItem = (field: "equipment" | "diet", value: string) => {
    if (field === "equipment") {
      setEquipment(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    } else {
      setDietaryRestrictions(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch("http://127.0.0.1:8000/api/fitness-profile/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          age, weight_kg: weightKg, fitness_level: fitnessLevel,
          days_per_week: daysPerWeek, time_per_session_min: timePerSession,
          equipment, dietary_restrictions: dietaryRestrictions, injuries,
        }),
      });
    } catch {}
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl gradient-bg" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.65 0.2 300)" }} />

      <div className="relative glass-strong rounded-3xl p-8 lg:p-10 w-full max-w-lg">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">Momentm</span>
        </div>

        <h2 className="text-2xl font-semibold mb-1">Set up your fitness profile</h2>
        <p className="text-sm text-muted-foreground mb-6">This helps the AI build a plan that actually fits you. You can update it anytime in settings.</p>

        <div className="space-y-5">

          {/* Age + Weight */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Age</Label>
              <Input className="mt-1.5" type="number" min={10} max={100} placeholder="25"
                value={age ?? ""}
                onChange={e => setAge(e.target.value ? parseInt(e.target.value) : null)} />
            </div>
            <div>
              <Label className="text-xs">Body weight (kg)</Label>
              <Input className="mt-1.5" type="number" min={30} max={300} step={0.5} placeholder="75"
                value={weightKg ?? ""}
                onChange={e => setWeightKg(e.target.value ? parseFloat(e.target.value) : null)} />
            </div>
          </div>

          {/* Fitness level */}
          <div>
            <Label className="text-xs">Fitness level</Label>
            <div className="flex gap-2 mt-1.5">
              {(["beginner", "intermediate", "advanced"] as const).map(level => (
                <button key={level} onClick={() => setFitnessLevel(level)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize",
                    fitnessLevel === level
                      ? "gradient-bg text-primary-foreground border-transparent"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}>
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
                <button key={d} onClick={() => setDaysPerWeek(d)}
                  className={cn(
                    "w-10 h-10 rounded-xl text-sm font-medium border transition-colors",
                    daysPerWeek === d
                      ? "gradient-bg text-primary-foreground border-transparent"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}>
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
                <button key={t} onClick={() => setTimePerSession(t)}
                  className={cn(
                    "px-3 h-10 rounded-xl text-sm font-medium border transition-colors",
                    timePerSession === t
                      ? "gradient-bg text-primary-foreground border-transparent"
                      : "border-border text-muted-foreground hover:bg-accent"
                  )}>
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
                const selected = equipment.includes(e);
                return (
                  <button key={e} onClick={() => toggleItem("equipment", e)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm border transition-colors flex items-center gap-1.5",
                      selected
                        ? "gradient-bg text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}>
                    {selected && <Check className="w-3 h-3" />}{e}
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
                const selected = dietaryRestrictions.includes(d);
                return (
                  <button key={d} onClick={() => toggleItem("diet", d)}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-sm border transition-colors flex items-center gap-1.5",
                      selected
                        ? "gradient-bg text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:bg-accent"
                    )}>
                    {selected && <Check className="w-3 h-3" />}{d}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Injuries */}
          <div>
            <Label className="text-xs">Injuries or limitations <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea className="mt-1.5 resize-none text-sm" rows={2}
              placeholder="e.g. bad left knee, shoulder impingement..."
              value={injuries} onChange={e => setInjuries(e.target.value)} maxLength={300} />
          </div>

        </div>

        <Button className="gradient-bg w-full mt-6" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Let's go"}
          {!saving && <ArrowRight className="w-4 h-4 ml-1" />}
        </Button>

        <button onClick={() => router.push("/dashboard")}
          className="w-full text-center text-sm text-muted-foreground mt-3 hover:text-foreground transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}
