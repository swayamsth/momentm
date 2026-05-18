"use client";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Heart, MessageCircle, Loader2, ZoomIn, X, Users, FileText, Globe,
  Lock, Shield, Camera, Edit3, ArrowLeft, Search, UserCheck, UserPlus, UserMinus,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

interface Post {
  id: number;
  user: string;
  handle: string;
  time: string;
  text: string;
  likes: number;
  liked: boolean;
  comments: { id: number }[];
  image: string | null;
  loop: string | null;
  loop_id: number | null;
  is_mine: boolean;
}

interface SuggestedUser {
  id: number;
  name: string;
  handle: string;
  profile_picture_url: string | null;
}

interface PublicUserData {
  id: number;
  name: string;
  handle: string;
  bio: string;
  profile_picture_url: string | null;
  cover_photo_url: string | null;
  is_private: boolean;
  post_count: number;
  followers_count: number;
  following_count: number;
  is_following: boolean;
  follow_status: "accepted" | "pending" | null;
  can_see_posts: boolean;
  posts: { id: number; text: string; image: string | null; time: string; likes: number; comments: number }[];
  mutual_loops: { id: number; name: string; tag: string; members: number; image_url: string | null }[];
}

function UserProfileModal({ userId, onClose }: { userId: number; onClose: () => void }) {
  const router = useRouter();
  const [data, setData] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/users/${userId}/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollow = async () => {
    if (!data) return;
    setFollowLoading(true);
    try {
      if (data.is_following || data.follow_status === 'pending') {
        await fetch(`${API}/users/${userId}/follow/`, { method: "DELETE", headers: authHeaders() });
        setData(prev => prev ? { ...prev, is_following: false, follow_status: null, followers_count: Math.max(0, prev.followers_count - (prev.is_following ? 1 : 0)) } : prev);
      } else {
        const res = await fetch(`${API}/users/${userId}/follow/`, { method: "POST", headers: authHeaders() });
        const result = await res.json();
        setData(prev => prev ? { ...prev, is_following: result.is_following, follow_status: result.status, followers_count: result.is_following ? prev.followers_count + 1 : prev.followers_count } : prev);
      }
    } catch { /* ignore */ }
    setFollowLoading(false);
  };

  const initials = (data?.name?.[0] ?? "?").toUpperCase();

  const followLabel = data?.follow_status === 'pending' ? 'Requested' : data?.is_following ? 'Following' : 'Follow';
  const FollowIcon = data?.follow_status === 'pending' ? Loader2 : data?.is_following ? UserMinus : UserPlus;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Post" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="w-full max-w-4xl bg-background rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 flex-shrink-0">
          <h2 className="font-semibold text-base">Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : !data ? (
          <div className="flex-1 flex items-center justify-center py-16 text-sm text-muted-foreground">Could not load profile.</div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Cover */}
            <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 relative flex-shrink-0">
              {data.cover_photo_url && <img src={data.cover_photo_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
            </div>
            {/* Avatar + info */}
            <div className="px-5 pb-4">
              <div className="flex items-end justify-between -mt-8 mb-3">
                <div className="w-16 h-16 rounded-full border-4 border-background gradient-bg flex items-center justify-center text-primary-foreground font-bold text-xl overflow-hidden shadow-lg">
                  {data.profile_picture_url
                    ? <img src={data.profile_picture_url} alt={data.name} className="w-full h-full object-cover" />
                    : initials}
                </div>
                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${data.is_following || data.follow_status === 'pending' ? 'glass border border-border/50 text-foreground hover:bg-accent' : 'gradient-bg text-primary-foreground'}`}
                  >
                    <FollowIcon className={`w-3.5 h-3.5 ${followLoading ? 'animate-spin' : ''}`} />
                    {followLabel}
                  </button>
                  <button
                    onClick={() => { onClose(); router.push(`/users/${userId}`); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium glass border border-border/50 hover:bg-accent transition-all"
                  >
                    View all posts
                  </button>
                </div>
              </div>
              <h3 className="text-lg font-bold">{data.name}</h3>
              <p className="text-sm text-muted-foreground">@{data.handle}</p>
              {data.bio && <p className="text-sm mt-1.5 text-foreground/80">{data.bio}</p>}
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{data.followers_count}</span> followers</span>
                <span className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">{data.following_count}</span> following</span>
              </div>
            </div>

            {/* Two-column body */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-5 px-5 pb-5">
              {/* Posts */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold">Public Posts</h4>
                {!data.can_see_posts ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                      <Lock className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium">This account is private</p>
                    <p className="text-xs text-muted-foreground mt-1">Follow this account to see their posts.</p>
                  </div>
                ) : data.posts.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No public posts yet.</p>
                ) : data.posts.map(p => (
                  <Card key={p.id} className="glass border-0 p-4">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-xs flex-shrink-0 overflow-hidden">
                        {data.profile_picture_url ? <img src={data.profile_picture_url} alt={data.name} className="w-full h-full object-cover" /> : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-semibold">{data.name}</span>
                          <span className="text-muted-foreground">@{data.handle} · {p.time}</span>
                        </div>
                        <p className="text-sm mt-1 leading-relaxed">{p.text}</p>
                        {p.image && (
                          <div className="mt-2 cursor-pointer rounded-xl overflow-hidden" onClick={() => setLightbox(p.image!)}>
                            <img src={p.image} alt="Post" className="w-full max-h-48 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.comments}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Mutual loops */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Loops in common</h4>
                {data.mutual_loops.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No shared loops yet.</p>
                ) : (
                  <div className="space-y-2">
                    {data.mutual_loops.map(l => (
                      <div key={l.id} className="flex items-center gap-3 p-3 glass rounded-xl">
                        <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground flex-shrink-0 overflow-hidden">
                          {l.image_url ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" /> : <Users className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.name}</p>
                          <p className="text-xs text-muted-foreground">{l.tag} · {l.members} members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProfileData {
  first_name: string;
  last_name: string;
  email: string;
  bio: string;
  privacy: "public" | "private" | "restricted";
  profile_picture_url: string | null;
  cover_photo_url: string | null;
  post_count: number;
  loop_count: number;
  public_post_count: number;
  followers_count: number;
  following_count: number;
}

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
        <X className="w-5 h-5" />
      </button>
      <img src={src} alt="Post" className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

const PRIVACY_OPTIONS = [
  { value: "public", label: "Public", icon: Globe, desc: "Anyone can see your profile and posts" },
  { value: "private", label: "Private", icon: Lock, desc: "Only approved followers can see your posts" },
  { value: "restricted", label: "Restricted", icon: Shield, desc: "Public but certain users see limited content" },
] as const;

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: ProfileData;
  onClose: () => void;
  onSave: (updated: Partial<ProfileData>) => void;
}) {
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [bio, setBio] = useState(profile.bio || "");
  const [privacy, setPrivacy] = useState(profile.privacy);
  const [restrictedSearch, setRestrictedSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API}/profile/`, {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ first_name: firstName, last_name: lastName, bio, privacy }),
      });
      if (res.ok) {
        onSave({ first_name: firstName, last_name: lastName, bio, privacy });
        // Update localStorage
        const stored = localStorage.getItem("user");
        if (stored) {
          const u = JSON.parse(stored);
          localStorage.setItem("user", JSON.stringify({ ...u, first_name: firstName, last_name: lastName }));
        }
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save.");
      }
    } catch {
      setError("Network error.");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <h2 className="font-semibold text-base">Edit Profile</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

          {/* Name */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">First name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Last name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3}
              placeholder="Tell people a bit about yourself..."
              className="w-full bg-muted/50 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>

          {/* Privacy */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-2 block">Profile privacy</label>
            <div className="space-y-2">
              {PRIVACY_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setPrivacy(opt.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    privacy === opt.value
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/50 hover:border-border"
                  }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    privacy === opt.value ? "gradient-bg" : "bg-muted"
                  }`}>
                    <opt.icon className={`w-4 h-4 ${privacy === opt.value ? "text-primary-foreground" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.desc}</p>
                  </div>
                  {privacy === opt.value && (
                    <div className="w-4 h-4 rounded-full gradient-bg flex items-center justify-center flex-shrink-0">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Restricted users search */}
          {privacy === "restricted" && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Restricted users</label>
              <div className="bg-muted/50 rounded-xl flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input value={restrictedSearch} onChange={(e) => setRestrictedSearch(e.target.value)}
                  placeholder="Search users to restrict..."
                  className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
              </div>
              <p className="text-xs text-muted-foreground mt-1.5">Restricted users can see your public posts but not your activity details.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border/50">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gradient-bg border-0 text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([]);
  const [myLoops, setMyLoops] = useState<{ id: number; name: string; tag: string; members: number; image_url: string | null }[]>([]);
  const [discoverLoops, setDiscoverLoops] = useState<{ id: number; name: string; tag: string; members: number; image_url: string | null }[]>([]);
  const [showAllLoops, setShowAllLoops] = useState(false);
  const [loopSearch, setLoopSearch] = useState("");
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [viewingUserId, setViewingUserId] = useState<number | null>(null);

  const pictureInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`${API}/profile/`, { headers: authHeaders() });
      if (res.ok) setProfile(await res.json());
    } catch { }
    setLoadingProfile(false);
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(`${API}/posts/mine/`, { headers: authHeaders() });
      if (res.ok) {
        const data: Post[] = await res.json();
        if (Array.isArray(data)) setPosts(data.filter((p) => p.loop_id === null));
      }
    } catch { }
    setLoadingPosts(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchProfile();
    fetchPosts();
    // Fetch suggestions and loops
    fetch(`${API}/profile/suggestions/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (Array.isArray(d)) setSuggestions(d); })
      .catch(() => {});
    fetch(`${API}/loops/`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : [])
      .then(d => {
        if (Array.isArray(d)) {
          const joined = d.filter((l: { joined: boolean; created_by_me: boolean }) => l.joined || l.created_by_me);
          const discover = d.filter((l: { joined: boolean; created_by_me: boolean }) => !l.joined && !l.created_by_me);
          setMyLoops(joined);
          setDiscoverLoops(discover.slice(0, 4));
        }
      })
      .catch(() => {});
  }, [mounted, fetchProfile, fetchPosts]);

  const handleLike = async (postId: number) => {
    setPosts((prev) => prev.map((p) => p.id === postId
      ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 }
      : p));
    try {
      await fetch(`${API}/posts/${postId}/like/`, { method: "POST", headers: authHeaders() });
    } catch { }
  };

  const handleUploadPicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPicture(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${API}/profile/upload-picture/`, { method: "POST", headers: authHeaders(), body: form });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, profile_picture_url: data.profile_picture_url } : null);
      }
    } catch { }
    setUploadingPicture(false);
    e.target.value = "";
  };

  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch(`${API}/profile/upload-cover/`, { method: "POST", headers: authHeaders(), body: form });
      if (res.ok) {
        const data = await res.json();
        setProfile((prev) => prev ? { ...prev, cover_photo_url: data.cover_photo_url } : null);
      }
    } catch { }
    setUploadingCover(false);
    e.target.value = "";
  };

  if (!mounted) return null;

  const fullName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email
    : "You";
  const handle = profile?.email?.split("@")[0] || "user";
  const initials = (profile?.first_name?.[0] ?? profile?.email?.[0] ?? "?").toUpperCase();

  const PrivacyIcon = profile?.privacy === "private" ? Lock : profile?.privacy === "restricted" ? Shield : Globe;

  const backButton = (
    <button onClick={() => router.back()}
      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );

  return (
    <AppShell headerLeft={backButton}>
      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
      {showEditModal && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setShowEditModal(false)}
          onSave={(updated) => setProfile((prev) => prev ? { ...prev, ...updated } : null)}
        />
      )}

      {/* Hidden file inputs */}
      <input ref={pictureInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadPicture} />
      <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleUploadCover} />

      {/* User profile modal */}
      {viewingUserId !== null && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}

      {/* All-loops popup */}
      {showAllLoops && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h2 className="font-semibold text-base">All My Loops</h2>
              <button onClick={() => { setShowAllLoops(false); setLoopSearch(""); }} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-border/50">
              <div className="bg-muted/50 rounded-xl flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input value={loopSearch} onChange={e => setLoopSearch(e.target.value)}
                  placeholder="Search loops..." className="flex-1 bg-transparent py-2.5 text-sm outline-none" />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {myLoops.filter(l => l.name.toLowerCase().includes(loopSearch.toLowerCase())).map(l => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0 overflow-hidden">
                    {l.image_url ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" /> : <Users className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{l.name}</p>
                    <p className="text-xs text-muted-foreground">{l.tag} · {l.members} members</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* All suggestions popup */}
      {showAllSuggestions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="w-full max-w-md bg-background rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
              <h2 className="font-semibold text-base">People you may know</h2>
              <button onClick={() => { setShowAllSuggestions(false); setSuggestionSearch(""); }} className="w-8 h-8 rounded-full hover:bg-accent flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-3 border-b border-border/50">
              <div className="bg-muted/50 rounded-xl flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input value={suggestionSearch} onChange={e => setSuggestionSearch(e.target.value)}
                  placeholder="Search people..." className="flex-1 bg-transparent py-2.5 text-sm outline-none" autoFocus />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-1">
              {suggestions.filter(u =>
                u.name.toLowerCase().includes(suggestionSearch.toLowerCase()) ||
                u.handle.toLowerCase().includes(suggestionSearch.toLowerCase())
              ).map(user => {
                const ui = (user.name?.[0] ?? user.handle?.[0] ?? "?").toUpperCase();
                return (
                  <button key={user.id} onClick={() => { setShowAllSuggestions(false); setSuggestionSearch(""); setViewingUserId(user.id); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors text-left">
                    <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                      {user.profile_picture_url ? <img src={user.profile_picture_url} alt={user.name} className="w-full h-full object-cover" /> : ui}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name || user.handle}</p>
                      <p className="text-xs text-muted-foreground">@{user.handle}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start">
          {/* ── LEFT COLUMN ── */}
          <div className="space-y-6">
            {/* Cover + Avatar card */}
            <Card className="glass border-0 overflow-hidden">
              {/* Cover photo */}
              <div className="relative h-44 bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 group">
                {profile?.cover_photo_url && (
                  <img src={profile.cover_photo_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                )}
                {loadingProfile && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                {/* Edit cover button */}
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white text-xs font-medium transition-colors backdrop-blur-sm"
                >
                  {uploadingCover ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                  Edit cover
                </button>
              </div>

              {/* Avatar row */}
              <div className="px-5 pb-5">
                <div className="flex items-end justify-between -mt-10 mb-3">
                  {/* Circular avatar */}
                  <div className="relative group">
                    <div className="w-20 h-20 rounded-full border-4 border-background gradient-bg flex items-center justify-center text-primary-foreground font-bold text-2xl overflow-hidden shadow-lg">
                      {profile?.profile_picture_url
                        ? <img src={profile.profile_picture_url} alt={fullName} className="w-full h-full object-cover" />
                        : initials}
                    </div>
                    <button
                      onClick={() => pictureInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      {uploadingPicture ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
                    </button>
                  </div>

                  {/* Edit profile button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowEditModal(true)}
                    className="flex items-center gap-1.5 rounded-xl"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit profile
                  </Button>
                </div>

                {/* Name + handle + bio */}
                <h1 className="text-xl font-bold tracking-tight">{fullName}</h1>
                <p className="text-sm text-muted-foreground">@{handle}</p>
                {profile?.bio && <p className="text-sm mt-2 text-foreground/80">{profile.bio}</p>}

                {/* Privacy badge */}
                <div className="flex items-center gap-1.5 mt-2">
                  <PrivacyIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{profile?.privacy ?? "public"}</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-5 pt-4 border-t border-border/50">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{profile?.loop_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <Users className="w-3 h-3" /> Loops
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{profile?.followers_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <UserCheck className="w-3 h-3" /> Followers
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold">{profile?.following_count ?? 0}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                      <UserPlus className="w-3 h-3" /> Following
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Public posts */}
            <div>
              <h2 className="text-base font-semibold mb-3">Public Posts</h2>
              {loadingPosts ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : posts.length === 0 ? (
                <Card className="glass border-0 p-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">No public posts yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Posts you share outside of a loop will appear here.</p>
                  <Button className="mt-4 gradient-bg border-0" onClick={() => router.push("/loops")}>
                    Go to Feed
                  </Button>
                </Card>
              ) : (
                <div className="space-y-4">
                  {posts.map((post) => (
                    <Card key={post.id} className="glass border-0 p-4">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                          {profile?.profile_picture_url
                            ? <img src={profile.profile_picture_url} alt={fullName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm">{initials}</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm flex-wrap">
                            <span className="font-semibold">{fullName}</span>
                            <span className="text-muted-foreground">@{handle} · {post.time}</span>
                            <Badge variant="secondary" className="text-xs flex items-center gap-1">
                              <Globe className="w-2.5 h-2.5" /> Public
                            </Badge>
                          </div>
                          <p className="text-sm mt-1 leading-relaxed">{post.text}</p>
                          {post.image && (
                            <div className="mt-3 relative group cursor-pointer rounded-xl overflow-hidden"
                              onClick={() => setLightbox(post.image!)}>
                              <img src={post.image} alt="Post" className="w-full max-h-64 object-cover rounded-xl transition-transform group-hover:scale-[1.01]" />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-xl flex items-center justify-center">
                                <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-6 mt-3 text-muted-foreground">
                            <button onClick={() => handleLike(post.id)}
                              className={`flex items-center gap-1.5 text-xs transition-colors ${post.liked ? "text-red-500" : "hover:text-red-500"}`}>
                              <Heart className={`w-4 h-4 ${post.liked ? "fill-red-500" : ""}`} /> {post.likes}
                            </button>
                            <span className="flex items-center gap-1.5 text-xs">
                              <MessageCircle className="w-4 h-4" /> {post.comments.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <div className="space-y-4 lg:sticky lg:top-6">
            {/* People you may know — or welcome card if empty */}
            {suggestions.length > 0 ? (
              <Card className="glass border-0 p-4">
                <h3 className="text-sm font-semibold mb-3">People you may know</h3>
                <div className="space-y-1">
                  {suggestions.slice(0, 4).map((user) => {
                    const userInitials = (user.name?.[0] ?? user.handle?.[0] ?? "?").toUpperCase();
                    return (
                      <button key={user.id}
                        onClick={() => setViewingUserId(user.id)}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-accent/50 transition-colors text-left">
                        <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                          {user.profile_picture_url
                            ? <img src={user.profile_picture_url} alt={user.name} className="w-full h-full object-cover" />
                            : userInitials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{user.name || user.handle}</p>
                          <p className="text-xs text-muted-foreground truncate">@{user.handle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {suggestions.length > 4 && (
                  <button onClick={() => setShowAllSuggestions(true)}
                    className="mt-2 w-full text-xs text-primary font-medium hover:underline text-center">
                    View all {suggestions.length} suggestions
                  </button>
                )}
              </Card>
            ) : (
              /* New user — no shared loops yet */
              <Card className="glass border-0 p-4 text-center">
                <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center mx-auto mb-3">
                  <Users className="w-5 h-5 text-primary-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">Find your community</p>
                <p className="text-xs text-muted-foreground mb-3">Join loops to discover people with the same goals.</p>
                <Button size="sm" className="gradient-bg border-0 w-full text-xs" onClick={() => router.push("/loops")}>
                  Explore Loops
                </Button>
              </Card>
            )}

            {/* Your Loops — or discover loops if new user */}
            {myLoops.length > 0 ? (
              <Card className="glass border-0 p-4">
                <h3 className="text-sm font-semibold mb-3">Your Loops</h3>
                <div className="space-y-2">
                  {myLoops.slice(0, 4).map((l) => (
                    <div key={l.id} onClick={() => router.push(`/loops/${l.id}`)}
                      className="flex items-center gap-3 py-1 cursor-pointer rounded-xl hover:bg-accent/50 transition-colors px-1">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden">
                        {l.image_url
                          ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
                          : <Users className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.members} members</p>
                      </div>
                    </div>
                  ))}
                </div>
                {myLoops.length > 4 && (
                  <button onClick={() => setShowAllLoops(true)}
                    className="mt-3 w-full text-xs text-primary font-medium hover:underline text-center">
                    View all {myLoops.length} loops
                  </button>
                )}
              </Card>
            ) : discoverLoops.length > 0 && (
              <Card className="glass border-0 p-4">
                <h3 className="text-sm font-semibold mb-3">Discover Loops</h3>
                <div className="space-y-2">
                  {discoverLoops.map((l) => (
                    <div key={l.id} onClick={() => router.push(`/loops/${l.id}`)}
                      className="flex items-center gap-3 py-1 cursor-pointer rounded-xl hover:bg-accent/50 transition-colors px-1">
                      <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 overflow-hidden">
                        {l.image_url
                          ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" />
                          : <Users className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.tag} · {l.members} members</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => router.push("/loops")}
                  className="mt-3 w-full text-xs text-primary font-medium hover:underline text-center">
                  Browse all loops
                </button>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
