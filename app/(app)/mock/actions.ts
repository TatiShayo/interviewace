"use server";

import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";

export async function saveMockAnswerToBank(
  question: string,
  answer: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireEntitled();
  await db().saveAnswer({ user_id: session.userId, question, answer, source: "mock" });
  track("answer_saved", session.userId, { source: "mock" });
  return { ok: true };
}
