"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Heart, MessageCircle, Users, Search,
  Plus, Loader2, Send, X, Lock, Globe, Pencil, Check, Trash2,
  UserCheck, UserX, ImageIcon, ZoomIn, Calendar, ChevronDown,
  Crown, ArrowLeft, TrendingUp, Flame, Camera, Utensils, Zap,
} from "lucide-react";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { usePremium } from "@/hooks/usePremium";

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
  image_url?: string | null;
  cover_url?: string | null;
}

interface JoinRequest {
  id: number;
  loop_id: number;
  loop_name: string;
  user: string;
  handle: string;
  requested_at: string;
}

interface Comment {
  id: number;
  user_id: number;
  user: string;
  handle: string;
  avatar_url: string | null;
  text: string;
  likes: number;
  liked: boolean;
  time: string;
  is_mine: boolean;
}

interface Post {
  id: number;
  user_id: number;
  user: string;
  handle: string;
  avatar_url: string | null;
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

function handleUnauthorized() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  localStorage.removeItem("user");
  window.location.href = "/";
}

async function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, { ...options, headers: { ...authHeaders(), ...(options?.headers || {}) } });
  if (res.status === 401) handleUnauthorized();
  return res;
}

function getMemberSince(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function loadUser(): { first_name?: string; email?: string } | null {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

const SEARCH_HISTORY_KEY = "momentm_loop_search_history";

function getSearchHistory(): string[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(SEARCH_HISTORY_KEY) : null;
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveToSearchHistory(term: string) {
  try {
    const history = getSearchHistory().filter((h) => h.toLowerCase() !== term.toLowerCase());
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify([term, ...history].slice(0, 8)));
  } catch { }
}

function removeFromSearchHistory(term: string) {
  try {
    const history = getSearchHistory().filter((h) => h !== term);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch { }
}


// ─── Search Bar with Suggestions + History ────────────────────────────────────

function LoopSearchBar({
  loops,
  searchQuery,
  setSearchQuery,
  onNavigateToLoop,
}: {
  loops: Loop[];
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  onNavigateToLoop: (id: number) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setHistory(getSearchHistory());
  }, [focused]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const suggestions = searchQuery.trim().length > 0
    ? loops.filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.desc?.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  const showDropdown = focused && (suggestions.length > 0 || (searchQuery === "" && history.length > 0));

  const handleSelectSuggestion = (loop: Loop) => {
    saveToSearchHistory(loop.name);
    setFocused(false);
    onNavigateToLoop(loop.id);
  };

  const handleSelectHistory = (term: string) => {
    setSearchQuery(term);
    setFocused(true);
  };

  const handleRemoveHistory = (term: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromSearchHistory(term);
    setHistory(getSearchHistory());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      saveToSearchHistory(searchQuery.trim());
      setFocused(false);
    }
    if (e.key === "Escape") setFocused(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="glass rounded-xl flex items-center gap-2 px-4">
        <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search loops..."
          className="flex-1 bg-transparent py-3 text-sm outline-none"
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(""); setFocused(true); }} className="text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-background rounded-xl shadow-lg border border-border overflow-hidden">
          {searchQuery === "" && history.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-1 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Recent searches</span>
              </div>
              {history.map((term) => (
                <button key={term} onClick={() => handleSelectHistory(term)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left">
                  <div className="flex items-center gap-2 min-w-0">
                    <Search className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm truncate">{term}</span>
                  </div>
                  <button onClick={(e) => handleRemoveHistory(term, e)}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded flex-shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </button>
              ))}
            </>
          )}
          {suggestions.length > 0 && (
            <>
              {searchQuery && (
                <div className="px-4 pt-3 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground">Loops</span>
                </div>
              )}
              {suggestions.map((loop) => (
                <button key={loop.id} onClick={() => handleSelectSuggestion(loop)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-accent transition-colors text-left">
                  <LoopAvatar loop={loop} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{loop.name}</span>
                      {loop.is_private && <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />}
                    </div>
                    <span className="text-xs text-muted-foreground">{loop.members} members · {loop.tag}</span>
                  </div>
                  {loop.joined || loop.created_by_me ? (
                    <Badge className="text-[10px] gradient-bg text-primary-foreground border-0 flex-shrink-0">
                      {loop.created_by_me ? "Admin" : "Joined"}
                    </Badge>
                  ) : null}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Loop Avatar ──────────────────────────────────────────────────────────────

function LoopAvatar({ loop, size = "md" }: { loop: Loop; size?: "sm" | "md" | "lg" }) {
  const sizeMap = {
    sm: { wrapper: "w-7 h-7", icon: "w-3.5 h-3.5" },
    md: { wrapper: "w-12 h-12", icon: "w-5 h-5" },
    lg: { wrapper: "w-14 h-14", icon: "w-7 h-7" },
  };
  const s = sizeMap[size];
  if (loop.image_url) {
    return <img src={loop.image_url} alt={loop.name} className={`${s.wrapper} rounded-xl object-cover flex-shrink-0`} />;
  }
  return (
    <div className={`${s.wrapper} rounded-xl flex items-center justify-center flex-shrink-0`}
      style={{ background: `color-mix(in oklab, ${loop.color} 18%, transparent)` }}>
      <Users className={s.icon} style={{ color: loop.color }} />
    </div>
  );
}

// ─── Upgrade Modal ────────────────────────────────────────────────────────────

function UpgradeModal({ onClose, onUpgrade }: { onClose: () => void; onUpgrade: () => void }) {
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
            You&apos;ve created 3 loops — the maximum on your current plan. Upgrade to Premium to create unlimited loops.
          </p>
        </div>
        <div className="space-y-2">
          <Button className="w-full gradient-bg border-0" onClick={onUpgrade}>
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
      await fetch(`${API}/loops/${loop.id}/${action}/`, { method: "POST", headers: authHeaders() });
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
              {loop.is_private ? <><Lock className="w-2.5 h-2.5" />Private</> : <><Globe className="w-2.5 h-2.5" />Public</>}
            </Badge>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <LoopAvatar loop={loop} size="lg" />
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
          <Button variant="outline" className="w-full" onClick={() => { onViewLoop(loop); onClose(); }}>
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

// ─── Delete Loop Modal ────────────────────────────────────────────────────────

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

function EditLoopModal({ loop, onClose, onSave }: {
  loop: Loop;
  onClose: () => void;
  onSave: (updated: Partial<Loop>) => void;
}) {
  const [name, setName] = useState(loop.name);
  const [desc, setDesc] = useState(loop.desc);
  const [tag, setTag] = useState(loop.tag);
  const [isPrivate, setIsPrivate] = useState(loop.is_private);
  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(loop.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setImageError("Image must be under 10MB."); return; }
    setImageFile(file);
    setImageError("");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    setLoading(true);
    let newImageUrl = loop.image_url || null;

    if (imageFile) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch(`${API}/loops/${loop.id}/upload-image/`, {
          method: "POST",
          headers: authHeaders(),
          body: formData,
        });
        const data = await res.json();
        if (res.ok) {
          newImageUrl = data.image_url;
        } else {
          setImageError(data.error || "Image upload failed.");
        }
      } catch {
        setImageError("Could not upload image.");
      }
      setUploadingImage(false);
    }

    try {
      await fetch(`${API}/loops/${loop.id}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name, description: desc, tag, is_private: isPrivate }),
      });
    } catch { }

    onSave({ name, desc, tag, is_private: isPrivate, image_url: newImageUrl });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Group Image Upload */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Group Image</label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Group" className="w-full h-32 object-cover rounded-xl" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 hover:opacity-100 transition-opacity rounded-xl">
                <button onClick={() => imageInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg bg-white/20 text-white text-xs font-medium hover:bg-white/30 flex items-center gap-1">
                  <ImageIcon className="w-3.5 h-3.5" /> Change
                </button>
                <button onClick={() => { setImagePreview(null); setImageFile(null); }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/80 text-white text-xs font-medium hover:bg-red-600/80 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => imageInputRef.current?.click()}
              className="w-full h-32 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary bg-muted/30">
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Upload group image</span>
              <span className="text-xs opacity-60">JPG, PNG up to 10MB</span>
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {imageError && <p className="text-xs text-red-500 mt-1">{imageError}</p>}
          {uploadingImage && (
            <p className="text-xs text-primary mt-1 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Uploading image...
            </p>
          )}
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
  const { isPremium } = usePremium();
  const router = useRouter();
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
        if (isPremium) {
          setError("Server loop limit reached. Please contact support.");
        } else {
          setShowUpgrade(true);
        }
      } else {
        setError(data.error || "Failed to create loop.");
      }
    } catch {
      setError("Cannot connect to server.");
    }
    setLoading(false);
  };

  if (showUpgrade) return (
    <UpgradeModal onClose={onClose} onUpgrade={() => router.push("/payment?plan=premium")} />
  );

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
        <LoopAvatar loop={loop} size="md" />
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
          <Link href={post.is_mine ? "/profile" : `/profile/${post.user_id}`} className="shrink-0">
            <div className="w-10 h-10 rounded-full overflow-hidden gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm hover:opacity-80 transition-opacity">
              {post.avatar_url
                ? <img src={post.avatar_url} alt={post.user} className="w-full h-full object-cover" />
                : post.user[0].toUpperCase()
              }
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm flex-wrap">
                <Link href={post.is_mine ? "/profile" : `/profile/${post.user_id}`} className="font-semibold hover:underline">{post.user}</Link>
                <span className="text-muted-foreground">@{post.handle} · {post.time}</span>
                {post.loop && post.loop_id && (
                  <button onClick={() => onLoopClick(post.loop_id!)} className="flex items-center gap-1 hover:opacity-70 transition-opacity">
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
                      <Link href={comment.is_mine ? "/profile" : `/profile/${comment.user_id}`} className="shrink-0">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center font-semibold text-xs hover:opacity-80 transition-opacity">
                          {comment.avatar_url
                            ? <img src={comment.avatar_url} alt={comment.user} className="w-full h-full object-cover" />
                            : comment.user[0].toUpperCase()
                          }
                        </div>
                      </Link>
                      <div className="flex-1 bg-muted rounded-xl px-3 py-2">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Link href={comment.is_mine ? "/profile" : `/profile/${comment.user_id}`} className="font-semibold hover:underline">{comment.user}</Link>
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

// ─── Join Requests Sidebar ────────────────────────────────────────────────────

function JoinRequestsSidebar({ requests, onApprove, onDeny }: {
  requests: JoinRequest[];
  onApprove: (req: JoinRequest) => void;
  onDeny: (req: JoinRequest) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <UserCheck className="w-4 h-4 text-amber-500" />
        <h3 className="font-semibold text-sm">Join Requests</h3>
        <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] flex items-center justify-center font-bold">
          {requests.length > 9 ? "9+" : requests.length}
        </span>
      </div>
      <div className="space-y-2">
        {requests.slice(0, 5).map((req) => (
          <Card key={req.id} className="glass border-0 p-3">
            <div className="flex items-center gap-2 mb-2.5">
              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                {req.user[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{req.user}</p>
                <p className="text-xs text-muted-foreground truncate">→ {req.loop_name}</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 gradient-bg text-primary-foreground border-0 h-7 text-xs gap-1"
                onClick={() => onApprove(req)}>
                <UserCheck className="w-3 h-3" /> Approve
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs border-red-200 text-red-500 hover:bg-red-50 gap-1"
                onClick={() => onDeny(req)}>
                <UserX className="w-3 h-3" /> Deny
              </Button>
            </div>
          </Card>
        ))}
        {requests.length > 5 && (
          <p className="text-xs text-muted-foreground text-center py-1">+{requests.length - 5} more in Requests tab</p>
        )}
      </div>
    </div>
  );
}

// ─── Activity Ticker ──────────────────────────────────────────────────────────

function ActivityTicker({ posts }: { posts: Post[] }) {
  if (posts.length === 0) return null;
  const items = posts.slice(0, 10).map((p) =>
    p.loop ? `${p.user} posted in ${p.loop}` : `${p.user} shared a public update`
  );
  const all = [...items, ...items];
  return (
    <>
      <style>{`@keyframes ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
      <div className="glass rounded-2xl px-4 py-2.5 mb-5 flex items-center gap-3 overflow-hidden">
        <div className="flex items-center gap-1.5 shrink-0 pr-3 border-r border-border/60">
          <Flame className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-xs font-semibold text-orange-500">Live</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <div style={{ animation: "ticker-scroll 28s linear infinite", display: "flex", gap: "2.5rem", whiteSpace: "nowrap" }}>
            {all.map((item, i) => (
              <span key={i} className="text-xs text-muted-foreground shrink-0">
                {item}<span className="mx-3 opacity-30">•</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Trending Loops Sidebar ───────────────────────────────────────────────────

function TrendingLoopsSidebar({ loops, posts, onLoopClick, onJoinLeave }: {
  loops: Loop[];
  posts: Post[];
  onLoopClick: (id: number) => void;
  onJoinLeave: (id: number, action: "join" | "leave") => void;
}) {
  const trending = useMemo(() => {
    const stats = new Map<number, { likes: number; comments: number; posts: number }>();
    posts.forEach((p) => {
      if (p.loop_id) {
        const s = stats.get(p.loop_id) || { likes: 0, comments: 0, posts: 0 };
        stats.set(p.loop_id, { likes: s.likes + (p.likes || 0), comments: s.comments + (p.comments?.length || 0), posts: s.posts + 1 });
      }
    });
    return loops
      .filter((l) => !l.is_private)
      .map((l) => {
        const s = stats.get(l.id) || { likes: 0, comments: 0, posts: 0 };
        return { ...l, score: l.members * 2 + s.posts * 3 + s.likes + s.comments, totalLikes: s.likes, totalComments: s.comments };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [loops, posts]);

  const [joiningId, setJoiningId] = useState<number | null>(null);

  const handleJoin = async (loop: typeof trending[0], e: React.MouseEvent) => {
    e.stopPropagation();
    if (loop.pending || loop.created_by_me) return;
    setJoiningId(loop.id);
    const action = loop.joined ? "leave" : "join";
    try {
      await fetch(`${API}/loops/${loop.id}/${action}/`, { method: "POST", headers: authHeaders() });
    } catch { }
    onJoinLeave(loop.id, action);
    setJoiningId(null);
  };

  if (trending.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Trending Loops</h3>
      </div>
      <div className="space-y-2">
        {trending.map((loop, i) => (
          <Card key={loop.id} className="glass border-0 p-3 cursor-pointer hover:shadow-sm transition-all hover:-translate-y-0.5"
            onClick={() => onLoopClick(loop.id)}>
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-muted-foreground w-4 shrink-0 text-center">{i + 1}</span>
              <LoopAvatar loop={loop} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{loop.name}</p>
                <p className="text-xs text-muted-foreground">{loop.members.toLocaleString()} members</p>
              </div>
              {loop.created_by_me ? (
                <Badge className="text-xs gradient-bg text-primary-foreground border-0 shrink-0">Admin</Badge>
              ) : loop.pending ? (
                <span className="text-xs text-amber-500 shrink-0">Pending</span>
              ) : (
                <Button size="sm"
                  variant={loop.joined ? "outline" : "default"}
                  className={`text-xs h-7 px-2.5 shrink-0 ${loop.joined ? "border-red-300 text-red-500 hover:bg-red-50" : "gradient-bg text-primary-foreground border-0"}`}
                  onClick={(e) => handleJoin(loop, e)}
                  disabled={joiningId === loop.id}>
                  {joiningId === loop.id ? <Loader2 className="w-3 h-3 animate-spin" /> : loop.joined ? "Leave" : "Join"}
                </Button>
              )}
            </div>
            {(loop.totalLikes > 0 || loop.totalComments > 0) && (
              <div className="flex items-center gap-3 mt-1.5 ml-10 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart className="w-3 h-3" /> {loop.totalLikes}</span>
                <span className="flex items-center gap-0.5"><MessageCircle className="w-3 h-3" /> {loop.totalComments}</span>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LoopsPage() {
  // ── Fix: no setState in useEffect for user or mounted ──
  const [user] = useState<{ first_name?: string; email?: string } | null>(() => loadUser());
  const [mounted, setMounted] = useState(false);

  const [loops, setLoops] = useState<Loop[]>([]);
  const [loadingLoops, setLoadingLoops] = useState(true);
  const [allPosts, setAllPosts] = useState<Post[]>([]);
  const [myPosts, setMyPosts] = useState<Post[]>([]);
  const [loadingAllPosts, setLoadingAllPosts] = useState(true);
  const [loadingMyPosts, setLoadingMyPosts] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [draft, setDraft] = useState("");
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLoop, setEditingLoop] = useState<Loop | null>(null);
  const [deletingLoop, setDeletingLoop] = useState<Loop | null>(null);
  const [selectedMyLoop, setSelectedMyLoop] = useState<number | "all">("all");
  const [viewingLoopPosts, setViewingLoopPosts] = useState<Loop | null>(null);
  const [loopViewPosts, setLoopViewPosts] = useState<Post[]>([]);
  const [loadingLoopPosts, setLoadingLoopPosts] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fix: only setMounted here, user loaded via useState initializer ──
  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = mounted
    ? (user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()
    : "?";

  const fetchLoops = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/loops/`);
      if (res.ok) {
        const data = await res.json();
        setLoops(data.map((l: Loop) => ({ ...l, color: TAG_COLORS[l.tag] || TAG_COLORS["Other"] })));
      }
    } catch { }
    setLoadingLoops(false);
  }, []);

  const fetchAllPosts = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/posts/`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setAllPosts(data);
      }
    } catch { }
    setLoadingAllPosts(false);
  }, []);

  const fetchMyPosts = useCallback(async (loopId?: number) => {
    setLoadingMyPosts(true);
    try {
      const url = loopId ? `${API}/posts/mine/?loop_id=${loopId}` : `${API}/posts/mine/`;
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMyPosts(data);
      }
    } catch { }
    setLoadingMyPosts(false);
  }, []);

  const fetchLoopPosts = useCallback(async (loop: Loop) => {
    setLoadingLoopPosts(true);
    setViewingLoopPosts(loop);
    try {
      const res = await apiFetch(`${API}/loops/${loop.id}/posts/`);
      if (res.ok) {
        const data = await res.json();
        setLoopViewPosts(Array.isArray(data) ? data : []);
      }
    } catch { }
    setLoadingLoopPosts(false);
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/loops/requests/`);
      if (res.ok) setRequests(await res.json());
    } catch { }
  }, []);

  // ── Fix: all fetch calls are async inside the effect so setState is never synchronous ──
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        fetchLoops(),
        fetchAllPosts(),
        fetchMyPosts(),
        fetchRequests(),
      ]);
    };
    init();
    const interval = setInterval(async () => {
      await fetchAllPosts();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchLoops, fetchAllPosts, fetchMyPosts, fetchRequests]);

  const handleMyLoopFilter = (value: number | "all") => {
    setSelectedMyLoop(value);
    setViewingLoopPosts(null);
    fetchMyPosts(value === "all" ? undefined : value as number);
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
      if (imageFile) formData.append("image", imageFile);
      const res = await apiFetch(`${API}/posts/create/`, {
        method: "POST", body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setAllPosts((prev) => [data, ...prev]);
        setMyPosts((prev) => [data, ...prev]);
        setDraft(""); setImagePreview(null); setImageFile(null);
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
    router.push(`/loops/${loopId}`);
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
        id: Date.now(), user_id: 0, avatar_url: null,
        user: user?.first_name || "You",
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
      await apiFetch(`${API}/loops/requests/${req.id}/approve/`, { method: "POST" });
    } catch { }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setLoops((prev) => prev.map((l) => l.id === req.loop_id ? { ...l, members: l.members + 1 } : l));
  };

  const handleDenyRequest = async (req: JoinRequest) => {
    try {
      await apiFetch(`${API}/loops/requests/${req.id}/deny/`, { method: "POST" });
    } catch { }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const myJoinedLoops = loops.filter((l) => l.joined || l.created_by_me);
  const myLoopIds = useMemo(() => new Set(myJoinedLoops.map((l) => l.id)), [myJoinedLoops]);
  const myLoopsByTag = useMemo(() => {
    if (activeTag === "All") return myLoopIds;
    const filtered = myJoinedLoops.filter((l) => l.tag === activeTag);
    return new Set(filtered.map((l) => l.id));
  }, [myJoinedLoops, myLoopIds, activeTag]);
  const myLoopPosts = useMemo(
    () => allPosts.filter((p) => p.loop_id != null && myLoopsByTag.has(p.loop_id)),
    [allPosts, myLoopsByTag]
  );
  // Feed = generic posts (no loop) + public loop posts from loops user is NOT in
  const feedPosts = useMemo(
    () => allPosts.filter((p) => p.loop_id == null || (!myLoopIds.has(p.loop_id) && !p.loop_is_private)),
    [allPosts, myLoopIds]
  );
  const LOOPS_CHIP_LIMIT = 6;
  const filteredMyLoops = useMemo(() => myJoinedLoops.slice(0, LOOPS_CHIP_LIMIT), [myJoinedLoops]);
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
    <AppShell headerLeft={
      <div>
        <h1 className="text-xl font-semibold tracking-tight leading-none">Loops</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Small communities. Big momentum.</p>
      </div>
    }>
      <div className="space-y-4">
        {/* Search + Create */}
        <div className="flex gap-2">
          <LoopSearchBar
            loops={loops}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onNavigateToLoop={handleLoopClick}
          />
          <Button className="gradient-bg border-0 shrink-0" onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-1" />Create
          </Button>
        </div>

        <Tabs defaultValue="feed" onValueChange={() => setActiveTag("All")}>
          <TabsList className="glass">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="myloops">My Loops</TabsTrigger>
            <TabsTrigger value="explore">Explore</TabsTrigger>
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
          <TabsContent value="feed" className="mt-6">
            <ActivityTicker posts={feedPosts} />
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
              {/* Left: Composer + Posts */}
              <div className="space-y-4 min-w-0">
                <Card className="glass border-0 p-5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handlePost()}
                        placeholder="Share your progress with the community..."
                        className="w-full bg-transparent text-sm outline-none resize-none min-h-[72px] placeholder:text-muted-foreground/60" maxLength={500} />
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
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                          <button onClick={() => { fileInputRef.current?.click(); if (!draft) setDraft("Just completed a workout! 💪 "); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                            <Camera className="w-3.5 h-3.5" /> Post Workout Photo
                          </button>
                          <button onClick={() => setDraft((d) => d || "Sharing today's meal 🍽️ ")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                            <Utensils className="w-3.5 h-3.5" /> Share a Meal
                          </button>
                          <button onClick={() => setDraft((d) => d || "Just logged a run! 🏃 ")}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                            <Zap className="w-3.5 h-3.5" /> Log a Run
                          </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{draft.length}/500</span>
                          <Button size="sm" className="gradient-bg border-0" onClick={handlePost}
                            disabled={posting || (!draft.trim() && !imagePreview)}>
                            {posting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                            {posting ? "Posting..." : "Post"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
                {loadingAllPosts ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : feedPosts.length === 0 ? (
                  <Card className="glass border-0 p-8 text-center"><p className="text-sm text-muted-foreground">No public posts yet. Join a loop or be the first to share!</p></Card>
                ) : (
                  <div className="space-y-4">
                    {feedPosts.map((p) => <PostCard key={p.id} post={p} {...postCardProps} />)}
                  </div>
                )}
              </div>
              {/* Right: Trending Loops + Join Requests */}
              <div className="space-y-6">
                <TrendingLoopsSidebar
                  loops={loops}
                  posts={allPosts}
                  onLoopClick={handleLoopClick}
                  onJoinLeave={handleJoinLeave}
                />
                <JoinRequestsSidebar
                  requests={requests}
                  onApprove={handleApproveRequest}
                  onDeny={handleDenyRequest}
                />
              </div>
            </div>
          </TabsContent>

          {/* ── My Loops Tab ── */}
          <TabsContent value="myloops" className="mt-6">
            {myJoinedLoops.length === 0 ? (
              <Card className="glass border-0 p-10 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <Users className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">You haven&apos;t joined any loops yet</p>
                <p className="text-xs text-muted-foreground mt-1">Go to Explore to find and join loops.</p>
              </Card>
            ) : (
              <>
                {/* Category filter */}
                <div className="flex gap-2 flex-wrap">
                  {ALL_TAGS.map((t) => (
                    <button key={t} onClick={() => setActiveTag(t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${activeTag === t ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground hover:border-primary/40"}`}>
                      {t}
                    </button>
                  ))}
                </div>
                <ActivityTicker posts={myLoopPosts} />
                <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
                  {/* Left: posts from my loops */}
                  <div className="space-y-4 min-w-0">
                    {/* My loop chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-muted-foreground shrink-0">My loops:</span>
                      {filteredMyLoops.map((l) => (
                        <button key={l.id} onClick={() => handleLoopClick(l.id)}
                          className="flex items-center gap-1.5 px-2.5 py-1 glass rounded-full text-xs hover:bg-accent transition-all border border-border/50">
                          <LoopAvatar loop={l} size="sm" />
                          <span className="font-medium">{l.name}</span>
                          {l.is_private && <Lock className="w-2.5 h-2.5 text-muted-foreground" />}
                          {l.created_by_me && <Badge className="text-[10px] h-4 px-1 gradient-bg text-primary-foreground border-0">Admin</Badge>}
                        </button>
                      ))}
                      {myJoinedLoops.length > LOOPS_CHIP_LIMIT && (
                        <button onClick={() => router.push("/loops/my-loops")}
                          className="text-xs text-primary hover:opacity-70 transition px-2.5 py-1 glass rounded-full border border-border/50 font-medium">
                          +{myJoinedLoops.length - LOOPS_CHIP_LIMIT} more
                        </button>
                      )}
                    </div>
                    {/* Posts */}
                    {loadingAllPosts ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : myLoopPosts.length === 0 ? (
                      <Card className="glass border-0 p-8 text-center">
                        <p className="text-sm text-muted-foreground">No posts in your loops yet. Click a loop above to explore it!</p>
                      </Card>
                    ) : (
                      <div className="space-y-4">
                        {myLoopPosts.map((p) => <PostCard key={p.id} post={p} {...postCardProps} />)}
                      </div>
                    )}
                  </div>
                  {/* Right: same sidebar */}
                  <div className="space-y-6">
                    <TrendingLoopsSidebar
                      loops={loops}
                      posts={allPosts}
                      onLoopClick={handleLoopClick}
                      onJoinLeave={handleJoinLeave}
                    />
                    <JoinRequestsSidebar
                      requests={requests}
                      onApprove={handleApproveRequest}
                      onDeny={handleDenyRequest}
                    />
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Explore Tab ── */}
          <TabsContent value="explore" className="space-y-4 mt-6">
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
    </AppShell>
  );
}