"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Activity, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/forgot-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("If that email exists, a reset link has been sent. Please check your inbox.");
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl gradient-bg" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.65 0.2 300)" }} />
      <div className="relative glass-strong rounded-3xl p-8 lg:p-10 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-semibold tracking-tight">Momentm</span>
        </div>
        <h2 className="text-2xl font-semibold mb-1">Forgot password</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter your email and we'll send you a reset link</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-600">{error}</p></div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200"><p className="text-sm text-green-600">{success}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@momentm.app" className="pl-9" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full gradient-bg shadow-[var(--shadow-elegant)] hover:opacity-90" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Remember your password?{" "}
          <button onClick={() => router.push("/")} className="text-primary hover:underline font-medium">Sign in</button>
        </p>
      </div>
    </div>
  );
}
