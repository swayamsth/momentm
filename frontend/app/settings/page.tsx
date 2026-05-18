"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Trash2, Loader2, X, ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type UserData = { email: string; two_factor_enabled?: boolean };

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
  const router = useRouter();
  const [user, setUser] = useState<UserData>({ email: "" });
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMessage, setTfaMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));

    fetch(`${API}/dashboard/`, { headers: authHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setTwoFactorEnabled(data.user.two_factor_enabled);
          const updatedUser = { ...JSON.parse(stored!), two_factor_enabled: data.user.two_factor_enabled };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      })
      .catch(() => {});

    fetch(`${API}/fitness-profile/`, { headers: authHeaders() })
      .then(r => r.json())
      .then(d => { setFitness(d); setFitnessLoaded(true); })
      .catch(() => setFitnessLoaded(true));
  }, []);

  const handleToggle2FA = async () => {
    setTfaLoading(true);
    setTfaMessage("");
    try {
      const res = await fetch(`${API}/toggle-2fa/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      const d = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(d.two_factor_enabled);
        const stored = localStorage.getItem("user");
        if (stored) {
          localStorage.setItem("user", JSON.stringify({ ...JSON.parse(stored), two_factor_enabled: d.two_factor_enabled }));
        }
        toast.success(d.message);
        setTfaMessage(d.message);
      } else {
        toast.error("Failed to update 2FA settings.");
      }
    } catch {
      toast.error("Cannot connect to server.");
    }
    setTfaLoading(false);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      const res = await fetch(`${API}/profile/delete/`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        router.push("/");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete account.");
      }
    } catch {
      setDeleteError("Cannot connect to server.");
    }
    setDeleteLoading(false);
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
      const res = await fetch(`${API}/fitness-profile/`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
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

  const headerLeft = (
    <div className="flex items-center gap-3">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <div className="w-px h-4 bg-border/60" />
      <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
    </div>
  );

  return (
    <AppShell headerLeft={headerLeft}>
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-sm bg-background rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h2 className="font-semibold text-base text-red-600">Delete Account</h2>
              <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }}
                className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete your account and all associated data including posts, loop memberships, and activity history. <span className="font-medium text-foreground">This action cannot be undone.</span>
              </p>
              {deleteError && (
                <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setShowDeleteConfirm(false); setDeleteError(""); }} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
                >
                  {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete permanently"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-xl space-y-8">

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

          {/* Account info */}
          <Card className="glass border-0 p-4">
            <p className="text-xs text-muted-foreground mb-1">Email address</p>
            <p className="text-sm font-medium">{user.email}</p>
          </Card>

          {/* Two-factor authentication */}
          <Card className="glass border-0 p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Two-factor authentication</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {twoFactorEnabled
                        ? "A code will be sent to your email on every login."
                        : "Add an extra layer of security to your account."}
                    </p>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`inline-block w-2 h-2 rounded-full ${twoFactorEnabled ? "bg-green-500" : "bg-muted-foreground/40"}`} />
                      <span className={`text-xs ${twoFactorEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                        {twoFactorEnabled ? "2FA is currently ON" : "2FA is currently OFF"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    disabled={tfaLoading}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${twoFactorEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    {tfaLoading
                      ? <Loader2 className="w-3 h-3 text-white animate-spin absolute left-1/2 -translate-x-1/2" />
                      : <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? "translate-x-6" : "translate-x-1"}`} />}
                  </button>
                </div>
                {tfaMessage && <p className="text-xs text-primary mt-2">{tfaMessage}</p>}
              </div>
            </div>
          </Card>

          {/* Delete account */}
          <Card className="glass border-0 p-5" style={{ border: "1px solid rgb(254 202 202 / 0.5)" }}>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-600">Delete account</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete your account and all your data. This cannot be undone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="mt-3 text-red-500 border-red-200 hover:bg-red-50 hover:border-red-300"
                >
                  Delete my account
                </Button>
              </div>
            </div>
          </Card>
        </section>

      </div>
    </AppShell>
  );
}
