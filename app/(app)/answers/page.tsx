import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { LinkButton } from "@/components/ui";
import { AnswerBankView } from "./AnswerBankView";

/**
 * Answer Bank (BUILD_PROMPT feature 5): all saved/improved answers, searchable,
 * "practice again" per answer. Surfaces the stored-value asset (PLAYBOOK 3.3) —
 * this is what the user loses by leaving.
 */
export default async function AnswersPage() {
  const session = await requireUser();
  const saved = await db().listSavedAnswers(session.userId);

  if (saved.length === 0) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Your answer bank is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Save outlines from your prep pack or improved answers from mock interviews — they'll collect here, ready for
          your next interview too.
        </p>
        <LinkButton href="/prep" className="mt-6">
          Browse your prep pack
        </LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Answer bank</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">
          {saved.length} polished {saved.length === 1 ? "answer" : "answers"}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Ready whenever your next interview comes — this is yours to keep.
        </p>
      </div>
      <AnswerBankView answers={saved} />
    </div>
  );
}
