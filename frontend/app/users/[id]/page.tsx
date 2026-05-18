"use client";
import { useParams, useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { useEffect, useState } from "react";
import {
  Heart, MessageCircle, Loader2, X, Users, Lock,
  ArrowLeft, UserPlus, UserMinus, UserCheck,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [data, setData] = useState<PublicUserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
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

  const headerLeft = (
    <div className="flex items-center gap-3">
      <button onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      {data && (
        <>
          <div className="w-px h-4 bg-border/60" />
          <h1 className="text-xl font-semibold tracking-tight">{data.name}</h1>
        </>
      )}
    </div>
  );

  return (
    <AppShell headerLeft={headerLeft}>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Post" className="max-w-full max-h-[90vh] rounded-2xl object-contain" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : !data ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <p className="text-lg font-medium">User not found</p>
          <p className="text-sm text-muted-foreground mt-1">This profile doesn&apos;t exist or was deleted.</p>
        </div>
      ) : (
        <div className="max-w-4xl space-y-0">
          {/* Profile card */}
          <Card className="glass border-0 overflow-hidden mb-6">
            {/* Cover */}
            <div className="h-40 bg-gradient-to-br from-primary/20 via-primary/10 to-muted/30 relative">
              {data.cover_photo_url && <img src={data.cover_photo_url} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />}
            </div>
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-10 mb-4">
                <div className="w-20 h-20 rounded-full border-4 border-background gradient-bg flex items-center justify-center text-primary-foreground font-bold text-2xl overflow-hidden shadow-lg">
                  {data.profile_picture_url
                    ? <img src={data.profile_picture_url} alt={data.name} className="w-full h-full object-cover" />
                    : initials}
                </div>
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all ${data.is_following || data.follow_status === 'pending' ? 'glass border border-border/50 hover:bg-accent' : 'gradient-bg text-primary-foreground'}`}
                >
                  <FollowIcon className={`w-4 h-4 ${followLoading ? 'animate-spin' : ''}`} />
                  {followLabel}
                </button>
              </div>
              <h2 className="text-2xl font-bold">{data.name}</h2>
              <p className="text-sm text-muted-foreground">@{data.handle}</p>
              {data.bio && <p className="text-sm mt-2 text-foreground/80">{data.bio}</p>}
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border/50">
                <div className="text-center">
                  <p className="text-xl font-bold">{data.followers_count}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><UserCheck className="w-3 h-3" /> Followers</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{data.following_count}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><UserPlus className="w-3 h-3" /> Following</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold">{data.post_count}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
            {/* Posts */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Public Posts</h3>
              {!data.can_see_posts ? (
                <Card className="glass border-0 p-10 flex flex-col items-center text-center">
                  <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-3">
                    <Lock className="w-7 h-7 text-muted-foreground" />
                  </div>
                  <p className="font-semibold">This account is private</p>
                  <p className="text-sm text-muted-foreground mt-1">Follow to see their posts.</p>
                </Card>
              ) : data.posts.length === 0 ? (
                <Card className="glass border-0 p-10 text-center">
                  <p className="text-sm text-muted-foreground">No public posts yet.</p>
                </Card>
              ) : (
                data.posts.map(p => (
                  <Card key={p.id} className="glass border-0 p-4">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0 overflow-hidden">
                        {data.profile_picture_url ? <img src={data.profile_picture_url} alt={data.name} className="w-full h-full object-cover" /> : initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span className="font-semibold">{data.name}</span>
                          <span className="text-xs text-muted-foreground">@{data.handle} · {p.time}</span>
                        </div>
                        <p className="text-sm mt-1 leading-relaxed">{p.text}</p>
                        {p.image && (
                          <div className="mt-2 cursor-pointer rounded-xl overflow-hidden" onClick={() => setLightbox(p.image!)}>
                            <img src={p.image} alt="Post" className="w-full max-h-64 object-cover rounded-xl hover:opacity-90 transition-opacity" />
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-muted-foreground text-xs">
                          <span className="flex items-center gap-1"><Heart className="w-3.5 h-3.5" /> {p.likes}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3.5 h-3.5" /> {p.comments}</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>

            {/* Mutual loops sidebar */}
            <div className="space-y-4">
              <h3 className="text-base font-semibold">Loops in common</h3>
              {data.mutual_loops.length === 0 ? (
                <Card className="glass border-0 p-5 text-center">
                  <p className="text-xs text-muted-foreground">No shared loops yet.</p>
                </Card>
              ) : (
                <div className="space-y-2">
                  {data.mutual_loops.map(l => (
                    <Card key={l.id} className="glass border-0 p-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center text-primary-foreground flex-shrink-0 overflow-hidden">
                        {l.image_url ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" /> : <Users className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{l.name}</p>
                        <p className="text-xs text-muted-foreground">{l.tag} · {l.members} members</p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
