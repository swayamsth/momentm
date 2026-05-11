"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Sparkles, Users, Trophy, CreditCard,
  LogOut, Activity, Menu, X, Bell, Heart, MessageCircle,
  UserCheck, UserPlus, Check,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai", label: "Momentm AI", icon: Sparkles },
  { to: "/loops", label: "Loops", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/coaching", label: "Coaching", icon: CreditCard },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: number;
  type: "like" | "comment" | "join" | "request_approved" | "request_denied";
  message: string;
  time: string;
  read: boolean;
  loop?: string;
}

interface User {
  email: string;
  first_name: string;
  last_name: string;
}

// ─── Dummy notifications ──────────────────────────────────────────────────────

const DUMMY_NOTIFICATIONS: Notification[] = [
  { id: 1, type: "like", message: "Alex Kim liked your post in 5AM Run Club", time: "2m ago", read: false, loop: "5AM Run Club" },
  { id: 2, type: "comment", message: "Jordan Lee commented on your post", time: "15m ago", read: false, loop: "Mindful Mornings" },
  { id: 3, type: "join", message: "Sarah Chen joined your loop Strength 200", time: "1h ago", read: false, loop: "Strength 200" },
  { id: 4, type: "request_approved", message: "Your request to join Sleep Stack was approved", time: "3h ago", read: true, loop: "Sleep Stack" },
  { id: 5, type: "request_denied", message: "Your request to join Elite Runners was declined", time: "5h ago", read: true },
];

// ─── Helper ───────────────────────────────────────────────────────────────────

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem("user");
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

// ─── Notification icon ────────────────────────────────────────────────────────

function NotifIcon({ type }: { type: Notification["type"] }) {
  const base = "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0";
  if (type === "like") return <div className={`${base} bg-red-100`}><Heart className="w-4 h-4 text-red-500" /></div>;
  if (type === "comment") return <div className={`${base} bg-blue-100`}><MessageCircle className="w-4 h-4 text-blue-500" /></div>;
  if (type === "join") return <div className={`${base} bg-green-100`}><UserPlus className="w-4 h-4 text-green-500" /></div>;
  if (type === "request_approved") return <div className={`${base} bg-emerald-100`}><UserCheck className="w-4 h-4 text-emerald-500" /></div>;
  return <div className={`${base} bg-orange-100`}><X className="w-4 h-4 text-orange-500" /></div>;
}

// ─── Bell Button ──────────────────────────────────────────────────────────────

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>(DUMMY_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ bottom: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        const res = await fetch("http://127.0.0.1:8000/api/notifications/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) setNotifications(data);
      } catch { /* keep dummy data */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        bottom: window.innerHeight - rect.top + 8,
        left: Math.max(8, rect.left),
      });
    }
    setOpen((prev) => !prev);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAllRead = async () => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch("http://127.0.0.1:8000/api/notifications/mark-all-read/", {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready */ }
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkRead = async (id: number) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/notifications/${id}/read/`, {
        method: "POST", headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready */ }
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="relative p-2 rounded-xl hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            bottom: dropdownPos.bottom,
            left: dropdownPos.left,
            width: 320,
            zIndex: 9999,
          }}
        >
          <div style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            className="rounded-2xl overflow-hidden shadow-2xl">

            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Notifications</span>
                {unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead}
                  className="text-xs text-primary hover:opacity-70 transition-opacity flex items-center gap-1">
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-40" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => { handleMarkRead(n.id); setOpen(false); }}
                    className={cn(
                      "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent",
                      !n.read && "bg-primary/5"
                    )}
                  >
                    <NotifIcon type={n.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-relaxed">{n.message}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>

            {notifications.length > 0 && (
              <div className="px-4 py-2.5 text-center"
                style={{ borderTop: "1px solid var(--border)" }}>
                <Link href="/loops" onClick={() => setOpen(false)}
                  className="text-xs text-primary hover:opacity-70 transition-opacity">
                  View all loop activity →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user] = useState<User | null>(() => loadUser());

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
                <Link key={n.to} href={n.to} onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    active
                      ? "gradient-bg text-primary-foreground shadow-[var(--shadow-elegant)]"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}>
                  <n.icon className="w-4 h-4" />
                  {n.label}
                </Link>
              );
            })}
          </nav>

          {/* ── User profile — NO bell here ── */}
          <div className="glass rounded-xl p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground">Premium</div>
            </div>
            <button onClick={handleLogout}
              className="text-muted-foreground hover:text-red-500 transition-colors" title="Logout">
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
          <div className="flex items-center gap-2">
            <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-accent">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-8 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 bg-foreground/20 z-30" />}
    </div>
  );
}