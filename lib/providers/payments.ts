/**
 * Payments provider. Real: Stripe subscriptions (weekly w/ 3-day trial,
 * monthly, 60-day "Land The Job"). Mock (no STRIPE_SECRET_KEY): an internal
 * /api/dev/mock-checkout flow that flips the sub to `trialing` so the whole
 * money path is testable without keys.
 *
 * PLAYBOOK 2.5: prices live server-side only; the client sends intent
 * ("weekly"), never amounts. Webhooks are signature-verified and idempotent.
 */
import "server-only";
import Stripe from "stripe";
import { env, has } from "@/lib/env";
import type { PlanId } from "@/lib/types";

/** Server-side plan config (experiment-ready: env-overridable price IDs). */
export const PLANS: Record<PlanId, { label: string; priceEnv: () => string; display: string; interval: string; trialDays: number }> = {
  weekly: { label: "Weekly", priceEnv: () => env.stripePriceWeekly, display: "$6.99/week", interval: "week", trialDays: 3 },
  monthly: { label: "Monthly", priceEnv: () => env.stripePriceMonthly, display: "$19.99/month", interval: "month", trialDays: 0 },
  landjob: { label: "Land The Job — 60 days", priceEnv: () => env.stripePriceLandJob, display: "$34.99 for 60 days", interval: "60 days", trialDays: 0 },
};

let _stripe: Stripe | null = null;
export function stripe(): Stripe {
  if (!_stripe) _stripe = new Stripe(env.stripeSecretKey, { apiVersion: "2025-07-30.basil" });
  return _stripe;
}
export const isMockPayments = () => !has.stripe;

export async function createCheckoutUrl(args: {
  userId: string;
  email: string;
  plan: PlanId;
  existingCustomerId?: string | null;
}): Promise<string> {
  const { userId, email, plan } = args;
  if (isMockPayments()) {
    // Dev-mode checkout: server-side route flips the sub to trialing.
    return `${env.appUrl}/api/dev/mock-checkout?plan=${plan}`;
  }
  const price = PLANS[plan].priceEnv();
  if (!price) throw new Error(`Missing Stripe price ID for plan ${plan} (see .env.example)`);
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    customer: args.existingCustomerId ?? undefined,
    customer_email: args.existingCustomerId ? undefined : email,
    client_reference_id: userId,
    subscription_data: PLANS[plan].trialDays > 0 ? { trial_period_days: PLANS[plan].trialDays, metadata: { user_id: userId, plan } } : { metadata: { user_id: userId, plan } },
    success_url: `${env.appUrl}/dashboard?checkout=success`,
    cancel_url: `${env.appUrl}/paywall?checkout=cancelled`,
    allow_promotion_codes: true,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

export async function createPortalUrl(customerId: string): Promise<string> {
  if (isMockPayments()) return `${env.appUrl}/settings?portal=mock`;
  const session = await stripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.appUrl}/settings`,
  });
  return session.url;
}

export function verifyWebhookSignature(payload: string, signature: string): Stripe.Event {
  return stripe().webhooks.constructEvent(payload, signature, env.stripeWebhookSecret);
}
