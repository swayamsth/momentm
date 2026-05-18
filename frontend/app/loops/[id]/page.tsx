"use client";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Users, Lock, Globe, Heart, MessageCircle,
  Loader2, Send, X, ZoomIn, Pencil, Trash2, Check, Calendar,
  Camera, Trophy, Zap, Settings, ImageIcon, Search,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

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

const TAG_QUICK_ACTIONS: Record<string, Array<{ label: string; template?: string; photo?: boolean }>> = {
  Running: [{ label: "Log a Run", template: "Just logged a run! 🏃 " }, { label: "Post Route", photo: true }],
  Strength: [{ label: "Log Workout", template: "Just crushed a workout! 💪 " }, { label: "Post PR", photo: true }],
  Nutrition: [{ label: "Add Recipe", template: "Here's a recipe I love! 🍽️ " }, { label: "Meal Photo", photo: true }],
  Cycling: [{ label: "Log Ride", template: "Just finished a ride! 🚴 " }, { label: "Post Route", photo: true }],
  Mind: [{ label: "Log Session", template: "Just completed a meditation session! 🧘 " }, { label: "Share Insight", template: "Something I reflected on today: " }],
  Sleep: [{ label: "Log Sleep", template: "Sleep log: " }, { label: "Share Tip", template: "Sleep tip of the day: " }],
  Recovery: [{ label: "Log Recovery", template: "Recovery update: feeling " }, { label: "Post Progress", photo: true }],
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
  image: string | null;
  is_mine: boolean;
}

