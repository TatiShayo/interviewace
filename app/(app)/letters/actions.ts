"use server";

/** Cover letter + follow-up email generators (BUILD_PROMPT feature 7). */
import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { generateJson } from "@/lib/ai/generate";
import { letterSchema, followupSchema } from "@/lib/ai/schemas";
import { coverLetterSystemPrompt, followupSystemPrompt, letterUserPrompt } from "@/lib/prompts";
import { track } from "@/lib/providers/analytics";
import type { LetterOut, FollowupOut } from "@/lib/ai/schemas";

function safeError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : fallback;
  const safe = ["Daily AI budget reached", "AI features are temporarily disabled", "The AI response could not be validated"].some(
    (p) => msg.startsWith(p)
  );
  return safe ? msg : fallback;
}

export async function generateCoverLetter(
  tone: string,
  extra: string
): Promise<{ ok: true; letter: LetterOut } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const jobs = await db().listJobs(session.userId);
  const job = jobs[0];
  if (!job) return { ok: false, error: "Generate a prep pack first so we know the role." };
  const resume = await db().getLatestResume(session.userId);

  try {
    const out = await generateJson({
      userId: session.userId,
      task: "cover_letter",
      system: coverLetterSystemPrompt(tone),
      user: letterUserPrompt({
        postingText: job.posting_text,
        resumeText: resume?.extracted_text ?? "",
        role: job.title,
        company: job.company,
        extra,
      }),
      schema: letterSchema,
      maxTokens: 1024,
    });
    track("cover_letter_generated", session.userId, { tone });
    return { ok: true, letter: out };
  } catch (e) {
    return { ok: false, error: safeError(e, "Couldn't generate a cover letter just now.") };
  }
}

export async function generateFollowupEmail(
  tone: string,
  extra: string
): Promise<{ ok: true; email: FollowupOut } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const jobs = await db().listJobs(session.userId);
  const job = jobs[0];
  if (!job) return { ok: false, error: "Generate a prep pack first so we know the role." };
  const resume = await db().getLatestResume(session.userId);

  try {
    const out = await generateJson({
      userId: session.userId,
      task: "followup",
      system: followupSystemPrompt(tone),
      user: letterUserPrompt({
        postingText: job.posting_text,
        resumeText: resume?.extracted_text ?? "",
        role: job.title,
        company: job.company,
        extra,
      }),
      schema: followupSchema,
      maxTokens: 512,
    });
    track("followup_generated", session.userId, { tone });
    return { ok: true, email: out };
  } catch (e) {
    return { ok: false, error: safeError(e, "Couldn't generate a follow-up just now.") };
  }
}
