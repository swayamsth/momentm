"use client";
import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserPlus, UserCheck, Clock, Sparkles, Activity, Flame, Users, Coins, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://127.0.0.1:8000/api";

type QuickProfile = {
  id: number;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  bio?: string;
  is_premium?: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follow_status: string | null;
  stats?: { total_points: number; total_activities: number; best_streak: number; loops_count: number };
};

function authHeaders() {
  const token = localStorage.getItem("access_token") ?? "";
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function Avatar({ profile, size = "md" }: { profile: QuickProfile | null; name?: string; avatarUrl?: string | null; size?: "sm" | "md" | "lg" }) {
  const sizeClass = size === "lg" ? "w-16 h-16 text-2xl" : size === "sm" ? "w-8 h-8 text-sm" : "w-12 h-12 text-lg";
  const initials = profile?.full_name?.[0]?.toUpperCase() ?? "?";
  return (
    <div className={cn("rounded-xl overflow-hidden shrink-0", sizeClass)}>
      {profile?.avatar_url
        ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
        : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold">{initials}</div>}
    </div>
  );
}

function MiniCard({ profile, onFollow, followLoading, onViewProfile }: {
  profile: QuickProfile;
  onFollow: () => void;
  followLoading: boolean;
  onViewProfile: () => void;
}) {
  const isFollowing = profile.is_following;
  const isPending = profile.follow_status === 'pending';

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Avatar profile={profile} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold truncate">{profile.full_name}</span>
            {profile.is_premium && (
              <Badge className="gradient-bg border-0 text-primary-foreground text-[10px] px-1.5 py-0">
                <Sparkles className="w-2.5 h-2.5 mr-0.5" />Premium
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">@{profile.handle}</p>
          <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
            <span><strong className="text-foreground">{profile.followers_count}</strong> followers</span>
            <span><strong className="text-foreground">{profile.following_count}</strong> following</span>
          </div>
        </div>
      </div>

      {/* Bio */}
      {profile.bio && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{profile.bio}</p>
      )}

      {/* Stats */}
      {profile.stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { icon: Coins,    label: "Pts",   value: profile.stats.total_points },
            { icon: Activity, label: "Acts",  value: profile.stats.total_activities },
            { icon: Flame,    label: "Streak",value: profile.stats.best_streak },
            { icon: Users,    label: "Loops", value: profile.stats.loops_count },
          ].map(s => (
            <div key={s.label} className="glass rounded-lg p-2">
              <div className="text-sm font-semibold tabular-nums">{s.value}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={isFollowing ? "outline" : "default"}
          className={cn("flex-1 gap-1.5 text-xs", !isFollowing && !isPending && "gradient-bg border-0 text-primary-foreground")}
          onClick={onFollow}
          disabled={followLoading}
        >
          {isFollowing ? <><UserCheck className="w-3.5 h-3.5" /> Following</> :
           isPending   ? <><Clock className="w-3.5 h-3.5" /> Pending</> :
                         <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
        </Button>
        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={onViewProfile}>
          Profile <ArrowRight className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function UserQuickView({
  userId,
  children,
  className = "inline-block",
}: {
  userId: number | string;
  children: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<QuickProfile | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    try {
      const res = await fetch(`${API}/profile/${userId}/`, { headers: authHeaders() });
      if (res.ok) setProfile(await res.json());
    } catch {}
  }, [userId]);

  const handleFollow = async () => {
    if (!profile) return;
    setFollowLoading(true);
    try {
      if (profile.is_following || profile.follow_status === 'pending') {
        await fetch(`${API}/follow/${userId}/`, { method: "DELETE", headers: authHeaders() });
        setProfile(p => p ? { ...p, is_following: false, follow_status: null, followers_count: p.followers_count - (p.is_following ? 1 : 0) } : p);
      } else {
        const res = await fetch(`${API}/follow/${userId}/`, { method: "POST", headers: authHeaders() });
        const data = await res.json();
        setProfile(p => p ? { ...p, is_following: data.is_following, follow_status: data.status, followers_count: p.followers_count + (data.is_following ? 1 : 0) } : p);
      }
    } catch {}
    setFollowLoading(false);
  };

  const goToProfile = () => {
    setDrawerOpen(false);
    router.push(`/profile/${userId}`);
  };

  return (
    <>
      {/* Desktop: hover card */}
      <HoverCard openDelay={300} closeDelay={100}>
        <HoverCardTrigger asChild>
          <span
            className={className}
            onMouseEnter={fetchProfile}
            onClick={(e) => {
              if (window.matchMedia("(pointer: coarse)").matches) {
                e.preventDefault();
                e.stopPropagation();
                fetchProfile();
                setDrawerOpen(true);
              }
            }}
          >
            {children}
          </span>
        </HoverCardTrigger>
        <HoverCardContent
          className="w-80 glass-strong border-border/50 shadow-2xl p-4 rounded-2xl"
          side="bottom"
          align="start"
        >
          {profile ? (
            <MiniCard profile={profile} onFollow={handleFollow} followLoading={followLoading} onViewProfile={goToProfile} />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded animate-pulse" />
              <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
            </div>
          )}
        </HoverCardContent>
      </HoverCard>

      {/* Mobile: bottom sheet drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="glass-strong border-t border-border/40 px-6 pb-8 pt-4">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-muted mb-6" />
          {profile ? (
            <MiniCard profile={profile} onFollow={handleFollow} followLoading={followLoading} onViewProfile={goToProfile} />
          ) : (
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-xl bg-muted animate-pulse" />
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-muted rounded animate-pulse" />
            </div>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
}