interface LeaderboardEntry {
  rank: number;
  user?: string;
  first_name?: string;
  last_name?: string;
  handle?: string;
  username?: string;
  points?: number;
  total_points?: number;
  score?: number;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function loadUser(): { first_name?: string; email?: string } | null {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

function getMemberSince(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getEntryName(e: LeaderboardEntry): string {
  if (e.user) return e.user;
  const full = [e.first_name, e.last_name].filter(Boolean).join(" ");
  return full || e.handle || e.username || "Member";
}

function getEntryPoints(e: LeaderboardEntry): number {
  return e.points ?? e.total_points ?? e.score ?? 0;
}

function LoopAvatar({ loop, size = "md" }: { loop: Loop; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = {
    sm: { wrapper: "w-7 h-7", icon: "w-3.5 h-3.5" },
    md: { wrapper: "w-12 h-12", icon: "w-5 h-5" },
    lg: { wrapper: "w-16 h-16", icon: "w-8 h-8" },
    xl: { wrapper: "w-20 h-20", icon: "w-10 h-10" },
  };
  const s = sizeMap[size];
  if (loop.image_url) {
    return <img src={loop.image_url} alt={loop.name} className={`${s.wrapper} rounded-2xl object-cover flex-shrink-0 ring-4 ring-white/30`} />;
  }
  return (
    <div className={`${s.wrapper} rounded-2xl flex items-center justify-center flex-shrink-0 ring-4 ring-white/30`}
      style={{ background: `color-mix(in oklab, ${loop.color} 25%, white)` }}>
      <Users className={s.icon} style={{ color: loop.color }} />
    </div>
  );
}

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

function PostCard({ post, onLikePost, onAddComment, onLikeComment, onDeletePost, onEditPost, onEditComment, onDeleteComment }: {
  post: Post;
  onLikePost: (id: number) => void;
  onAddComment: (postId: number, text: string) => void;
  onLikeComment: (commentId: number, postId: number) => void;
  onDeletePost: (id: number) => void;
  onEditPost: (id: number, text: string) => void;
  onEditComment: (commentId: number, postId: number, text: string) => void;
  onDeleteComment: (commentId: number, postId: number) => void;
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
    onAddComment(post.id, commentDraft);
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
        method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
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
        method: "PATCH", headers: { "Content-Type": "application/json", ...authHeaders() },
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
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold">{post.user}</span>
                <span className="text-muted-foreground">@{post.handle} · {post.time}</span>
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
                  className="w-full bg-muted rounded-xl px-3 py-2 text-sm outline-none resize-none min-h-[80px]" maxLength={500} />
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
                  <p className="text-xs text-muted-foreground pl-9">No comments yet.</p>
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
                              className="w-full bg-background rounded-lg px-2 py-1 text-xs outline-none" />
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

const RANK_COLORS = ["oklch(0.78 0.16 75)", "oklch(0.65 0.08 250)", "oklch(0.62 0.22 25)"];

function TopContributors({ loopId }: { loopId: string }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${API}/loops/${loopId}/leaderboard/`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setEntries(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch { }
      setLoading(false);
    };
    fetch_();
  }, [loopId]);

  if (loading) return (
    <Card className="glass border-0 p-4">
      <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
    </Card>
  );

  if (entries.length === 0) return null;

  return (
    <Card className="glass border-0 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-primary" />
        <h3 className="font-semibold text-sm">Top Contributors</h3>
        <span className="text-xs text-muted-foreground">Leaderboard in this loop</span>
      </div>
      <div className="space-y-2">
        {entries.map((e, i) => {
          const name = getEntryName(e);
          const pts = getEntryPoints(e);
          const rank = e.rank ?? i + 1;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: rank <= 3 ? `color-mix(in oklab, ${RANK_COLORS[rank - 1]} 20%, transparent)` : undefined, color: rank <= 3 ? RANK_COLORS[rank - 1] : undefined }}>
                {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
              </div>
              <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                {name[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate">{name.length > 10 ? name.slice(0, 10) + "…" : name}</p>
              </div>
              <span className="text-xs font-bold tabular-nums">{pts.toLocaleString()}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Edit Loop Settings Modal ─────────────────────────────────────────────────

const PRESET_TAGS = ["Running", "Mind", "Strength", "Nutrition", "Cycling", "Recovery", "Sleep", "Other"];

function EditLoopSettingsModal({ loop, onClose, onSave }: {
  loop: Loop;
  onClose: () => void;
  onSave: (updated: Partial<Loop>) => void;
}) {
  const [name, setName] = useState(loop.name);
  const [desc, setDesc] = useState(loop.desc);
  const [tag, setTag] = useState(loop.tag);
  const [isPrivate, setIsPrivate] = useState(loop.is_private);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(loop.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError("Image must be under 10MB."); return; }
    setImageFile(file);
    setError("");
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleSave = async () => {
    if (!name.trim()) { setError("Loop name is required."); return; }
    setSaving(true);
    setError("");
    let newImageUrl = loop.image_url || null;

    if (imageFile) {
      setUploadingImage(true);
      try {
        const formData = new FormData();
        formData.append("image", imageFile);
        const res = await fetch(`${API}/loops/${loop.id}/upload-image/`, {
          method: "POST", headers: authHeaders(), body: formData,
        });
        const data = await res.json();
        if (res.ok) newImageUrl = data.image_url;
        else setError(data.error || "Image upload failed.");
      } catch { setError("Could not upload image."); }
      setUploadingImage(false);
    }

    try {
      const res = await fetch(`${API}/loops/${loop.id}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ name: name.trim(), description: desc.trim(), tag, is_private: isPrivate }),
      });
      if (res.ok) {
        onSave({ name: name.trim(), desc: desc.trim(), tag, is_private: isPrivate, image_url: newImageUrl });
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save changes.");
      }
    } catch { setError("Cannot connect to server."); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Settings className="w-4 h-4" /> Loop Settings</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {/* Group image */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Group Image</label>
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Group" className="w-full h-28 object-cover rounded-xl" />
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
              className="w-full h-28 rounded-xl border-2 border-dashed border-border hover:border-primary/40 transition-colors flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary bg-muted/30">
              <ImageIcon className="w-5 h-5" />
              <span className="text-xs font-medium">Upload group image</span>
            </button>
          )}
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
          {uploadingImage && <p className="text-xs text-primary mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</p>}
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Loop Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={50}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={200} rows={3}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-primary/30" />
            <p className="text-xs text-muted-foreground text-right mt-0.5">{desc.length}/200</p>
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
          <Button className="flex-1 gradient-bg border-0" onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
            Save Changes
          </Button>
        </div>
      </Card>
    </div>
  );
}

// ─── Loop Detail Page ─────────────────────────────────────────────────────────

export default function LoopDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user] = useState(() => loadUser());
  const [mounted, setMounted] = useState(false);
  const [loop, setLoop] = useState<Loop | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingLoop, setLoadingLoop] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [joining, setJoining] = useState(false);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [members, setMembers] = useState<{ id: number; name: string; handle: string; profile_picture_url: string | null; joined_at: string; is_creator: boolean }[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");

  useEffect(() => { setMounted(true); }, []);

  const initials = mounted
    ? (user?.first_name?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()
    : "?";

  const fetchLoop = useCallback(async () => {
    try {
      const res = await fetch(`${API}/loops/`, { headers: authHeaders() });
      if (res.ok) {
        const data: Loop[] = await res.json();
        const found = data.find((l) => l.id === Number(id));
        if (found) setLoop({ ...found, color: TAG_COLORS[found.tag] || TAG_COLORS["Other"] });
      }
    } catch { }
    setLoadingLoop(false);
  }, [id]);

  const handleOpenMembers = async () => {
    setShowMembers(true);
    if (members.length === 0) {
      setMembersLoading(true);
      try {
        const res = await fetch(`${API}/loops/${id}/members/`, { headers: authHeaders() });
        if (res.ok) {
          const data = await res.json();
          setMembers(data.members || []);
        }
      } catch { }
      setMembersLoading(false);
    }
  };

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/loops/${id}/posts/`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : []);
      }
    } catch { }
    setLoadingPosts(false);
  }, [id]);

  useEffect(() => {
    if (mounted) { fetchLoop(); fetchPosts(); }
  }, [mounted, fetchLoop, fetchPosts]);

  const handleJoinLeave = async () => {
    if (!loop) return;
    setJoining(true);
    const action = loop.joined ? "leave" : "join";
    try {
      await fetch(`${API}/loops/${loop.id}/${action}/`, { method: "POST", headers: authHeaders() });
      setLoop((prev) => prev ? {
        ...prev,
        joined: action === "join" && !prev.is_private,
        pending: action === "join" && prev.is_private,
        members: action === "join" && !prev.is_private ? prev.members + 1 : action === "leave" ? prev.members - 1 : prev.members,
      } : null);
    } catch { }
    setJoining(false);
  };

  const handlePost = async () => {
    if (!draft.trim() && !imagePreview) return;
    setPosting(true);
    setPostError("");
    try {
      const formData = new FormData();
      formData.append("text", draft);
      formData.append("loop_id", String(id));
      if (imageFile) formData.append("image", imageFile);
      const res = await fetch(`${API}/posts/create/`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setPosts((prev) => [data, ...prev]);
        setDraft(""); setImagePreview(null); setImageFile(null);
      } else {
        setPostError(data.error || "Failed to post.");
      }
    } catch {
      setPostError("Cannot connect to server.");
    }
    setPosting(false);
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

  const updatePosts = (fn: (posts: Post[]) => Post[]) => setPosts(fn);
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

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loop) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${API}/loops/${loop.id}/upload-image/`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await res.json();
      if (res.ok) setLoop((prev) => prev ? { ...prev, image_url: data.image_url } : null);
    } catch { }
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !loop) return;
    if (file.size > 10 * 1024 * 1024) { setCoverError("Image must be under 10MB."); return; }
    setUploadingCover(true);
    setCoverError("");
    const formData = new FormData();
    formData.append("image", file);
    try {
      const res = await fetch(`${API}/loops/${loop.id}/upload-cover/`, {
        method: "POST", headers: authHeaders(), body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setLoop((prev) => prev ? { ...prev, cover_url: data.cover_url } : null);
      } else {
        setCoverError(data.error || "Upload failed. Please try again.");
      }
    } catch {
      setCoverError("Cannot connect to server.");
    }
    setUploadingCover(false);
    e.target.value = "";
  };

  if (!mounted) return null;

  const isMember = loop?.joined || loop?.created_by_me;
  const quickActions = loop ? (TAG_QUICK_ACTIONS[loop.tag] || [
    { label: "Post Photo", photo: true },
    { label: "Share Update", template: "Update from the loop! 🌟 " },
  ]) : [];

  const backButton = (
    <button onClick={() => router.push("/loops")}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="w-4 h-4" /> Back to Loops
    </button>
  );

  return (
    <AppShell headerLeft={backButton}>
      {showSettings && loop && (
        <EditLoopSettingsModal
          loop={loop}
          onClose={() => setShowSettings(false)}
          onSave={(updated) => setLoop((prev) => prev ? { ...prev, ...updated } : null)}
        />
      )}

      {/* Members popup */}
      {showMembers && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={() => setShowMembers(false)}>
          <div className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
              <h2 className="font-semibold text-base">Members ({loop?.members ?? 0})</h2>
              <button onClick={() => setShowMembers(false)} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-4 pt-3 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={memberSearch}
                  onChange={e => setMemberSearch(e.target.value)}
                  placeholder="Search members..."
                  className="w-full pl-9 pr-4 py-2 text-sm rounded-xl glass border-0 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-4">
              {membersLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {members
                    .filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.handle.toLowerCase().includes(memberSearch.toLowerCase()))
                    .map(m => (
                      <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-accent transition-colors">
                        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                          {m.profile_picture_url
                            ? <img src={m.profile_picture_url} alt={m.name} className="w-full h-full object-cover" />
                            : m.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{m.name}</p>
                            {m.is_creator && <span className="text-[10px] px-1.5 py-0.5 rounded-full gradient-bg text-primary-foreground font-medium">Admin</span>}
                          </div>
                          <p className="text-xs text-muted-foreground">@{m.handle} · joined {m.joined_at}</p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div className="max-w-[1200px]">
      <div className="space-y-6">
        {/* ── Banner Header ── */}
        {loadingLoop ? (
          <div className="h-44 glass rounded-3xl flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : loop ? (
          <div className="relative h-44 rounded-3xl overflow-hidden">
            {/* Background (cover photo) */}
            {loop.cover_url ? (
              <>
                <img src={loop.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />
              </>
            ) : (
              <div className="absolute inset-0" style={{
                background: `linear-gradient(135deg, ${loop.color}, color-mix(in oklab, ${loop.color} 55%, black 45%))`,
              }} />
            )}

            {/* Always-mounted hidden input for cover upload */}
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />

            {/* Content overlay — edit cover button lives here so it's never covered */}
            <div className="absolute inset-0 flex items-end p-5">
              {/* Edit cover button pinned to top-right inside the overlay */}
              {loop.created_by_me && (
                <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                  <button onClick={() => { setCoverError(""); coverInputRef.current?.click(); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 hover:bg-black/65 text-white text-xs backdrop-blur-sm transition-all border border-white/20">
                    {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                    {uploadingCover ? "Uploading…" : "Edit Cover"}
                  </button>
                  {coverError && (
                    <span className="text-[11px] text-red-300 bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm">
                      {coverError}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-end gap-4 flex-1 min-w-0">
                {/* Avatar — admin gets edit overlay */}
                {loop.created_by_me ? (
                  <div className="relative group flex-shrink-0">
                    <LoopAvatar loop={loop} size="xl" />
                    <button onClick={() => avatarInputRef.current?.click()}
                      className="absolute inset-0 rounded-2xl bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-0.5">
                      {uploadingAvatar
                        ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                        : <Camera className="w-5 h-5 text-white" />}
                      <span className="text-[10px] text-white font-medium">Edit Photo</span>
                    </button>
                    <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadAvatar} />
                  </div>
                ) : (
                  <LoopAvatar loop={loop} size="xl" />
                )}
                <div className="flex-1 min-w-0 pb-0.5">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-white drop-shadow">{loop.name}</h1>
                    <Badge className="bg-white/20 text-white border-white/30 text-xs flex items-center gap-1 backdrop-blur-sm">
                      {loop.is_private ? <><Lock className="w-2.5 h-2.5" />Private</> : <><Globe className="w-2.5 h-2.5" />Public</>}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-white/30 text-xs backdrop-blur-sm">{loop.tag}</Badge>
                  </div>
                  {loop.desc && <p className="text-sm text-white/80 mb-1.5 truncate">{loop.desc}</p>}
                  <div className="flex items-center gap-4 text-sm text-white/70 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />{loop.members.toLocaleString()} members
                    </span>
                    {loop.joined_at && isMember && (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />Member since {getMemberSince(loop.joined_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action button — bottom-right of banner */}
              <div className="flex-shrink-0">
                {loop.created_by_me ? (
                  <button onClick={() => setShowSettings(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-foreground text-sm font-semibold hover:bg-white/90 transition-all shadow">
                    <Settings className="w-3.5 h-3.5" /> Admin
                  </button>
                ) : loop.pending ? (
                  <Badge className="bg-amber-500/90 text-white border-0 backdrop-blur-sm px-3 py-1.5">Pending</Badge>
                ) : (
                  <Button
                    variant={loop.joined ? "outline" : "default"}
                    className={loop.joined
                      ? "bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
                      : "gradient-bg text-primary-foreground border-0 shadow-lg"}
                    onClick={handleJoinLeave}
                    disabled={joining}>
                    {joining ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    {loop.joined ? "Leave Loop" : loop.is_private ? "Request to Join" : "Join Loop"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Card className="glass border-0 p-8 text-center">
            <p className="text-sm text-muted-foreground">Loop not found.</p>
          </Card>
        )}

        {/* ── Body: Two Columns ── */}
        {loop && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
            {/* Left: Composer + Posts */}
            <div className="space-y-4 min-w-0">
              {/* Composer — members only */}
              {isMember ? (
                <Card className="glass border-0 p-5">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1">
                      <textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handlePost()}
                        placeholder={`Post to ${loop.name}...`}
                        className="w-full bg-transparent text-sm outline-none resize-none min-h-[60px] placeholder:text-muted-foreground/60" maxLength={500} />
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
                      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                          {quickActions.map((action, i) => (
                            <button key={i}
                              onClick={() => {
                                if (action.photo) { fileInputRef.current?.click(); }
                                if (action.template) setDraft((d) => d || action.template!);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all">
                              {action.photo ? <Camera className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
                              {action.label}
                            </button>
                          ))}
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
              ) : !loop.pending ? (
                <Card className="glass border-0 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Join this loop to post and interact with members.</p>
                </Card>
              ) : null}

              {/* Posts */}
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                {posts.length} post{posts.length !== 1 ? "s" : ""}
              </p>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <Card className="glass border-0 p-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {isMember ? "No posts yet. Be the first to share!" : "Join this loop to see and create posts."}
                  </p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {posts.map((p) => (
                    <PostCard key={p.id} post={p}
                      onLikePost={handleLikePost}
                      onAddComment={handleAddComment}
                      onLikeComment={handleLikeComment}
                      onDeletePost={handleDeletePost}
                      onEditPost={handleEditPost}
                      onEditComment={handleEditComment}
                      onDeleteComment={handleDeleteComment}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">
              {/* Loop Stats */}
              <Card className="glass border-0 p-4 space-y-3">
                <h3 className="font-semibold text-sm">Loop Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={handleOpenMembers} className="glass rounded-xl p-3 text-center hover:bg-accent/50 transition-colors w-full">
                    <p className="text-xl font-bold tabular-nums">{loop.members}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Members</p>
                  </button>
                  <div className="glass rounded-xl p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">{posts.length}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Posts</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {posts.reduce((sum, p) => sum + p.likes, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Total Likes</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <p className="text-xl font-bold tabular-nums">
                      {posts.reduce((sum, p) => sum + p.comments.length, 0)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Comments</p>
                  </div>
                </div>
              </Card>

              {/* Top Contributors */}
              <TopContributors loopId={id} />
            </div>
          </div>
        )}
      </div>
      </div>
    </AppShell>
  );
}
