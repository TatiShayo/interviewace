import Link from "next/link";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { LinkButton } from "@/components/ui";
import { MockSessionRunner } from "./MockSessionRunner";

/**
 * Voice mock interview entry point (BUILD_PROMPT feature 3). Requires a
 * generated prep pack; the actual session flow (recorder, orb, scoring,
 * radar summary) lives client-side in MockSessionRunner, driven by
 * /api/mock/* routes so every AI call and the 3/day cap stays server-enforced.
 */
export default async function MockPage() {
  const session = await requireUser();
  const jobs = await db().listJobs(session.userId);
  const latestJob = jobs[0] ?? null;
  const pack = latestJob ? await db().getPrepPackByJob(latestJob.id, session.userId) : null;

  if (!latestJob || !pack) {
    return (
      <div className="py-10 text-center">
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">No prep pack yet</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Generate your questions first — then come back and practice them out loud.
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
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Practice</p>
        <h1 className="font-display text-2xl font-semibold leading-tight text-[var(--color-navy)]">
          Mock interview — {latestJob.title} at {latestJob.company}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Five questions. Answer out loud, get scored, see where to sharpen.{" "}
          <Link href="/prep" className="font-medium text-[var(--color-navy)] hover:underline">
            Review the full pack
          </Link>
          .
        </p>
      </div>
      <MockSessionRunner jobId={latestJob.id} />
    </div>
  );
}
