"use client";

/**
 * Interview-day mode (BUILD_PROMPT feature 14): when the countdown hits
 * day-of, the app home switches to a condensed flashcard review — flip
 * through the answer bank, calm and focused, no distractions.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, Button } from "@/components/ui";
import type { SavedAnswer } from "@/lib/types";

export function FlashcardMode({ company, answers }: { company: string; answers: SavedAnswer[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (answers.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="font-display text-xl font-semibold text-[var(--color-navy)]">Today&apos;s the day</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          You don&apos;t have saved answers yet — one calm pass through your{" "}
          <a href="/cheatsheet" className="font-medium text-[var(--color-navy)] hover:underline">
            cheat sheet
          </a>{" "}
          will do.
        </p>
      </Card>
    );
  }

  const card = answers[index];

  function go(delta: number) {
    setFlipped(false);
    setIndex((i) => Math.max(0, Math.min(answers.length - 1, i + delta)));
  }

  return (
    <div>
      <div className="mb-4 text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Interview day — {company}</p>
        <p className="mt-1 font-display text-xl font-semibold text-[var(--color-navy)]">Quick flashcard review</p>
        <p className="mt-0.5 text-sm text-[var(--color-muted)]">
          Card {index + 1} of {answers.length}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
        >
          <Card
            className="min-h-[220px] cursor-pointer p-6"
            onClick={() => setFlipped((f) => !f)}
            role="button"
            aria-label="Flip card"
          >
            {!flipped ? (
              <div className="flex h-full min-h-[172px] flex-col items-center justify-center text-center">
                <p className="font-display text-lg font-semibold leading-snug text-[var(--color-navy)]">{card.question}</p>
                <p className="mt-3 text-xs text-[var(--color-muted)]">Tap to reveal your answer</p>
              </div>
            ) : (
              <p className="text-sm leading-relaxed text-[var(--color-ink)]">{card.answer}</p>
            )}
          </Card>
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={() => go(-1)} disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </Button>
        <Button variant="secondary" onClick={() => go(1)} disabled={index === answers.length - 1}>
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
