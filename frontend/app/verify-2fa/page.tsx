"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Verify2FAForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/verify-2fa/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (res.ok) {
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
      } else {
        setError(data.error || "Verification failed.");
      }
    } catch {
      setError("Cannot connect to server.");
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
        <h2 className="text-2xl font-semibold mb-1">Two-factor authentication</h2>
        <p className="text-sm text-muted-foreground mb-1">We sent a 6-digit code to</p>
        <p className="text-sm font-medium mb-6">{email}</p>
        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200"><p className="text-sm text-red-600">{error}</p></div>}
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Authentication code</Label>
            <Input id="otp" placeholder="123456" value={otp} onChange={(e) => setOtp(e.target.value)} maxLength={6} required className="text-center text-lg tracking-widest" />
          </div>
          <Button type="submit" size="lg" className="w-full gradient-bg shadow-[var(--shadow-elegant)] hover:opacity-90" disabled={loading}>
            {loading ? "Verifying..." : "Verify and sign in"}
            {!loading && <ArrowRight className="w-4 h-4 ml-1" />}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground mt-4">
          <button onClick={() => router.push("/")} className="text-primary hover:underline">Back to login</button>
        </p>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return <Suspense><Verify2FAForm /></Suspense>;
}
