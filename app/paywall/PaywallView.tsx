"use client";

/**
 * Paywall — blurred-teaser conversion booster (BUILD_PROMPT feature 12).
 * Shows the user's REAL prep plan as a letterpress document: 3 questions
 * readable, the rest locked with visible category labels (paper-stack motif,
 * not glassmorphism). Personalized headline, plan comparison, trial CTA,
 * placeholder social proof (clearly marked), restore link.
 */
import { useState } from "react";
import { Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Button, Card } from "@/components/ui";
import { startCheckout } from "./actions";
import type { PlanId } from "@/lib/types";

type Plan = { id: PlanId; label: string; display: string; trialDays: number };

export function PaywallView({
  headline,
  company,
  role,
  days,
  totalQuestions,
  unlocked,
  locked,
  plans,
}: {
  headline: string;
  company: string;
  role: string;
  days: number | null;
  totalQuestions: number;
  unlocked: { question: string; category: string }[];
  locked: { category: string }[];
  plans: Plan[];
}) {
  const [selected, setSelected] = useState<PlanId>("weekly");
  const chosen = plans.find((p) => p.id === selected)!;

  return (
    <main className="mx-auto max-w-xl px-5 py-8">
      {days !== null && days >= 0 && (
        <p className="mb-2 text-sm font-medium text-[var(--color-brass)]">
          {days === 0 ? "Interview today" : days === 1 ? "Interview tomorrow" : `${days} days until your interview`}
        </p>
      )}
      <h1 className="font-display text-[clamp(1.9rem,5vw,2.75rem)] font-semibold leading-tight text-[var(--color-navy)]">
        {headline}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-muted)]">
        We found <span className="tnum font-medium text-[var(--color-navy)]">{totalQuestions}</span> questions this
        panel is likely to ask for {role}. Here are the first three — start your trial to unlock the rest, practice out
        loud, and get scored.
      </p>

      {/* Letterpress prep-plan document */}
      <Card className="mt-7 bg-[var(--color-porcelain)] p-6">
        <div className="mb-4 border-b border-[var(--color-line)] pb-3">
          <p className="font-display text-lg text-[var(--color-navy)]">Prep Plan — {company}</p>
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Personalized · {totalQuestions} questions</p>
        </div>

        <ol className="space-y-3">
          {unlocked.map((q, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="rounded-[var(--radius)] border border-[var(--color-line)] bg-white p-3.5"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">{q.category}</span>
              <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{q.question}</p>
            </motion.li>
          ))}

          {locked.map((q, i) => (
            <li
              key={`l${i}`}
              className="locked-card flex items-center justify-between rounded-[var(--radius)] border border-[var(--color-line)] bg-white p-3.5"
            >
              <div className="relative z-0">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{q.category}</span>
                <p className="mt-1 h-3.5 w-48 max-w-full rounded bg-[var(--color-porcelain-2)]" />
              </div>
              <Lock className="relative z-10 h-4 w-4 text-[var(--color-muted)]" aria-hidden />
            </li>
          ))}
        </ol>
      </Card>

      {/* Plan selection */}
      <form action={startCheckout} className="mt-8">
        <input type="hidden" name="plan" value={selected} />
        <div className="space-y-2.5">
          {plans.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`flex w-full items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left transition-colors active:scale-[0.99] ${
                selected === p.id ? "border-[var(--color-navy)] bg-white ring-1 ring-[var(--color-navy)]" : "border-[var(--color-line)] bg-white/60"
              }`}
            >
              <div>
                <span className="font-medium text-[var(--color-navy)]">{p.label}</span>
                {p.trialDays > 0 && (
                  <span className="ml-2 rounded-full bg-[var(--color-score-bg)] px-2 py-0.5 text-xs font-medium text-[var(--color-score)]">
                    {p.trialDays}-day free trial
                  </span>
                )}
              </div>
              <span className="tnum text-sm text-[var(--color-navy)]">{p.display}</span>
            </button>
          ))}
        </div>

        <Button type="submit" size="lg" className="mt-5 w-full">
          {chosen.trialDays > 0 ? `Start ${chosen.trialDays}-day free trial` : `Get ${chosen.label}`}
        </Button>
        <p className="mt-3 text-center text-xs text-[var(--color-muted)]">
          {chosen.trialDays > 0
            ? `Free for ${chosen.trialDays} days, then ${chosen.display}. Cancel anytime.`
            : `${chosen.display}. Cancel anytime.`}
        </p>
      </form>

      {/* Social proof — PLACEHOLDER until real testimonials exist (PLAYBOOK 88) */}
      <div className="mt-8 rounded-[var(--radius)] border border-[var(--color-line)] bg-white/50 p-4">
        <p className="text-sm italic leading-relaxed text-[var(--color-muted)]">
          “I walked in knowing exactly what they’d ask. It was the calmest interview of my life.”
        </p>
        <p className="mt-1.5 text-xs text-[var(--color-muted)]">— Placeholder testimonial (replace with a real one before launch)</p>
      </div>

      <p className="mt-6 text-center text-sm text-[var(--color-muted)]">
        Already subscribed?{" "}
        <a href="/dashboard" className="font-medium text-[var(--color-navy)] hover:underline">
          Restore access
        </a>
      </p>
    </main>
  );
}
