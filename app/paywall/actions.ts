"use server";

/**
 * Checkout server action. PLAYBOOK 2.5: the client sends only intent (plan id),
 * never amounts; prices live server-side in lib/providers/payments.ts. With no
 * Stripe key this returns the internal dev mock-checkout URL.
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { createCheckoutUrl, isMockPayments, runMockCheckout } from "@/lib/providers/payments";
import { track } from "@/lib/providers/analytics";
import type { PlanId } from "@/lib/types";

const PLAN_IDS: PlanId[] = ["weekly", "monthly", "landjob"];

export async function startCheckout(formData: FormData): Promise<void> {
  const session = await requireUser();
  const plan = String(formData.get("plan") ?? "weekly") as PlanId;
  if (!PLAN_IDS.includes(plan)) throw new Error("Unknown plan");

  const sub = await db().getSubscription(session.userId);
  track("checkout_started", session.userId, { plan });

  // Mock mode: run the subscription flip in-process and redirect straight to
  // a real page. Redirecting a Server Action to a Route Handler (not a page)
  // gets soft-navigated by the Next.js client router, which never issues the
  // follow-up request and stalls on /paywall (see runMockCheckout's docstring).
  if (isMockPayments()) {
    await runMockCheckout(session.userId, plan);
    redirect("/dashboard?checkout=success");
  }

  const url = await createCheckoutUrl({
    userId: session.userId,
    email: session.email,
    plan,
    existingCustomerId: sub?.stripe_customer_id ?? null,
  });
  redirect(url);
}
