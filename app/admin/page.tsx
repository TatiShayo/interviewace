import { redirect } from "next/navigation";
import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/providers/payments";
import { Card } from "@/components/ui";

/**
 * Internal metrics dashboard (BUILD_PROMPT cross-cutting requirement):
 * MRR, trials active, trial conversion %, mock sessions/day, AI cost/user.
 * Allowlist-gated by ADMIN_EMAILS (PLAYBOOK 2.8: admin surfaces are
 * allowlist-gated). Middleware already requires an auth cookie for /admin;
 * this re-checks the verified session + email server-side (never trusts
 * client state) — same defense-in-depth pattern as the paid-route gate.
 */
export default async function AdminPage() {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");
  if (!env.adminEmails.includes(session.email.toLowerCase())) redirect("/dashboard");

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [totalUsers, byStatus, usageToday, usage30d, sessions24h, outcomes] = await Promise.all([
    db().countProfiles(),
    db().countSubsByStatus(),
    db().sumUsageSince(todayIso),
    db().sumUsageSince(since30d),
    db().countSessionsSince(since24h),
    db().aggregateOutcomes(),
  ]);

  const trialing = byStatus.trialing ?? 0;
  const active = byStatus.active ?? 0;
  const pastDue = byStatus.past_due ?? 0;
  const paused = byStatus.paused ?? 0;
  const canceled = byStatus.canceled ?? 0;
  const everStarted = trialing + active + pastDue + paused + canceled;

  // Blended weekly-equivalent MRR estimate: no per-plan breakdown is stored
  // (only status counts, by design — avoids a full subscription-row admin
  // dump per PLAYBOOK 2.7 data minimization). Approximate using the mean of
  // the three server-configured plan prices as $/month.
  const monthlyEquivalents = [
    (6.99 * 52) / 12, // weekly -> monthly equivalent
    19.99,
    34.99 / 2, // 60-day plan -> ~monthly equivalent
  ];
  const avgMonthly = monthlyEquivalents.reduce((a, b) => a + b, 0) / monthlyEquivalents.length;
  const mrrEstimate = active * avgMonthly;

  const conversionPct = everStarted > 0 ? Math.round(((active + pastDue) / everStarted) * 1000) / 10 : 0;
  const arpu = active > 0 ? mrrEstimate / active : 0;
  const aiCostPerActiveUserMonth = active > 0 ? usage30d.cost_cents / 100 / active : 0;
  const aiCostPctOfArpu = arpu > 0 ? Math.round((aiCostPerActiveUserMonth / arpu) * 1000) / 10 : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Admin</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Signed in as {session.email}. Internal metrics only — no user PII shown.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric label="MRR (estimate)" value={`$${mrrEstimate.toFixed(0)}`} />
        <Metric label="Trials active" value={`${trialing}`} />
        <Metric label="Trial → paid" value={`${conversionPct}%`} />
        <Metric label="Mock sessions / 24h" value={`${sessions24h}`} />
        <Metric label="AI cost / active user" value={`$${aiCostPerActiveUserMonth.toFixed(2)}`} sub="last 30d" />
        <Metric
          label="AI cost % of ARPU"
          value={`${aiCostPctOfArpu}%`}
          sub={aiCostPctOfArpu > 15 ? "over 15% target" : "within target"}
          warn={aiCostPctOfArpu > 15}
        />
      </div>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Subscriptions by status</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatusPill label="Trialing" value={trialing} />
          <StatusPill label="Active" value={active} />
          <StatusPill label="Past due" value={pastDue} />
          <StatusPill label="Paused" value={paused} />
          <StatusPill label="Canceled" value={canceled} />
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Usage & outcomes</p>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Total signups" v={`${totalUsers}`} />
          <Row k="AI spend today" v={`$${(usageToday.cost_cents / 100).toFixed(2)} (${usageToday.requests} requests)`} />
          <Row k="AI spend, 30d" v={`$${(usage30d.cost_cents / 100).toFixed(2)}`} />
          <Row k="Outcome surveys answered" v={`${outcomes.total}`} />
          <Row
            k="Reported offer rate"
            v={outcomes.total > 0 ? `${Math.round((outcomes.offers / outcomes.total) * 100)}%` : "—"}
          />
        </dl>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Plan pricing (server config)</p>
        <dl className="mt-3 space-y-2 text-sm">
          {Object.entries(PLANS).map(([id, p]) => (
            <Row key={id} k={p.label} v={p.display} />
          ))}
        </dl>
      </Card>

      <p className="text-xs text-[var(--color-muted)]">
        Weekly ritual (PLAYBOOK 4.5): review this funnel, pick one experiment, one retention fix, one distribution push — ship all three.
      </p>
    </div>
  );
}

function Metric({ label, value, sub, warn }: { label: string; value: string; sub?: string; warn?: boolean }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
      <p className={`tnum font-display text-2xl font-semibold ${warn ? "text-[var(--color-danger)]" : "text-[var(--color-navy)]"}`}>
        {value}
      </p>
      {sub && <p className={`mt-0.5 text-xs ${warn ? "text-[var(--color-danger)]" : "text-[var(--color-muted)]"}`}>{sub}</p>}
    </Card>
  );
}

function StatusPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-line)] bg-white/60 px-3 py-2 text-center">
      <p className="tnum font-display text-xl font-semibold text-[var(--color-navy)]">{value}</p>
      <p className="text-xs text-[var(--color-muted)]">{label}</p>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--color-line)] pb-2 last:border-0 last:pb-0">
      <dt className="text-[var(--color-muted)]">{k}</dt>
      <dd className="tnum font-medium text-[var(--color-navy)]">{v}</dd>
    </div>
  );
}
