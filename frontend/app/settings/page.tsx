"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; first_name: string; two_factor_enabled?: boolean } | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const stored = localStorage.getItem("user");
    if (!token || !stored) { router.push("/"); return; }
    setUser(JSON.parse(stored));
    fetch("http://127.0.0.1:8000/api/dashboard/", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setTwoFactorEnabled(data.user.two_factor_enabled);
          const updatedUser = { ...JSON.parse(stored), two_factor_enabled: data.user.two_factor_enabled };
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      })
      .catch(() => console.log("Could not fetch 2FA status"));
  }, []);

  const handleToggle2FA = async () => {
    setLoading(true);
    setMessage("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/toggle-2fa/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(data.two_factor_enabled);
        const stored = localStorage.getItem("user");
        if (stored) {
          localStorage.setItem("user", JSON.stringify({ ...JSON.parse(stored), two_factor_enabled: data.two_factor_enabled }));
        }
        setMessage(data.message);
      } else {
        setMessage("Failed to update 2FA settings.");
      }
    } catch {
      setMessage("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const refresh = localStorage.getItem("refresh_token");
      await fetch("http://127.0.0.1:8000/api/delete-account/", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ refresh }),
      }).catch(() => {});
    } catch { /* proceed regardless */ }
    localStorage.clear();
    router.push("/");
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-30 blur-3xl gradient-bg" />
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "oklch(0.65 0.2 300)" }} />
      <div className="relative glass-strong rounded-3xl p-8 lg:p-10 w-full max-w-md">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-semibold tracking-tight">Momentm</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>
        <h2 className="text-2xl font-semibold mb-6">Account settings</h2>
        <div className="glass rounded-xl p-4 mb-6">
          <p className="text-xs text-muted-foreground mb-1">Email address</p>
          <p className="text-sm font-medium">{user.email}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground mt-1">
                {twoFactorEnabled ? "A code will be sent to your email on every login" : "Add an extra layer of security"}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-block w-2 h-2 rounded-full ${twoFactorEnabled ? "bg-green-500" : "bg-gray-300"}`} />
                <p className={`text-xs ${twoFactorEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                  {twoFactorEnabled ? "2FA is currently ON" : "2FA is currently OFF"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggle2FA}
              disabled={loading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${twoFactorEnabled ? "bg-primary" : "bg-muted-foreground/30"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${twoFactorEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
          {message && <p className="text-xs text-primary mt-3">{message}</p>}
        </div>

        {/* Danger zone */}
        <div className="glass rounded-xl p-4 border border-red-200/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">Delete account</p>
              <p className="text-xs text-muted-foreground mt-1">Permanently delete your account and all data</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-1.5" /> Delete
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={deleteOpen} onOpenChange={(o) => { if (!o) setDeleteOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Account
            </DialogTitle>
            <DialogDescription className="text-sm pt-1">
              Are you sure you want to delete your account? This is permanent and cannot be undone.
              All your data, loops, and activity history will be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              onClick={handleDeleteAccount}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="w-4 h-4 mr-1" /> Yes, delete my account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
