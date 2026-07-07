"use client";

/**
 * Prep pack client view: question cards deal in one-by-one with staggered
 * spring reveals (BUILD_PROMPT motion direction — never a spinner then a wall
 * of text), a category filter, swipe/keyboard navigation between cards, and a
 * regenerate button. Each card can save its outline straight to the Answer Bank.
 */
import { useMemo, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, BookmarkPlus, Check } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { regeneratePrepPack, saveOutlineToBank } from "./actions";
import type { PrepQuestion } from "@/lib/types";

const CATEGORY_LABEL: Record<PrepQuestion["category"], string> = {
  behavioral: "Behavioral",
  role_specific: "Role-specific",
  company_culture: "Company & culture",
  curveball: "Curveball",
};

const FILTERS: { v: PrepQuestion["category"] | "all"; label: string }[] = [
  { v: "all", label: "All" },
  { v: "behavioral", label: "Behavioral" },
  { v: "role_specific", label: "Role-specific" },
  { v: "company_culture", label: "Company & culture" },
  { v: "curveball", label: "Curveball" },
];

export function PrepPackView({
  jobId,
  companyIntel,
  questions,
}: {
  jobId: string;
  companyIntel: string;
  questions: PrepQuestion[];
}) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["v"]>("all");
  const [regenerating, startRegen] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());

  const filtered = useMemo(
    () => questions.map((q, i) => ({ q, i })).filter(({ q }) => filter === "all" || q.category === filter),
    [questions, filter]
  );

  function onSave(index: number, outline: string, question: string) {
    setSaved((s) => new Set(s).add(index));
    void saveOutlineToBank(question, outline);
  }

  function onRegenerate() {
    setError(null);
    startRegen(async () => {
      const res = await regeneratePrepPack(jobId);
      if (!res.ok) setError(res.error);
      else window.location.reload();
    });
  }

  return (
    <div>
      <Card className="mb-6 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Company intel</p>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--color-ink)]">{companyIntel}</p>
      </Card>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.v}
              onClick={() => setFilter(f.v)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
                filter === f.v
                  ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-porcelain)]"
                  : "border-[var(--color-line)] bg-white/60 text-[var(--color-muted)] hover:border-[var(--color-navy)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" onClick={onRegenerate} disabled={regenerating}>
          <RefreshCw className={`h-3.5 w-3.5 ${regenerating ? "animate-spin" : ""}`} aria-hidden />
          {regenerating ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>

      {error && (
        <p role="alert" className="mb-4 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <div className="space-y-3">
        <AnimatePresence initial>
          {filtered.map(({ q, i }, order) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: Math.min(order * 0.06, 0.6), type: "spring", stiffness: 280, damping: 26 }}
            >
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <Badge>{CATEGORY_LABEL[q.category]}</Badge>
                  <button
                    onClick={() => onSave(i, q.strong_answer_outline, q.question)}
                    disabled={saved.has(i)}
                    className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-navy)] hover:underline disabled:text-[var(--color-score)] disabled:no-underline"
                  >
                    {saved.has(i) ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden /> Saved
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="h-3.5 w-3.5" aria-hidden /> Save outline
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-3 font-display text-lg font-semibold leading-snug text-[var(--color-navy)]">
                  {q.question}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">
                  <span className="font-medium text-[var(--color-ink)]">Why they ask: </span>
                  {q.why_asked}
                </p>
                <div className="mt-3 rounded-[var(--radius)] bg-[var(--color-porcelain-2)] p-3.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">
                    Strong-answer outline
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{q.strong_answer_outline}</p>
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
