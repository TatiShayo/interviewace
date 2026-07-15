"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Search, Trash2 } from "lucide-react";
import { Card, Input, Badge } from "@/components/ui";
import { deleteSavedAnswerAction } from "./actions";
import type { SavedAnswer } from "@/lib/types";

const PAGE_SIZE = 20;

export function AnswerBankView({ answers }: { answers: SavedAnswer[] }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState(answers);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((a) => a.question.toLowerCase().includes(q) || a.answer.toLowerCase().includes(q));
  }, [items, query]);

  // Cap the rendered list so a large bank doesn't mount hundreds of nodes at
  // once; "Show more" reveals the next page. Reset paging when the query changes.
  const page = filtered.slice(0, visible);

  async function remove(id: string) {
    setItems((prev) => prev.filter((a) => a.id !== id));
    await deleteSavedAnswerAction(id);
  }

  return (
    <div>
      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-muted)]" aria-hidden />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setVisible(PAGE_SIZE);
          }}
          placeholder="Search your answers…"
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {page.map((a, i) => (
          <motion.div key={a.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}>
            <Card className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>{a.source === "star" ? "STAR" : "Mock"}</Badge>
                </div>
                <button
                  onClick={() => remove(a.id)}
                  aria-label="Delete answer"
                  className="rounded-[var(--radius-sm)] p-1 text-[var(--color-muted)] hover:bg-[var(--color-porcelain-2)] hover:text-[var(--color-danger)]"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </button>
              </div>
              <p className="mt-2 font-medium text-[var(--color-navy)]">{a.question}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{a.answer}</p>
            </Card>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-[var(--color-muted)]">No answers match &quot;{query}&quot;.</p>
        )}
      </div>

      {visible < filtered.length && (
        <div className="mt-5 text-center">
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            className="rounded-[var(--radius-sm)] border border-[var(--color-line)] px-4 py-2 text-sm font-medium text-[var(--color-navy)] hover:bg-[var(--color-porcelain-2)]"
          >
            Show more ({filtered.length - visible} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
