"use server";

/**
 * Salary negotiation module (BUILD_PROMPT feature 6): script generation +
 * role-play mode (user responds to an AI hardball recruiter).
 */
import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { generateJson } from "@/lib/ai/generate";
import { negotiationSchema, roleplaySchema } from "@/lib/ai/schemas";
import {
  negotiationSystemPrompt,
  negotiationUserPrompt,
  negotiationRoleplaySystemPrompt,
  negotiationRoleplayUserPrompt,
} from "@/lib/prompts";
import { track } from "@/lib/providers/analytics";
import type { NegotiationOut, RoleplayOut } from "@/lib/ai/schemas";

function safeError(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : fallback;
  const safe = ["Daily AI budget reached", "AI features are temporarily disabled", "The AI response could not be validated"].some(
    (p) => msg.startsWith(p)
  );
  return safe ? msg : fallback;
}

export async function generateNegotiationScript(args: {
  offerAmount: string;
  market: string;
  location: string;
  competing: boolean;
}): Promise<{ ok: true; script: NegotiationOut } | { ok: false; error: string }> {
  const session = await requireEntitled();
  const jobs = await db().listJobs(session.userId);
  const role = jobs[0]?.title ?? "this role";

  try {
    const out = await generateJson({
      userId: session.userId,
      task: "negotiation",
      system: negotiationSystemPrompt,
      user: negotiationUserPrompt({ ...args, role }),
      schema: negotiationSchema,
      maxTokens: 2048,
    });
    track("negotiation_script_generated", session.userId, {});
    return { ok: true, script: out };
  } catch (e) {
    return { ok: false, error: safeError(e, "Couldn't generate a script just now. Please try again.") };
  }
}

export async function roleplayReply(args: {
  context: string;
  history: { speaker: "recruiter" | "candidate"; text: string }[];
}): Promise<{ ok: true; reply: RoleplayOut } | { ok: false; error: string }> {
  const session = await requireEntitled();
  try {
    const out = await generateJson({
      userId: session.userId,
      task: "roleplay",
      system: negotiationRoleplaySystemPrompt,
      user: negotiationRoleplayUserPrompt(args),
      schema: roleplaySchema,
      maxTokens: 512,
    });
    return { ok: true, reply: out };
  } catch (e) {
    return { ok: false, error: safeError(e, "The recruiter is thinking too hard — try again.") };
  }
}
