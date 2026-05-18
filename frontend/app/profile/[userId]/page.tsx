"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Flame, Award, Crown, Zap, Star, Ticket, Heart, Tag, Trophy,
  Coins, Activity, Users, CalendarDays, Sparkles, Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  flame:     <Flame className="w-5 h-5" />,
  award:     <Award className="w-5 h-5" />,
  megaphone: <Trophy className="w-5 h-5" />,
  crown:     <Crown className="w-5 h-5" />,
  zap:       <Zap className="w-5 h-5" />,
  star:      <Star className="w-5 h-5" />,
  ticket:    <Ticket className="w-5 h-5" />,
  heart:     <Heart className="w-5 h-5" />,
  tag:       <Tag className="w-5 h-5" />,
  trophy:    <Trophy className="w-5 h-5" />,
};

type PublicCosmetic = {
  id: number;
  name: string;
  effect: string;
  icon: string;
  color: string;
};

type PublicProfile = {
  is_private: boolean;
  full_name: string;
  avatar_url: string | null;
  bio?: string;
  is_premium?: boolean;
  member_since?: string;
  stats?: {
    total_points: number;
    total_activities: number;
    best_streak: number;
    loops_count: number;
  };
  cosmetics?: PublicCosmetic[];
  loops?: { id: number; name: string; image_url: string | null }[];
};

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token") ?? "";
    fetch(`http://127.0.0.1:8000/api/profile/${userId}/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <AppShell>
      <div className="space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="glass rounded-2xl h-24 animate-pulse" />
        ))}
      </div>
    </AppShell>
  );

  if (!profile) return (
    <AppShell>
      <div className="max-w-2xl">
        <Card className="glass border-0 p-12 text-center">
          <p className="text-muted-foreground">User not found.</p>
        </Card>
      </div>
    </AppShell>
  );

  const initials = profile.full_name?.[0]?.toUpperCase() ?? "?";

  // ── Private profile ──────────────────────────────────────────────────────────
  if (profile.is_private) {
    return (
      <AppShell>
        <div className="max-w-2xl">
          <Card className="glass border-0 p-10 flex flex-col items-center gap-4 text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)]">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-semibold">{initials}</div>
              }
            </div>
            <div>
              <h1 className="text-xl font-semibold">{profile.full_name}</h1>
              <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span className="text-sm">This profile is private</span>
              </div>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  // ── Public profile ───────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">

        {/* ── Identity ── */}
        <Card className="glass border-0 p-6">
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-[var(--shadow-elegant)] shrink-0">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-semibold">{initials}</div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold">{profile.full_name}</h1>
                {profile.is_premium && (
                  <Badge className="gradient-bg border-0 text-primary-foreground text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />Premium
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {profile.bio || <span className="italic opacity-50">No bio yet.</span>}
              </p>
              <span className="text-xs text-muted-foreground flex items-center gap-1 mt-3">
                <CalendarDays className="w-3 h-3" /> Member since {profile.member_since}
              </span>
            </div>
          </div>
        </Card>

        {/* ── Stats ── */}
        {profile.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Coins,    label: "Total points", value: profile.stats.total_points.toLocaleString(),    color: "oklch(0.78 0.16 75)" },
              { icon: Activity, label: "Activities",   value: profile.stats.total_activities.toLocaleString(), color: "oklch(0.6 0.22 255)" },
              { icon: Flame,    label: "Best streak",  value: `${profile.stats.best_streak}d`,                color: "oklch(0.72 0.22 30)" },
              { icon: Users,    label: "Loops",        value: profile.stats.loops_count.toLocaleString(),     color: "oklch(0.7 0.16 155)" },
            ].map(s => (
              <Card key={s.label} className="glass border-0 p-4 text-center">
                <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
                <div className="text-xl font-semibold tabular-nums">{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </Card>
            ))}
          </div>
        )}

        {/* ── Cosmetics ── */}
        {profile.cosmetics && profile.cosmetics.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cosmetics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.cosmetics.map(c => {
                const animClass =
                  c.effect === "streak_flame" ? "cosmetic-flame" :
                  c.effect === "profile_badge" ? "cosmetic-badge" : null;
                return (
                  <Card key={c.id} className="glass border-0 p-4 flex items-center gap-3">
                    <div
                      className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", animClass)}
                      style={{ background: `color-mix(in oklab, ${c.color} 20%, transparent)`, color: c.color }}
                    >
                      {ICON_MAP[c.icon] ?? ICON_MAP.trophy}
                    </div>
                    <div className="min-w-0">
                      {c.effect === "leaderboard_title"
                        ? <span className="cosmetic-title">{c.name}</span>
                        : <div className="text-sm font-medium truncate">{c.name}</div>
                      }
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Loops ── */}
        {profile.loops && profile.loops.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Loops</h2>
            <div className="grid grid-cols-2 gap-3">
              {profile.loops.map(l => (
                <Card key={l.id} className="glass border-0 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden">
                    {l.image_url
                      ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm">{l.name[0]}</div>
                    }
                  </div>
                  <div className="font-medium text-sm truncate">{l.name}</div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
