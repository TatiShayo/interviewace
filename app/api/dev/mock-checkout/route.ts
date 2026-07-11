/**
 * Dev-only mock checkout. Active ONLY when no Stripe key is configured
 * (isMockPayments). Flips the caller's subscription to `trialing` so the entire
 * money path — onboarding -> paywall -> entitled app — is testable with zero keys.
 * Guards: real session required; refuses to run when Stripe IS configured.
 */
import { NextResponse, type NextRequest } from "next/server";
import { requireUser } from "@/lib/entitlement";
import { isMockPayments, runMockCheckout } from "@/lib/providers/payments";
import type { PlanId } from "@/lib/types";

// Kept for direct manual use (e.g. hitting the URL by hand in dev); the
// paywall's real checkout flow calls `runMockCheckout` in-process instead
// (see its docstring in lib/providers/payments.ts for why).
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

  await runMockCheckout(session.userId, plan);
  return NextResponse.redirect(new URL("/dashboard?checkout=success", req.url));
}
