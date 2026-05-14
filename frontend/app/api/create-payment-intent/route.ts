import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PLAN_PRICES: Record<string, number> = {
  premium: 1200,
  pro: 2900,
};

export async function POST(req: NextRequest) {
  const { plan } = await req.json();
  const amount = PLAN_PRICES[plan] ?? PLAN_PRICES.premium;

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: "aud",
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
