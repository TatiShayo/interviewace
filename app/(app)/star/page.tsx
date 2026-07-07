import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { LinkButton } from "@/components/ui";
import { StarBuilder } from "./StarBuilder";

/** STAR answer builder (BUILD_PROMPT feature 4): pick a question, draft with AI help. */
export default async function StarPage() {
  const session = await requireUser();
  const jobs = await db().listJobs(session.userId);
  const latestJob = jobs[0] ?? null;
  const pack = latestJob ? await db().getPrepPackByJob(latestJob.id, session.userId) : null;

  if (!pack || pack.questions.length === 0) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Pick a question to build first</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Generate your prep pack, then come back to draft a structured STAR answer for any question.
        </p>
        <LinkButton href="/onboarding" className="mt-6">
          Get started
        </LinkButton>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">STAR builder</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Build a structured answer</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Situation, Task, Action, Result — get an AI suggestion pulled from your resume for any section.
        </p>
      </div>
      <StarBuilder questions={pack.questions.map((q) => q.question)} />
    </div>
  );
}
