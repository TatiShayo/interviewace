/**
 * Lifecycle email senders (PLAYBOOK 3.2 matrix + BUILD_PROMPT features 14/15).
 * Each function is a pure "send this one email" call; the cron endpoint
 * (app/api/cron/lifecycle/route.ts) decides WHO to send to and WHEN, keeping
 * the trigger logic and delivery logic separately testable.
 */
import "server-only";
import { sendEmail } from "@/lib/providers/email";
import { emailShell } from "@/lib/emails/template";
import { env } from "@/lib/env";
import { renderCheatSheetPdf } from "@/lib/cheatsheet";
import type { PrepPack, SavedAnswer } from "@/lib/types";

export async function sendPackReadyEmail(to: string, company: string, role: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Your ${company} prep pack is ready`,
    html: emailShell({
      preheader: `Your ${role} questions are ready to review.`,
      heading: `Your ${company} prep plan is ready`,
      bodyHtml: `<p>We've built your questions for the <strong>${role}</strong> role — the ones this panel is most likely to ask, with strong-answer outlines pulled from your own resume.</p><p>Your cheat sheet is included once you're ready to print or share it.</p>`,
      ctaLabel: "Review your prep pack",
      ctaUrl: `${env.appUrl}/prep`,
    }),
  });
}

export async function sendWeakestQuestionNudge(to: string, question: string): Promise<void> {
  await sendEmail({
    to,
    subject: "Practice your weakest question today",
    html: emailShell({
      preheader: "One question, five minutes, real improvement.",
      heading: "Let's sharpen one answer",
      bodyHtml: `<p>Your last mock scored lowest on:</p><p style="font-style:italic;color:#0F2A43;">&ldquo;${question}&rdquo;</p><p>Five minutes of practice on just this one question moves your readiness score more than anything else you could do today.</p>`,
      ctaLabel: "Practice it now",
      ctaUrl: `${env.appUrl}/mock`,
    }),
  });
}

export async function sendReadinessProgressEmail(to: string, readiness: number, sessions: number): Promise<void> {
  await sendEmail({
    to,
    subject: `Your readiness score: ${readiness}/100`,
    html: emailShell({
      preheader: `${sessions} practice sessions completed so far.`,
      heading: `You're at ${readiness}/100`,
      bodyHtml: `<p>You've completed <strong>${sessions}</strong> practice session${sessions === 1 ? "" : "s"}. Every rep moves the number — keep going before your interview.</p>`,
      ctaLabel: "See your dashboard",
      ctaUrl: `${env.appUrl}/dashboard`,
    }),
  });
}

export async function sendDayBeforePepEmail(to: string, company: string): Promise<void> {
  await sendEmail({
    to,
    subject: `Tomorrow's the day — ${company}`,
    html: emailShell({
      preheader: "One calm pass through your cheat sheet tonight.",
      heading: "You've got this",
      bodyHtml: `<p>Your interview at <strong>${company}</strong> is tomorrow. Do one calm pass through your cheat sheet tonight, then stop — you've done the work.</p>`,
      ctaLabel: "Open your cheat sheet",
      ctaUrl: `${env.appUrl}/cheatsheet`,
    }),
  });
}

export async function sendDayOfGoodLuckEmail(
  to: string,
  args: { company: string; role: string; companyIntel: string; questions: PrepPack["questions"]; bestAnswers: SavedAnswer[] }
): Promise<void> {
  const pdf = await renderCheatSheetPdf({
    company: args.company,
    role: args.role,
    companyIntel: args.companyIntel,
    questions: args.questions,
    bestAnswers: args.bestAnswers,
  });
  await sendEmail({
    to,
    subject: `Good luck today — ${args.company}`,
    html: emailShell({
      preheader: "Your cheat sheet is attached.",
      heading: "Good luck today",
      bodyHtml: `<p>Today's the day. Your cheat sheet is attached — one calm read before you walk in, then trust your prep.</p>`,
      ctaLabel: "Open flashcard mode",
      ctaUrl: `${env.appUrl}/dashboard`,
    }),
    attachments: [{ filename: `interviewace-cheatsheet-${args.company.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf`, content: pdf.toString("base64") }],
  });
}

export async function sendOutcomeSurveyEmail(to: string, company: string): Promise<void> {
  await sendEmail({
    to,
    subject: `How did it go at ${company}?`,
    html: emailShell({
      preheader: "One question — 10 seconds.",
      heading: "How did it go?",
      bodyHtml: `<p>Your interview at <strong>${company}</strong> was yesterday. One question — how did it go?</p>`,
      ctaLabel: "Tell us",
      ctaUrl: `${env.appUrl}/dashboard?outcome=1`,
    }),
  });
}

export async function sendWinBackEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: "50% off your next month — come back",
    html: emailShell({
      preheader: "Your answer bank is still here.",
      heading: "Your prep is waiting",
      bodyHtml: `<p>Your answer bank is exactly as you left it. Come back for 50% off your next month — good for one more search.</p>`,
      ctaLabel: "Reactivate for 50% off",
      ctaUrl: `${env.appUrl}/paywall?winback=1`,
    }),
  });
}
