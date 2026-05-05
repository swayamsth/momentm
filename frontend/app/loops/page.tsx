"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Heart, MessageCircle, Repeat2, Users, Target, Search,
  Plus, Loader2, Send, X, Lock, Globe, Pencil, Check, Trash2, UserCheck, UserX
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Static Data ──────────────────────────────────────────────────────────────

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
  isPrivate: boolean;
  createdByMe: boolean;
  joinedAt?: string;
}

interface JoinRequest {
  id: number;
  loopId: number;
  loopName: string;
  user: string;
  handle: string;
  requestedAt: string;
}

interface Comment {
  id: number;
  user: string;
  handle: string;
  text: string;
  likes: number;
  liked: boolean;
  time: string;
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
  loop?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberSince(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

// ─── Delete Confirmation Modal ────────────────────────────────────────────────

function DeleteLoopModal({ loop, onClose, onConfirm }: {
  loop: Loop;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-sm p-6 relative z-10 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Delete &quot;{loop.name}&quot;?</h2>
          <p className="text-sm text-muted-foreground mt-1">
            This will permanently delete the loop and remove all members. This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0" onClick={onConfirm}>
            Delete Loop
          </Button>
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
  const [isPrivate, setIsPrivate] = useState(loop.isPrivate);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/loops/${loop.id}/edit/`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc, tag, is_private: isPrivate }),
      });
    } catch { /* backend not ready yet */ }
    onSave({ name, desc, tag, isPrivate });
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Loop Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={50} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
              className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30"
              maxLength={200} />
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

function CreateLoopModal({ onClose, onCreate }: {
  onClose: () => void;
  onCreate: (loop: Loop) => void;
}) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [tag, setTag] = useState("Running");
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { setError("Loop name is required."); return; }
    setLoading(true);
    setError("");
    const newLoop: Loop = {
      id: Date.now(),
      name: name.trim(),
      desc: desc.trim() || "No description yet.",
      tag,
      color: TAG_COLORS[tag] || TAG_COLORS["Other"],
      isPrivate,
      members: 1,
      createdByMe: true,
      joinedAt: new Date().toISOString(),
    };
    try {
      const token = localStorage.getItem("access_token");
      await fetch("http://127.0.0.1:8000/api/loops/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newLoop.name, description: newLoop.desc, tag, is_private: isPrivate }),
      });
    } catch { /* backend not ready yet */ }
    onCreate(newLoop);
    setSuccess(true);
    setTimeout(onClose, 1200);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
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
                <input value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 6AM Grind Squad"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={50} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)}
                  placeholder="What's this loop about?"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30"
                  maxLength={200} />
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

function LoopCard({ loop, joined, joinedAt, onJoinLeave, onEdit, onDelete, pendingRequest }: {
  loop: Loop;
  joined: boolean;
  joinedAt?: string;
  onJoinLeave: (id: number) => void;
  onEdit?: (loop: Loop) => void;
  onDelete?: (loop: Loop) => void;
  pendingRequest?: boolean;
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (pendingRequest) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/loops/${loop.id}/${joined ? "leave" : "join"}/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready, toggle locally */ }
    onJoinLeave(loop.id);
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
          {loop.isPrivate && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
          <Badge variant="secondary" className="text-xs">{loop.tag}</Badge>
          {loop.createdByMe && onEdit && (
            <button onClick={() => onEdit(loop)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-lg hover:bg-accent">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {loop.createdByMe && onDelete && (
            <button onClick={() => onDelete(loop)}
              className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <h3 className="font-semibold">{loop.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-3 flex-1">{loop.desc}</p>

      {joined && joinedAt && (
        <p className="text-xs text-primary/70 font-medium mb-3">
          Member since {getMemberSince(joinedAt)}
        </p>
      )}

      {pendingRequest && (
        <p className="text-xs text-amber-500 font-medium mb-3">⏳ Request pending approval</p>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{loop.members.toLocaleString()} members</span>
        {!loop.createdByMe && (
          <Button size="sm" onClick={handleClick} disabled={loading || pendingRequest}
            variant={joined ? "outline" : "default"}
            className={
              joined
                ? "border-red-300 text-red-500 hover:bg-red-50 hover:text-red-600"
                : pendingRequest
                ? "opacity-60 cursor-not-allowed border-border text-muted-foreground"
                : "gradient-bg text-primary-foreground border-0"
            }>
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : joined ? "Leave" : pendingRequest ? "Pending" : "Join"}
          </Button>
        )}
        {loop.createdByMe && (
          <Badge className="text-xs gradient-bg text-primary-foreground border-0">Admin</Badge>
        )}
      </div>
    </Card>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({ post, onLikePost, onAddComment, onLikeComment }: {
  post: Post;
  onLikePost: (id: number) => void;
  onAddComment: (postId: number, text: string) => void;
  onLikeComment: (commentId: number, postId: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);

  const handleComment = async () => {
    if (!commentDraft.trim()) return;
    setPosting(true);
    await onAddComment(post.id, commentDraft);
    setCommentDraft("");
    setPosting(false);
  };

  return (
    <Card className="glass border-0 p-4">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
          {post.user[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <span className="font-semibold">{post.user}</span>
            <span className="text-muted-foreground">@{post.handle} · {post.time}</span>
            {post.loop && <Badge variant="secondary" className="text-xs">{post.loop}</Badge>}
          </div>
          <p className="text-sm mt-1 leading-relaxed">{post.text}</p>
          <div className="flex items-center gap-6 mt-3 text-muted-foreground">
            <button onClick={() => onLikePost(post.id)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-red-500" : "hover:text-red-500"}`}>
              <Heart className={`w-4 h-4 ${post.liked ? "fill-red-500" : ""}`} />
              {post.likes}
            </button>
            <button onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${showComments ? "text-primary" : "hover:text-primary"}`}>
              <MessageCircle className="w-4 h-4" />
              {post.comments.length}
            </button>
            <button className="flex items-center gap-1.5 text-xs hover:text-primary transition-colors">
              <Repeat2 className="w-4 h-4" />
            </button>
          </div>
          {showComments && (
            <div className="mt-4 space-y-3">
              <div className="flex gap-2 items-start">
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">?</div>
                <div className="flex-1 flex gap-2">
                  <input value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Write a comment..."
                    className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs outline-none" />
                  <button onClick={handleComment} disabled={posting || !commentDraft.trim()}
                    className="text-primary hover:opacity-70 disabled:opacity-30 transition">
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
                      <div className="flex items-center gap-2 text-xs mb-1">
                        <span className="font-semibold">{comment.user}</span>
                        <span className="text-muted-foreground">@{comment.handle} · {comment.time}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{comment.text}</p>
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
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const initialLoops: Loop[] = [
  { id: 1, name: "5AM Run Club", members: 1240, tag: "Running", desc: "Early-morning runners pushing each other.", color: TAG_COLORS.Running, isPrivate: false, createdByMe: false },
  { id: 2, name: "Mindful Mornings", members: 820, tag: "Mind", desc: "10-minute meditation streaks together.", color: TAG_COLORS.Mind, isPrivate: false, createdByMe: false },
  { id: 3, name: "Strength 200", members: 450, tag: "Strength", desc: "200 reps a day — bodyweight or weighted.", color: TAG_COLORS.Strength, isPrivate: true, createdByMe: false },
  { id: 4, name: "Plant-Based Pros", members: 690, tag: "Nutrition", desc: "Daily plant-forward meal logs.", color: TAG_COLORS.Nutrition, isPrivate: false, createdByMe: false },
  { id: 5, name: "Cycle 100", members: 320, tag: "Cycling", desc: "100km a week, every week.", color: TAG_COLORS.Cycling, isPrivate: false, createdByMe: false },
  { id: 6, name: "Sleep Stack", members: 510, tag: "Sleep", desc: "Lights out by 10:30pm.", color: TAG_COLORS.Sleep, isPrivate: true, createdByMe: false },
];

// Dummy requests for testing the UI
const dummyRequests: JoinRequest[] = [
  { id: 1, loopId: 3, loopName: "Strength 200", user: "Alex Kim", handle: "alexkim", requestedAt: "2 hours ago" },
  { id: 2, loopId: 6, loopName: "Sleep Stack", user: "Jordan Lee", handle: "jordanlee", requestedAt: "5 hours ago" },
];

export default function LoopsPage() {
  const [loops, setLoops] = useState<Loop[]>(initialLoops);
  const [joinedMap, setJoinedMap] = useState<Record<number, string>>({});
  const [pendingIds, setPendingIds] = useState<number[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>(dummyRequests);
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [postError, setPostError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLoop, setEditingLoop] = useState<Loop | null>(null);
  const [deletingLoop, setDeletingLoop] = useState<Loop | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
  const [feedFilter, setFeedFilter] = useState<"all" | "myloops">("all");
  const [user, setUser] = useState<{ first_name?: string; email?: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const initials = user?.first_name
    ? user.first_name[0].toUpperCase()
    : user?.email?.[0].toUpperCase() || "?";

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/posts/", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setPosts(data);
    } catch { /* backend not ready */ }
    finally { setLoadingPosts(false); }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinLeave = (id: number) => {
    const loop = loops.find((l) => l.id === id);
    if (!loop) return;

    if (joinedMap[id]) {
      // Leave
      const updated = { ...joinedMap };
      delete updated[id];
      setJoinedMap(updated);
      setLoops((prev) => prev.map((l) => l.id === id ? { ...l, members: l.members - 1 } : l));
    } else if (loop.isPrivate) {
      // Send join request for private loops
      setPendingIds((prev) => [...prev, id]);
    } else {
      // Join public loop immediately
      setJoinedMap((prev) => ({ ...prev, [id]: new Date().toISOString() }));
      setLoops((prev) => prev.map((l) => l.id === id ? { ...l, members: l.members + 1 } : l));
    }
  };

  const handleLoopCreated = (newLoop: Loop) => {
    setLoops((prev) => [newLoop, ...prev]);
    setJoinedMap((prev) => ({ ...prev, [newLoop.id]: newLoop.joinedAt || new Date().toISOString() }));
  };

  const handleLoopEdited = (updated: Partial<Loop>) => {
    if (!editingLoop) return;
    setLoops((prev) => prev.map((l) => l.id === editingLoop.id ? { ...l, ...updated } : l));
  };

  const handleLoopDeleted = async () => {
    if (!deletingLoop) return;
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/loops/${deletingLoop.id}/delete/`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready */ }
    setLoops((prev) => prev.filter((l) => l.id !== deletingLoop.id));
    const updated = { ...joinedMap };
    delete updated[deletingLoop.id];
    setJoinedMap(updated);
    setDeletingLoop(null);
  };

