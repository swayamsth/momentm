"use client";
import { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Flame, Medal, Crown, Award, Zap, Star, Ticket, Heart, Tag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type UserLoop = {
  id: number;
  name: string;
  joined: boolean;
};

type LeaderboardUser = {
  rank: number;
  name: string;
  streak: number;
  points: number;
  is_premium: boolean;
  cosmetics: string[];
  you: boolean;
};

type Reward = {
  id: number;
  name: string;
  description: string;
  type: "cosmetic" | "subscription" | "real_world";
  effect: string;
  cost: number;
  icon: string;
  color: string;
  metadata: Record<string, number>;
  claimed: boolean;
  can_afford: boolean;
  in_stock: boolean;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  flame:    <Flame className="w-6 h-6" />,
  award:    <Award className="w-6 h-6" />,
  megaphone:<Trophy className="w-6 h-6" />,
  crown:    <Crown className="w-6 h-6" />,
  zap:      <Zap className="w-6 h-6" />,
  star:     <Star className="w-6 h-6" />,
  ticket:   <Ticket className="w-6 h-6" />,
  heart:    <Heart className="w-6 h-6" />,
  tag:      <Tag className="w-6 h-6" />,
  trophy:   <Trophy className="w-6 h-6" />,
};

function RewardCard({ reward, onClaim, claiming }: {
  reward: Reward;
  onClaim: (id: number) => void;
  claiming: boolean;
}) {
  const icon = ICON_MAP[reward.icon] ?? ICON_MAP.trophy;
  return (
    <Card className="glass border-0 p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${reward.color} 20%, transparent)`, color: reward.color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{reward.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{reward.description}</div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: reward.color }}>
          {reward.cost.toLocaleString()} pts
        </span>
        {reward.claimed ? (
          <Badge variant="secondary" className="text-xs">Claimed</Badge>
        ) : !reward.in_stock ? (
          <Badge variant="outline" className="text-xs text-muted-foreground">Out of stock</Badge>
        ) : (
          <Button
            size="sm"
            className="gradient-bg text-xs h-7 px-3"
            disabled={!reward.can_afford || claiming}
            onClick={() => onClaim(reward.id)}
          >
            {!reward.can_afford ? `Need ${(reward.cost).toLocaleString()} pts` : "Claim"}
          </Button>
        )}
      </div>
    </Card>
  );
}

type FilterValue = 10 | 50 | 100 | null;

const FILTER_OPTIONS: { label: string; value: FilterValue }[] = [
  { label: "Top 10",   value: 10 },
  { label: "Top 50",   value: 50 },
  { label: "Top 100",  value: 100 },
  { label: "Everyone", value: null },
];

function FilterDropdown({ value, onChange }: { value: FilterValue; onChange: (v: FilterValue) => void }) {
  return (
    <Select
      value={String(value)}
      onValueChange={(v) => onChange(v === "null" ? null : (Number(v) as FilterValue))}
    >
      <SelectTrigger className="w-36 glass border-0 text-xs h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="glass-strong border-0">
        {FILTER_OPTIONS.map(opt => (
          <SelectItem key={String(opt.value)} value={String(opt.value)} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function applyFilter(list: LeaderboardUser[], limit: FilterValue): {
  visible: LeaderboardUser[];
  you: LeaderboardUser | null;
} {
  if (!limit) return { visible: list, you: null };
  const top = list.slice(0, limit);
  const inTop = top.some(u => u.you);
  const youEntry = list.find(u => u.you) ?? null;
  return { visible: top, you: inTop ? null : youEntry };
}

function Row({ u }: { u: LeaderboardUser }) {
  const rankIcon =
    u.rank === 1 ? <Crown className="w-4 h-4 text-yellow-400" /> :
    u.rank === 2 ? <Medal className="w-4 h-4 text-muted-foreground" /> :
    u.rank === 3 ? <Medal className="w-4 h-4 text-orange-400" /> :
    <span className="text-sm font-semibold text-muted-foreground w-4 text-center">{u.rank}</span>;

  const hasFlame = u.cosmetics.includes("streak_flame");
  const hasBadge = u.cosmetics.includes("profile_badge");
  const hasTitle = u.cosmetics.includes("leaderboard_title");

  return (
    <div className={`glass rounded-xl p-4 flex items-center gap-4 ${u.you ? "ring-2 ring-primary" : ""}`}>
      <div className="w-8 flex justify-center">{rankIcon}</div>
      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm shrink-0">
        {u.name[0]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm flex items-center gap-1.5 flex-wrap">
          {u.name}
          {hasBadge && <span className="cosmetic-badge"><Award className="w-5 h-5" /></span>}
          {hasTitle && <span className="cosmetic-title">Iron Athlete</span>}
          {u.you && <Badge variant="secondary" className="text-xs">You</Badge>}
          {u.is_premium && <Badge className="text-xs gradient-bg border-0 text-primary-foreground">Premium</Badge>}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          {hasFlame
            ? <span className="cosmetic-flame"><Flame className="w-4 h-4" /></span>
            : <Flame className="w-3.5 h-3.5" />
          }
          {u.streak} day streak
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold">{u.points.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">points</div>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [availablePoints, setAvailablePoints] = useState(0);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [myLoops, setMyLoops] = useState<UserLoop[]>([]);
  const [selectedLoopId, setSelectedLoopId] = useState<number | null>(null);
  const [loopUsers, setLoopUsers] = useState<LeaderboardUser[]>([]);
  const [loadingLoopBoard, setLoadingLoopBoard] = useState(false);
  const [globalFilter, setGlobalFilter] = useState<FilterValue>(null);
  const [loopFilter, setLoopFilter] = useState<FilterValue>(null);

  const token = () => localStorage.getItem("access_token") ?? "";

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/leaderboard/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => setUsers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingBoard(false));
  }, []);

  const fetchRewards = useCallback(() => {
    setLoadingRewards(true);
    fetch("http://127.0.0.1:8000/api/rewards/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => {
        setRewards(d.rewards ?? []);
        setAvailablePoints(d.available_points ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoadingRewards(false));
  }, []);

  useEffect(() => {
    if (storeOpen) fetchRewards();
  }, [storeOpen, fetchRewards]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/loops/", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => {
        const joined = Array.isArray(d) ? d.filter((l: UserLoop & { joined: boolean }) => l.joined) : [];
        setMyLoops(joined);
        if (joined.length > 0) setSelectedLoopId(joined[0].id);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedLoopId) return;
    setLoadingLoopBoard(true);
    fetch(`http://127.0.0.1:8000/api/loops/${selectedLoopId}/leaderboard/`, {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(r => r.json())
      .then(d => setLoopUsers(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoadingLoopBoard(false));
  }, [selectedLoopId]);

  const handleClaim = async (rewardId: number) => {
    setClaiming(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/rewards/${rewardId}/claim/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to claim reward.");
      } else {
        toast.success(data.message);
        fetchRewards();
      }
    } catch {
      toast.error("Something went wrong.");
    } finally {
      setClaiming(false);
    }
  };

  const top3 = users.length >= 3 ? [users[1], users[0], users[2]] : [];
  const byType = (type: string) => rewards.filter(r => r.type === type);

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Streaks. Points. Bragging rights.</p>
          </div>
          <Dialog open={storeOpen} onOpenChange={setStoreOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-bg"><Award className="w-4 h-4 mr-1" />Rewards Store</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-0 max-w-2xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between pr-6">
                  <span>Rewards Store</span>
                  <span className="text-sm font-normal text-muted-foreground">
                    {availablePoints.toLocaleString()} pts available
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex justify-end mb-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground h-7"
                  onClick={() => { setStoreOpen(false); router.push("/rewards"); }}
                >
                  My Claimed Rewards →
                </Button>
              </div>

              {loadingRewards ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => <div key={i} className="glass rounded-xl h-24 animate-pulse" />)}
                </div>
              ) : (
                <Tabs defaultValue="cosmetic">
                  <TabsList className="glass w-full">
                    <TabsTrigger value="cosmetic" className="flex-1">Cosmetic</TabsTrigger>
                    <TabsTrigger value="subscription" className="flex-1">Subscription</TabsTrigger>
                    <TabsTrigger value="real_world" className="flex-1">Real World</TabsTrigger>
                  </TabsList>
                  {(["cosmetic", "subscription", "real_world"] as const).map(type => (
                    <TabsContent key={type} value={type} className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                      {byType(type).map(r => (
                        <RewardCard key={r.id} reward={r} onClaim={handleClaim} claiming={claiming} />
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {loadingBoard ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="glass rounded-xl p-4 h-16 animate-pulse" />)}
          </div>
        ) : (
          <>
            {top3.length === 3 && (
              <div className="grid grid-cols-3 gap-3 max-w-2xl">
                {top3.map((u, i) => (
                  <Card key={u.name} className={`glass-strong border-0 p-5 text-center ${i === 1 ? "scale-105" : ""} ${u.you ? "ring-2 ring-primary" : ""}`}>
                    <div className="flex justify-center mb-2">
                      {u.rank === 1 ? <Crown className="w-6 h-6 text-yellow-400" /> : <Medal className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="w-14 h-14 mx-auto rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold mb-2">
                      {u.name[0]}
                    </div>
                    <div className="font-semibold text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.points.toLocaleString()} pts</div>
                    {u.cosmetics.includes("profile_badge") && (
                      <span className="cosmetic-badge flex justify-center mt-1">
                        <Award className="w-5 h-5" />
                      </span>
                    )}
                  </Card>
                ))}
              </div>
            )}

            <Tabs defaultValue="global">
              <TabsList className="glass">
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="loop">My Loops</TabsTrigger>
              </TabsList>
              <TabsContent value="global" className="mt-6">
                <div className="flex justify-end mb-3">
                  <FilterDropdown value={globalFilter} onChange={setGlobalFilter} />
                </div>
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity data yet. Start logging to appear on the leaderboard!</p>
                ) : (() => {
                  const { visible, you } = applyFilter(users, globalFilter);
                  return (
                    <div className="relative">
                      <div className="space-y-2 pb-2">
                        {visible.map(u => <Row key={u.rank} u={u} />)}
                      </div>
                      {you && (
                        <div className="sticky bottom-4 mt-2">
                          <div className="flex items-center gap-3 px-2 py-1 mb-1">
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">#{you.rank} you</span>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                          <Row u={you} />
                        </div>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
              <TabsContent value="loop" className="mt-6 space-y-4">
                {myLoops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">You have not joined any loops yet.</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {myLoops.map(l => (
                        <button
                          key={l.id}
                          onClick={() => setSelectedLoopId(l.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                            selectedLoopId === l.id
                              ? "gradient-bg text-primary-foreground"
                              : "glass text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {l.name}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <FilterDropdown value={loopFilter} onChange={setLoopFilter} />
                    </div>
                    {loadingLoopBoard ? (
                      <div className="space-y-2">
                        {[...Array(4)].map((_, i) => (
                          <div key={i} className="glass rounded-xl p-4 h-16 animate-pulse" />
                        ))}
                      </div>
                    ) : loopUsers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No activity logged in this loop yet.</p>
                    ) : (() => {
                      const { visible, you } = applyFilter(loopUsers, loopFilter);
                      return (
                        <div className="relative">
                          <div className="space-y-2 pb-2">
                            {visible.map(u => <Row key={u.rank} u={u} />)}
                          </div>
                          {you && (
                            <div className="sticky bottom-4 mt-2">
                              <div className="flex items-center gap-3 px-2 py-1 mb-1">
                                <div className="flex-1 h-px bg-border" />
                                <span className="text-xs text-muted-foreground">#{you.rank} you</span>
                                <div className="flex-1 h-px bg-border" />
                              </div>
                              <Row u={you} />
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
