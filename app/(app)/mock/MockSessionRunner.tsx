"use client";

/**
 * Orchestrates the 5-question voice mock: start session -> AI interviewer
 * "asks" (TTS + text) -> orb breathes -> user records/types -> submit ->
 * scores + rewrite reveal -> next question -> radar summary. Skeletons
 * everywhere, no bare spinners (PLAYBOOK 1.4).
 */
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Card, Badge, Skeleton } from "@/components/ui";
import { InterviewerOrb } from "./InterviewerOrb";
import { Recorder } from "./Recorder";
import { ScoreRadar } from "./ScoreRadar";
import { saveMockAnswerToBank } from "./actions";
import type { AnswerScores } from "@/lib/types";

type Question = { question: string; category: string };
type ScoredAnswer = {
  question: string;
  transcript: string;
  scores: AnswerScores;
  feedback: string;
  improved_answer: string;
};

type Phase = "start" | "loading" | "asking" | "answering" | "scoring" | "reveal" | "summary" | "error";

export function MockSessionRunner({ jobId }: { jobId: string }) {
  const [phase, setPhase] = useState<Phase>("start");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<ScoredAnswer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function start() {
    setPhase("loading");
    setError(null);
    try {
      const res = await fetch("/api/mock/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mode: "voice" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't start a session.");
        setPhase("error");
        return;
      }
      setSessionId(data.sessionId);
      setCompany(data.company);
      setRole(data.role);
      setQuestions(data.questions);
      setRemaining(data.remainingToday);
      setIndex(0);
      setAnswers([]);
      setPhase("asking");
      playQuestion(data.questions[0].question);
    } catch {
      setError("Couldn't start a session. Check your connection and try again.");
      setPhase("error");
    }
  }

  async function playQuestion(text: string) {
    try {
      const res = await fetch("/api/mock/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          void audioRef.current.play().catch(() => {});
        }
      }
    } catch {
      // Silent fallback: the question text is always shown regardless of audio.
    } finally {
      setTimeout(() => setPhase("answering"), 600);
    }
  }

  async function submitAnswer(payload: { audio?: Blob; text?: string }) {
    if (!sessionId) return;
    setPhase("scoring");
    setError(null);
    try {
      let res: Response;
      const q = questions[index].question;
      if (payload.audio) {
        const form = new FormData();
        form.append("sessionId", sessionId);
        form.append("question", q);
        form.append("audio", payload.audio, "answer.webm");
        res = await fetch("/api/mock/answer", { method: "POST", body: form });
      } else {
        res = await fetch("/api/mock/answer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, question: q, transcript: payload.text }),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Scoring failed. Please try again.");
        setPhase("answering");
        return;
      }
      const a = data.answer;
      setAnswers((prev) => [
        ...prev,
        { question: q, transcript: a.transcript, scores: a.scores, feedback: a.feedback, improved_answer: a.improved_answer },
      ]);
      setPhase("reveal");
    } catch {
      setError("Scoring failed. Please try again.");
      setPhase("answering");
    }
  }

  function next() {
    const n = index + 1;
    if (n >= questions.length) {
      if (sessionId) void fetch("/api/mock/session/" + sessionId, { method: "PATCH" }).catch(() => {});
      setPhase("summary");
      return;
    }
    setIndex(n);
    setPhase("asking");
    playQuestion(questions[n].question);
  }

  function saveToBank(i: number) {
    const a = answers[i];
    setSavedIdx((s) => new Set(s).add(i));
    void saveMockAnswerToBank(a.question, a.improved_answer);
  }

  if (phase === "start") {
    return (
      <Card className="p-8 text-center">
        <InterviewerOrb state="thinking" />
        <h2 className="mt-5 font-display text-xl font-semibold text-[var(--color-navy)]">Ready when you are</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
          Five questions from your {role || "prep"} pack for {company || "this role"}. Answer out loud — you'll get
          scored on structure, relevance, confidence, and conciseness.
        </p>
        <Button onClick={start} size="lg" className="mt-6">
          Start mock interview
        </Button>
      </Card>
    );
  }

  if (phase === "loading") {
    return (
      <Card className="p-8">
        <Skeleton className="mx-auto h-24 w-24 rounded-full" />
        <Skeleton className="mx-auto mt-5 h-5 w-48" />
        <Skeleton className="mx-auto mt-2 h-4 w-64" />
      </Card>
    );
  }

  if (phase === "error") {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-[var(--color-danger)]">{error}</p>
        <Button onClick={start} className="mt-4">
          Try again
        </Button>
      </Card>
    );
  }

  if (phase === "summary") {
    const dims: (keyof Omit<AnswerScores, "justifications">)[] = ["structure", "relevance", "confidence", "conciseness"];
    const averages: Record<string, number> = {};
    for (const d of dims) {
      averages[d] = Math.round((answers.reduce((sum, a) => sum + a.scores[d], 0) / answers.length) * 10) / 10;
    }
    const overall = Math.round((dims.reduce((sum, d) => sum + averages[d], 0) / dims.length) * 10) / 10;

    return (
      <div className="space-y-5">
        <ScoreRadar averages={averages} overall={overall} />
        <div className="space-y-3">
          {answers.map((a, i) => (
            <Card key={i} className="p-4">
              <p className="text-sm font-medium text-[var(--color-navy)]">{a.question}</p>
              <p className="mt-1.5 text-sm text-[var(--color-muted)]">{a.feedback}</p>
              <button
                onClick={() => saveToBank(i)}
                disabled={savedIdx.has(i)}
                className="mt-2 text-xs font-medium text-[var(--color-navy)] hover:underline disabled:text-[var(--color-score)] disabled:no-underline"
              >
                {savedIdx.has(i) ? "Saved to answer bank" : "Save improved answer"}
              </button>
            </Card>
          ))}
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={start} disabled={remaining !== null && remaining <= 0}>
            Practice again
          </Button>
        </div>
        {remaining !== null && remaining <= 0 && (
          <p className="text-xs text-[var(--color-muted)]">
            You've used today's 3 practice sessions — see you tomorrow.
          </p>
        )}
      </div>
    );
  }

  const current = questions[index];

  return (
    <div>
      <audio ref={audioRef} className="hidden" />
      <div className="mb-4 flex items-center justify-between">
        <Badge>
          Question {index + 1} of {questions.length}
        </Badge>
        <Badge>{current.category.replace("_", " ")}</Badge>
      </div>

      <Card className="p-6">
        <InterviewerOrb state={phase === "asking" ? "speaking" : phase === "scoring" ? "thinking" : "listening"} />
        <p className="mx-auto mt-5 max-w-md text-center font-display text-lg font-semibold leading-snug text-[var(--color-navy)]">
          {current.question}
        </p>

        {error && (
          <p role="alert" className="mt-3 text-center text-sm text-[var(--color-danger)]">
            {error}
          </p>
        )}

        {phase === "answering" && (
          <div className="mt-4">
            <Recorder
              onSubmitAudio={(blob) => submitAnswer({ audio: blob })}
              onSubmitText={(text) => submitAnswer({ text })}
            />
          </div>
        )}

        {phase === "scoring" && (
          <div className="mt-6 space-y-2">
            <Skeleton className="mx-auto h-4 w-40" />
            <Skeleton className="mx-auto h-4 w-56" />
          </div>
        )}
      </Card>

      <AnimatePresence>
        {phase === "reveal" && answers[index] && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
            <RevealCard answer={answers[index]} onNext={next} isLast={index === questions.length - 1} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RevealCard({ answer, onNext, isLast }: { answer: ScoredAnswer; onNext: () => void; isLast: boolean }) {
  const dims: { key: keyof Omit<AnswerScores, "justifications">; label: string }[] = [
    { key: "structure", label: "Structure" },
    { key: "relevance", label: "Relevance" },
    { key: "confidence", label: "Confidence" },
    { key: "conciseness", label: "Conciseness" },
  ];
  return (
    <Card className="p-5">
      <div className="grid grid-cols-4 gap-2 text-center">
        {dims.map((d, i) => (
          <motion.div
            key={d.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300, damping: 22 }}
          >
            <p className="tnum font-display text-2xl font-semibold text-[var(--color-score)]">{answer.scores[d.key]}</p>
            <p className="text-[11px] text-[var(--color-muted)]">{d.label}</p>
          </motion.div>
        ))}
      </div>
      <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink)]">{answer.feedback}</p>
      <div className="mt-3 rounded-[var(--radius)] bg-[var(--color-porcelain-2)] p-3.5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">A stronger version</p>
        <p className="mt-1 text-sm leading-relaxed text-[var(--color-ink)]">{answer.improved_answer}</p>
      </div>
      <Button onClick={onNext} size="lg" className="mt-4 w-full">
        {isLast ? "See my results" : "Next question"}
      </Button>
    </Card>
  );
}
