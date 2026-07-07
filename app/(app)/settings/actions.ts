"use server";

/**
 * Settings actions: Stripe portal, pause-instead-of-cancel (PLAYBOOK 3.3 —
 * "cancellation flow offers pause until your next search, keep your answer
 * bank"), self-serve data export + account deletion (GDPR, PLAYBOOK 2.7).
 */
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { createPortalUrl, isMockPayments, stripe } from "@/lib/providers/payments";
import { track } from "@/lib/providers/analytics";
import { signOut } from "@/lib/auth";

export async function openBillingPortal(): Promise<void> {
  const session = await requireUser();
  const sub = await db().getSubscription(session.userId);
  if (!sub?.stripe_customer_id) redirect("/paywall");
  const url = await createPortalUrl(sub.stripe_customer_id);
  redirect(url);
}

/** Pause instead of cancel: keeps the answer bank, flips status so entitlement
 * gates re-route to the paywall without deleting any stored-value data. */
export async function pauseSubscription(): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const sub = await db().getSubscription(session.userId);
  if (!sub) return { ok: false, error: "No active subscription to pause." };

  try {
    if (!isMockPayments() && sub.stripe_sub_id) {
      await stripe().subscriptions.update(sub.stripe_sub_id, {
        pause_collection: { behavior: "keep_as_draft" },
      });
    }
    await db().upsertSubscription({ user_id: session.userId, status: "paused" });
    track("subscription_paused", session.userId, {});
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't pause your subscription. Try the billing portal instead." };
  }
}

export async function exportMyData(): Promise<Record<string, unknown>> {
  const session = await requireUser();
  track("data_export_requested", session.userId, {});
  return db().exportUserData(session.userId);
}

export async function deleteMyAccount(): Promise<void> {
  const session = await requireUser();
  track("account_deleted", session.userId, {});
  await db().deleteAllUserData(session.userId);
  await signOut();
  redirect("/");
}
