import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { Card, LinkButton } from "@/components/ui";

/** Cheat-sheet page: preview + download the one-page PDF (feature 13). */
export default async function CheatsheetPage() {
  const session = await requireUser();
  const jobs = await db().listJobs(session.userId);
  const job = jobs[0] ?? null;
  const pack = job ? await db().getPrepPackByJob(job.id, session.userId) : null;

  if (!job || !pack) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">No cheat sheet yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Generate your prep pack first — the cheat sheet is built from your top questions and best answers.
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
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Cheat sheet</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">
          One page for {job.company}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Your top 8 questions, best answers, company facts, and 3 questions to ask them — print or keep it on your
          phone.
        </p>
      </div>

      <Card className="p-6">
        <p className="text-sm leading-relaxed text-[var(--color-ink)]">
          Includes your strongest {Math.min(pack.questions.length, 8)} questions for {job.title}, plus any answers
          you&apos;ve saved to your answer bank.
        </p>
        <a
          href="/api/cheatsheet"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex h-14 min-w-[44px] items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--color-navy)] px-7 text-base font-medium text-[var(--color-porcelain)] shadow-[var(--shadow-card)] transition-all duration-150 hover:bg-[var(--color-navy-2)] active:scale-[0.97]"
        >
          Download cheat sheet PDF
        </a>
      </Card>
    </div>
  );
}
