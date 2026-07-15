/**
 * Interview-date lifecycle cron (BUILD_PROMPT feature 14/15): day-before pep
 * email, day-of good-luck email + cheat sheet attachment, day-after outcome
 * survey. Intended to run once daily (Vercel Cron or an external scheduler);
 * protected by CRON_SECRET so it can't be triggered by the public internet.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { db } from "@/lib/providers/db";
import { daysUntil } from "@/lib/utils";
import { sendDayBeforePepEmail, sendDayOfGoodLuckEmail, sendOutcomeSurveyEmail } from "@/lib/emails/lifecycle";
import { reportError } from "@/lib/providers/monitoring";

/** Constant-time bearer-token check so the secret can't be recovered by timing. */
function cronAuthorized(auth: string | null): boolean {
  if (!env.cronSecret || !auth) return false;
  const expected = Buffer.from(`Bearer ${env.cronSecret}`);
  const got = Buffer.from(auth);
  return expected.length === got.length && timingSafeEqual(expected, got);
}

export async function GET(req: Request) {
  if (!cronAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profiles = await db().listEntitledProfilesWithInterviewDate();
  let dayBefore = 0;
  let dayOf = 0;
  let dayAfter = 0;

  for (const p of profiles) {
    const days = daysUntil(p.interview_date);
    if (days === null) continue;
    try {
      const jobs = await db().listJobs(p.id);
      const job = jobs[0];
      if (!job) continue;

      if (days === 1) {
        await sendDayBeforePepEmail(p.email, job.company);
        dayBefore++;
      } else if (days === 0) {
        const pack = await db().getPrepPackByJob(job.id, p.id);
        if (pack) {
          const saved = await db().listSavedAnswers(p.id);
          await sendDayOfGoodLuckEmail(p.email, {
            company: job.company,
            role: job.title,
            companyIntel: pack.company_intel,
            questions: pack.questions,
            bestAnswers: saved,
          });
          dayOf++;
        }
      } else if (days === -1) {
        await sendOutcomeSurveyEmail(p.email, job.company);
        dayAfter++;
      }
    } catch (e) {
      reportError(e, { route: "cron/lifecycle", userId: p.id });
    }
  }

  return NextResponse.json({ ok: true, scanned: profiles.length, dayBefore, dayOf, dayAfter });
}
