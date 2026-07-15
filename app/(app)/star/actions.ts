"use server";

/**
 * STAR builder actions (BUILD_PROMPT feature 4): guided Situation/Task/Action/
 * Result form with an AI suggestion per section, pulling only from the user's
 * real resume (never fabricated) — enforced by starSuggestSystemPrompt.
 */
import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { generateJson } from "@/lib/ai/generate";
import { starSuggestSchema } from "@/lib/ai/schemas";
import { starSuggestSystemPrompt, starSuggestUserPrompt } from "@/lib/prompts";
import { limitOr, LIMITS } from "@/lib/security/ratelimit";
import { track } from "@/lib/providers/analytics";

export async function suggestStarSection(args: {
  question: string;
  section: "situation" | "task" | "action" | "result";
  draftSoFar: string;
}): Promise<{ ok: true; suggestion: string } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const limited = limitOr(`star_suggest:${session.userId}`, LIMITS.ai);
  if (limited) return { ok: false, error: limited };

  const resume = await db().getLatestResume(session.userId);

  try {
    const out = await generateJson({
      userId: session.userId,
      task: "star_suggest",
      system: starSuggestSystemPrompt,
      user: starSuggestUserPrompt({
        question: args.question,
        section: args.section,
        resumeText: resume?.extracted_text ?? "",
        draftSoFar: args.draftSoFar,
      }),
      schema: starSuggestSchema,
      maxTokens: 512,
    });
    track("star_suggestion_used", session.userId, { section: args.section });
    return { ok: true, suggestion: out.suggestion };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Suggestion failed";
    const safe = ["Daily AI budget reached", "AI features are temporarily disabled", "The AI response could not be validated"].some(
      (p) => msg.startsWith(p)
    );
    return { ok: false, error: safe ? msg : "Couldn't generate a suggestion just now." };
  }
}

export async function saveStarAnswer(
  question: string,
  situation: string,
  task: string,
  action: string,
  result: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const parts = [situation, task, action, result].map((s) => s.trim()).filter(Boolean);
  if (parts.length < 2) return { ok: false, error: "Fill in at least two sections before saving." };

  const answer = [
    situation && `Situation: ${situation.trim()}`,
    task && `Task: ${task.trim()}`,
    action && `Action: ${action.trim()}`,
    result && `Result: ${result.trim()}`,
  ]
    .filter(Boolean)
    .join(" ");

  await db().saveAnswer({ user_id: session.userId, question, answer, source: "star" });
  track("answer_saved", session.userId, { source: "star_builder" });
  return { ok: true };
}
