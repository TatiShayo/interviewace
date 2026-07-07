"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { Button, Card, Label, Textarea } from "@/components/ui";
import { suggestStarSection, saveStarAnswer } from "./actions";

const SECTIONS = [
  { key: "situation" as const, label: "Situation", hint: "What was the context?" },
  { key: "task" as const, label: "Task", hint: "What were you responsible for?" },
  { key: "action" as const, label: "Action", hint: "What did you specifically do?" },
  { key: "result" as const, label: "Result", hint: "What happened, ideally with a number?" },
];

export function StarBuilder({ questions }: { questions: string[] }) {
  const [question, setQuestion] = useState(questions[0] ?? "");
  const [draft, setDraft] = useState({ situation: "", task: "", action: "", result: "" });
  const [loadingSection, setLoadingSection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function set(section: keyof typeof draft, value: string) {
    setDraft((d) => ({ ...d, [section]: value }));
    setSaved(false);
  }

  async function suggest(section: (typeof SECTIONS)[number]["key"]) {
    setLoadingSection(section);
    setError(null);
    const res = await suggestStarSection({ question, section, draftSoFar: draft[section] });
    setLoadingSection(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    set(section, res.suggestion);
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await saveStarAnswer(question, draft.situation, draft.task, draft.action, draft.result);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div>
      <Card className="mb-5 p-4">
        <Label htmlFor="q">Question</Label>
        <select
          id="q"
          value={question}
          onChange={(e) => {
            setQuestion(e.target.value);
            setDraft({ situation: "", task: "", action: "", result: "" });
            setSaved(false);
          }}
          className="mt-1.5 h-11 w-full rounded-[var(--radius)] border border-[var(--color-line)] bg-white px-3.5 text-[15px] text-[var(--color-ink)] focus:border-[var(--color-navy)] focus-visible:outline-none"
        >
          {questions.map((q, i) => (
            <option key={i} value={q}>
              {q}
            </option>
          ))}
        </select>
      </Card>

      <div className="space-y-4">
        {SECTIONS.map((s, i) => (
          <motion.div key={s.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor={s.key}>{s.label}</Label>
                  <p className="text-xs text-[var(--color-muted)]">{s.hint}</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => suggest(s.key)}
                  disabled={loadingSection === s.key}
                >
                  <Sparkles className="h-3.5 w-3.5" aria-hidden />
                  {loadingSection === s.key ? "Thinking…" : "AI suggestion"}
                </Button>
              </div>
              <Textarea
                id={s.key}
                rows={3}
                className="mt-2"
                value={draft[s.key]}
                onChange={(e) => set(s.key, e.target.value)}
                placeholder={`Describe the ${s.label.toLowerCase()}…`}
              />
            </Card>
          </motion.div>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      <Button onClick={save} disabled={pending} size="lg" className="mt-5 w-full">
        {saved ? (
          <>
            <Check className="h-4 w-4" aria-hidden /> Saved to answer bank
          </>
        ) : (
          "Save to answer bank"
        )}
      </Button>
    </div>
  );
}
