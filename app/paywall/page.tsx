import { redirect } from "next/navigation";
import { requireUser, getSubStatus } from "@/lib/entitlement";
import { isEntitled } from "@/lib/types";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";
import { formatDateHuman, daysUntil } from "@/lib/utils";
import { PLANS } from "@/lib/providers/payments";
import { PaywallView } from "./PaywallView";

const CATEGORY_LABEL: Record<string, string> = {
  behavioral: "Behavioral",
  role_specific: "Role-specific",
  company_culture: "Company & culture",
  curveball: "Curveball",
};

export default async function PaywallPage() {
  const session = await requireUser();
  if (isEntitled(await getSubStatus(session.userId))) redirect("/dashboard");

  const profile = await db().getProfile(session.userId);
  const jobs = await db().listJobs(session.userId);
  const latestJob = jobs[0] ?? null;
  const pack = latestJob ? await db().getPrepPackByJob(latestJob.id, session.userId) : null;

  track("paywall_viewed", session.userId, { has_pack: Boolean(pack) });

  const company = latestJob?.company ?? "your interview";
  const dateHuman = formatDateHuman(profile?.interview_date);
  const days = daysUntil(profile?.interview_date);

  const headline = dateHuman
    ? `Be ready for ${company} on ${dateHuman}`
    : `Your ${company} prep plan is ready`;

  const unlocked = (pack?.questions ?? []).slice(0, 3).map((q) => ({
    question: q.question,
    category: CATEGORY_LABEL[q.category] ?? q.category,
  }));
  const locked = (pack?.questions ?? []).slice(3).map((q) => ({
    category: CATEGORY_LABEL[q.category] ?? q.category,
  }));

  const plans = (["weekly", "monthly", "landjob"] as const).map((id) => ({
    id,
    label: PLANS[id].label,
    display: PLANS[id].display,
    trialDays: PLANS[id].trialDays,
  }));

  return (
    <PaywallView
      headline={headline}
      company={company}
      role={profile?.target_role ?? latestJob?.title ?? "this role"}
      days={days}
      totalQuestions={pack?.questions.length ?? 15}
      unlocked={unlocked}
      locked={locked}
      plans={plans}
    />
  );
}
