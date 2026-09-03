import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { AnswerScores } from "@/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function uid(): string {
  return crypto.randomUUID();
}

/** Stable content hash used for prep-pack caching (posting+resume). */
export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function parseDateSafe(dateIso: string | null | undefined): Date | null {
  if (!dateIso || typeof dateIso !== "string") return null;
  const trimmed = dateIso.trim();
  if (!trimmed) return null;
  const date = trimmed.includes("T") ? new Date(trimmed) : new Date(trimmed + "T09:00:00");
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function daysUntil(dateIso: string | null | undefined, now: number = Date.now()): number | null {
  if (typeof now !== "number" || !Number.isFinite(now)) return null;
  const target = parseDateSafe(dateIso);
  if (!target) return null;
  const res = Math.ceil((target.getTime() - now) / 86_400_000);
  return res === 0 ? 0 : res;
}

export function formatDateHuman(dateIso: string | null | undefined): string {
  const d = parseDateSafe(dateIso);
  if (!d) return "";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Practice streak: consecutive calendar days (ending today or yesterday —
 * a day not yet practiced doesn't break the streak until it's over) with at
 * least one mock session started. Dashboard stored-value / habit signal
 * (PLAYBOOK 3.3: "streaks where natural").
 */
export function practiceStreak(startedAtTimestamps: string[], now: number = Date.now()): number {
  if (!startedAtTimestamps || startedAtTimestamps.length === 0) return 0;
  if (typeof now !== "number" || !Number.isFinite(now)) return 0;

  const days = new Set<string>();
  for (const t of startedAtTimestamps) {
    if (!t || typeof t !== "string") continue;
    const d = new Date(t);
    if (!Number.isNaN(d.getTime())) {
      days.add(d.toISOString().slice(0, 10));
    }
  }

  if (days.size === 0) return 0;

  const oneDay = 86_400_000;
  const todayMidnight = new Date(new Date(now).toISOString().slice(0, 10) + "T00:00:00Z").getTime();
  if (Number.isNaN(todayMidnight)) return 0;

  const todayIso = new Date(todayMidnight).toISOString().slice(0, 10);
  const yestIso = new Date(todayMidnight - oneDay).toISOString().slice(0, 10);
  if (!days.has(todayIso) && !days.has(yestIso)) return 0;

  let streak = 0;
  let cursor = days.has(todayIso) ? todayMidnight : todayMidnight - oneDay;
  while (days.has(new Date(cursor).toISOString().slice(0, 10))) {
    streak += 1;
    cursor -= oneDay;
  }
  return streak;
}

function safeScoreValue(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 5;
  return Math.min(10, Math.max(1, Math.round(v)));
}

/**
 * Computes calibrated overall readiness score (1-100) from answered sessions.
 * Returns null if no scored answers exist.
 */
export function calculateReadinessScore(
  answers: Array<{ scores?: AnswerScores | null } | null | undefined>
): number | null {
  if (!answers || answers.length === 0) return null;
  const valid = answers.filter((a): a is { scores: AnswerScores } => Boolean(a?.scores));
  if (valid.length === 0) return null;

  const total = valid.reduce((sum, a) => {
    const s = a.scores;
    const structure = safeScoreValue(s.structure);
    const relevance = safeScoreValue(s.relevance);
    const confidence = safeScoreValue(s.confidence);
    const conciseness = safeScoreValue(s.conciseness);
    return sum + (structure + relevance + confidence + conciseness) / 4;
  }, 0);

  const avg = total / valid.length;
  if (!Number.isFinite(avg)) return null;
  return Math.min(100, Math.max(10, Math.round(avg * 10)));
}

/**
 * Computes dimensional average scores and overall score out of 10.
 */
export function computeAverageScores(
  answers: Array<{ scores?: AnswerScores | null } | null | undefined>
): {
  structure: number;
  relevance: number;
  confidence: number;
  conciseness: number;
  overall: number;
} | null {
  if (!answers || answers.length === 0) return null;
  const valid = answers.filter((a): a is { scores: AnswerScores } => Boolean(a?.scores));
  if (valid.length === 0) return null;

  const sums = { structure: 0, relevance: 0, confidence: 0, conciseness: 0 };
  for (const a of valid) {
    sums.structure += safeScoreValue(a.scores.structure);
    sums.relevance += safeScoreValue(a.scores.relevance);
    sums.confidence += safeScoreValue(a.scores.confidence);
    sums.conciseness += safeScoreValue(a.scores.conciseness);
  }

  const count = valid.length;
  const structure = Math.round((sums.structure / count) * 10) / 10;
  const relevance = Math.round((sums.relevance / count) * 10) / 10;
  const confidence = Math.round((sums.confidence / count) * 10) / 10;
  const conciseness = Math.round((sums.conciseness / count) * 10) / 10;
  const overall = Math.round(((structure + relevance + confidence + conciseness) / 4) * 10) / 10;

  return { structure, relevance, confidence, conciseness, overall };
}

/** Truncate text safely with ellipsis. */
export function truncateText(text: string, maxLen: number, suffix = "..."): string {
  if (!text || typeof text !== "string") return "";
  if (!Number.isFinite(maxLen) || maxLen <= 0) return "";
  if (text.length <= maxLen) return text;
  if (maxLen < suffix.length) return text.slice(0, maxLen);
  return text.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
}
