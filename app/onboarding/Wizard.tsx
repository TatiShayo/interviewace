"use client";

/**
 * 6-step onboarding wizard — the conversion engine (BUILD_PROMPT feature 1).
 * role → experience → interview date (urgency) → biggest fear → interview type
 * → paste posting (+optional resume) → animated "Building your prep plan…" that
 * generates a REAL pack → routes to the paywall.
 * Staggered spring reveals, no spinners; press-to-0.97 (PLAYBOOK 1.4).
 */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Textarea, Input, Label } from "@/components/ui";
import { saveOnboardingStep, buildPrepPlan } from "./actions";
import { daysUntil } from "@/lib/utils";

type Data = {
  target_role: string;
  experience_level: string;
  interview_date: string;
  biggest_fear: string;
  interview_type: string;
};

const EXPERIENCE = [
  { v: "entry", label: "Entry level", hint: "0–2 years" },
  { v: "mid", label: "Mid level", hint: "3–6 years" },
  { v: "senior", label: "Senior", hint: "7+ years" },
  { v: "exec", label: "Leadership / exec", hint: "Director and above" },
];
const FEARS = [
  { v: "freezing_up", label: "Freezing up under pressure" },
  { v: "behavioral", label: "Behavioral / “tell me about a time” questions" },
  { v: "technical", label: "Technical or role-specific questions" },
  { v: "salary_talk", label: "Talking about salary" },
];
const TYPES = [
  { v: "phone_screen", label: "Phone screen", hint: "Recruiter or hiring manager" },
  { v: "behavioral", label: "Behavioral round", hint: "STAR-heavy" },
  { v: "technical", label: "Technical round", hint: "Role-specific depth" },
  { v: "panel", label: "Panel", hint: "Multiple interviewers" },
];

const TOTAL = 6;

export function OnboardingWizard({ initial }: { initial: Data }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Data>(initial);
  const [posting, setPosting] = useState("");
  const [resume, setResume] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (patch: Partial<Data>) => setData((d) => ({ ...d, ...patch }));

  function next(save: Parameters<typeof saveOnboardingStep>[0]) {
    setError(null);
    startTransition(async () => {
      const res = await saveOnboardingStep(save);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep((s) => Math.min(s + 1, TOTAL - 1));
    });
  }

  const days = daysUntil(data.interview_date);

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-5 py-8">
      <Progress step={step} />
      <div className="flex flex-1 flex-col justify-center py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
          >
            {step === 0 && (
              <StepShell title="What role are you interviewing for?" hint="Be specific — “Senior Product Manager”, not just “PM”.">
                <Input
                  autoFocus
                  value={data.target_role}
                  onChange={(e) => set({ target_role: e.target.value })}
                  placeholder="e.g. Senior Product Manager"
                  onKeyDown={(e) => e.key === "Enter" && data.target_role.trim() && next({ step: 1, target_role: data.target_role })}
                />
                <Nav
                  onNext={() => next({ step: 1, target_role: data.target_role })}
                  disabled={!data.target_role.trim() || pending}
                />
              </StepShell>
            )}

            {step === 1 && (
              <StepShell title="How much experience do you have?" hint="This calibrates the depth of your questions.">
                <Choices
                  options={EXPERIENCE}
                  value={data.experience_level}
                  onSelect={(v) => {
                    set({ experience_level: v });
                    next({ step: 2, experience_level: v });
                  }}
                />
              </StepShell>
            )}

            {step === 2 && (
              <StepShell title="When is your interview?" hint="We’ll build your plan around the time you have.">
                <Input
                  type="date"
                  autoFocus
                  value={data.interview_date}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => set({ interview_date: e.target.value })}
                />
                {days !== null && days >= 0 && (
                  <p className="mt-3 text-sm text-[var(--color-brass)]">
                    {days === 0 ? "That’s today — let’s move fast." : days === 1 ? "Tomorrow. We’ll get you ready tonight." : `${days} days out. Plenty of time to get sharp.`}
                  </p>
                )}
                <Nav onNext={() => next({ step: 3, interview_date: data.interview_date })} disabled={pending} skipLabel="I don’t know yet" onSkip={() => next({ step: 3 })} />
              </StepShell>
            )}

            {step === 3 && (
              <StepShell title="What worries you most?" hint="We’ll weight your practice toward it.">
                <Choices
                  options={FEARS}
                  value={data.biggest_fear}
                  onSelect={(v) => {
                    set({ biggest_fear: v });
                    next({ step: 4, biggest_fear: v });
                  }}
                />
              </StepShell>
            )}

            {step === 4 && (
              <StepShell title="What kind of interview is it?" hint="This changes the mix of questions we generate.">
                <Choices
                  options={TYPES}
                  value={data.interview_type}
                  onSelect={(v) => {
                    set({ interview_type: v });
                    next({ step: 5, interview_type: v });
                  }}
                />
              </StepShell>
            )}

            {step === 5 && (
              <PostingStep
                posting={posting}
                setPosting={setPosting}
                resume={resume}
                setResume={setResume}
                error={error}
                onBuild={() => {
                  setError(null);
                  startTransition(async () => {
                    const res = await buildPrepPlan({ posting_text: posting, resume_text: resume });
                    if (!res.ok) {
                      setError(res.error);
                      return;
                    }
                    router.push("/paywall");
                  });
                }}
                pending={pending}
              />
            )}
          </motion.div>
        </AnimatePresence>
        {error && step !== 5 && (
          <p role="alert" className="mt-4 text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }).map((_, i) => (
        <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
          <motion.div
            className="h-full bg-[var(--color-navy)]"
            initial={false}
            animate={{ width: i <= step ? "100%" : "0%" }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      ))}
    </div>
  );
}

