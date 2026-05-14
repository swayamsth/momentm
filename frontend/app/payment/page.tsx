"use client";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { usePremium } from "@/hooks/usePremium";
import { ChevronLeft, Lock, Loader2, CheckCircle, Activity } from "lucide-react";

const PLANS: Record<string, { name: string; price: number; features: string[] }> = {
  premium: {
    name: "Momentm Premium",
    price: 12,
    features: ["Unlimited Loops & Challenges", "Daily AI recalibration", "Predictive performance graphs", "Priority badges & rewards", "1 free coaching session / mo"],
  },
  pro: {
    name: "Momentm Pro",
    price: 29,
    features: ["Everything in Premium", "1-on-1 coach matching", "Custom training plans", "Advanced analytics export", "Team Loops"],
  },
};

function formatCardNumber(v: string) {
  return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? d.slice(0, 2) + "/" + d.slice(2) : d;
}
function loadUser() {
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}
function genTxId() {
  return "TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase();
}

function PaymentPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activatePremium } = usePremium();

  const planKey = searchParams.get("plan") ?? "premium";
  const plan = PLANS[planKey] ?? PLANS.premium;
  const user = loadUser();

  // Card fields
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState(`${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim());

  // Personal fields
  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [country, setCountry] = useState("Australia");
  const [city, setCity] = useState("");
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handlePay = async () => {
    setError("");
    if (cardNumber.replace(/\s/g, "").length !== 16) { setError("Enter a valid 16-digit card number."); return; }
    if (expiry.length !== 5) { setError("Enter a valid expiry (MM/YY)."); return; }
    if (cvv.length < 3) { setError("Enter a valid CVV."); return; }
    if (!holder.trim()) { setError("Enter the cardholder name."); return; }
    if (!email.trim()) { setError("Enter your email address."); return; }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 1800));
    activatePremium();

    const txId = genTxId();
    const billingDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });

    fetch("/api/invoice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planName: plan.name, price: plan.price,
        userName: `${firstName} ${lastName}`.trim(),
        userEmail: email, transactionId: txId, billingDate,
      }),
    }).catch(() => {});

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push("/dashboard"), 2800);
  };

  const inp = "w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm w-full shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle className="w-9 h-9 text-green-500" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Payment successful!</h2>
            <p className="text-sm text-gray-500 mt-2">
              Welcome to {plan.name}! An invoice has been sent to <strong>{email}</strong>. Redirecting…
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button onClick={() => router.push("/coaching")}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to plans
        </button>
        <div className="h-5 w-px bg-gray-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <Activity className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-semibold text-sm">Momentm</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="w-3.5 h-3.5" /> Secure checkout
        </div>
      </div>

      <div className="flex-1 flex items-start justify-center py-10 px-4">
        <div className="w-full max-w-3xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Complete your purchase</h1>
          <p className="text-gray-500 text-sm mb-8">{plan.name} · ${plan.price}.00 / month</p>

          <div className="grid md:grid-cols-2 gap-6">

            {/* ── Left: Personal information ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900">Personal information</h2>
                <p className="text-xs text-gray-400 mt-0.5">Your invoice will be sent to the email below</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">First name</Label>
                  <input className={inp} placeholder="First name"
                    value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Last name</Label>
                  <input className={inp} placeholder="Last name"
                    value={lastName} onChange={(e) => setLastName(e.target.value)} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Country</Label>
                <select className={inp} value={country} onChange={(e) => setCountry(e.target.value)}>
                  {["Australia","United States","United Kingdom","Canada","India","New Zealand","Singapore","Other"].map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">City</Label>
                  <input className={inp} placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Zip code</Label>
                  <input className={inp} placeholder="0000"
                    value={zip} onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 10))} />
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">E-mail</Label>
                <input className={inp} placeholder="you@example.com" type="email"
                  value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs text-gray-500 mb-1.5 block">Phone number</Label>
                <input className={inp} placeholder="+61 400 000 000" type="tel"
                  value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            {/* ── Right: Card information ── */}
            <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <h2 className="font-semibold text-gray-900">Card information</h2>
                <p className="text-xs text-gray-400 mt-0.5">Indicate details of the card from which money will be debited</p>
              </div>

              {/* Accepted cards */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">Accepted:</span>
                <span className="px-2.5 py-1 rounded-md bg-[#1a1f71] text-white font-bold italic text-sm tracking-wider">VISA</span>
                <div className="flex items-center border border-gray-200 rounded-md px-2.5 py-1 gap-1.5 bg-white">
                  <div className="w-4 h-4 rounded-full bg-red-500" />
                  <div className="w-4 h-4 rounded-full bg-yellow-400 -ml-2.5" />
                  <span className="text-xs text-gray-600 font-medium ml-0.5">Mastercard</span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
              )}

              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Cardholder name</Label>
                  <input className={inp} placeholder="Full name on card"
                    value={holder} onChange={(e) => setHolder(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs text-gray-500 mb-1.5 block">Card number</Label>
                  <input className={`${inp} font-mono tracking-widest`} placeholder="0000 0000 0000 0000"
                    value={cardNumber} onChange={(e) => setCardNumber(formatCardNumber(e.target.value))} maxLength={19} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">Month and year</Label>
                    <input className={`${inp} font-mono`} placeholder="MM / YY"
                      value={expiry} onChange={(e) => setExpiry(formatExpiry(e.target.value))} maxLength={5} />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500 mb-1.5 block">CVV code</Label>
                    <input className={`${inp} font-mono`} placeholder="•••"
                      value={cvv} onChange={(e) => setCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                      maxLength={4} type="password" />
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">{plan.name}</span>
                  <span className="font-semibold">${plan.price}.00</span>
                </div>
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Billed monthly</span><span>Cancel anytime</span>
                </div>
              </div>

              <button onClick={handlePay} disabled={loading}
                className="w-full h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}>
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                  : <><Lock className="w-4 h-4" />Pay ${plan.price}.00</>}
              </button>
              <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3" /> 256-bit SSL secured · Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentPageInner /></Suspense>;
}
