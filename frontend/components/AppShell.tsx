"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Sparkles, Users, Trophy, CreditCard, LogOut, Activity, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai", label: "Momentm AI", icon: Sparkles },
  { to: "/loops", label: "Loops", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/coaching", label: "Coaching", icon: CreditCard },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; first_name: string; last_name: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const handleLogout = () => {
    const refresh = localStorage.getItem("refresh_token");
    fetch("http://127.0.0.1:8000/api/logout/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    }).catch(() => console.log("Logout error"));
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    router.push("/");
  };

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "Guest";

  const initials = user?.first_name
    ? user.first_name[0].toUpperCase()
    : user?.email?.[0].toUpperCase() || "?";

  return (
    <div className="min-h-screen flex w-full">
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 h-screen w-64 z-40 transition-transform lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full glass-strong m-3 rounded-2xl p-5 flex flex-col">
          <Link href="/dashboard" className="flex items-center gap-2 mb-8 px-2">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-[var(--shadow-glow)]">
              <Activity className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="text-xl font-semibold tracking-tight">Momentm</span>
          </Link>

          <nav className="flex flex-col gap-1 flex-1">
            {nav.map((n) => {
              const active = path.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  href={n.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "gradient-bg text-primary-foreground shadow-[var(--shadow-elegant)]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground">Premium</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-muted-foreground hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="lg:hidden sticky top-0 z-30 glass-strong m-3 rounded-2xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold">Momentm</span>
          </Link>
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-accent">
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 bg-foreground/20 z-30" />}
    </div>
  );
}
