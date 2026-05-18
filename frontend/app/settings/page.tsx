"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Trash2, Loader2, X, ArrowLeft } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; first_name: string; two_factor_enabled?: boolean } | null>(null);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [tfaLoading, setTfaLoading] = useState(false);
  const [tfaMessage, setTfaMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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
  }, []);

  const handleToggle2FA = async () => {
    setTfaLoading(true);
    setTfaMessage("");
    try {
      const res = await fetch(`${API}/toggle-2fa/`, {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (res.ok) {
        setTwoFactorEnabled(data.two_factor_enabled);
        const stored = localStorage.getItem("user");
        if (stored) {
          localStorage.setItem("user", JSON.stringify({ ...JSON.parse(stored), two_factor_enabled: data.two_factor_enabled }));
        }
        setTfaMessage(data.message);
      } else {
        setTfaMessage("Failed to update 2FA settings.");
      }
    } catch {
      setTfaMessage("Cannot connect to server.");
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

  if (!user) return null;

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

      <div className="max-w-xl">

        {/* Account info */}
        <Card className="glass border-0 p-4 mb-4">
          <p className="text-xs text-muted-foreground mb-1">Email address</p>
          <p className="text-sm font-medium">{user.email}</p>
        </Card>

        {/* Two-factor authentication */}
        <Card className="glass border-0 p-5 mb-4">
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
        <Card className="glass border-0 p-5" style={{ borderColor: "rgb(254 202 202 / 0.5)", border: "1px solid rgb(254 202 202 / 0.5)" }}>
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
      </div>
    </AppShell>
  );
}
