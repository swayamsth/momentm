"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Flame, Award, Crown, Zap, Star, Ticket, Heart, Tag, Trophy, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type ClaimedReward = {
  id: number;
  reward_name: string;
  reward_type: "cosmetic" | "subscription" | "real_world";
  reward_effect: string;
  reward_icon: string;
  reward_color: string;
  cost: number;
  code: string;
  claimed_at: string;
  expires_at: string | null;
};

const ICON_MAP: Record<string, React.ReactNode> = {
  flame:     <Flame className="w-5 h-5" />,
  award:     <Award className="w-5 h-5" />,
  megaphone: <Trophy className="w-5 h-5" />,
  crown:     <Crown className="w-5 h-5" />,
  zap:       <Zap className="w-5 h-5" />,
  star:      <Star className="w-5 h-5" />,
  ticket:    <Ticket className="w-5 h-5" />,
  heart:     <Heart className="w-5 h-5" />,
  tag:       <Tag className="w-5 h-5" />,
  trophy:    <Trophy className="w-5 h-5" />,
};

const TYPE_LABEL: Record<string, string> = {
  cosmetic:     "Cosmetic",
  subscription: "Subscription",
  real_world:   "Real World",
};

function CodeBox({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2 mt-2 bg-black/20 rounded-lg px-3 py-2">
      <code className="flex-1 text-xs font-mono tracking-widest text-primary">{code}</code>
      <button onClick={copy} className="text-muted-foreground hover:text-foreground transition-colors">
        {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ClaimedCard({ claim }: { claim: ClaimedReward }) {
  const icon = ICON_MAP[claim.reward_icon] ?? ICON_MAP.trophy;

  return (
    <Card className="glass border-0 p-4 space-y-2">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `color-mix(in oklab, ${claim.reward_color} 20%, transparent)`, color: claim.reward_color }}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{claim.reward_name}</span>
            <Badge variant="outline" className="text-xs">{TYPE_LABEL[claim.reward_type]}</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Claimed {claim.claimed_at}
            {claim.expires_at && ` · Expires ${claim.expires_at}`}
          </div>
          <div className="text-xs text-muted-foreground">{claim.cost.toLocaleString()} pts spent</div>
        </div>
      </div>

      {claim.reward_type === "real_world" && claim.code && (
        <CodeBox code={claim.code} />
      )}

      {claim.reward_type === "real_world" && !claim.code && claim.reward_effect === "prize_draw" && (
        <p className="text-xs text-muted-foreground italic">Entry recorded — winner announced at end of month.</p>
      )}

      {claim.reward_type === "real_world" && !claim.code && claim.reward_effect === "charity" && (
        <p className="text-xs text-muted-foreground italic">Donation confirmed — thank you for giving back.</p>
      )}

      {claim.reward_type === "subscription" && claim.expires_at && (
        <p className="text-xs text-green-400">Premium active until {claim.expires_at}</p>
      )}
    </Card>
  );
}

export default function RewardsPage() {
  const [claims, setClaims] = useState<ClaimedReward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { setLoading(false); return; }
    fetch("http://127.0.0.1:8000/api/rewards/claimed/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setClaims(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const byType = (type: string) => claims.filter(c => c.reward_type === type);

  return (
    <AppShell headerLeft={
      <div>
        <h1 className="text-xl font-semibold tracking-tight leading-none">My Rewards</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{"Everything you've claimed — codes, perks, and active cosmetics."}</p>
      </div>
    }>
      <div className="space-y-6">

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <div key={i} className="glass rounded-xl h-20 animate-pulse" />)}
          </div>
        ) : claims.length === 0 ? (
          <Card className="glass border-0 p-8 text-center space-y-2">
            <Trophy className="w-10 h-10 mx-auto text-muted-foreground" />
            <p className="font-medium">No rewards claimed yet</p>
            <p className="text-sm text-muted-foreground">Head to the leaderboard and open the Rewards Store to spend your points.</p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.href = "/leaderboard"}>
              Go to Leaderboard
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {(["cosmetic", "subscription", "real_world"] as const).map(type => {
              const items = byType(type);
              if (!items.length) return null;
              return (
                <div key={type} className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    {TYPE_LABEL[type]}
                  </h2>
                  {items.map(c => <ClaimedCard key={c.id} claim={c} />)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
