"use client";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Heart, MessageCircle, Repeat2, Users, Target, Search,
  Plus, Loader2, Send, X, Lock, Globe
} from "lucide-react";
import { useState, useEffect } from "react";

// ─── Static Data ────────────────────────────────────────────────────────────

const loopsData = [
  { id: 1, name: "5AM Run Club", members: 1240, tag: "Running", desc: "Early-morning runners pushing each other.", color: "oklch(0.6 0.22 255)", isPrivate: false },
  { id: 2, name: "Mindful Mornings", members: 820, tag: "Mind", desc: "10-minute meditation streaks together.", color: "oklch(0.55 0.18 300)", isPrivate: false },
  { id: 3, name: "Strength 200", members: 450, tag: "Strength", desc: "200 reps a day — bodyweight or weighted.", color: "oklch(0.62 0.22 25)", isPrivate: true },
  { id: 4, name: "Plant-Based Pros", members: 690, tag: "Nutrition", desc: "Daily plant-forward meal logs.", color: "oklch(0.7 0.16 155)", isPrivate: false },
  { id: 5, name: "Cycle 100", members: 320, tag: "Cycling", desc: "100km a week, every week.", color: "oklch(0.78 0.16 75)", isPrivate: false },
  { id: 6, name: "Sleep Stack", members: 510, tag: "Recovery", desc: "Lights out by 10:30pm.", color: "oklch(0.5 0.15 280)", isPrivate: true },
];

const challengesData = [
  { name: "March Mile-A-Day", loop: "5AM Run Club", progress: 68, goal: "31 miles total", participants: 240, color: "oklch(0.6 0.22 255)" },
  { name: "100k Steps Week", loop: "Cycle 100", progress: 42, goal: "100,000 group steps", participants: 86, color: "oklch(0.7 0.16 155)" },
  { name: "21-Day Meditation", loop: "Mindful Mornings", progress: 85, goal: "21 sessions", participants: 412, color: "oklch(0.55 0.18 300)" },
  { name: "Push-Up October", loop: "Strength 200", progress: 23, goal: "10,000 group push-ups", participants: 145, color: "oklch(0.62 0.22 25)" },
];

const ALL_TAGS = ["All", "Running", "Mind", "Strength", "Nutrition", "Cycling", "Recovery"];

// ─── Types ───────────────────────────────────────────────────────────────────

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
}

// ─── Create Loop Modal ───────────────────────────────────────────────────────

function CreateLoopModal({ onClose }: { onClose: () => void }) {
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
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/loops/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, description: desc, tag, is_private: isPrivate }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(onClose, 1200);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create loop.");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={onClose} />
      <Card className="glass-strong border-0 w-full max-w-md p-6 relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Create a Loop</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
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
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. 6AM Grind Squad"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="What's this loop about?"
                  className="w-full bg-muted rounded-xl px-4 py-2.5 text-sm outline-none resize-none min-h-[80px] focus:ring-2 focus:ring-primary/30"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground text-right mt-1">{desc.length}/200</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_TAGS.filter(t => t !== "All").map((t) => (
                    <button
                      key={t}
                      onClick={() => setTag(t)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                        tag === t
                          ? "gradient-bg text-primary-foreground border-transparent"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
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
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`w-10 h-6 rounded-full transition-all relative ${isPrivate ? "gradient-bg" : "bg-muted"}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${isPrivate ? "left-5" : "left-1"}`} />
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button className="flex-1 gradient-bg" onClick={handleCreate} disabled={loading || !name.trim()}>
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

// ─── Loop Card ───────────────────────────────────────────────────────────────

function LoopCard({ loop }: { loop: typeof loopsData[0] }) {
  const [joined, setJoined] = useState(false);
  const [members, setMembers] = useState(loop.members);
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/loops/${loop.id}/join/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setJoined(!joined);
        setMembers(joined ? members - 1 : members + 1);
      }
    } catch {
      // still toggle locally if backend not ready yet
      setJoined(!joined);
      setMembers(joined ? members - 1 : members + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass border-0 p-5 hover:shadow-[var(--shadow-elegant)] transition-all hover:-translate-y-0.5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `color-mix(in oklab, ${loop.color} 18%, transparent)` }}
        >
          <Users className="w-5 h-5" style={{ color: loop.color }} />
        </div>
        <div className="flex items-center gap-2">
          {loop.isPrivate && (
            <span title="Private loop">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
            </span>
          )}
          <Badge variant="secondary" className="text-xs">{loop.tag}</Badge>
        </div>
      </div>
      <h3 className="font-semibold">{loop.name}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4 flex-1">{loop.desc}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{members.toLocaleString()} members</span>
        <Button
          size="sm"
          variant={joined ? "outline" : "default"}
          className={joined ? "" : "gradient-bg text-primary-foreground border-0"}
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : joined ? "Joined ✓" : "Join"}
        </Button>
      </div>
    </Card>
  );
}

