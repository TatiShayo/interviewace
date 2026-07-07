"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button, Card, Textarea } from "@/components/ui";
import { generateCoverLetter, generateFollowupEmail } from "./actions";

const TONES = ["confident", "warm", "concise", "enthusiastic"];

export function LettersView() {
  const [tab, setTab] = useState<"cover" | "followup">("cover");
  const [tone, setTone] = useState("confident");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subject: string; body: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    const res = tab === "cover" ? await generateCoverLetter(tone, extra) : await generateFollowupEmail(tone, extra);
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if ("letter" in res) setResult({ subject: res.letter.subject_line, body: res.letter.letter });
    else setResult({ subject: res.email.subject_line, body: res.email.email });
  }

  function copy() {
    if (!result) return;
    navigator.clipboard?.writeText(`Subject: ${result.subject}\n\n${result.body}`).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {(["cover", "followup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setResult(null);
            }}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              tab === t
                ? "border-[var(--color-navy)] bg-[var(--color-navy)] text-[var(--color-porcelain)]"
                : "border-[var(--color-line)] bg-white/60 text-[var(--color-muted)]"
            }`}
          >
            {t === "cover" ? "Cover letter" : "Follow-up email"}
          </button>
        ))}
      </div>

      <Card className="p-4">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Tone</p>
        <div className="flex flex-wrap gap-1.5">
          {TONES.map((t) => (
            <button
              key={t}
              onClick={() => setTone(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
                tone === t ? "border-[var(--color-navy)] bg-white ring-1 ring-[var(--color-navy)]" : "border-[var(--color-line)] bg-white/60 text-[var(--color-muted)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <Textarea
          className="mt-3"
          rows={3}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder={tab === "cover" ? "Anything else to weave in? (optional)" : "What stood out from the interview? (optional)"}
        />
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button onClick={generate} disabled={loading} size="lg" className="mt-3 w-full">
          {loading ? "Writing…" : `Generate ${tab === "cover" ? "cover letter" : "follow-up email"}`}
        </Button>
      </Card>

      {result && (
        <Card className="mt-4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{result.subject}</p>
            <button onClick={copy} className="flex items-center gap-1 text-xs font-medium text-[var(--color-navy)] hover:underline">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden /> Copy
                </>
              )}
            </button>
          </div>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)]">{result.body}</p>
        </Card>
      )}
    </div>
  );
}
