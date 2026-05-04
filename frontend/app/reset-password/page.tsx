"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Activity, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); setLoading(false); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); setLoading(false); return; }
    try {
      const res = await fetch("http://127.0.0.1:8000/api/reset-password/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword, confirm_password: confirmPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Password reset successfully! Redirecting to login...");
        setTimeout(() => router.push("/"), 2000);
      } else {
        setError(data.error || "Something went wrong.");
      }
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-strong rounded-3xl p-8 w-full max-w-md text-center">
          <p className="text-red-500 text-sm mb-4">Invalid reset link. Please request a new one.</p>
          <Button onClick={() => router.push("/forgot-password")} variant="outline">Request new link</Button>
        </div>
      </div>
    );
  }

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
        <h2 className="text-2xl font-semibold mb-1">Reset password</h2>
        <p className="text-sm text-muted-foreground mb-6">Enter your new password below</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-600">{error}</p></div>}
        {success && <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200"><p className="text-sm text-green-600">{success}</p></div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="new-password" type="password" placeholder="••••••••" className="pl-9" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input id="confirm-password" type="password" placeholder="••••••••" className="pl-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
          </div>
          <Button type="submit" size="lg" className="w-full gradient-bg shadow-[var(--shadow-elegant)] hover:opacity-90" disabled={loading}>
            {loading ? "Resetting..." : "Reset password"}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
