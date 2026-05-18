"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import {
  Check, Star, Calendar as CalendarIcon, Sparkles, CheckCircle,
  Loader2, Clock, Search, X, Award, Users, MessageCircle, Globe,
  ChevronRight, ThumbsUp,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { useRouter } from "next/navigation";

// ─── Data ────────────────────────────────────────────────────────────────────

const tiers = [
  {
    name: "Free", price: "$0", desc: "Get started with the essentials.",
    features: ["Basic activity tracking", "Join up to 3 Loops", "Weekly AI insights", "Community feed"],
  },
  {
    name: "Premium", price: "$12", featured: true, desc: "Unlock the full Momentm experience.",
    features: ["Everything in Free", "Unlimited Loops & Challenges", "Daily AI recalibration", "Predictive performance graphs", "Priority badges & rewards", "1 free coaching session / mo"],
  },
  {
    name: "Pro", price: "$29", desc: "For serious athletes & teams.",
    features: ["Everything in Premium", "1-on-1 coach matching", "Custom training plans", "Advanced analytics export", "Team Loops"],
  },
];

const coaches = [
  {
    name: "Dr. Lena Park",
    focus: "Endurance & Recovery",
    category: "Endurance",
    rating: 4.9,
    sessions: 320,
    price: 65,
    experience: 8,
    gradient: "from-blue-500 to-indigo-600",
    avatarBg: "#3b82f6",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    languages: ["English", "Korean"],
    responseTime: "< 2 hours",
    bio: "Dr. Lena Park is a certified endurance coach and sports scientist with 8 years of experience helping athletes optimise performance and recovery. She specialises in long-distance running, triathlon preparation, and evidence-based recovery protocols.",
    specialties: ["Marathon Training", "Recovery Protocols", "VO2 Max", "Injury Prevention"],
    reviews: [
      { author: "Alex R.", rating: 5, text: "Dr. Park completely transformed my marathon training. Cut 18 minutes off my PB in just 4 months!", date: "Mar 2025", helpful: 14 },
      { author: "Sam T.", rating: 5, text: "Incredible depth of knowledge on recovery. I no longer feel burnt out after long runs.", date: "Feb 2025", helpful: 9 },
      { author: "Chris M.", rating: 4, text: "Very professional and data-driven approach. Highly recommend for serious athletes.", date: "Jan 2025", helpful: 6 },
    ],
  },
  {
    name: "Marcus Cole",
    focus: "Strength & Hypertrophy",
    category: "Strength",
    rating: 4.8,
    sessions: 410,
    price: 70,
    experience: 10,
    gradient: "from-orange-500 to-red-500",
    avatarBg: "#f97316",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    languages: ["English"],
    responseTime: "< 3 hours",
    bio: "Marcus Cole is a former competitive powerlifter turned personal coach with over a decade of hands-on experience. He blends periodisation science with practical programming to help clients build serious strength and muscle.",
    specialties: ["Powerlifting", "Hypertrophy Programs", "Periodisation", "Form & Technique"],
    reviews: [
      { author: "Jordan K.", rating: 5, text: "Added 30kg to my deadlift in 3 months. Marcus knows his stuff inside and out.", date: "Apr 2025", helpful: 21 },
      { author: "Taylor W.", rating: 5, text: "Best strength coach I've ever worked with. The custom programming is on another level.", date: "Mar 2025", helpful: 17 },
      { author: "Riley S.", rating: 4, text: "Very knowledgeable. Slightly intense but that's exactly what I needed.", date: "Feb 2025", helpful: 8 },
    ],
  },
  {
    name: "Aria Tanaka",
    focus: "Mindfulness & Sleep",
    category: "Mindfulness",
    rating: 5.0,
    sessions: 198,
    price: 55,
    experience: 6,
    gradient: "from-purple-500 to-pink-500",
    avatarBg: "#a855f7",
    avatar: "https://randomuser.me/api/portraits/women/65.jpg",
    languages: ["English", "Japanese"],
    responseTime: "< 1 hour",
    bio: "Aria Tanaka is a mindfulness practitioner and sleep optimisation coach who blends Eastern wellness traditions with modern neuroscience. Her sessions help clients reduce stress, improve focus, and achieve deep restorative sleep.",
    specialties: ["Meditation", "Sleep Hygiene", "Stress Management", "Breathwork"],
    reviews: [
      { author: "Morgan L.", rating: 5, text: "Aria is exceptional. My sleep quality went from 4/10 to 9/10 in just 6 weeks.", date: "Apr 2025", helpful: 19 },
      { author: "Casey B.", rating: 5, text: "Life-changing sessions. I had no idea how much poor sleep was affecting my performance.", date: "Mar 2025", helpful: 12 },
      { author: "Quinn P.", rating: 5, text: "So calm, so knowledgeable. Aria creates a safe space to work through everything.", date: "Jan 2025", helpful: 10 },
    ],
  },
  {
    name: "Diego Ruiz",
    focus: "Nutrition Coaching",
    category: "Nutrition",
    rating: 4.7,
    sessions: 256,
    price: 60,
    experience: 7,
    gradient: "from-green-500 to-emerald-600",
    avatarBg: "#22c55e",
    avatar: "https://randomuser.me/api/portraits/men/55.jpg",
    languages: ["English", "Spanish"],
    responseTime: "< 4 hours",
    bio: "Diego Ruiz is a registered nutritionist and performance dietitian who specialises in body composition and athletic fuelling. He takes a flexible, evidence-based approach — no fad diets, just sustainable habits that actually work.",
    specialties: ["Macro Tracking", "Weight Management", "Sports Nutrition", "Gut Health"],
    reviews: [
      { author: "Jamie H.", rating: 5, text: "Diego debunked every nutrition myth I believed in. Lost 8kg while eating more food.", date: "Mar 2025", helpful: 23 },
      { author: "Blake N.", rating: 4, text: "Very thorough assessments and personalised plans. Great communicator too.", date: "Feb 2025", helpful: 11 },
      { author: "Avery C.", rating: 5, text: "Finally someone who doesn't push restrictive diets. Diego's approach is refreshing.", date: "Jan 2025", helpful: 15 },
    ],
  },
  {
    name: "Sarah Mitchell",
    focus: "HIIT & Cardio",
    category: "HIIT",
    rating: 4.8,
    sessions: 287,
    price: 58,
    experience: 5,
    gradient: "from-rose-500 to-pink-600",
    avatarBg: "#f43f5e",
    avatar: "https://randomuser.me/api/portraits/women/17.jpg",
    languages: ["English"],
    responseTime: "< 2 hours",
    bio: "Sarah Mitchell is a high-energy HIIT specialist and certified group fitness instructor. She crafts cardio programs that maximise fat burn and cardiovascular health in minimal time — perfect for busy schedules.",
    specialties: ["HIIT Programming", "Fat Loss", "Cardiovascular Fitness", "Group Training"],
    reviews: [
      { author: "Drew P.", rating: 5, text: "Sarah's HIIT sessions are brutal in the best way. Lost 12kg in 10 weeks!", date: "Apr 2025", helpful: 18 },
      { author: "Finley R.", rating: 5, text: "High energy, motivating, and genuinely cares about your progress.", date: "Mar 2025", helpful: 13 },
      { author: "Harley O.", rating: 4, text: "Excellent programming. The workouts are tough but she scales them perfectly.", date: "Feb 2025", helpful: 7 },
    ],
  },
  {
    name: "James Okafor",
    focus: "Flexibility & Mobility",
    category: "Mobility",
    rating: 4.9,
    sessions: 174,
    price: 52,
    experience: 9,
    gradient: "from-cyan-500 to-sky-600",
    avatarBg: "#06b6d4",
    avatar: "https://randomuser.me/api/portraits/men/76.jpg",
    languages: ["English", "French"],
    responseTime: "< 3 hours",
    bio: "James Okafor is a movement specialist and certified yoga instructor with a background in physiotherapy. He helps clients eliminate chronic tightness, correct posture imbalances, and move pain-free through targeted mobility work.",
    specialties: ["Mobility Assessment", "Yoga", "Postural Correction", "Active Stretching"],
    reviews: [
      { author: "Parker D.", rating: 5, text: "Fixed my chronic lower back pain in 4 sessions. Absolute wizard with mobility.", date: "Mar 2025", helpful: 25 },
      { author: "Reese V.", rating: 5, text: "James is incredibly thorough and patient. My range of motion has improved massively.", date: "Feb 2025", helpful: 16 },
      { author: "Skyler M.", rating: 4, text: "Brilliant coach. Every session is targeted and effective. No fluff.", date: "Jan 2025", helpful: 9 },
    ],
  },
  {
    name: "Emma Walsh",
    focus: "Weight Management",
    category: "Nutrition",
    rating: 4.7,
    sessions: 312,
    price: 62,
    experience: 11,
    gradient: "from-amber-500 to-yellow-500",
    avatarBg: "#f59e0b",
    avatar: "https://randomuser.me/api/portraits/women/28.jpg",
    languages: ["English"],
    responseTime: "< 2 hours",
    bio: "Emma Walsh is a veteran weight management coach with over a decade helping clients achieve sustainable transformations. She combines behavioural psychology with practical fitness and nutrition strategies for long-lasting results.",
    specialties: ["Behaviour Change", "Sustainable Weight Loss", "Habit Building", "Accountability Coaching"],
    reviews: [
      { author: "Logan A.", rating: 5, text: "Emma changed my entire relationship with food and exercise. Down 20kg and keeping it off.", date: "Apr 2025", helpful: 29 },
      { author: "Cameron F.", rating: 4, text: "Very experienced and empathetic. She understands the psychology of change.", date: "Mar 2025", helpful: 14 },
      { author: "Peyton S.", rating: 5, text: "The accountability check-ins are worth every cent. Emma genuinely invests in your success.", date: "Feb 2025", helpful: 20 },
    ],
  },
  {
    name: "Kai Nakamura",
    focus: "Sports Performance",
    category: "Performance",
    rating: 4.9,
    sessions: 231,
    price: 75,
    experience: 12,
    gradient: "from-violet-600 to-purple-700",
    avatarBg: "#7c3aed",
    avatar: "https://randomuser.me/api/portraits/men/66.jpg",
    languages: ["English", "Japanese"],
    responseTime: "< 2 hours",
    bio: "Kai Nakamura is an elite sports performance coach who has worked with professional athletes across football, basketball, and track. He focuses on explosive power, speed development, and competitive edge for athletes at all levels.",
    specialties: ["Speed & Agility", "Explosive Power", "Athletic Programming", "Competition Prep"],
    reviews: [
      { author: "River B.", rating: 5, text: "Kai took my sprint speed from 10.8s to 10.1s in 8 weeks. Absolutely elite level coaching.", date: "Apr 2025", helpful: 31 },
      { author: "Sage H.", rating: 5, text: "Professional, precise, and results-driven. Best investment I've made in my athletic career.", date: "Mar 2025", helpful: 22 },
      { author: "Rowan L.", rating: 5, text: "World-class knowledge of athletic performance. Kai is in a league of his own.", date: "Feb 2025", helpful: 18 },
    ],
  },
];

