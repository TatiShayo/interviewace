"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Textarea } from "@/components/ui";
import { submitOutcome } from "./actions";

export function OutcomeSurvey({ onDismiss }: { onDismiss: () => void }) {
  const [phase, setPhase] = useState<"ask" | "yes" | "no" | "done">("ask");
  const [testimonial, setTestimonial] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  async function answer(gotOffer: boolean) {
    setPhase(gotOffer ? "yes" : "no");
    const res = await submitOutcome(gotOffer);
    if (res.ok) setReferralCode(res.referralCode);
  }

  async function sendTestimonial() {
    await submitOutcome(true, testimonial);
    setPhase("done");
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
        <Card className="p-5">
          {phase === "ask" && (
            <>
              <p className="font-display text-lg font-semibold text-[var(--color-navy)]">Did you get the offer?</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">One question — helps us get you ready faster next time too.</p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => answer(true)} size="lg" className="flex-1">
                  Yes
                </Button>
                <Button onClick={() => answer(false)} variant="secondary" size="lg" className="flex-1">
                  Not this time
                </Button>
              </div>
              <button onClick={onDismiss} className="mt-3 text-xs text-[var(--color-muted)] hover:underline">
                Ask me later
              </button>
            </>
          )}

          {phase === "yes" && (
            <>
              <p className="font-display text-lg font-semibold text-[var(--color-score)]">Congratulations.</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Mind sharing a quick line about your experience? It helps other job seekers find us.
              </p>
              <Textarea
                rows={3}
                className="mt-3"
                value={testimonial}
                onChange={(e) => setTestimonial(e.target.value)}
                placeholder="e.g. I walked in knowing exactly what they'd ask…"
              />
              <Button onClick={sendTestimonial} size="lg" className="mt-3 w-full" disabled={!testimonial.trim()}>
                Share it
              </Button>
              <button onClick={() => setPhase("done")} className="mt-2 text-xs text-[var(--color-muted)] hover:underline">
                Skip
              </button>
              {referralCode && (
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  Your referral code <span className="tnum font-medium text-[var(--color-navy)]">{referralCode}</span> gives
                  a friend a free week too.
                </p>
              )}
            </>
          )}

          {phase === "no" && (
            <>
              <p className="font-display text-lg font-semibold text-[var(--color-navy)]">Next one, then.</p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Paste your next job posting and we&apos;ll build a fresh prep plan around it.
              </p>
              <Button size="lg" className="mt-3 w-full" onClick={() => (window.location.href = "/onboarding")}>
                Prep for the next one
              </Button>
              <button onClick={onDismiss} className="mt-2 text-xs text-[var(--color-muted)] hover:underline">
                Not now
              </button>
            </>
          )}

          {phase === "done" && <p className="text-sm text-[var(--color-navy)]">Thank you — good luck out there.</p>}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
