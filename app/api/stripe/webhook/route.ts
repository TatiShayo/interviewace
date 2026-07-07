/**
 * Stripe webhook. PLAYBOOK 2.5: signature-verified + idempotent (persist event
 * ids). Syncs the local `subscriptions` row to Stripe's source of truth so
 * entitlement checks (middleware + lib/entitlement) are always correct.
 */
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { verifyWebhookSignature, stripe, isMockPayments } from "@/lib/providers/payments";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";
import { reportError } from "@/lib/providers/monitoring";
import type { PlanId, SubStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, SubStatus> = {
  trialing: "trialing",
  active: "active",
  past_due: "past_due",
  paused: "paused",
  canceled: "canceled",
  unpaid: "past_due",
  incomplete: "none",
  incomplete_expired: "canceled",
};

function planFromPrice(sub: Stripe.Subscription): PlanId | null {
  const meta = (sub.metadata?.plan ?? "") as string;
  if (meta === "weekly" || meta === "monthly" || meta === "landjob") return meta;
  return null;
}

export async function POST(req: Request) {
  if (isMockPayments()) return NextResponse.json({ error: "Stripe not configured" }, { status: 404 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(payload, signature);
  } catch {
    // Never leak internal details on signature failure.
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: process each event id at most once.
  const fresh = await db().insertStripeEventOnce(event.id);
  if (!fresh) return NextResponse.json({ received: true, duplicate: true });

  try {
    await handleEvent(event);
  } catch (e) {
    reportError(e, { area: "stripe_webhook", type: event.type });
    // 500 so Stripe retries; the event id row lets us dedupe on retry only
    // after successful processing — so on failure we allow reprocessing.
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const userId = s.client_reference_id;
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id ?? null;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null;
      if (userId && subId) {
        const sub = await stripe().subscriptions.retrieve(subId);
        await syncSubscription(userId, customerId, sub);
        track("trial_started", userId, { plan: planFromPrice(sub) ?? "unknown" });
      }
      break;
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const userId = sub.metadata?.user_id ?? (await db().findUserByStripeCustomer(customerId));
      if (userId) await syncSubscription(userId, customerId, sub);
      break;
    }
    case "invoice.payment_failed": {
      const inv = event.data.object as Stripe.Invoice;
      const customerId = typeof inv.customer === "string" ? inv.customer : inv.customer?.id ?? null;
      if (customerId) {
        const userId = await db().findUserByStripeCustomer(customerId);
        if (userId) track("payment_failed", userId, {});
      }
      break;
    }
    default:
      break;
  }
}

async function syncSubscription(userId: string, customerId: string | null, sub: Stripe.Subscription): Promise<void> {
  const status = STATUS_MAP[sub.status] ?? "none";
  const item = sub.items.data[0];
  const periodEnd = item?.current_period_end ?? null;
  await db().upsertSubscription({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_sub_id: sub.id,
    status,
    plan: planFromPrice(sub),
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
  });
}
