"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Flame, Award, Crown, Zap, Star, Ticket, Heart, Tag, Trophy,
  Coins, Activity, Users, CalendarDays, Sparkles, Lock, ArrowLeft,
  UserPlus, UserCheck, Clock, MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const API = "http://127.0.0.1:8000/api";

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

type PublicCosmetic = { id: number; name: string; effect: string; icon: string; color: string };
type PublicPost = { id: number; text: string; image: string | null; time: string; likes: number; comments: number };
type PublicLoop = { id: number; name: string; image_url: string | null; is_mutual: boolean };

type PublicProfile = {
  id: number;
  is_private: boolean;
  full_name: string;
  handle: string;
  avatar_url: string | null;
  bio?: string;
  is_premium?: boolean;
  member_since?: string;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follow_status: string | null;
  can_see_posts: boolean;
  post_count: number;
  stats?: { total_points: number; total_activities: number; best_streak: number; loops_count: number };
  cosmetics?: PublicCosmetic[];
  loops?: PublicLoop[];
  posts?: PublicPost[];
};

export default function PublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  const authHeaders = () => {
    const token = localStorage.getItem("access_token") ?? "";
    return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  };

  const fetchProfile = useCallback(() => {
    fetch(`${API}/profile/${userId}/`, { headers: authHeaders() })
      .then(r => r.json())
      .then(setProfile)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

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

  if (loading) return (
    <AppShell>
      <div className="space-y-4 max-w-2xl">
        {[...Array(3)].map((_, i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
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

  const FollowButton = () => {
    const isFollowing = profile.is_following;
    const isPending = profile.follow_status === 'pending';
    return (
      <Button
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        className={cn("gap-1.5", !isFollowing && !isPending && "gradient-bg border-0 text-primary-foreground")}
        onClick={handleFollow}
        disabled={followLoading}
      >
        {isFollowing ? <><UserCheck className="w-3.5 h-3.5" /> Following</> :
         isPending   ? <><Clock className="w-3.5 h-3.5" /> Pending</> :
                       <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
      </Button>
    );
  };

  if (profile.is_private && !profile.is_following) {
    return (
      <AppShell>
        <div className="max-w-2xl space-y-4">
          <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <Card className="glass border-0 p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl overflow-hidden">
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-semibold">{initials}</div>}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{profile.full_name}</h1>
              <p className="text-sm text-muted-foreground mt-1">@{profile.handle}</p>
              <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span className="text-sm">This profile is private</span>
              </div>
            </div>
            <FollowButton />
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-5 max-w-2xl">

        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Identity */}
        <Card className="glass border-0 overflow-hidden">
          {/* Cover */}
          <div className="h-24 gradient-bg opacity-40" />
          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-background shadow-lg shrink-0">
                {profile.avatar_url
                  ? <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-semibold">{initials}</div>}
              </div>
              <FollowButton />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{profile.full_name}</h1>
              {profile.is_premium && (
                <Badge className="gradient-bg border-0 text-primary-foreground text-xs">
                  <Sparkles className="w-3 h-3 mr-1" />Premium
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.handle}</p>
            {profile.bio && <p className="text-sm mt-2 leading-relaxed">{profile.bio}</p>}

            <div className="flex items-center gap-5 mt-4 text-sm">
              <div><span className="font-semibold tabular-nums">{profile.followers_count}</span> <span className="text-muted-foreground">followers</span></div>
              <div><span className="font-semibold tabular-nums">{profile.following_count}</span> <span className="text-muted-foreground">following</span></div>
              {profile.member_since && (
                <div className="flex items-center gap-1 text-muted-foreground ml-auto">
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="text-xs">Joined {profile.member_since}</span>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        {profile.stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Coins,    label: "Points",     value: profile.stats.total_points.toLocaleString() },
              { icon: Activity, label: "Activities", value: profile.stats.total_activities.toLocaleString() },
              { icon: Flame,    label: "Streak",     value: `${profile.stats.best_streak}d` },
              { icon: Users,    label: "Loops",      value: profile.stats.loops_count.toLocaleString() },
            ].map(s => (
              <Card key={s.label} className="glass border-0 p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest">{s.label}</div>
                  <s.icon className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <div className="text-2xl font-semibold tabular-nums tracking-tight">{s.value}</div>
              </Card>
            ))}
          </div>
        )}

        {/* Cosmetics / badges */}
        {profile.cosmetics && profile.cosmetics.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-widest px-1">Badges & cosmetics</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.cosmetics.map(c => (
                <Card key={c.id} className="glass border-0 p-4 flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${c.color} 20%, transparent)`, color: c.color }}
                  >
                    {ICON_MAP[c.icon] ?? ICON_MAP.trophy}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent posts */}
        {profile.can_see_posts && profile.posts && profile.posts.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-widest px-1">Recent posts</div>
            <div className="space-y-3">
              {profile.posts.map(post => (
                <Card key={post.id} className="glass border-0 p-4 space-y-2">
                  <p className="text-sm leading-relaxed">{post.text}</p>
                  {post.image && (
                    <img src={post.image} alt="Post" className="rounded-xl w-full max-h-48 object-cover" />
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" />{post.likes}</span>
                    <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" />{post.comments}</span>
                    <span className="ml-auto">{post.time}</span>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Loops */}
        {profile.loops && profile.loops.length > 0 && (
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground uppercase tracking-widest px-1">Loops</div>
            <div className="grid grid-cols-2 gap-3">
              {profile.loops.map(l => (
                <Card key={l.id} className="glass border-0 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl shrink-0 overflow-hidden">
                    {l.image_url
                      ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm">{l.name[0]}</div>}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{l.name}</div>
                    {l.is_mutual && <div className="text-[10px] text-primary uppercase tracking-widest mt-0.5">Mutual</div>}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppShell>
  );
}
