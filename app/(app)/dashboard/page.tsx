import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { Card, LinkButton } from "@/components/ui";
import { formatDateHuman, daysUntil } from "@/lib/utils";
import { FlashcardMode } from "./FlashcardMode";
import { DashboardExtras } from "./DashboardExtras";

/**
 * Dashboard: interview countdown, readiness score (avg of mock scores),
 * stored-value surfacing (answer bank count — what they lose by leaving),
 * and the single "next best action" (PLAYBOOK 3.3).
 */
export default async function DashboardPage() {
  const session = await requireUser();
  const [profile, jobs, answers, saved, sessions] = await Promise.all([
    db().getProfile(session.userId),
    db().listJobs(session.userId),
    db().listAnswersByUser(session.userId),
    db().listSavedAnswers(session.userId),
    db().listSessions(session.userId),
  ]);

  const latestJob = jobs[0] ?? null;
  const pack = latestJob ? await db().getPrepPackByJob(latestJob.id, session.userId) : null;

  const scored = answers.filter((a) => a.scores);
  const readiness =
    scored.length > 0
      ? Math.round(
          (scored.reduce((sum, a) => {
            const s = a.scores!;
            return sum + (s.structure + s.relevance + s.confidence + s.conciseness) / 4;
          }, 0) /
            scored.length) *
            10
        )
      : null;

  const days = daysUntil(profile?.interview_date);
  const dateHuman = formatDateHuman(profile?.interview_date);
  const interviewPassed = days !== null && days < 0;

  // Interview-day mode: condensed flashcard review replaces the full dashboard.
  if (days === 0 && latestJob) {
    return <FlashcardMode company={latestJob.company} answers={saved} />;
  }

  // Next best action heuristic.
  const nextAction = !pack
    ? { label: "Generate your prep pack", href: "/prep", why: "Start with the questions you'll actually be asked." }
    : sessions.length === 0
      ? { label: "Run your first mock", href: "/mock", why: "Practicing out loud is where the improvement happens." }
      : readiness !== null && readiness < 70
        ? { label: "Practice your weakest answer", href: "/mock", why: "Your readiness score has room to grow." }
        : { label: "Review your cheat sheet", href: "/cheatsheet", why: "You're ready — do a final calm pass." };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--color-navy)]">
          {latestJob ? `${latestJob.title} at ${latestJob.company}` : "Your interview prep"}
        </h1>
        {dateHuman ? (
          <p className="mt-1 text-[var(--color-muted)]">
            {days !== null && days >= 0 ? (days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`) : "Scheduled"} — {dateHuman}
          </p>
        ) : (
          <p className="mt-1 text-[var(--color-muted)]">Add your interview date in settings to unlock the countdown.</p>
        )}
      </div>

      {/* Metric row */}
      <div className="grid grid-cols-3 gap-3">
        <Metric label="Countdown" value={days !== null && days >= 0 ? `${days}` : "—"} unit={days === 1 ? "day" : "days"} />
        <Metric
          label="Readiness"
          value={readiness !== null ? `${readiness}` : "—"}
          unit={readiness !== null ? "/100" : ""}
          score
        />
        <Metric label="Answer bank" value={`${saved.length}`} unit={saved.length === 1 ? "answer" : "answers"} />
      </div>

      {/* Next best action */}
      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Next best action</p>
        <p className="mt-1.5 font-medium text-[var(--color-navy)]">{nextAction.label}</p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">{nextAction.why}</p>
        <LinkButton href={nextAction.href} className="mt-4" size="md">
          Continue
        </LinkButton>
      </Card>

      {/* Stored value nudge */}
      {saved.length > 0 && (
        <p className="text-sm text-[var(--color-muted)]">
          Your answer bank holds{" "}
          <span className="tnum font-medium text-[var(--color-navy)]">{saved.length}</span> polished{" "}
          {saved.length === 1 ? "answer" : "answers"} — ready whenever your next interview comes.
        </p>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <QuickLink href="/prep" title="Prep pack" desc={pack ? `${pack.questions.length} questions` : "Not generated yet"} />
        <QuickLink href="/mock" title="Practice" desc={`${sessions.length} sessions done`} />
        <QuickLink href="/answers" title="Answer bank" desc={`${saved.length} saved`} />
        <QuickLink href="/negotiation" title="Negotiation" desc="Build your script" />
      </div>

      <Suspense fallback={null}>
        <DashboardExtras interviewPassed={interviewPassed} />
      </Suspense>
    </div>
  );
}

function Metric({ label, value, unit, score }: { label: string; value: string; unit: string; score?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className="mt-1">
        <span className={`tnum font-display text-3xl font-semibold ${score ? "text-[var(--color-score)]" : "text-[var(--color-navy)]"}`}>
          {value}
        </span>
        {unit && <span className="ml-1 text-sm text-[var(--color-muted)]">{unit}</span>}
      </p>
    </Card>
  );
}

function QuickLink({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <Link
      href={href}
      className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-white/60 p-4 transition-colors hover:border-[var(--color-navy)]"
    >
      <p className="font-medium text-[var(--color-navy)]">{title}</p>
      <p className="mt-0.5 text-sm text-[var(--color-muted)]">{desc}</p>
    </Link>
  );
}