  const handleApproveRequest = async (req: JoinRequest) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/loops/requests/${req.id}/approve/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready */ }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
    setLoops((prev) => prev.map((l) => l.id === req.loopId ? { ...l, members: l.members + 1 } : l));
  };

  const handleDenyRequest = async (req: JoinRequest) => {
    try {
      const token = localStorage.getItem("access_token");
      await fetch(`http://127.0.0.1:8000/api/loops/requests/${req.id}/deny/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* backend not ready */ }
    setRequests((prev) => prev.filter((r) => r.id !== req.id));
  };

  const handlePost = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/posts/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      if (res.ok) { setPosts([data, ...posts]); setDraft(""); }
      else setPostError(data.error || "Failed to post.");
    } catch { setPostError("Cannot connect to server."); }
    finally { setPosting(false); }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setPosts(posts.map((p) => p.id === postId ? { ...p, likes: data.likes, liked: data.liked } : p));
    } catch { console.log("Like failed"); }
  };

  const handleAddComment = async (postId: number, text: string) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/comment/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.ok) setPosts(posts.map((p) => p.id === postId ? { ...p, comments: [...p.comments, data] } : p));
    } catch { console.log("Comment failed"); }
  };

  const handleLikeComment = async (commentId: number, postId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/comments/${commentId}/like/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(posts.map((p) =>
          p.id === postId
            ? { ...p, comments: p.comments.map((c) => c.id === commentId ? { ...c, likes: data.likes, liked: data.liked } : c) }
            : p
        ));
      }
    } catch { console.log("Comment like failed"); }
  };

  const filteredLoops = loops.filter((l) => {
    const matchesSearch =
      l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === "All" || l.tag === activeTag;
    return matchesSearch && matchesTag;
  });

  const joinedLoopNames = loops.filter((l) => joinedMap[l.id]).map((l) => l.name);
  const filteredPosts = feedFilter === "myloops"
    ? posts.filter((p) => p.loop && joinedLoopNames.includes(p.loop))
    : posts;

  const myRequests = requests.filter((r) =>
    loops.find((l) => l.id === r.loopId && l.createdByMe)
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Loops</h1>
          <p className="text-sm text-muted-foreground">Small communities. Big momentum.</p>
        </div>

        <Tabs defaultValue="explore">
          <TabsList className="glass">
            <TabsTrigger value="explore">Explore</TabsTrigger>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
            <TabsTrigger value="requests" className="relative">
              Requests
              {myRequests.length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                  {myRequests.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    activeTag === t
                      ? "gradient-bg text-primary-foreground border-transparent"
                      : "glass border-border text-muted-foreground hover:border-primary/40"
                  }`}>
                  {t}
                </button>
              ))}
            </div>

            {filteredLoops.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <p className="text-sm text-muted-foreground">No loops found. Try a different search!</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLoops.map((l) => (
                  <LoopCard
                    key={l.id}
                    loop={l}
                    joined={!!joinedMap[l.id]}
                    joinedAt={joinedMap[l.id]}
                    pendingRequest={pendingIds.includes(l.id)}
                    onJoinLeave={handleJoinLeave}
                    onEdit={l.createdByMe ? setEditingLoop : undefined}
                    onDelete={l.createdByMe ? setDeletingLoop : undefined}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Feed Tab ── */}
          <TabsContent value="feed" className="space-y-4 mt-6 max-w-2xl">
            <div className="flex gap-2">
              <button onClick={() => setFeedFilter("all")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  feedFilter === "all" ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground"
                }`}>
                All Posts
              </button>
              <button onClick={() => setFeedFilter("myloops")}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                  feedFilter === "myloops" ? "gradient-bg text-primary-foreground border-transparent" : "glass border-border text-muted-foreground"
                }`}>
                My Loops {Object.keys(joinedMap).length > 0 && `(${Object.keys(joinedMap).length})`}
              </button>
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
                    className="w-full bg-transparent text-sm outline-none resize-none min-h-[60px]"
                    maxLength={500} />
                  {postError && <p className="text-xs text-red-500 mb-2">{postError}</p>}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{draft.length}/500 · Cmd+Enter to post</span>
                    <Button size="sm" className="gradient-bg border-0" onClick={handlePost} disabled={posting || !draft.trim()}>
                      {posting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {posting ? "Posting..." : "Post"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {loadingPosts ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredPosts.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {feedFilter === "myloops"
                    ? Object.keys(joinedMap).length === 0
                      ? "Join some loops first to see their posts here!"
                      : "No posts from your loops yet."
                    : "No posts yet. Be the first to share your progress!"}
                </p>
              </Card>
            ) : (
              filteredPosts.map((p) => (
                <PostCard key={p.id} post={p}
                  onLikePost={handleLikePost}
                  onAddComment={handleAddComment}
                  onLikeComment={handleLikeComment} />
              ))
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
            {myRequests.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                  <UserCheck className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium text-sm">No pending requests</p>
                <p className="text-xs text-muted-foreground mt-1">Join requests for your private loops will appear here.</p>
              </Card>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">{myRequests.length} pending request{myRequests.length > 1 ? "s" : ""} for your loops</p>
                {myRequests.map((req) => (
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
                          Wants to join <span className="font-medium text-foreground">{req.loopName}</span> · {req.requestedAt}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleApproveRequest(req)}
                          className="gradient-bg text-primary-foreground border-0 gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDenyRequest(req)}
                          className="border-red-200 text-red-500 hover:bg-red-50 gap-1">
                          <UserX className="w-3.5 h-3.5" />
                          Deny
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

      {showCreateModal && (
        <CreateLoopModal onClose={() => setShowCreateModal(false)} onCreate={handleLoopCreated} />
      )}
      {editingLoop && (
        <EditLoopModal loop={editingLoop} onClose={() => setEditingLoop(null)} onSave={handleLoopEdited} />
      )}
      {deletingLoop && (
        <DeleteLoopModal loop={deletingLoop} onClose={() => setDeletingLoop(null)} onConfirm={handleLoopDeleted} />
      )}
    </AppShell>
  );
}