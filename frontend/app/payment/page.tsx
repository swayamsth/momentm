"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import { usePremium } from "@/hooks/usePremium";
import { ChevronLeft, Lock, Loader2, CheckCircle, Activity } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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


function loadUser() {
  try {
    const s = typeof window !== "undefined" ? localStorage.getItem("user") : null;
    return s ? JSON.parse(s) : null;
  } catch { return null; }
}

const inp = "w-full h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all";

function CheckoutForm({ plan, planKey }: { plan: typeof PLANS[string]; planKey: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const { activatePremium } = usePremium();
  const user = loadUser();

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
    if (!stripe || !elements) return;
    if (!email.trim()) { setError("Enter your email address."); return; }

    setError("");
    setLoading(true);

    try {
      // 1. Create PaymentIntent on server
      const res = await fetch("/api/create-payment-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey }),
      });
      const { clientSecret } = await res.json();

      // 2. Confirm card payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) { setLoading(false); return; }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: `${firstName} ${lastName}`.trim() || user?.first_name || "Customer",
            email,
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message ?? "Payment failed. Please try again.");
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === "succeeded") {
        // 3. Activate premium locally + on backend
        activatePremium();
        const token = localStorage.getItem("access_token");
        if (token) {
          fetch("http://127.0.0.1:8000/api/activate-premium/", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => console.error("[premium] backend activation failed:", err));
        }

        // 4. Send invoice email
        const billingDate = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
        try {
          const invoiceRes = await fetch("/api/invoice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              planName: plan.name,
              price: plan.price,
              userName: `${firstName} ${lastName}`.trim(),
              userEmail: email,
              transactionId: paymentIntent.id,
              billingDate,
            }),
          });
          const invoiceData = await invoiceRes.json();
          if (!invoiceData.sent) console.warn("[invoice] email not sent — check GMAIL credentials");
        } catch (err) {
          console.error("[invoice] request failed:", err);
        }

        setSuccess(true);
        setTimeout(() => router.push("/dashboard"), 2800);
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
              <p className="text-xs text-gray-400 mt-0.5">Secured and processed by Stripe</p>
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

            {/* Stripe Card Element */}
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Card details</Label>
              <div className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 flex items-center focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                <CardElement
                  className="w-full"
                  options={{
                    style: {
                      base: {
                        fontSize: "14px",
                        color: "#111827",
                        fontFamily: "inherit",
                        "::placeholder": { color: "#9ca3af" },
                      },
                      invalid: { color: "#ef4444" },
                    },
                    hidePostalCode: true,
                  }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Use test card: <span className="font-mono">4242 4242 4242 4242</span> · any future date · any CVC
              </p>
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

            <button onClick={handlePay} disabled={loading || !stripe}
              className="w-full h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg,#2563eb,#6366f1)" }}>
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</>
                : <><Lock className="w-4 h-4" />Pay ${plan.price}.00</>}
            </button>
            <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" /> Powered by Stripe · 256-bit SSL
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planKey = searchParams.get("plan") ?? "premium";
  const plan = PLANS[planKey] ?? PLANS.premium;
  const [clientSecret, setClientSecret] = useState("");

  useEffect(() => {
    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: planKey }),
    })
      .then(r => r.json())
      .then(d => setClientSecret(d.clientSecret));
  }, [planKey]);

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

      {clientSecret ? (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm plan={plan} planKey={planKey} />
        </Elements>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      )}
    </div>
  );
}

export default function PaymentPage() {
  return <Suspense><PaymentPageInner /></Suspense>;
}
