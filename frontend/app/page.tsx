"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Mail, Lock, Github, Chrome, ArrowRight, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "register") {
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("http://127.0.0.1:8000/api/signup/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            confirm_password: confirmPassword,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
        } else {
          const errorMsg = typeof data === "object"
            ? Object.values(data).flat().join(" ")
            : "Signup failed.";
          setError(errorMsg);
        }
      } catch {
        setError("Cannot connect to server. Please try again.");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.requires_2fa) {
            router.push(`/verify-2fa?email=${encodeURIComponent(email)}`);
          } else {
            localStorage.setItem("access_token", data.tokens.access);
            localStorage.setItem("refresh_token", data.tokens.refresh);
            localStorage.setItem("user", JSON.stringify(data.user));
            try {
              const fpRes = await fetch("http://127.0.0.1:8000/api/fitness-profile/", {
                headers: { Authorization: `Bearer ${data.tokens.access}` },
              });
              const fp = await fpRes.json();
              if (fp.age === null && fp.weight_kg === null) {
                router.push("/onboarding");
                return;
              }
            } catch {}
            router.push("/dashboard");
          }
        } else {
          setError(data.error || "Invalid email or password.");
        }
      } catch {
        setError("Cannot connect to server. Please try again.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl gradient-bg" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.65 0.2 300)" }} />

      <div className="relative grid lg:grid-cols-2 gap-12 max-w-6xl w-full items-center">
        {/* Pitch */}
        <div className="space-y-8 lg:pr-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Activity className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-2xl font-semibold tracking-tight">Momentm</span>
          </Link>

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              AI-driven habit recalibration
            </div>
            <h1 className="text-4xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Build habits.<br />
              <span className="gradient-text">Together.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-md">
              The social fitness platform that adapts to you. Join Loops, track progress, and let Momentm AI fine-tune your goals.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 max-w-md">
            {[
              { v: "12k+", l: "Active users" },
              { v: "94%", l: "Goal hit rate" },
              { v: "4.9★", l: "User rating" },
            ].map((s) => (
              <div key={s.l} className="glass rounded-xl p-3">
                <div className="text-xl font-semibold">{s.v}</div>
                <div className="text-xs text-muted-foreground">{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <div className="glass-strong rounded-3xl p-6 lg:p-10">
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl mb-6">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); }}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  mode === m ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Jenish Ranjit"
                    className="pl-9"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@momentm.app"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {mode === "login" && (
                  <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </Link>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {mode === "register" && (
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-9"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gradient-bg shadow-[var(--shadow-elegant)] hover:opacity-90"
              disabled={loading}
            >
              {loading
                ? "Please wait..."
                : mode === "login" ? "Sign in" : "Create account"}
              {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">or continue with</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" type="button">
              <Chrome className="w-4 h-4 mr-2" /> Google
            </Button>
            <Button variant="outline" type="button">
              <Github className="w-4 h-4 mr-2" /> GitHub
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
