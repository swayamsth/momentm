"use client";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Users, Lock, Globe, Loader2, Search, X, SlidersHorizontal,
} from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const PRESET_TAGS = ["Running", "Mind", "Strength", "Nutrition", "Cycling", "Recovery", "Sleep", "Other"];

const TAG_COLORS: Record<string, string> = {
  Running: "oklch(0.6 0.22 255)",
  Mind: "oklch(0.55 0.18 300)",
  Strength: "oklch(0.62 0.22 25)",
  Nutrition: "oklch(0.7 0.16 155)",
  Cycling: "oklch(0.78 0.16 75)",
  Recovery: "oklch(0.5 0.15 280)",
  Sleep: "oklch(0.65 0.18 220)",
  Other: "oklch(0.6 0.08 250)",
};

interface Loop {
  id: number;
  name: string;
  members: number;
  tag: string;
  desc: string;
  color: string;
  is_private: boolean;
  created_by_me: boolean;
  joined: boolean;
  pending: boolean;
  joined_at?: string;
  image_url?: string | null;
  cover_url?: string | null;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getMemberSince(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function LoopAvatar({ loop }: { loop: Loop }) {
  if (loop.image_url) {
    return <img src={loop.image_url} alt={loop.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />;
  }
  return (
    <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: `color-mix(in oklab, ${loop.color} 18%, transparent)` }}>
      <Users className="w-5 h-5" style={{ color: loop.color }} />
    </div>
  );
}

type VisibilityFilter = "all" | "public" | "private";

export default function MyLoopsPage() {
  const router = useRouter();
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [activeTag, setActiveTag] = useState("All");

  useEffect(() => { setMounted(true); }, []);

  const fetchLoops = useCallback(async () => {
    try {
      const res = await fetch(`${API}/loops/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLoops(
          data
            .filter((l: Loop) => l.joined || l.created_by_me)
            .map((l: Loop) => ({ ...l, color: TAG_COLORS[l.tag] || TAG_COLORS["Other"] }))
        );
      }
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mounted) fetchLoops();
  }, [mounted, fetchLoops]);

  const filtered = useMemo(() => {
    return loops.filter((l) => {
      const matchesSearch = !searchQuery ||
        l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.desc?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "private" && l.is_private) ||
        (visibilityFilter === "public" && !l.is_private);
      const matchesTag = activeTag === "All" || l.tag === activeTag;
      return matchesSearch && matchesVisibility && matchesTag;
    });
  }, [loops, searchQuery, visibilityFilter, activeTag]);

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/loops")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Loops
          </button>
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Loops</h1>
          <p className="text-sm text-muted-foreground mt-1">All the communities you&apos;re part of.</p>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="glass rounded-xl flex items-center gap-2 px-4">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your loops..." className="flex-1 bg-transparent py-3 text-sm outline-none" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Visibility + Category filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            {(["all", "public", "private"] as VisibilityFilter[]).map((v) => (
              <button key={v} onClick={() => setVisibilityFilter(v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${visibilityFilter === v ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground hover:border-primary/40"}`}>
                {v === "private" && <Lock className="w-3 h-3" />}
                {v === "public" && <Globe className="w-3 h-3" />}
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
            <span className="text-border">|</span>
            {["All", ...PRESET_TAGS].map((t) => (
              <button key={t} onClick={() => setActiveTag(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${activeTag === t ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground hover:border-primary/40"}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Loop count */}
        <p className="text-xs text-muted-foreground">
          {loading ? "Loading..." : `${filtered.length} loop${filtered.length !== 1 ? "s" : ""}`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <Card className="glass border-0 p-10 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-sm">No loops match your filters</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((loop) => (
              <button key={loop.id} onClick={() => router.push(`/loops/${loop.id}`)}
                className="text-left group">
                <Card className="glass border-0 p-5 hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <LoopAvatar loop={loop} />
                    <div className="flex items-center gap-1.5">
                      {loop.is_private
                        ? <Badge variant="secondary" className="text-xs flex items-center gap-1"><Lock className="w-2.5 h-2.5" />Private</Badge>
                        : <Badge variant="secondary" className="text-xs flex items-center gap-1"><Globe className="w-2.5 h-2.5" />Public</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm">{loop.name}</h3>
                    {loop.created_by_me && (
                      <Badge className="text-[10px] h-4 px-1.5 gradient-bg text-primary-foreground border-0">Admin</Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className="text-xs w-fit mb-2">{loop.tag}</Badge>
                  <p className="text-xs text-muted-foreground flex-1 line-clamp-2">{loop.desc}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/40">
                    <span className="text-xs text-muted-foreground">{loop.members.toLocaleString()} members</span>
                    {loop.joined_at && (
                      <span className="text-xs text-primary/70">Since {getMemberSince(loop.joined_at)}</span>
                    )}
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
