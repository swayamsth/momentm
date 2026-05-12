"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Flame, Award, Crown, Zap, Star, Ticket, Heart, Tag, Trophy,
  Pencil, Check, X, Coins, Activity, Users, CalendarDays, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
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

type ProfileData = {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  bio: string;
  is_public: boolean;
  is_premium: boolean;
  member_since: string;
  stats: {
    total_points: number;
    total_activities: number;
    best_streak: number;
    loops_count: number;
  };
  cosmetics: {
    id: number;
    name: string;
    effect: string;
    icon: string;
    color: string;
    is_active: boolean;
    claimed_at: string;
  }[];
  loops: { id: number; name: string; image_url: string | null }[];
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/profile/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setFirstName(d.first_name);
        setLastName(d.last_name);
        setBio(d.bio);
        setIsPublic(d.is_public);
      })
      .catch(() => toast.error("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/profile/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token()}`,
        },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, bio, is_public: isPublic }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error("Failed to save."); return; }
      setProfile(data);
      setEditing(false);
      toast.success("Profile updated.");
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (!profile) return;
    setFirstName(profile.first_name);
    setLastName(profile.last_name);
    setBio(profile.bio);
    setIsPublic(profile.is_public);
    setEditing(false);
  };

  if (loading) return (
    <AppShell>
      <div className="space-y-4 max-w-2xl">
        {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-2xl h-24 animate-pulse" />)}
      </div>
    </AppShell>
  );

  if (!profile) return null;

  const initials = profile.first_name?.[0]?.toUpperCase() ?? profile.email[0].toUpperCase();

  return (
    <AppShell>
      <div className="space-y-6 max-w-2xl">

        {/* ── Identity ── */}
        <Card className="glass border-0 p-6">
          <div className="flex items-start gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center text-primary-foreground text-3xl font-semibold shadow-[var(--shadow-elegant)]">
                {initials}
              </div>
              {profile.is_premium && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full gradient-bg flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-primary-foreground" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">First name</Label>
                      <Input value={firstName} onChange={e => setFirstName(e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Last name</Label>
                      <Input value={lastName} onChange={e => setLastName(e.target.value)} className="mt-1 h-8 text-sm" />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Bio</Label>
                    <Textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      placeholder="Tell people a little about yourself..."
                      className="mt-1 text-sm resize-none"
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1 text-right">{bio.length}/160</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                      <span className="text-xs text-muted-foreground">{isPublic ? "Public profile" : "Private profile"}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={handleCancel} className="h-7 px-2">
                        <X className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" className="gradient-bg h-7 px-3 text-xs" onClick={handleSave} disabled={saving}>
                        <Check className="w-3.5 h-3.5 mr-1" />{saving ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold">{profile.full_name}</h1>
                    {profile.is_premium && <Badge className="gradient-bg border-0 text-primary-foreground text-xs">Premium</Badge>}
                    <Badge variant="outline" className="text-xs">{profile.is_public ? "Public" : "Private"}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    {profile.bio || <span className="italic opacity-50">No bio yet.</span>}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" /> Member since {profile.member_since}
                    </span>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs ml-auto" onClick={() => setEditing(true)}>
                      <Pencil className="w-3 h-3 mr-1" /> Edit
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* ── Lifetime stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Coins, label: "Total points", value: profile.stats.total_points.toLocaleString(), color: "oklch(0.78 0.16 75)" },
            { icon: Activity, label: "Activities", value: profile.stats.total_activities.toLocaleString(), color: "oklch(0.6 0.22 255)" },
            { icon: Flame, label: "Best streak", value: `${profile.stats.best_streak}d`, color: "oklch(0.72 0.22 30)" },
            { icon: Users, label: "Loops", value: profile.stats.loops_count.toLocaleString(), color: "oklch(0.7 0.16 155)" },
          ].map(s => (
            <Card key={s.label} className="glass border-0 p-4 text-center">
              <s.icon className="w-5 h-5 mx-auto mb-2" style={{ color: s.color }} />
              <div className="text-xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </Card>
          ))}
        </div>

        {/* ── Cosmetics showcase ── */}
        {profile.cosmetics.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cosmetics</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {profile.cosmetics.map(c => (
                <Card key={c.id} className={cn("glass border-0 p-4 flex items-center gap-3 transition-opacity", !c.is_active && "opacity-50")}>
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in oklab, ${c.color} 20%, transparent)`, color: c.color }}
                  >
                    {ICON_MAP[c.icon] ?? ICON_MAP.trophy}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {c.is_active ? <span className="text-green-500 font-medium">Active</span> : "Inactive"}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── Loops ── */}
        {profile.loops.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">My Loops</h2>
            <div className="grid grid-cols-2 gap-3">
              {profile.loops.map(l => (
                <Card key={l.id} className="glass border-0 p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
                    {l.name[0]}
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
