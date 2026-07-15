"use server";

/**
 * Prep-pack actions for the authenticated app (post-paywall). Regeneration
 * re-runs the same cached-by-hash pipeline used in onboarding — pasting the
 * exact same posting+resume again is free (BUILD_PROMPT cost guard 16).
 */
import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { generatePrepPack } from "@/lib/ai/prepPack";
import { limitOr, LIMITS } from "@/lib/security/ratelimit";
import { track } from "@/lib/providers/analytics";

export async function regeneratePrepPack(
  jobId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const limited = limitOr(`regen_prep:${session.userId}`, LIMITS.ai);
  if (limited) return { ok: false, error: limited };

  const job = await db().getJob(jobId, session.userId);
  if (!job) return { ok: false, error: "We couldn't find that job posting." };

  const resume = await db().getLatestResume(session.userId);

  try {
    // Force a fresh generation: nudge the hash by appending a regen marker so
    // the cache lookup misses, without losing the original posting/resume text.
    await db().deletePrepPacksForJob(jobId, session.userId);
    await generatePrepPack({
      userId: session.userId,
      postingText: job.posting_text,
      resumeText: resume?.extracted_text ?? "",
      jobId: job.id,
    });
    track("prep_pack_regenerated", session.userId, { job_id: jobId });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    const safe = [
      "Daily AI budget reached",
      "AI features are temporarily disabled",
      "The AI response could not be validated",
    ].some((p) => msg.startsWith(p));
    return { ok: false, error: safe ? msg : "We couldn't regenerate your plan just now. Please try again." };
  }
}

export async function saveOutlineToBank(
  question: string,
  outline: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireEntitled();
  await db().saveAnswer({ user_id: session.userId, question, answer: outline, source: "star" });
  track("answer_saved", session.userId, { source: "prep_outline" });
  return { ok: true };
}
