"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check } from "lucide-react";
import { Button, Card, Input, Label } from "@/components/ui";
import { generateNegotiationScript, roleplayReply } from "./actions";
import type { NegotiationOut } from "@/lib/ai/schemas";

type Turn = { speaker: "recruiter" | "candidate"; text: string; tip?: string };

export function NegotiationBuilder() {
  const [offerAmount, setOfferAmount] = useState("");
  const [market, setMarket] = useState("");
  const [location, setLocation] = useState("");
  const [competing, setCompeting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [script, setScript] = useState<NegotiationOut | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [roleplayOn, setRoleplayOn] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [reply, setReply] = useState("");
  const [rpLoading, setRpLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await generateNegotiationScript({ offerAmount, market, location, competing });
    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setScript(res.script);
  }

  function copy(text: string, key: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  async function startRoleplay() {
    setRoleplayOn(true);
    setTurns([]);
    setRpLoading(true);
    const res = await roleplayReply({ context: contextSummary(), history: [] });
    setRpLoading(false);
    if (res.ok) setTurns([{ speaker: "recruiter", text: res.reply.recruiter_reply, tip: res.reply.coaching_tip }]);
  }

  function contextSummary(): string {
    return `Offer: ${offerAmount || "unspecified"}. Market: ${market || "unspecified"}. Location: ${location || "unspecified"}. Competing offers: ${competing ? "yes" : "no"}.`;
  }

  async function sendReply() {
    if (!reply.trim()) return;
    const history = [...turns.map((t) => ({ speaker: t.speaker, text: t.text })), { speaker: "candidate" as const, text: reply }];
    setTurns((prev) => [...prev, { speaker: "candidate", text: reply }]);
    setReply("");
    setRpLoading(true);
    const res = await roleplayReply({ context: contextSummary(), history });
    setRpLoading(false);
    if (res.ok) setTurns((prev) => [...prev, { speaker: "recruiter", text: res.reply.recruiter_reply, tip: res.reply.coaching_tip }]);
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="offer">Offer on the table</Label>
            <Input id="offer" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} placeholder="e.g. $135k base + equity" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="market">Market / industry</Label>
            <Input id="market" value={market} onChange={(e) => setMarket(e.target.value)} placeholder="e.g. mid-size SaaS" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="loc">Location</Label>
            <Input id="loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Austin, TX" className="mt-1.5" />
          </div>
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-[var(--color-navy)]">
              <input type="checkbox" checked={competing} onChange={(e) => setCompeting(e.target.checked)} className="h-4 w-4" />
              I have a competing offer
            </label>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button onClick={generate} disabled={loading} size="lg" className="mt-4 w-full">
          {loading ? "Writing your script…" : "Generate negotiation script"}
        </Button>
      </Card>

      {script && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <ScriptBlock label="Opening script" text={script.opening_script} onCopy={() => copy(script.opening_script, "open")} copied={copied === "open"} />
          <ScriptBlock label="Counter script" text={script.counter_script} onCopy={() => copy(script.counter_script, "counter")} copied={copied === "counter"} />
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Phrases to use</p>
            <ul className="mt-2 space-y-1.5">
              {script.phrases.map((p, i) => (
                <li key={i} className="text-sm leading-relaxed text-[var(--color-ink)]">
                  &ldquo;{p}&rdquo;
                </li>
              ))}
            </ul>
          </Card>
          <ScriptBlock label="Email template" text={script.email_template} onCopy={() => copy(script.email_template, "email")} copied={copied === "email"} mono />
          <Card className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Walk-away guidance</p>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-ink)]">{script.walk_away_guidance}</p>
          </Card>

          {!roleplayOn ? (
            <Button variant="secondary" size="lg" className="w-full" onClick={startRoleplay}>
              Practice against a hardball recruiter
            </Button>
          ) : (
            <Card className="p-4">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Role-play</p>
              <div className="max-h-80 space-y-3 overflow-y-auto">
                {turns.map((t, i) => (
                  <div key={i} className={t.speaker === "candidate" ? "text-right" : ""}>
                    <p
                      className={`inline-block rounded-[var(--radius)] px-3.5 py-2.5 text-sm leading-relaxed ${
                        t.speaker === "candidate"
                          ? "bg-[var(--color-navy)] text-[var(--color-porcelain)]"
                          : "bg-[var(--color-porcelain-2)] text-[var(--color-ink)]"
                      }`}
                    >
                      {t.text}
                    </p>
                    {t.tip && <p className="mt-1 text-xs italic text-[var(--color-muted)]">{t.tip}</p>}
                  </div>
                ))}
                {rpLoading && <p className="text-xs text-[var(--color-muted)]">Recruiter is typing…</p>}
              </div>
              <div className="mt-3 flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Your response…"
                  onKeyDown={(e) => e.key === "Enter" && sendReply()}
                />
                <Button onClick={sendReply} disabled={rpLoading || !reply.trim()}>
                  Send
                </Button>
              </div>
            </Card>
          )}
        </motion.div>
      )}
    </div>
  );
}

function ScriptBlock({ label, text, onCopy, copied, mono }: { label: string; text: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
        <button onClick={onCopy} className="flex items-center gap-1 text-xs font-medium text-[var(--color-navy)] hover:underline">
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
      <p className={`mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--color-ink)] ${mono ? "font-mono text-[13px]" : ""}`}>{text}</p>
    </Card>
  );
}
