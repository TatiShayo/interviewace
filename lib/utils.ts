import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const target = new Date(dateIso + "T09:00:00");
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

export function formatDateHuman(dateIso: string | null | undefined): string {
  if (!dateIso) return "";
  const d = new Date(dateIso + "T09:00:00");
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

/**
 * Practice streak: consecutive calendar days (ending today or yesterday —
 * a day not yet practiced doesn't break the streak until it's over) with at
 * least one mock session started. Dashboard stored-value / habit signal
 * (PLAYBOOK 3.3: "streaks where natural").
 */
export function practiceStreak(startedAtTimestamps: string[]): number {
  if (startedAtTimestamps.length === 0) return 0;
  const days = new Set(startedAtTimestamps.map((t) => t.slice(0, 10)));
  const oneDay = 86_400_000;
  const todayMidnight = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z").getTime();

  // Streak must include today or yesterday to still be "alive".
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
