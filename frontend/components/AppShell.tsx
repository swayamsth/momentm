"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Sparkles, Users, Trophy, CreditCard,
  LogOut, Activity, Menu, X, Bell, Heart, MessageCircle,
  UserCheck, UserPlus, Check, Gift, Coins, ChevronUp, User, Settings,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/ai", label: "Momentm AI", icon: Sparkles },
  { to: "/loops", label: "Loops", icon: Users },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { to: "/rewards", label: "My Rewards", icon: Gift },
  { to: "/coaching", label: "Coaching", icon: CreditCard },
];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Notification {
  id: string | number;
  type: "like" | "comment" | "join" | "request_approved" | "request_denied" | "join_request" | "new_member" | "follow_request" | "new_follower";
  message: string;
  time: string;
  read: boolean;
  loop?: string;
  membership_id?: number;
  loop_id?: number;
  follow_id?: number;
  follower_id?: number;
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
  if (type === "join" || type === "new_member") return <div className={`${base} bg-green-100`}><UserPlus className="w-4 h-4 text-green-500" /></div>;
  if (type === "request_approved") return <div className={`${base} bg-emerald-100`}><UserCheck className="w-4 h-4 text-emerald-500" /></div>;
  if (type === "join_request" || type === "follow_request") return <div className={`${base} bg-amber-100`}><UserPlus className="w-4 h-4 text-amber-500" /></div>;
  if (type === "new_follower") return <div className={`${base} bg-purple-100`}><UserCheck className="w-4 h-4 text-purple-500" /></div>;
  return <div className={`${base} bg-orange-100`}><X className="w-4 h-4 text-orange-500" /></div>;
}

// ─── Bell Button ──────────────────────────────────────────────────────────────

function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>(DUMMY_NOTIFICATIONS);
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
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
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
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
            top: dropdownPos.top,
            right: dropdownPos.right,
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
                notifications.map((n) => {
                  const isActionable = n.type === "join_request" || n.type === "follow_request";
                  return (
                    <div
                      key={n.id}
                      className={cn(
                        "flex flex-col px-4 py-3 transition-colors",
                        !n.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <NotifIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed">{n.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
                          {isActionable && (
                            <div className="flex gap-2 mt-1.5">
                              <button
                                onClick={() => {
                                  const token = localStorage.getItem("access_token");
                                  const endpoint = n.type === "join_request"
                                    ? `http://127.0.0.1:8000/api/loops/requests/${n.membership_id}/approve/`
                                    : `http://127.0.0.1:8000/api/follow-requests/${n.follow_id}/approve/`;
                                  fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                                  setNotifications(prev => prev.filter(x => x.id !== n.id));
                                }}
                                className="text-xs text-primary font-medium hover:opacity-70"
                              >Approve</button>
                              <span className="text-xs text-muted-foreground">·</span>
                              <button
                                onClick={() => {
                                  const token = localStorage.getItem("access_token");
                                  const endpoint = n.type === "join_request"
                                    ? `http://127.0.0.1:8000/api/loops/requests/${n.membership_id}/deny/`
                                    : `http://127.0.0.1:8000/api/follow-requests/${n.follow_id}/deny/`;
                                  fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
                                  setNotifications(prev => prev.filter(x => x.id !== n.id));
                                }}
                                className="text-xs text-red-500 font-medium hover:opacity-70"
                              >Deny</button>
                            </div>
                          )}
                        </div>
                        {!n.read && !isActionable && (
                          <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })
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

// ─── Profile Dropdown ─────────────────────────────────────────────────────────

function ProfileDropdown({
  displayName,
  initials,
  isPremium,
  profilePicUrl,
  onLogout,
  router,
}: {
  displayName: string;
  initials: string;
  isPremium: boolean | null;
  profilePicUrl?: string | null;
  onLogout: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        className="w-full glass rounded-xl p-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left"
      >
        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
          {profilePicUrl
            ? <img src={profilePicUrl} alt={displayName} className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground">
            {isPremium === null ? "—" : isPremium ? "Premium" : "Free"}
          </div>
        </div>
        <ChevronUp className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${open ? "" : "rotate-180"}`} />
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute bottom-full left-0 right-0 mb-2 rounded-2xl overflow-hidden shadow-2xl z-50"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          {/* Profile card header */}
          <div className="px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                {profilePicUrl
                  ? <img src={profilePicUrl} alt={displayName} className="w-full h-full object-cover" />
                  : initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">{isPremium ? "Premium member" : "Free plan"}</p>
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); router.push("/profile"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-3.5 h-3.5" />
              </div>
              View Profile
            </button>
            <button
              onClick={() => { setOpen(false); router.push("/settings"); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Settings className="w-3.5 h-3.5" />
              </div>
              Settings &amp; privacy
            </button>

            <div className="mx-4 my-1 border-t border-border/50" />

            <button
              onClick={() => { setOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-accent transition-colors text-left text-red-500"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-3.5 h-3.5 text-red-500" />
              </div>
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ─── App Shell ────────────────────────────────────────────────────────────────

export function AppShell({ children, headerLeft }: { children: React.ReactNode; headerLeft?: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user] = useState<User | null>(() => loadUser());
  const [availablePoints, setAvailablePoints] = useState<number | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [displayPoints, setDisplayPoints] = useState(0);
  const [pillVisible, setPillVisible] = useState(false);
  const [profilePicUrl, setProfilePicUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) return;
    fetch("http://127.0.0.1:8000/api/rewards/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        setAvailablePoints(d.available_points ?? 0);
        setIsPremium(d.is_premium ?? false);
      })
      .catch(() => {});
    fetch("http://127.0.0.1:8000/api/profile/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.profile_picture_url) setProfilePicUrl(d.profile_picture_url); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (availablePoints === null) return;

    // Fade the pill in
    const fadeTimer = setTimeout(() => setPillVisible(true), 50);

    // Count up from 0 to availablePoints
    const duration = 1200;
    const start = Date.now();
    const target = availablePoints;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic — fast start, gentle finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayPoints(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
    return () => clearTimeout(fadeTimer);
  }, [availablePoints]);

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

          {/* ── Points ── */}
          <div
            className="border border-border/50 rounded-2xl px-4 py-3 my-2 transition-opacity duration-700"
            style={{ opacity: pillVisible ? 1 : 0 }}
          >
            <p className="text-[11px] text-muted-foreground mb-1">Available points</p>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 shrink-0" style={{ color: "oklch(0.78 0.16 75)" }} />
              <p className="text-xl font-bold tabular-nums tracking-tight leading-none">
                {displayPoints.toLocaleString()}
                <span className="text-xs font-normal text-muted-foreground ml-1.5">pts</span>
              </p>
            </div>
          </div>

          {/* ── Profile dropdown ── */}
          <ProfileDropdown
            displayName={displayName}
            initials={initials}
            isPremium={isPremium}
            profilePicUrl={profilePicUrl}
            onLogout={handleLogout}
            router={router}
          />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 glass-strong m-3 rounded-2xl px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Activity className="w-4 h-4 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <span className="font-semibold">Momentm</span>
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-accent">
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </header>
        {/* Desktop top bar */}
        <div className="hidden lg:flex sticky top-0 z-20 items-center justify-between gap-2 px-6 py-4">
          <div className="flex-1 min-w-0">{headerLeft}</div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificationBell />
          </div>
        </div>
        <main className="flex-1 px-4 pb-4 pt-2 lg:px-8 lg:pb-8 lg:pt-3 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>

      {open && <div onClick={() => setOpen(false)} className="lg:hidden fixed inset-0 bg-foreground/20 z-30" />}
    </div>
  );
}