"use server";

/**
 * Onboarding server actions. Every step is instrumented (drop-off per screen is
 * the #1 conversion lever — PLAYBOOK 3.1). The final step generates a REAL prep
 * pack so the paywall can show the user their own questions (blurred-teaser).
 */
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";
import { generatePrepPack } from "@/lib/ai/prepPack";
import type { ExperienceLevel, InterviewFear, InterviewType } from "@/lib/types";

const EXPERIENCE: ExperienceLevel[] = ["entry", "mid", "senior", "exec"];
const FEARS: InterviewFear[] = ["freezing_up", "behavioral", "technical", "salary_talk"];
const TYPES: InterviewType[] = ["phone_screen", "behavioral", "technical", "panel"];

/** Persist a partial onboarding step and record its completion event. */
export async function saveOnboardingStep(input: {
  step: number;
  target_role?: string;
  experience_level?: string;
  interview_date?: string;
  biggest_fear?: string;
  interview_type?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireUser();
  const patch: Record<string, unknown> = {};

  if (input.target_role !== undefined) {
    const role = input.target_role.trim().slice(0, 120);
    if (!role) return { ok: false, error: "Please enter the role you're interviewing for." };
    patch.target_role = role;
  }
  if (input.experience_level !== undefined) {
    if (!EXPERIENCE.includes(input.experience_level as ExperienceLevel))
      return { ok: false, error: "Please choose an experience level." };
    patch.experience_level = input.experience_level;
  }
  if (input.interview_date !== undefined && input.interview_date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.interview_date))
      return { ok: false, error: "Please pick a valid date." };
    patch.interview_date = input.interview_date;
  }
  if (input.biggest_fear !== undefined) {
    if (!FEARS.includes(input.biggest_fear as InterviewFear))
      return { ok: false, error: "Please choose one." };
    patch.biggest_fear = input.biggest_fear;
  }
  if (input.interview_type !== undefined) {
    if (!TYPES.includes(input.interview_type as InterviewType))
      return { ok: false, error: "Please choose an interview type." };
    patch.interview_type = input.interview_type;
  }

  if (Object.keys(patch).length) await db().updateProfile(session.userId, patch);
  track("onboarding_step_completed", session.userId, { step: input.step });
  return { ok: true };
}

/**
 * Final onboarding step: save the posting + resume text, generate a real prep
 * pack. Returns a teaser (first 3 questions unlocked, categories of the rest)
 * for the paywall — the full pack stays gated until the trial starts.
 */
export async function buildPrepPlan(input: {
  posting_text: string;
  resume_text?: string;
}): Promise<
  | { ok: true; jobId: string; company: string; title: string; teaser: { question: string; category: string }[]; lockedCategories: string[] }
  | { ok: false; error: string }
> {
  const session = await requireUser();
  const posting = input.posting_text.trim();
  if (posting.length < 40) return { ok: false, error: "Paste a bit more of the job posting so we can read it." };

  const resume = (input.resume_text ?? "").trim().slice(0, 40_000);
  if (resume) {
    await db().createResume({ user_id: session.userId, storage_path: null, extracted_text: resume });
  }

  track("onboarding_generate_started", session.userId, {});
  try {
    const { job, pack } = await generatePrepPack({
      userId: session.userId,
      postingText: posting.slice(0, 40_000),
      resumeText: resume,
    });
    track("prep_pack_generated", session.userId, { source: "onboarding", cached: pack.cached });
    track("activation", session.userId, {}); // activation event = first prep pack

    const teaser = pack.questions.slice(0, 3).map((q) => ({ question: q.question, category: q.category }));
    const lockedCategories = pack.questions.slice(3).map((q) => q.category);
    return { ok: true, jobId: job.id, company: job.company, title: job.title, teaser, lockedCategories };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    // Budget / disabled errors are safe to surface; everything else generic.
    const safe = ["Daily AI budget reached", "AI features are temporarily disabled", "The AI response could not be validated"].some(
      (p) => msg.startsWith(p)
    );
    return { ok: false, error: safe ? msg : "We couldn't build your plan just now. Please try again." };
  }
}
