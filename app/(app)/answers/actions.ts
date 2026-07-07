"use server";

/** Answer Bank actions: the stored-value asset users would lose by leaving (PLAYBOOK 3.3). */
import { requireEntitled } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";

export async function deleteSavedAnswerAction(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireEntitled();
  await db().deleteSavedAnswer(id, session.userId);
  track("answer_deleted", session.userId, {});
  return { ok: true };
}
