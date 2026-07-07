/**
 * Dev-only mock checkout. Active ONLY when no Stripe key is configured
 * (isMockPayments). Flips the caller's subscription to `trialing` so the entire
 * money path — onboarding -> paywall -> entitled app — is testable with zero keys.
 * Guards: real session required; refuses to run when Stripe IS configured.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { isMockPayments, PLANS } from "@/lib/providers/payments";
import { track } from "@/lib/providers/analytics";
import type { PlanId } from "@/lib/types";

export async function GET(req: NextRequest) {
  if (!isMockPayments()) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const session = await requireUser().catch(() => null);
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  const planParam = req.nextUrl.searchParams.get("plan") ?? "weekly";
  const plan: PlanId = (["weekly", "monthly", "landjob"] as PlanId[]).includes(planParam as PlanId)
    ? (planParam as PlanId)
    : "weekly";

  const trialDays = PLANS[plan].trialDays;
  const now = Date.now();
  const periodMs = plan === "weekly" ? 7 : plan === "monthly" ? 30 : 60;
  const currentPeriodEnd = new Date(now + (trialDays > 0 ? trialDays : periodMs) * 86_400_000).toISOString();

  await db().upsertSubscription({
    user_id: session.userId,
    stripe_customer_id: `mock_cus_${session.userId.slice(0, 8)}`,
    stripe_sub_id: `mock_sub_${session.userId.slice(0, 8)}`,
    status: trialDays > 0 ? "trialing" : "active",
    plan,
    current_period_end: currentPeriodEnd,
  });

  track("trial_started", session.userId, { plan, mock: true });
  return NextResponse.redirect(new URL("/dashboard?checkout=success", req.url));
}