const CATEGORIES = ["All", "Endurance", "Strength", "Mindfulness", "Nutrition", "HIIT", "Mobility", "Performance"];

const TIME_SLOTS = [
  { label: "8:00 AM", period: "Morning" },
  { label: "9:00 AM", period: "Morning" },
  { label: "10:00 AM", period: "Morning" },
  { label: "11:00 AM", period: "Morning" },
  { label: "12:00 PM", period: "Afternoon" },
  { label: "1:00 PM", period: "Afternoon" },
  { label: "2:00 PM", period: "Afternoon" },
  { label: "3:00 PM", period: "Afternoon" },
  { label: "5:00 PM", period: "Evening" },
  { label: "6:00 PM", period: "Evening" },
  { label: "7:00 PM", period: "Evening" },
];

type Coach = typeof coaches[0];

function loadUser() {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return stored ? JSON.parse(stored) : null;
  } catch { return null; }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function CoachAvatar({ coach, size = "md" }: { coach: Coach; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const sz = size === "lg" ? "w-20 h-20 text-2xl" : size === "md" ? "w-16 h-16 text-xl" : "w-12 h-12 text-lg";
  const initials = coach.name.split(" ").map(n => n[0]).join("").slice(0, 2);

  if (coach.avatar && !imgError) {
    return (
      <img
        src={coach.avatar}
        alt={coach.name}
        onError={() => setImgError(true)}
        className={`${sz} rounded-2xl object-cover flex-shrink-0 shadow-lg`}
      />
    );
  }
  return (
    <div
      className={`${sz} rounded-2xl flex items-center justify-center font-bold text-white flex-shrink-0 shadow-lg`}
      style={{ background: `linear-gradient(135deg, ${coach.avatarBg}, ${coach.avatarBg}99)` }}
    >
      {initials}
    </div>
  );
}

// ─── Star Rating ──────────────────────────────────────────────────────────────

function StarRow({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const sz = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${sz} ${i <= Math.round(rating) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`} />
      ))}
    </span>
  );
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function ProfileModal({ coach, onClose, onBook }: { coach: Coach; onClose: () => void; onBook: () => void }) {
  return (
    <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="relative p-6 pb-4 border-b" style={{ background: `linear-gradient(135deg, ${coach.avatarBg}18, ${coach.avatarBg}08)` }}>
        <div className="flex items-start gap-4">
          <CoachAvatar coach={coach} size="lg" />
          <div className="flex-1 min-w-0">
            <DialogTitle className="text-xl font-bold">{coach.name}</DialogTitle>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              <Badge variant="secondary" className="text-xs">{coach.focus}</Badge>
              <Badge className="text-xs" style={{ background: `${coach.avatarBg}20`, color: coach.avatarBg, border: `1px solid ${coach.avatarBg}40` }}>
                {coach.category}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <StarRow rating={coach.rating} size="md" />
              <span className="text-sm font-semibold">{coach.rating}</span>
              <span className="text-xs text-muted-foreground">({coach.sessions} sessions)</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold">${coach.price}</div>
            <div className="text-xs text-muted-foreground">/session</div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1 p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { icon: Award, label: "Experience", value: `${coach.experience} yrs` },
            { icon: Users, label: "Sessions", value: coach.sessions.toString() },
            { icon: Clock, label: "Response", value: coach.responseTime },
            { icon: Globe, label: "Languages", value: coach.languages.length.toString() },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-accent/50 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
              <div className="text-sm font-semibold">{value}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>

        {/* Bio */}
        <div>
          <h3 className="text-sm font-semibold mb-2">About</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{coach.bio}</p>
        </div>

        {/* Specialties */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {coach.specialties.map(s => (
              <span key={s} className="px-3 py-1 rounded-full text-xs font-medium border border-border bg-accent/40">{s}</span>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-sm font-semibold mb-2">Languages</h3>
          <div className="flex gap-2">
            {coach.languages.map(l => (
              <span key={l} className="flex items-center gap-1 text-xs text-muted-foreground"><Globe className="w-3 h-3" />{l}</span>
            ))}
          </div>
        </div>

        {/* Reviews */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Client Reviews</h3>
            <div className="flex items-center gap-1.5">
              <StarRow rating={coach.rating} />
              <span className="text-xs font-semibold">{coach.rating} / 5</span>
            </div>
          </div>
          <div className="space-y-3">
            {coach.reviews.map((r, i) => (
              <div key={i} className="bg-accent/30 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: coach.avatarBg }}>
                      {r.author[0]}
                    </div>
                    <span className="text-sm font-medium">{r.author}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{r.date}</span>
                </div>
                <StarRow rating={r.rating} />
                <p className="text-sm text-muted-foreground leading-relaxed">"{r.text}"</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-0.5">
                  <ThumbsUp className="w-3 h-3" />
                  <span>{r.helpful} found this helpful</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Close</Button>
        <Button className="flex-1 gradient-bg" onClick={onBook}>
          <CalendarIcon className="w-4 h-4 mr-2" />Book a Session
        </Button>
      </div>
    </DialogContent>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CoachingPage() {
  const { isPremium, daysRemaining } = usePremium();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pricing");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const [profileCoach, setProfileCoach] = useState<Coach | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (isPremium) setActiveTab("coaches");
  }, [isPremium]);

  const filteredCoaches = coaches.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.focus.toLowerCase().includes(search.toLowerCase()) ||
      c.specialties.some(s => s.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = activeCategory === "All" || c.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const openBook = (coach: Coach) => {
    setProfileCoach(null);
    setSelectedCoach(coach);
    setSelectedDate(undefined);
    setSelectedTime("");
    setConfirmed(false);
  };

  const closeBook = () => {
    setSelectedCoach(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setConfirmed(false);
  };

  const handleConfirm = async () => {
    if (!selectedCoach || !selectedDate || !selectedTime) return;
    setLoading(true);
    const user = loadUser();
    try {
      const res = await fetch("/api/book-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachName: selectedCoach.name,
          coachFocus: selectedCoach.focus,
          date: selectedDate.toISOString(),
          time: selectedTime,
          price: selectedCoach.price,
          userEmail: user?.email ?? "",
          userName: user ? `${user.first_name} ${user.last_name}`.trim() : "",
        }),
      });
      const data = await res.json();
      setConfirmed(true);
      if (data.emailSent) toast.success("Confirmation email sent!");
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const periods = ["Morning", "Afternoon", "Evening"];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Coaching & Plans</h1>
          <p className="text-sm text-muted-foreground">Upgrade your journey or work 1-on-1 with a pro.</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="glass">
            {!isPremium && <TabsTrigger value="pricing">Pricing</TabsTrigger>}
            <TabsTrigger value="coaches">Find a Coach</TabsTrigger>
            {isPremium && (
              <div className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-yellow-700">
                <Sparkles className="w-3 h-3 text-yellow-500" />
                Premium · {daysRemaining}d left
              </div>
            )}
          </TabsList>

          {/* ── Pricing ── */}
          {!isPremium && (
            <TabsContent value="pricing" className="mt-6">
              <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((t) => (
                  <div
                    key={t.name}
                    className={`group relative rounded-2xl p-6 cursor-pointer transition-all duration-300 ease-out ${
                      t.featured
                        ? "bg-gradient-to-b from-primary/5 to-primary/10 ring-2 ring-primary shadow-[0_8px_32px_rgba(99,102,241,0.18)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.28)] hover:-translate-y-2 hover:scale-[1.02]"
                        : "glass hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-primary/30 hover:scale-[1.01]"
                    }`}
                    onClick={() => {
                      if (t.name === "Premium") router.push("/payment?plan=premium");
                      else if (t.name === "Pro") router.push("/payment?plan=pro");
                    }}
                  >
                    {t.featured && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="gradient-bg text-primary-foreground px-3 py-1 shadow-md">
                          <Sparkles className="w-3 h-3 mr-1" />Most popular
                        </Badge>
                      </div>
                    )}
                    <div className="mb-4">
                      <h3 className={`font-bold text-xl transition-colors duration-200 ${t.featured ? "text-primary" : "group-hover:text-primary"}`}>{t.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="text-5xl font-bold tracking-tight">{t.price}</span>
                        <span className="text-muted-foreground mb-2">/mo</span>
                      </div>
                    </div>
                    <button
                      className={`w-full py-2.5 rounded-xl text-sm font-semibold mb-6 transition-all duration-200 ${
                        t.name === "Free"
                          ? "border-2 border-border text-muted-foreground cursor-default"
                          : t.featured
                            ? "gradient-bg text-primary-foreground shadow-md hover:shadow-lg hover:opacity-90 active:scale-95"
                            : "border-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (t.name === "Premium") router.push("/payment?plan=premium");
                        else if (t.name === "Pro") router.push("/payment?plan=pro");
                      }}
                    >
                      {t.name === "Free" ? "Current plan" : "Upgrade →"}
                    </button>
                    <ul className="space-y-3">
                      {t.features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${t.featured ? "bg-primary/15" : "bg-primary/10 group-hover:bg-primary/20"}`}>
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          {/* ── Find a Coach ── */}
          <TabsContent value="coaches" className="mt-6 space-y-4">

            {/* Search + filter */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full h-10 pl-9 pr-9 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                  placeholder="Search by name, specialty or focus…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
                      activeCategory === cat
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
              {filteredCoaches.length} coach{filteredCoaches.length !== 1 ? "es" : ""} found
            </p>

            {/* Coach cards */}
            {filteredCoaches.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No coaches found</p>
                <p className="text-sm mt-1">Try a different search or category</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredCoaches.map((c) => (
                  <Card key={c.name} className="glass border-0 p-5 hover:shadow-lg transition-shadow">
                    <div className="flex gap-4">
                      <CoachAvatar coach={c} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{c.name}</h3>
                            <Badge variant="secondary" className="mt-1 text-xs">{c.focus}</Badge>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-semibold">${c.price}</div>
                            <div className="text-xs text-muted-foreground">/session</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{c.rating}
                          </span>
                          <span>·</span>
                          <span>{c.sessions} sessions</span>
                          <span>·</span>
                          <span>{c.experience} yrs exp</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs"
                            onClick={() => setProfileCoach(c)}
                          >
                            <MessageCircle className="w-3.5 h-3.5 mr-1" />View Profile
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gradient-bg text-xs"
                            onClick={() => openBook(c)}
                          >
                            <CalendarIcon className="w-3.5 h-3.5 mr-1" />Book Session
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Profile Modal ── */}
      <Dialog open={!!profileCoach} onOpenChange={(open) => { if (!open) setProfileCoach(null); }}>
        {profileCoach && (
          <ProfileModal
            coach={profileCoach}
            onClose={() => setProfileCoach(null)}
            onBook={() => openBook(profileCoach)}
          />
        )}
      </Dialog>

      {/* ── Booking Modal ── */}
      <Dialog open={!!selectedCoach} onOpenChange={(open) => { if (!open) closeBook(); }}>
        <DialogContent className="max-w-md p-0 overflow-hidden">
          {confirmed ? (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold mb-1">Booking Confirmed!</DialogTitle>
                <DialogDescription className="text-sm">
                  Your session with <span className="font-medium text-foreground">{selectedCoach?.name}</span> on{" "}
                  <span className="font-medium text-foreground">{selectedDate ? format(selectedDate, "MMMM d, yyyy") : ""}</span> at{" "}
                  <span className="font-medium text-foreground">{selectedTime}</span> is confirmed.
                  <br /><br />
                  A confirmation email has been sent to you.
                </DialogDescription>
              </div>
              <Button className="w-full gradient-bg" onClick={closeBook}>Done</Button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 p-5 border-b">
                {selectedCoach && <CoachAvatar coach={selectedCoach} size="sm" />}
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-semibold">{selectedCoach?.name}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">{selectedCoach?.focus} · ${selectedCoach?.price}/session</DialogDescription>
                </div>
              </div>
              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                <div>
                  <p className="text-sm font-medium mb-2">Select a date</p>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={{ before: new Date() }}
                      className="rounded-lg border"
                    />
                  </div>
                </div>
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Select a time — {format(selectedDate, "EEEE, MMM d")}
                    </p>
                    <div className="space-y-3">
                      {periods.map((period) => (
                        <div key={period}>
                          <p className="text-xs text-muted-foreground mb-1.5">{period}</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {TIME_SLOTS.filter(s => s.period === period).map((slot) => (
                              <button
                                key={slot.label}
                                onClick={() => setSelectedTime(slot.label)}
                                className={`py-1.5 text-xs rounded-lg border transition-all font-medium ${
                                  selectedTime === slot.label
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border hover:border-primary/50 hover:bg-accent"
                                }`}
                              >
                                {slot.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  className="w-full gradient-bg"
                  disabled={!selectedDate || !selectedTime || loading}
                  onClick={handleConfirm}
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking…</>
                    : <><CalendarIcon className="w-4 h-4 mr-2" />Confirm Booking</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
