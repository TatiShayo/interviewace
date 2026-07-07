"use server";

/**
 * Checkout server action. PLAYBOOK 2.5: the client sends only intent (plan id),
 * never amounts; prices live server-side in lib/providers/payments.ts. With no
 * Stripe key this returns the internal dev mock-checkout URL.
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { createCheckoutUrl } from "@/lib/providers/payments";
import { track } from "@/lib/providers/analytics";
import type { PlanId } from "@/lib/types";

const PLAN_IDS: PlanId[] = ["weekly", "monthly", "landjob"];

export async function startCheckout(formData: FormData): Promise<void> {
  const session = await requireUser();
  const plan = String(formData.get("plan") ?? "weekly") as PlanId;
  if (!PLAN_IDS.includes(plan)) throw new Error("Unknown plan");

  const sub = await db().getSubscription(session.userId);
  track("checkout_started", session.userId, { plan });

  const url = await createCheckoutUrl({
    userId: session.userId,
    email: session.email,
    plan,
    existingCustomerId: sub?.stripe_customer_id ?? null,
  });
  redirect(url);
}