// ─── Post Card ───────────────────────────────────────────────────────────────

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
          </div>
          <p className="text-sm mt-1 leading-relaxed">{post.text}</p>
          <div className="flex items-center gap-6 mt-3 text-muted-foreground">
            <button
              onClick={() => onLikePost(post.id)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-red-500" : "hover:text-red-500"}`}
            >
              <Heart className={`w-4 h-4 ${post.liked ? "fill-red-500" : ""}`} />
              {post.likes}
            </button>
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 text-xs transition-colors ${showComments ? "text-primary" : "hover:text-primary"}`}
            >
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
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0">
                  ?
                </div>
                <div className="flex-1 flex gap-2">
                  <input
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleComment()}
                    placeholder="Write a comment..."
                    className="flex-1 bg-muted rounded-lg px-3 py-1.5 text-xs outline-none"
                  />
                  <button
                    onClick={handleComment}
                    disabled={posting || !commentDraft.trim()}
                    className="text-primary hover:opacity-70 disabled:opacity-30 transition"
                  >
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
                      <button
                        onClick={() => onLikeComment(comment.id, post.id)}
                        className={`flex items-center gap-1 text-xs mt-1.5 transition-colors ${comment.liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
                      >
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

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function LoopsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState("All");
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
    } catch {
      setError("Could not load posts.");
    } finally {
      setLoadingPosts(false);
    }
  };

  useEffect(() => {
    fetchPosts();
    const interval = setInterval(fetchPosts, 15000);
    return () => clearInterval(interval);
  }, []);

  const handlePost = async () => {
    if (!draft.trim()) return;
    setPosting(true);
    setError("");
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch("http://127.0.0.1:8000/api/posts/create/", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      if (res.ok) {
        setPosts([data, ...posts]);
        setDraft("");
      } else {
        setError(data.error || "Failed to post.");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setPosting(false);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`http://127.0.0.1:8000/api/posts/${postId}/like/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setPosts(posts.map((p) => p.id === postId ? { ...p, likes: data.likes, liked: data.liked } : p));
      }
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
      if (res.ok) {
        setPosts(posts.map((p) => p.id === postId ? { ...p, comments: [...p.comments, data] } : p));
      }
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

  const filteredLoops = loopsData.filter((l) => {
    const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = activeTag === "All" || l.tag === activeTag;
    return matchesSearch && matchesTag;
  });

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
          </TabsList>

          {/* ── Explore Tab ── */}
          <TabsContent value="explore" className="space-y-4 mt-6">
            <div className="flex gap-2">
              <div className="flex-1 glass rounded-xl flex items-center gap-2 px-4">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search loops..."
                  className="flex-1 bg-transparent py-3 text-sm outline-none"
                />
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

            {/* Tag filters */}
            <div className="flex gap-2 flex-wrap">
              {ALL_TAGS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                    activeTag === t
                      ? "gradient-bg text-primary-foreground border-transparent"
                      : "glass border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {filteredLoops.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <p className="text-sm text-muted-foreground">No loops found for &quot;{searchQuery}&quot;</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredLoops.map((l) => <LoopCard key={l.id} loop={l} />)}
              </div>
            )}
          </TabsContent>

          {/* ── Feed Tab ── */}
          <TabsContent value="feed" className="space-y-4 mt-6 max-w-2xl">
            <Card className="glass border-0 p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1">
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && handlePost()}
                    placeholder="Share your progress..."
                    className="w-full bg-transparent text-sm outline-none resize-none min-h-[60px]"
                    maxLength={500}
                  />
                  {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
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
            ) : posts.length === 0 ? (
              <Card className="glass border-0 p-8 text-center">
                <p className="text-sm text-muted-foreground">No posts yet. Be the first to share your progress!</p>
              </Card>
            ) : (
              posts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  onLikePost={handleLikePost}
                  onAddComment={handleAddComment}
                  onLikeComment={handleLikeComment}
                />
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
        </Tabs>
      </div>

      {showCreateModal && <CreateLoopModal onClose={() => setShowCreateModal(false)} />}
    </AppShell>
  );
}