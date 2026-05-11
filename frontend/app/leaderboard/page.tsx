"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Flame, Medal, Crown, Award, Lock } from "lucide-react";

type LeaderboardUser = {
  rank: number;
  name: string;
  streak: number;
  points: number;
  you: boolean;
};

const badges = [
  { name: "Early Bird", desc: "10 workouts before 7am", earned: true, color: "oklch(0.78 0.16 75)" },
  { name: "Iron Streak", desc: "30-day streak", earned: true, color: "oklch(0.62 0.22 25)" },
  { name: "Mind Master", desc: "50 meditation sessions", earned: true, color: "oklch(0.55 0.18 300)" },
  { name: "Marathon", desc: "Run 42.2km in a week", earned: false, color: "oklch(0.6 0.22 255)" },
  { name: "Centurion", desc: "100-day streak", earned: false, color: "oklch(0.7 0.16 155)" },
  { name: "Loop Leader", desc: "Lead a Loop to 1k members", earned: false, color: "oklch(0.5 0.15 280)" },
];

function Row({ u }: { u: LeaderboardUser }) {
  const rankIcon =
    u.rank === 1 ? <Crown className="w-4 h-4 text-yellow-400" /> :
    u.rank === 2 ? <Medal className="w-4 h-4 text-muted-foreground" /> :
    u.rank === 3 ? <Medal className="w-4 h-4 text-orange-400" /> :
    <span className="text-sm font-semibold text-muted-foreground w-4 text-center">{u.rank}</span>;
  return (
    <div className={`glass rounded-xl p-4 flex items-center gap-4 ${u.you ? "ring-2 ring-primary" : ""}`}>
      <div className="w-8 flex justify-center">{rankIcon}</div>
      <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold text-sm">{u.name[0]}</div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm flex items-center gap-2">
          {u.name}
          {u.you && <Badge variant="secondary" className="text-xs">You</Badge>}
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Flame className="w-3 h-3" />{u.streak} day streak
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
  const [users, setUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("http://127.0.0.1:8000/api/leaderboard/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, []);

  const top3 = users.length >= 3 ? [users[1], users[0], users[2]] : [];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Leaderboard</h1>
            <p className="text-sm text-muted-foreground">Streaks. Points. Bragging rights.</p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="gradient-bg"><Award className="w-4 h-4 mr-1" />Rewards</Button>
            </DialogTrigger>
            <DialogContent className="glass-strong border-0 max-w-2xl">
              <DialogHeader><DialogTitle>Your badges</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                {badges.map((b) => (
                  <Card key={b.name} className={`glass border-0 p-4 text-center ${b.earned ? "" : "opacity-60"}`}>
                    <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-2" style={{ background: b.earned ? `color-mix(in oklab, ${b.color} 20%, transparent)` : "oklch(0.94 0.01 250)" }}>
                      {b.earned ? <Trophy className="w-7 h-7" style={{ color: b.color }} /> : <Lock className="w-6 h-6 text-muted-foreground" />}
                    </div>
                    <div className="font-semibold text-sm">{b.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{b.desc}</div>
                    {b.earned && <Button size="sm" variant="outline" className="mt-3 w-full">Redeem</Button>}
                  </Card>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 h-16 animate-pulse" />
            ))}
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
                    <div className="w-14 h-14 mx-auto rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-semibold mb-2">{u.name[0]}</div>
                    <div className="font-semibold text-sm">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.points.toLocaleString()} pts</div>
                  </Card>
                ))}
              </div>
            )}

            <Tabs defaultValue="global">
              <TabsList className="glass">
                <TabsTrigger value="global">Global</TabsTrigger>
                <TabsTrigger value="loop">My Loops</TabsTrigger>
              </TabsList>
              <TabsContent value="global" className="space-y-2 mt-6">
                {users.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity data yet. Start logging to appear on the leaderboard!</p>
                ) : (
                  users.map((u) => <Row key={u.rank} u={u} />)
                )}
              </TabsContent>
              <TabsContent value="loop" className="space-y-2 mt-6">
                {users.slice(0, 5).map((u) => <Row key={u.rank} u={u} />)}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </AppShell>
  );
}
