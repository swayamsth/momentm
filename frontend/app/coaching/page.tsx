"use client";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Check, Star, Calendar as CalendarIcon, Sparkles, CheckCircle, Loader2, Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { usePremium } from "@/hooks/usePremium";
import { useRouter } from "next/navigation";

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
  { name: "Dr. Lena Park", focus: "Endurance & Recovery", rating: 4.9, sessions: 320, price: 65, color: "oklch(0.6 0.22 255)" },
  { name: "Marcus Cole", focus: "Strength & Hypertrophy", rating: 4.8, sessions: 410, price: 70, color: "oklch(0.62 0.22 25)" },
  { name: "Aria Tanaka", focus: "Mindfulness & Sleep", rating: 5.0, sessions: 198, price: 55, color: "oklch(0.55 0.18 300)" },
  { name: "Diego Ruiz", focus: "Nutrition Coaching", rating: 4.7, sessions: 256, price: 60, color: "oklch(0.7 0.16 155)" },
];

type Coach = typeof coaches[0];

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

function loadUser() {
  try {
    const stored = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export default function CoachingPage() {
  const { isPremium, daysRemaining } = usePremium();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pricing");
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null);

  useEffect(() => {
    if (isPremium) setActiveTab("coaches");
  }, [isPremium]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const openModal = (coach: Coach) => {
    setSelectedCoach(coach);
    setSelectedDate(undefined);
    setSelectedTime("");
    setConfirmed(false);
  };

  const closeModal = () => {
    setSelectedCoach(null);
    setSelectedDate(undefined);
    setSelectedTime("");
    setConfirmed(false);
  };

  const handleConfirm = async () => {
    if (!selectedCoach || !selectedDate || !selectedTime) return;
    setLoading(true);

    const user = loadUser();
    const userEmail = user?.email ?? "";
    const userName = user ? `${user.first_name} ${user.last_name}`.trim() : "";

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
          userEmail,
          userName,
        }),
      });
      const data = await res.json();
      setConfirmed(true);
      if (data.emailSent) {
        toast.success("Confirmation email sent!");
      } else if (data.error) {
        toast.error("Email error: " + data.error);
      }
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

          {!isPremium && (
            <TabsContent value="pricing" className="mt-6">
              <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((t) => (
                  <div
                    key={t.name}
                    className={`
                      group relative rounded-2xl p-6 cursor-pointer
                      transition-all duration-300 ease-out
                      ${t.featured
                        ? "bg-gradient-to-b from-primary/5 to-primary/10 ring-2 ring-primary shadow-[0_8px_32px_rgba(99,102,241,0.18)] hover:shadow-[0_16px_48px_rgba(99,102,241,0.28)] hover:-translate-y-2 hover:scale-[1.02]"
                        : "glass hover:shadow-xl hover:-translate-y-1 hover:ring-2 hover:ring-primary/30 hover:scale-[1.01]"
                      }
                    `}
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
                      <h3 className={`font-bold text-xl transition-colors duration-200 ${t.featured ? "text-primary" : "group-hover:text-primary"}`}>
                        {t.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">{t.desc}</p>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-end gap-1">
                        <span className="text-5xl font-bold tracking-tight">{t.price}</span>
                        <span className="text-muted-foreground mb-2">/mo</span>
                      </div>
                    </div>

                    <button
                      className={`
                        w-full py-2.5 rounded-xl text-sm font-semibold mb-6
                        transition-all duration-200
                        ${t.name === "Free"
                          ? "border-2 border-border text-muted-foreground cursor-default"
                          : t.featured
                            ? "gradient-bg text-primary-foreground shadow-md hover:shadow-lg hover:opacity-90 active:scale-95"
                            : "border-2 border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95"
                        }
                      `}
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
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors duration-200 ${t.featured ? "bg-primary/15" : "bg-primary/10 group-hover:bg-primary/20"}`}>
                            <Check className="w-3 h-3 text-primary" />
                          </div>
                          <span className="text-muted-foreground">{f}</span>
                        </li>
                      ))}
                    </ul>

                    {t.name !== "Free" && (
                      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${t.featured ? "ring-4 ring-primary/20" : "ring-2 ring-primary/20"}`} />
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>
          )}

          <TabsContent value="coaches" className="mt-6 space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {coaches.map((c) => (
                <Card key={c.name} className="glass border-0 p-5">
                  <div className="flex gap-4">
                    <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-semibold flex-shrink-0 text-primary-foreground" style={{ background: `linear-gradient(135deg, ${c.color}, oklch(0.7 0.18 250))` }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold">{c.name}</h3>
                          <Badge variant="secondary" className="mt-1 text-xs">{c.focus}</Badge>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${c.price}</div>
                          <div className="text-xs text-muted-foreground">/session</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />{c.rating}</span>
                        <span>·</span>
                        <span>{c.sessions} sessions</span>
                      </div>
                      <div className="mt-4">
                        <Button size="sm" className="gradient-bg w-full" onClick={() => openModal(c)}>
                          <CalendarIcon className="w-3.5 h-3.5 mr-1" />Book a Session
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Booking Modal */}
      <Dialog open={!!selectedCoach} onOpenChange={(open) => { if (!open) closeModal(); }}>
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
                  A confirmation email has been sent to you. Your coach will reach out with session details.
                </DialogDescription>
              </div>
              <Button className="w-full gradient-bg" onClick={closeModal}>Done</Button>
            </div>
          ) : (
            <>
              {/* Coach header */}
              <div className="flex items-center gap-3 p-5 border-b">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-semibold text-primary-foreground flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${selectedCoach?.color}, oklch(0.7 0.18 250))` }}>
                  {selectedCoach?.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base font-semibold">{selectedCoach?.name}</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">{selectedCoach?.focus} · ${selectedCoach?.price}/session</DialogDescription>
                </div>
              </div>

              <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
                {/* Date picker */}
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

                {/* Time slots */}
                {selectedDate && (
                  <div>
                    <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Select a time — {format(selectedDate, "EEEE, MMM d")}
                    </p>
                    <div className="space-y-3">
                      {periods.map((period) => {
                        const slots = TIME_SLOTS.filter((s) => s.period === period);
                        return (
                          <div key={period}>
                            <p className="text-xs text-muted-foreground mb-1.5">{period}</p>
                            <div className="grid grid-cols-4 gap-1.5">
                              {slots.map((slot) => (
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Confirm button */}
                <Button
                  className="w-full gradient-bg"
                  disabled={!selectedDate || !selectedTime || loading}
                  onClick={handleConfirm}
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Booking…</>
                  ) : (
                    <><CalendarIcon className="w-4 h-4 mr-2" />Confirm Booking</>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