function StepShell({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold leading-tight text-[var(--color-navy)]">{title}</h1>
      {hint && <p className="mt-2 mb-6 text-sm leading-relaxed text-[var(--color-muted)]">{hint}</p>}
      <div>{children}</div>
    </div>
  );
}

function Choices({
  options,
  value,
  onSelect,
}: {
  options: { v: string; label: string; hint?: string }[];
  value: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="space-y-2.5">
      {options.map((o, i) => (
        <motion.button
          key={o.v}
          type="button"
          onClick={() => onSelect(o.v)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
          whileTap={{ scale: 0.98 }}
          className={`flex w-full items-center justify-between rounded-[var(--radius)] border px-4 py-3.5 text-left transition-colors ${
            value === o.v
              ? "border-[var(--color-navy)] bg-white"
              : "border-[var(--color-line)] bg-white/60 hover:border-[var(--color-navy)]"
          }`}
        >
          <span className="font-medium text-[var(--color-navy)]">{o.label}</span>
          {o.hint && <span className="text-sm text-[var(--color-muted)]">{o.hint}</span>}
        </motion.button>
      ))}
    </div>
  );
}

function Nav({
  onNext,
  disabled,
  skipLabel,
  onSkip,
}: {
  onNext: () => void;
  disabled?: boolean;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="mt-6 flex items-center gap-3">
      <Button onClick={onNext} disabled={disabled} size="lg" className="flex-1">
        Continue
      </Button>
      {skipLabel && onSkip && (
        <Button onClick={onSkip} variant="ghost" size="lg">
          {skipLabel}
        </Button>
      )}
    </div>
  );
}

function PostingStep({
  posting,
  setPosting,
  resume,
  setResume,
  error,
  onBuild,
  pending,
}: {
  posting: string;
  setPosting: (v: string) => void;
  resume: string;
  setResume: (v: string) => void;
  error: string | null;
  onBuild: () => void;
  pending: boolean;
}) {
  if (pending) return <BuildingScreen />;
  return (
    <StepShell title="Paste the job posting" hint="We’ll read it and find the questions this panel is most likely to ask. Your resume is optional but makes every answer sharper.">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="posting">Job posting</Label>
          <PostingUrlFetch onFetched={setPosting} />
          <Textarea
            id="posting"
            rows={7}
            value={posting}
            onChange={(e) => setPosting(e.target.value)}
            placeholder="…or paste the full job description here"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="resume">Your resume (optional)</Label>
          <ResumeUpload onExtracted={setResume} />
          <Textarea
            id="resume"
            rows={5}
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            placeholder="…or paste your resume text so answers reference your real experience"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}
        <Button onClick={onBuild} disabled={posting.trim().length < 40} size="lg" className="w-full">
          Build my prep plan
        </Button>
        <p className="text-center text-xs text-[var(--color-muted)]">
          Your resume is private, never used to train models, and deletable anytime.
        </p>
      </div>
    </StepShell>
  );
}

/** Paste-a-link alternative to pasting posting text (BUILD_PROMPT feature 11). */
function PostingUrlFetch({ onFetched }: { onFetched: (text: string) => void }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchUrl() {
    if (!url.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/onboarding/parse-posting-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setErr(data.error ?? "Couldn't read that page — paste the posting below instead.");
        return;
      }
      onFetched(data.text);
    } catch {
      setErr("Couldn't reach that page — paste the posting below instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-2">
      <div className="flex gap-2">
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Or paste a link to the posting…"
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={fetchUrl} disabled={busy || !url.trim()}>
          {busy ? "Reading…" : "Fetch"}
        </Button>
      </div>
      {err && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{err}</p>}
    </div>
  );
}

/** PDF/DOCX resume upload alternative to pasting text (BUILD_PROMPT feature 11). */
function ResumeUpload({ onExtracted }: { onExtracted: (text: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;
    setBusy(true);
    setErr(null);
    setFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/onboarding/parse-resume", { method: "POST", body: form });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setErr(data.error ?? "Couldn't read that file — paste your resume below instead.");
        return;
      }
      onExtracted(data.text);
    } catch {
      setErr("Upload failed — paste your resume below instead.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mb-2">
      <label className="flex w-full cursor-pointer items-center justify-between rounded-[var(--radius)] border border-dashed border-[var(--color-line)] bg-white/60 px-3.5 py-2.5 text-sm text-[var(--color-muted)] transition-colors hover:border-[var(--color-navy)]">
        <span>{busy ? "Reading…" : fileName ? `Uploaded: ${fileName}` : "Upload a PDF or DOCX résumé"}</span>
        <input type="file" accept=".pdf,.docx" className="hidden" onChange={onChange} disabled={busy} />
      </label>
      {err && <p className="mt-1.5 text-xs text-[var(--color-danger)]">{err}</p>}
    </div>
  );
}

const BUILD_STAGES = [
  "Reading the job posting…",
  "Identifying what this panel really tests…",
  "Matching questions to your experience…",
  "Writing strong-answer outlines…",
  "Finalizing your prep plan…",
];

function BuildingScreen() {
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStage((s) => Math.min(s + 1, BUILD_STAGES.length - 1)), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="py-6 text-center">
      <motion.div
        className="mx-auto mb-8 h-16 w-16 rounded-full border-2 border-[var(--color-brass)]"
        animate={{ scale: [1, 1.12, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
      />
      <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Building your prep plan</h1>
      <div className="mt-6 space-y-2">
        {BUILD_STAGES.map((s, i) => (
          <motion.p
            key={s}
            className="text-sm"
            animate={{ opacity: i <= stage ? 1 : 0.3, color: i <= stage ? "var(--color-navy)" : "var(--color-muted)" }}
          >
            {i < stage ? "✓ " : ""}
            {s}
          </motion.p>
        ))}
      </div>
    </div>
  );
}
