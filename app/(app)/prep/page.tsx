import Link from "next/link";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { LinkButton } from "@/components/ui";
import { PrepPackView } from "./PrepPackView";

/**
 * Prep Pack — full UI (BUILD_PROMPT feature 2). Server component fetches the
 * user's latest job + pack; the client component owns the staggered reveal,
 * category filter, and regenerate flow.
 */
export default async function PrepPage() {
  const session = await requireUser();
  const jobs = await db().listJobs(session.userId);
  const latestJob = jobs[0] ?? null;

  if (!latestJob) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">No prep pack yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Paste a job posting to generate the 15 questions this panel is most likely to ask.
        </p>
        <LinkButton href="/onboarding" className="mt-6">
          Paste a job posting
        </LinkButton>
      </div>
    );
  }

  const pack = await db().getPrepPackByJob(latestJob.id, session.userId);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Prep pack</p>
          <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--color-navy)]">
            {latestJob.title} at {latestJob.company}
          </h1>
        </div>
        <Link href="/mock" className="whitespace-nowrap text-sm font-medium text-[var(--color-navy)] hover:underline">
          Start a mock →
        </Link>
      </div>

      {pack ? (
        <PrepPackView
          jobId={latestJob.id}
          companyIntel={pack.company_intel}
          questions={pack.questions}
        />
      ) : (
        <p className="text-sm text-[var(--color-muted)]">
          This job hasn&apos;t been generated yet.{" "}
          <Link href="/onboarding" className="font-medium text-[var(--color-navy)] hover:underline">
            Generate a prep pack
          </Link>
          .
        </p>
      )}
    </div>
  );
}
