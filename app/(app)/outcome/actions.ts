"use server";

/**
 * Outcome loop (BUILD_PROMPT feature 15): one-question survey after the
 * interview date passes (and in the cancel flow). YES -> testimonial request
 * + referral code surfaced at peak happiness; NO -> offer to regenerate prep
 * for the next application. Aggregate stats feed the (currently placeholder)
 * landing-page proof once real.
 */
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";

export async function submitOutcome(
  gotOffer: boolean,
  testimonial?: string
): Promise<{ ok: true; referralCode: string | null } | { ok: false; error: string }> {
  const session = await requireUser();
  await db().saveOutcome({ user_id: session.userId, got_offer: gotOffer, testimonial: testimonial?.trim() || null });
  track("outcome_reported", session.userId, { got_offer: gotOffer, has_testimonial: Boolean(testimonial?.trim()) });

  const profile = await db().getProfile(session.userId);
  return { ok: true, referralCode: gotOffer ? (profile?.referral_code ?? null) : null };
}
