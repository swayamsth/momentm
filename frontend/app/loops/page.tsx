"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Heart, MessageCircle, Users, Target, Search,
  Plus, Loader2, Send, X, Lock, Globe, Pencil, Check, Trash2,
  UserCheck, UserX, ImageIcon, ZoomIn, Calendar, ChevronDown, Bell,
  Crown, ArrowLeft,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

const PRESET_TAGS = ["Running", "Mind", "Strength", "Nutrition", "Cycling", "Recovery", "Sleep", "Other"];
const ALL_TAGS = ["All", ...PRESET_TAGS];

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

const challengesData = [
  { name: "March Mile-A-Day", loop: "5AM Run Club", progress: 68, goal: "31 miles total", participants: 240, color: "oklch(0.6 0.22 255)" },
  { name: "100k Steps Week", loop: "Cycle 100", progress: 42, goal: "100,000 group steps", participants: 86, color: "oklch(0.7 0.16 155)" },
  { name: "21-Day Meditation", loop: "Mindful Mornings", progress: 85, goal: "21 sessions", participants: 412, color: "oklch(0.55 0.18 300)" },
  { name: "Push-Up October", loop: "Strength 200", progress: 23, goal: "10,000 group push-ups", participants: 145, color: "oklch(0.62 0.22 25)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

interface JoinRequest {
  id: number;
  loop_id: number;
  loop_name: string;
  user: string;
  handle: string;
  requested_at: string;
}

interface Notification {
  id: string;
  type: 'join_request' | 'new_member';
  message: string;
  loop_id: number;
  loop_name: string;
  user: string;
  handle: string;
  membership_id?: number;
  time: string;
  read: boolean;
}

interface Comment {
  id: number;
  user: string;
  handle: string;
  text: string;
  likes: number;
  liked: boolean;
  time: string;
  is_mine: boolean;
}

interface Post {
  id: number;
  user: string;
  handle: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  comments: Comment[];
  loop?: string | null;
  loop_id?: number | null;
  loop_is_private?: boolean;
  image: string | null;
  is_mine: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getMemberSince(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

const SEEN_NOTIF_KEY = "momentm_seen_notif_ids";

function getSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_NOTIF_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSeenIds(ids: Set<string>) {
  try {
    localStorage.setItem(SEEN_NOTIF_KEY, JSON.stringify([...ids]));
  } catch { }
}

function markAllSeen(notifs: Notification[]) {
  const seen = getSeenIds();
  notifs.forEach((n) => seen.add(n.id));
  saveSeenIds(seen);
}

function countUnseen(notifs: Notification[]): number {
  const seen = getSeenIds();
  return notifs.filter((n) => !seen.has(n.id)).length;
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function UpgradeModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-sm p-6 relative z-10 space-y-4 text-center">
        <div className="w-14 h-14 rounded-full gradient-bg flex items-center justify-center mx-auto">
          <Crown className="w-7 h-7 text-primary-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Loop Limit Reached</h2>
          <p className="text-sm text-muted-foreground mt-2">
            You&apos;ve created 3 loops — the maximum on your current plan. Upgrade to Premium to create unlimited loops and unlock exclusive features.
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full gradient-bg border-0" onClick={onClose}>
            <Crown className="w-4 h-4 mr-2" /> Upgrade to Premium
          </Button>
          <Button variant="outline" className="w-full" onClick={onClose}>Maybe later</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Loop Detail Modal ────────────────────────────────────────────────────────

function LoopDetailModal({ loop, onClose, onJoin, onViewLoop }: {
  loop: Loop;
  onClose: () => void;
  onJoin: (id: number, action: "join" | "leave") => void;
  onViewLoop: (loop: Loop) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [justJoined, setJustJoined] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    const action = loop.joined ? "leave" : "join";
    try {
      await fetch(`${API}/loops/${loop.id}/${action}/`, {
        method: "POST", headers: authHeaders(),
      });
    } catch { }
    onJoin(loop.id, action);
    if (action === "join" && !loop.is_private) setJustJoined(true);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-semibold">{loop.name}</h2>
            <Badge variant="secondary" className="text-xs flex items-center gap-1">
              {loop.is_private ? <><Lock className="w-2.5 h-2.5" /> Private</> : <><Globe className="w-2.5 h-2.5" /> Public</>}
            </Badge>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: `color-mix(in oklab, ${loop.color} 18%, transparent)` }}>
            <Users className="w-7 h-7" style={{ color: loop.color }} />
          </div>
          <div>
            <Badge variant="secondary" className="text-xs mb-1">{loop.tag}</Badge>
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> {loop.members.toLocaleString()} members
            </div>
            {loop.joined_at && (loop.joined || loop.created_by_me) && (
              <div className="text-xs text-primary/70 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" /> Member since {getMemberSince(loop.joined_at)}
              </div>
            )}
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{loop.desc}</p>

        {justJoined && (
          <div className="glass rounded-xl p-3 text-center space-y-1">
            <p className="text-sm font-semibold gradient-text">🎉 Welcome to {loop.name}!</p>
            <p className="text-xs text-muted-foreground">You are now a member of this loop.</p>
          </div>
        )}

        <div className="space-y-2">
          {/* Join / Leave / Admin / Pending button */}
          {loop.created_by_me ? (
            <div className="glass rounded-xl p-3 text-center">
              <Badge className="gradient-bg text-primary-foreground border-0">You are the Admin</Badge>
            </div>
          ) : loop.pending ? (
            <div className="glass rounded-xl p-3 text-center">
              <p className="text-sm text-amber-500 font-medium">⏳ Your request is pending approval</p>
            </div>
          ) : (
            <Button
              className={`w-full ${loop.joined || justJoined ? "border-red-300 text-red-500 hover:bg-red-50" : "gradient-bg text-primary-foreground border-0"}`}
              variant={loop.joined || justJoined ? "outline" : "default"}
              onClick={handleJoin}
              disabled={loading || justJoined}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {justJoined ? "Joined ✓" : loop.joined ? "Leave Loop" : loop.is_private ? "Request to Join" : "Join Loop"}
            </Button>
          )}

          {/* View all posts button — always visible */}
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onViewLoop(loop);
              onClose();
            }}>
            View all posts in {loop.name} →
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt="Post image" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

// ─── Delete Loop Modal ─────────────────────────────────────────────────────────

function DeleteLoopModal({ loop, onClose, onConfirm }: { loop: Loop; onClose: () => void; onConfirm: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-sm p-6 relative z-10 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Delete &quot;{loop.name}&quot;?</h2>
          <p className="text-sm text-muted-foreground mt-1">This will permanently delete the loop. This cannot be undone.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>Delete Loop</Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Edit Loop Modal ──────────────────────────────────────────────────────────

function EditLoopModal({ loop, onClose, onSave }: { loop: Loop; onClose: () => void; onSave: (updated: Partial<Loop>) => void }) {
  const [name, setName] = useState(loop.name);
  const [desc, setDesc] = useState(loop.desc);
  const [tag, setTag] = useState(loop.tag);
  const [isPrivate, setIsPrivate] = useState(loop.is_private);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      await fetch(`${API}/loops/${loop.id}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name, description: desc, tag, is_private: isPrivate }),
      });
    } catch { }
    onSave({ name, desc, tag, is_private: isPrivate });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Loop Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" maxLength={50} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30" maxLength={200} />
            <p className="text-xs text-muted-foreground text-right mt-1">{desc.length}/200</p>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_TAGS.map((t) => (
                <button key={t} onClick={() => setTag(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${tag === t ? "gradient-bg text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
            <div className="flex items-center gap-2">
              {isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
              <div>
                <p className="text-sm font-medium">{isPrivate ? "Private Loop" : "Public Loop"}</p>
                <p className="text-xs text-muted-foreground">{isPrivate ? "Invite only" : "Anyone can join"}</p>
              </div>
            </div>
            <button onClick={() => setIsPrivate(!isPrivate)}
              className={`w-10 h-6 rounded-full transition-all relative ${isPrivate ? "gradient-bg" : "bg-muted"}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPrivate ? "left-5" : "left-1"}`} />
            </button>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 gradient-bg border-0" onClick={handleSave} disabled={loading || !name.trim()}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Create Loop Modal ────────────────────────────────────────────────────────

function CreateLoopModal({ onClose, onCreate }: { onClose: () => void; onCreate: (loop: Loop) => void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tag, setTag] = useState("Running");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Loop name is required."); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/loops/create/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), tag, is_private: isPrivate }),
      });
      const data = await res.json();
      if (res.ok) {
        const newLoop: Loop = { ...data, color: TAG_COLORS[data.tag] || TAG_COLORS["Other"] };
        onCreate(newLoop);
        setSuccess(true);
        setTimeout(onClose, 1200);
      } else if (data.error === "LOOP_LIMIT_REACHED") {
        setShowUpgrade(true);
      } else {
        setError(data.error || "Failed to create loop.");
      }
    } catch {
      setError("Cannot connect to server.");
    }
    setLoading(false);
  };

  if (showUpgrade) return <UpgradeModal onClose={onClose} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        {success ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-primary-foreground" />
            </div>
            <p className="font-semibold">Loop created!</p>
            <p className="text-sm text-muted-foreground mt-1">Your community is ready.</p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Loop Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 6AM Grind Squad"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" maxLength={50} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's this loop about?"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30" maxLength={200} />
                <p className="text-xs text-muted-foreground text-right mt-1">{desc.length}/200</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((t) => (
                    <button key={t} onClick={() => setTag(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${tag === t ? "gradient-bg text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:border-primary/40"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between glass rounded-xl px-4 py-3">
                <div className="flex items-center gap-2">
                  {isPrivate ? <Lock className="w-4 h-4 text-muted-foreground" /> : <Globe className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{isPrivate ? "Private Loop" : "Public Loop"}</p>
                    <p className="text-xs text-muted-foreground">{isPrivate ? "Invite only" : "Anyone can join"}</p>
                  </div>
                </div>
                <button onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-10 h-6 rounded-full transition-all relative ${isPrivate ? "gradient-bg" : "bg-muted"}`}>
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPrivate ? "left-5" : "left-1"}`} />
                </button>
              </div>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 gradient-bg border-0" onClick={handleCreate} disabled={loading || !name.trim()}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {loading ? "Creating..." : "Create Loop"}
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

// ─── Loop Card ────────────────────────────────────────────────────────────────

function LoopCard({ loop, onJoinLeave, onEdit, onDelete }: {
  loop: Loop;
  onJoinLeave: (id: number, action: "join" | "leave") => void;
  onEdit?: (loop: Loop) => void;
  onDelete?: (loop: Loop) => void;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (loop.pending) return;
    setLoading(true);
    const action = loop.joined ? "leave" : "join";
    try {
      await fetch(`${API}/loops/${loop.id}/${action}/`, { method: "POST", headers: authHeaders() });
    } catch { }
    onJoinLeave(loop.id, action);
    setLoading(false);
  };

  return (
    <Card className="glass border-0 p-5 hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${loop.color} 18%, transparent)` }}>
          <Users className="w-5 h-5" style={{ color: loop.color }} />
        </div>
        <div className="flex items-center gap-1.5">
          {loop.is_private && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          <Badge variant="secondary" className="text-xs">{loop.tag}</Badge>
          {loop.created_by_me && onEdit && (
            <button onClick={() => onEdit(loop)} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {loop.created_by_me && onDelete && (
            <button onClick={() => onDelete(loop)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      <h3 className="font-semibold">{loop.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-3 flex-1">{loop.desc}</p>
      {loop.joined && loop.joined_at && !loop.created_by_me && (
        <p className="text-xs text-primary/70 font-medium mb-3">Member since {getMemberSince(loop.joined_at)}</p>
      )}
      {loop.pending && <p className="text-xs text-amber-500 font-medium mb-3">⏳ Request pending approval</p>}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{loop.members.toLocaleString()} members</span>
        {!loop.created_by_me && (
          <Button size="sm" onClick={handleClick} disabled={loading || loop.pending}
            variant={loop.joined ? "outline" : "default"}
            className={loop.joined ? "border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
              : loop.pending ? "opacity-60 cursor-not-allowed border-border text-muted-foreground"
              : "gradient-bg text-primary-foreground border-0"}>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : loop.joined ? "Leave" : loop.pending ? "Pending" : "Join"}
          </Button>
        )}
        {loop.created_by_me && <Badge className="text-xs gradient-bg text-primary-foreground border-0">Admin</Badge>}
      </div>
    </Card>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, loops, onLikePost, onAddComment, onLikeComment, onDeletePost, onEditPost, onEditComment, onDeleteComment, onLoopClick }: {
  post: Post;
  loops: Loop[];
  onLikePost: (id: number) => void;
  onAddComment: (postId: number, text: string) => void;
  onLikeComment: (commentId: number, postId: number) => void;
  onDeletePost: (id: number) => void;
  onEditPost: (id: number, text: string) => void;
  onEditComment: (commentId: number, postId: number, text: string) => void;
  onDeleteComment: (commentId: number, postId: number) => void;
  onLoopClick: (loopId: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editCommentText, setEditCommentText] = useState("");

  const handleComment = async () => {
    if (!commentDraft.trim()) return;
    setPosting(true);
    await onAddComment(post.id, commentDraft);
    setCommentDraft("");
    setPosting(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    try {
      await fetch(`${API}/posts/${post.id}/delete/`, { method: "DELETE", headers: authHeaders() });
      onDeletePost(post.id);
    } catch { }
    setDeleting(false);
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`${API}/posts/${post.id}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text: editText }),
      });
      if (res.ok) { onEditPost(post.id, editText); setEditing(false); }
    } catch { }
    setSavingEdit(false);
  };

  const handleSaveCommentEdit = async (commentId: number) => {
    if (!editCommentText.trim()) return;
    try {
      const res = await fetch(`${API}/comments/${commentId}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text: editCommentText }),
      });
      if (res.ok) { onEditComment(commentId, post.id, editCommentText); setEditingCommentId(null); }
    } catch { }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`${API}/comments/${commentId}/delete/`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) onDeleteComment(commentId, post.id);
    } catch { }
  };

  return (
    <>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
      <Card className="glass border-0 p-4">
        <div className="flex gap-3">
          <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
            {post.user[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="font-semibold">{post.user}</span>
                <span className="text-muted-foreground">@{post.handle} · {post.time}</span>
                {post.loop && post.loop_id && (
                  <button onClick={() => onLoopClick(post.loop_id!)}
                    className="flex items-center gap-1 hover:opacity-70 transition-opacity">
                    <Badge variant="secondary" className="text-xs flex items-center gap-1 cursor-pointer hover:bg-accent">
                      {post.loop_is_private && <Lock className="w-2.5 h-2.5" />}
                      {post.loop}
                    </Badge>
                  </button>
                )}
              </div>
              {post.is_mine && (
                <div className="flex items-center gap-1">
                  <button onClick={() => { setEditing(true); setEditText(post.text); }}
                    className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-lg hover:bg-accent">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={handleDelete} disabled={deleting}
                    className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea value={editText} onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30" maxLength={500} />
                <div className="flex gap-2">
                  <Button size="sm" className="gradient-bg border-0" onClick={handleSaveEdit} disabled={savingEdit}>
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />} Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm mt-1 leading-relaxed">{post.text}</p>
            )}

            {post.image && !editing && (
              <div className="mt-3 relative group cursor-pointer rounded-xl overflow-hidden" onClick={() => setLightboxSrc(post.image!)}>
                <img src={post.image} alt="Post attachment" className="w-full max-h-64 object-cover rounded-xl transition-transform group-hover:scale-[1.01]" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                  <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                </div>
              </div>
            )}

            {!editing && (
              <div className="flex items-center gap-6 mt-3 text-muted-foreground">
                <button onClick={() => onLikePost(post.id)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-red-500" : "hover:text-red-500"}`}>
                  <Heart className={`w-4 h-4 ${post.liked ? "fill-red-500" : ""}`} /> {post.likes}
                </button>
                <button onClick={() => setShowComments(!showComments)}
                  className={`flex items-center gap-1.5 text-xs transition-colors ${showComments ? "text-primary" : "hover:text-primary"}`}>
                  <MessageCircle className="w-4 h-4" /> {post.comments.length}
                </button>
              </div>
            )}

            {showComments && !editing && (
              <div className="mt-4 space-y-3">
                <div className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">?</div>
                  <div className="flex-1 flex gap-2">
                    <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleComment()}
                      placeholder="Write a comment..." className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs outline-none" />
                    <button onClick={handleComment} disabled={posting || !commentDraft.trim()} className="text-primary hover:opacity-70 disabled:opacity-30 transition">
                      {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                {post.comments.length === 0 ? (
                  <p className="text-xs text-muted-foreground pl-9">No comments yet. Be the first!</p>
                ) : (
                  post.comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2 pl-2">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center font-semibold text-xs flex-shrink-0">
                        {comment.user[0].toUpperCase()}
                      </div>
                      <div className="flex-1 bg-muted rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold">{comment.user}</span>
                            <span className="text-muted-foreground">@{comment.handle} · {comment.time}</span>
                          </div>
                          {comment.is_mine && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button onClick={() => { setEditingCommentId(comment.id); setEditCommentText(comment.text); }}
                                className="text-muted-foreground hover:text-primary transition-colors p-0.5 rounded">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => handleDeleteComment(comment.id)}
                                className="text-muted-foreground hover:text-red-500 transition-colors p-0.5 rounded">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <div className="space-y-2">
                            <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                              className="w-full bg-background rounded-lg px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary/30" />
                            <div className="flex gap-1">
                              <button onClick={() => handleSaveCommentEdit(comment.id)} className="text-xs text-primary font-medium hover:opacity-70">Save</button>
                              <span className="text-xs text-muted-foreground">·</span>
                              <button onClick={() => setEditingCommentId(null)} className="text-xs text-muted-foreground hover:opacity-70">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs leading-relaxed">{comment.text}</p>
                        )}
                        <button onClick={() => onLikeComment(comment.id, post.id)}
                          className={`flex items-center gap-1 text-xs mt-1.5 transition-colors ${comment.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}>
                          <Heart className={`w-3 h-3 ${comment.liked ? "fill-red-500" : ""}`} />
                          {comment.likes > 0 && comment.likes}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </Card>
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoopsPage() {
  const [mounted, setMounted] = useState(false);
  const [loops, setLoops] = useState<Loop[]>([]);
  const [loadingLoops, setLoadingLoops] = useState(true);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingAllPosts, setLoadingAllPosts] = useState(true);
  const [loadingMyPosts, setLoadingMyPosts] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [draft, setDraft] = useState("");
  const [selectedLoopId, setSelectedLoopId] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLoop, setEditingLoop] = useState<Loop | null>(null);
  const [deletingLoop, setDeletingLoop] = useState<Loop | null>(null);
  const [loopDetailModal, setLoopDetailModal] = useState<Loop | null>(null);
  const [selectedMyLoop, setSelectedMyLoop] = useState<number | "all">("all");
  const [viewingLoopPosts, setViewingLoopPosts] = useState<Loop | null>(null);
  const [loopViewPosts, setLoopViewPosts] = useState<Post[]>([]);
  const [loadingLoopPosts, setLoadingLoopPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [user, setUser] = useState<{ first_name?: string; email?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch { } }
  }, []);

  const initials = mounted
    ? (user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()
    : "?";

  const fetchLoops = async () => {
    try {
      const res = await fetch(`${API}/loops/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLoops(data.map((l: any) => ({ ...l, color: TAG_COLORS[l.tag] || TAG_COLORS["Other"] })));
      }
    } catch { }
    setLoadingLoops(false);
  };

  const fetchAllPosts = async () => {
    try {
      const res = await fetch(`${API}/posts/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAllPosts(data);
      }
    } catch { }
    setLoadingAllPosts(false);
  };

  const fetchMyPosts = async (loopId?: number) => {
    setLoadingMyPosts(true);
    try {
      const url = loopId ? `${API}/posts/mine/?loop_id=${loopId}` : `${API}/posts/mine/`;
      const res = await fetch(url, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyPosts(data);
      }
    } catch { }
    setLoadingMyPosts(false);
  };

  const fetchLoopPosts = async (loop: Loop) => {
    setLoadingLoopPosts(true);
    setViewingLoopPosts(loop);
    try {
      const res = await fetch(`${API}/loops/${loop.id}/posts/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLoopViewPosts(Array.isArray(data) ? data : []);
      }
    } catch { }
    setLoadingLoopPosts(false);
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API}/loops/requests/`, { headers: authHeaders() });
      if (res.ok) setRequests(await res.json());
    } catch { }
  };

  const fetchNotifications = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`${API}/notifications/`, { headers: authHeaders() });
      if (!res.ok) return;
      const data: Notification[] = await res.json();
      setNotifications(data);
      if (isInitial) {
        markAllSeen(data);
        setUnreadCount(0);
      } else {
        setUnreadCount(countUnseen(data));
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchLoops();
    fetchAllPosts();
    fetchMyPosts();
    fetchRequests();
    fetchNotifications(true);
    const interval = setInterval(() => {
      fetchAllPosts();
      fetchNotifications(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleOpenNotifications = () => {
    const opening = !showNotifications;
    setShowNotifications(opening);
    if (opening) {
      markAllSeen(notifications);
      setUnreadCount(0);
    }
  };

  const handleMyLoopFilter = (value: number | "all") => {
    setSelectedMyLoop(value);
    setViewingLoopPosts(null);
    fetchMyPosts(value === "all" ? undefined : value as number);
  };

  const handleViewLoopPosts = (loop: Loop) => {
    fetchLoopPosts(loop);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setPostError("Image must be under 10MB."); return; }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handlePost = async () => {
    if (!draft.trim() && !imagePreview) return;
    setPosting(true);
    setPostError("");
    try {
      const formData = new FormData();
      formData.append("text", draft);
      if (selectedLoopId) formData.append("loop_id", String(selectedLoopId));
      if (imageFile) formData.append("image", imageFile);
      const res = await fetch(`${API}/posts/create/`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAllPosts((prev) => [data, ...prev]);
        setMyPosts((prev) => [data, ...prev]);
        setDraft(""); setImagePreview(null); setImageFile(null); setSelectedLoopId(null);
      } else {
        setPostError(data.error || "Failed to post.");
      }
    } catch {
      setPostError("Cannot connect to server.");
    }
    setPosting(false);
  };

  const handleJoinLeave = (id: number, action: "join" | "leave") => {
    setLoops((prev) => prev.map((l) => {
      if (l.id !== id) return l;
      if (action === "leave") return { ...l, joined: false, pending: false, members: l.members - 1 };
      if (l.is_private) return { ...l, pending: true };
      return { ...l, joined: true, members: l.members + 1, joined_at: new Date().toISOString() };
    }));
  };

  const handleLoopClick = (loopId: number) => {
    const loop = loops.find((l) => l.id === loopId);
    if (loop) setLoopDetailModal(loop);
  };

  const updatePosts = (fn: (posts: Post[]) => Post[]) => {
    setAllPosts(fn);
    setMyPosts(fn);
    setLoopViewPosts(fn);
  };

  const handleDeletePost = (postId: number) => updatePosts((p) => p.filter((x) => x.id !== postId));
  const handleEditPost = (postId: number, text: string) => updatePosts((p) => p.map((x) => x.id === postId ? { ...x, text } : x));
  const handleEditComment = (commentId: number, postId: number, text: string) =>
    updatePosts((p) => p.map((x) => x.id === postId ? { ...x, comments: x.comments.map((c) => c.id === commentId ? { ...c, text } : c) } : x));
  const handleDeleteComment = (commentId: number, postId: number) =>
    updatePosts((p) => p.map((x) => x.id === postId ? { ...x, comments: x.comments.filter((c) => c.id !== commentId) } : x));

  const handleLikePost = async (postId: number) => {
    try {
      const res = await fetch(`${API}/posts/${postId}/like/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok) updatePosts((p) => p.map((x) => x.id === postId ? { ...x, likes: data.likes, liked: data.liked } : x));
    } catch {
      updatePosts((p) => p.map((x) => x.id === postId ? { ...x, liked: !x.liked, likes: x.liked ? x.likes - 1 : x.likes + 1 } : x));
    }
  };

  const handleAddComment = async (postId: number, text: string) => {
    try {
      const res = await fetch(`${API}/posts/${postId}/comment/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok) updatePosts((p) => p.map((x) => x.id === postId ? { ...x, comments: [...x.comments, data] } : x));
    } catch {
      const local: Comment = {
        id: Date.now(), user: user?.first_name || "You",
        handle: user?.email?.split("@")[0] || "you",
        text, likes: 0, liked: false, time: "just now", is_mine: true,
      };
      updatePosts((p) => p.map((x) => x.id === postId ? { ...x, comments: [...x.comments, local] } : x));
    }
  };

  const handleLikeComment = async (commentId: number, postId: number) => {
    try {
      const res = await fetch(`${API}/comments/${commentId}/like/`, {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      const data = await res.json();
      if (res.ok) updatePosts((p) => p.map((x) =>
        x.id === postId
          ? { ...x, comments: x.comments.map((c) => c.id === commentId ? { ...c, likes: data.likes, liked: data.liked } : c) }
          : x));
    } catch {
      updatePosts((p) => p.map((x) =>
        x.id === postId
          ? { ...x, comments: x.comments.map((c) => c.id === commentId ? { ...c, liked: !c.liked, likes: c.liked ? c.likes - 1 : c.likes + 1 } : c) }
          : x));
    }
  };

  const handleApproveRequest = async (req: JoinRequest) => {
    try {
      await fetch(`${API}/loops/requests/${req.id}/approve/`, { method: "POST", headers: authHeaders() });
    } catch { }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setLoops((prev) => prev.map((l) => l.id === req.loop_id ? { ...l, members: l.members + 1 } : l));
    fetchNotifications(false);
  };

  const handleDenyRequest = async (req: JoinRequest) => {
    try {
      await fetch(`${API}/loops/requests/${req.id}/deny/`, { method: "POST", headers: authHeaders() });
    } catch { }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    fetchNotifications(false);
  };

  const myJoinedLoops = loops.filter((l) => l.joined || l.created_by_me);
  const recentLoops = myJoinedLoops.slice(0, 2);
  const selectedLoopInfo = selectedMyLoop !== "all" ? loops.find((l) => l.id === selectedMyLoop) : null;

  const filteredLoops = loops.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === "All" || l.tag === activeTag;
    return matchesSearch && matchesTag;
  });

  const postCardProps = {
    loops,
    onLikePost: handleLikePost,
    onAddComment: handleAddComment,
    onLikeComment: handleLikeComment,
    onDeletePost: handleDeletePost,
    onEditPost: handleEditPost,
    onEditComment: handleEditComment,
    onDeleteComment: handleDeleteComment,
    onLoopClick: handleLoopClick,
  };

  if (!mounted) return null;

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Loops</h1>
            <p className="text-sm text-muted-foreground">Small communities. Big momentum.</p>
          </div>

          {/* Single notification bell — top right only */}
          <div className="relative">
            <button onClick={handleOpenNotifications}
              className="relative p-2 rounded-xl glass hover:bg-accent transition-colors">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 z-50">
                <Card className="glass-strong border-0 p-3 space-y-2 max-h-80 overflow-y-auto shadow-lg">
                  <div className="flex items-center justify-between px-1">
                    <p className="text-sm font-semibold">Notifications</p>
                    <button onClick={() => setShowNotifications(false)} className="text-muted-foreground hover:text-foreground">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No notifications yet</p>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="glass rounded-xl p-3 space-y-1">
                        <div className="flex items-start gap-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold text-white ${n.type === 'join_request' ? 'bg-amber-500' : 'bg-green-500'}`}>
                            {n.user[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-relaxed">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.time}</p>
                          </div>
                        </div>
                        {n.type === 'join_request' && n.membership_id && (
                          <div className="flex gap-2 pl-9">
                            <button onClick={() => { handleApproveRequest({ id: n.membership_id!, loop_id: n.loop_id, loop_name: n.loop_name, user: n.user, handle: n.handle, requested_at: n.time }); setShowNotifications(false); }}
                              className="text-xs text-primary font-medium hover:opacity-70">Approve</button>
                            <span className="text-xs text-muted-foreground">·</span>
                            <button onClick={() => { handleDenyRequest({ id: n.membership_id!, loop_id: n.loop_id, loop_name: n.loop_name, user: n.user, handle: n.handle, requested_at: n.time }); setShowNotifications(false); }}
                              className="text-xs text-red-500 font-medium hover:opacity-70">Deny</button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </Card>
              </div>
            )}
          </div>
        </div>

        <Tabs defaultValue="feed">
          <TabsList className="glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="myloops">My Loops</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {requests.length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {requests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Feed Tab ── */}
          <TabsContent value="feed" className="space-y-4 mt-6 max-w-2xl">
            <div>
              <h2 className="font-semibold text-lg">All Posts</h2>
              <p className="text-xs text-muted-foreground">Public loop posts and your private loop posts</p>
            </div>
            <Card className="glass border-0 p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1">
                  <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handlePost()}
                    placeholder="Share your progress..."
                    className="w-full bg-transparent text-sm outline-none resize-none min-h-[60px]" maxLength={500} />
                  {myJoinedLoops.length > 0 && (
                    <div className="mt-2">
                      <select value={selectedLoopId ?? ""}
                        onChange={(e) => setSelectedLoopId(e.target.value ? Number(e.target.value) : null)}
                        className="text-xs bg-muted rounded-lg px-3 py-1.5 outline-none text-muted-foreground w-full">
                        <option value="">🌐 No loop (public post)</option>
                        {myJoinedLoops.map((l) => (
                          <option key={l.id} value={l.id}>{l.is_private ? "🔒 " : "🌐 "}{l.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {imagePreview && (
                    <div className="relative mt-2 rounded-xl overflow-hidden inline-block">
                      <img src={imagePreview} alt="Preview" className="max-h-48 max-w-full rounded-xl object-cover" />
                      <button onClick={() => { setImagePreview(null); setImageFile(null); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {postError && <p className="text-xs text-red-500 mt-2">{postError}</p>}
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                      <button onClick={() => fileInputRef.current?.click()}
                        className="text-muted-foreground hover:text-primary transition-colors p-1.5 rounded-lg hover:bg-accent">
                        <ImageIcon className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-muted-foreground">{draft.length}/500</span>
                    </div>
                    <Button size="sm" className="gradient-bg border-0" onClick={handlePost}
                      disabled={posting || (!draft.trim() && !imagePreview)}>
                      {posting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
            {loadingAllPosts ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : allPosts.length === 0 ? (
              <Card className="glass border-0 p-8 text-center"><p className="text-sm text-muted-foreground">No posts yet. Be the first to share your progress!</p></Card>
            ) : (
              allPosts.map((p) => <PostCard key={p.id} post={p} {...postCardProps} />)
            )}
          </TabsContent>

          {/* ── My Loops Tab ── */}
          <TabsContent value="myloops" className="space-y-4 mt-6 max-w-2xl">
            {myJoinedLoops.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">You haven&apos;t joined any loops yet</p>
                <p className="text-xs text-muted-foreground mt-1">Go to Explore to find and join loops.</p>
              </Card>
            ) : viewingLoopPosts ? (
              <>
                <button onClick={() => setViewingLoopPosts(null)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to My Loops
                </button>
                <Card className="glass border-0 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `color-mix(in oklab, ${viewingLoopPosts.color} 18%, transparent)` }}>
                      <Users className="w-5 h-5" style={{ color: viewingLoopPosts.color }} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{viewingLoopPosts.name}</span>
                        <Badge variant="secondary" className="text-xs flex items-center gap-1">
                          {viewingLoopPosts.is_private ? <><Lock className="w-2.5 h-2.5" /> Private</> : <><Globe className="w-2.5 h-2.5" /> Public</>}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">{viewingLoopPosts.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{viewingLoopPosts.members.toLocaleString()} members</span>
                        {viewingLoopPosts.joined_at && (
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Member since {getMemberSince(viewingLoopPosts.joined_at)}</span>
                        )}
                        {viewingLoopPosts.created_by_me && <Badge className="text-xs gradient-bg text-primary-foreground border-0">Admin</Badge>}
                      </div>
                    </div>
                  </div>
                </Card>
                <h3 className="text-sm font-semibold text-muted-foreground">
                  All posts in {viewingLoopPosts.name} ({loopViewPosts.length})
                </h3>
                {loadingLoopPosts ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : loopViewPosts.length === 0 ? (
                  <Card className="glass border-0 p-8 text-center"><p className="text-sm text-muted-foreground">No posts in this loop yet.</p></Card>
                ) : (
                  <div className="space-y-3">
                    {loopViewPosts.map((p) => <PostCard key={p.id} post={p} {...postCardProps} />)}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="relative">
                  <select value={selectedMyLoop}
                    onChange={(e) => handleMyLoopFilter(e.target.value === "all" ? "all" : Number(e.target.value))}
                    className="w-full glass border border-border rounded-xl px-4 py-3 text-sm outline-none appearance-none cursor-pointer pr-10">
                    <option value="all">All my posts (across all loops)</option>
                    {myJoinedLoops.map((l) => (
                      <option key={l.id} value={l.id}>{l.is_private ? "🔒 " : "🌐 "}{l.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                </div>

                {selectedLoopInfo ? (
                  <Card className="glass border-0 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ background: `color-mix(in oklab, ${selectedLoopInfo.color} 18%, transparent)` }}>
                        <Users className="w-5 h-5" style={{ color: selectedLoopInfo.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{selectedLoopInfo.name}</span>
                          <Badge variant="secondary" className="text-xs flex items-center gap-1">
                            {selectedLoopInfo.is_private ? <><Lock className="w-2.5 h-2.5" /> Private</> : <><Globe className="w-2.5 h-2.5" /> Public</>}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">{selectedLoopInfo.tag}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{selectedLoopInfo.members.toLocaleString()} members</span>
                          {selectedLoopInfo.joined_at && (
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Member since {getMemberSince(selectedLoopInfo.joined_at)}</span>
                          )}
                          {selectedLoopInfo.created_by_me && <Badge className="text-xs gradient-bg text-primary-foreground border-0">Admin</Badge>}
                        </div>
                      </div>
                    </div>
                  </Card>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {recentLoops.map((l) => (
                      <Card key={l.id} className="glass border-0 p-3 cursor-pointer hover:shadow-sm transition-all"
                        onClick={() => handleViewLoopPosts(l)}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                            style={{ background: `color-mix(in oklab, ${l.color} 18%, transparent)` }}>
                            <Users className="w-3.5 h-3.5" style={{ color: l.color }} />
                          </div>
                          <span className="text-xs font-semibold truncate flex-1">{l.name}</span>
                          {l.is_private ? <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" /> : <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                        </div>
                        <div className="text-xs text-muted-foreground">{l.members.toLocaleString()} members</div>
                        {l.joined_at && !l.created_by_me && <div className="text-xs text-primary/70 mt-0.5">Since {getMemberSince(l.joined_at)}</div>}
                        {l.created_by_me && <div className="text-xs text-primary mt-0.5">Admin</div>}
                        <div className="text-xs text-primary mt-1 font-medium">View posts →</div>
                      </Card>
                    ))}
                    {myJoinedLoops.length > 2 && (
                      <div className="col-span-2 text-center">
                        <p className="text-xs text-muted-foreground">+{myJoinedLoops.length - 2} more loops — use the dropdown above to switch</p>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold mb-3 text-muted-foreground">
                    {selectedMyLoop === "all"
                      ? `Your posts across all loops (${myPosts.length})`
                      : `All posts in ${selectedLoopInfo?.name} (${myPosts.length})`}
                  </h3>
                  {loadingMyPosts ? (
                    <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                  ) : myPosts.length === 0 ? (
                    <Card className="glass border-0 p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        {selectedMyLoop === "all"
                          ? "You haven't made any posts yet. Go to Feed to share your progress!"
                          : `No posts in ${selectedLoopInfo?.name} yet.`}
                      </p>
                    </Card>
                  ) : (
                    <div className="space-y-3">
                      {myPosts.map((p) => <PostCard key={p.id} post={p} {...postCardProps} />)}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Explore Tab ── */}
          <TabsContent value="explore" className="space-y-4 mt-6">
            <div className="flex gap-2">
              <div className="flex-1 glass rounded-xl flex items-center gap-2 px-4">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search loops..." className="flex-1 bg-transparent py-3 text-sm outline-none" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button className="gradient-bg border-0" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-1" />Create
              </Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ALL_TAGS.map((t) => (
                <button key={t} onClick={() => setActiveTag(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${activeTag === t ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground hover:border-primary/40"}`}>
                  {t}
                </button>
              ))}
            </div>
            {loadingLoops ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : filteredLoops.length === 0 ? (
              <Card className="glass border-0 p-8 text-center"><p className="text-sm text-muted-foreground">No loops found. Try a different search or create one!</p></Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLoops.map((l) => (
                  <LoopCard key={l.id} loop={l}
                    onJoinLeave={handleJoinLeave}
                    onEdit={l.created_by_me ? setEditingLoop : undefined}
                    onDelete={l.created_by_me ? setDeletingLoop : undefined} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Challenges Tab ── */}
          <TabsContent value="challenges" className="space-y-4 mt-6">
            <div className="grid md:grid-cols-2 gap-4">
              {challengesData.map((c) => (
                <Card key={c.name} className="glass border-0 p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <Badge variant="secondary" className="text-xs mb-2">{c.loop}</Badge>
                      <h3 className="font-semibold">{c.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{c.goal}</p>
                    </div>
                    <Target className="w-5 h-5" style={{ color: c.color }} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Group progress</span>
                      <span className="font-semibold">{c.progress}%</span>
                    </div>
                    <Progress value={c.progress} />
                    <div className="text-xs text-muted-foreground">{c.participants} participants</div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Requests Tab ── */}
          <TabsContent value="requests" className="space-y-4 mt-6 max-w-2xl">
            {requests.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">Join requests for your private loops will appear here.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{requests.length} pending request{requests.length > 1 ? "s" : ""} for your loops</p>
                {requests.map((req) => (
                  <Card key={req.id} className="glass border-0 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                        {req.user[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{req.user}</span>
                          <span className="text-muted-foreground text-xs">@{req.handle}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Wants to join <span className="font-medium text-foreground">{req.loop_name}</span> · {req.requested_at}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleApproveRequest(req)} className="gradient-bg text-primary-foreground border-0 gap-1">
                          <UserCheck className="w-3.5 h-3.5" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDenyRequest(req)} className="border-red-200 text-red-500 hover:bg-red-50 gap-1">
                          <UserX className="w-3.5 h-3.5" /> Deny
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateLoopModal onClose={() => setShowCreateModal(false)} onCreate={(loop) => setLoops((p) => [loop, ...p])} />}
      {editingLoop && (
        <EditLoopModal loop={editingLoop} onClose={() => setEditingLoop(null)} onSave={(updated) => {
          setLoops((prev) => prev.map((l) => l.id === editingLoop.id
            ? { ...l, ...updated, color: TAG_COLORS[(updated.tag ?? l.tag)] || TAG_COLORS["Other"] } : l));
        }} />
      )}
      {deletingLoop && (
        <DeleteLoopModal loop={deletingLoop} onClose={() => setDeletingLoop(null)} onConfirm={async () => {
          try { await fetch(`${API}/loops/${deletingLoop.id}/delete/`, { method: "DELETE", headers: authHeaders() }); } catch { }
          setLoops((prev) => prev.filter((l) => l.id !== deletingLoop.id));
          setDeletingLoop(null);
        }} />
      )}
      {loopDetailModal && (
        <LoopDetailModal
          loop={loopDetailModal}
          onClose={() => setLoopDetailModal(null)}
          onViewLoop={(loop) => {
            setViewingLoopPosts(null);
            fetchLoopPosts(loop);
          }}
          onJoin={(id, action) => {
            handleJoinLeave(id, action);
            setLoopDetailModal((prev) => prev ? {
              ...prev,
              joined: action === "join" && !prev.is_private,
              pending: action === "join" && prev.is_private,
              members: action === "join" && !prev.is_private ? prev.members + 1 : action === "leave" ? prev.members - 1 : prev.members,
            } : null);
          }}
        />
      )}
    </AppShell>
  );
}