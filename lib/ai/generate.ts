/**
 * Central LLM gateway. Every AI feature goes through generateJson:
 *  - kill switch (AI_KILL_SWITCH env) — disable AI instantly, no redeploy
 *  - per-user daily token/cost budget, enforced server-side
 *  - zod validation of the response; ONE retry with the parse error appended;
 *    then fail closed (PLAYBOOK 2.6)
 *  - usage recording for the admin cost dashboard
 */
import "server-only";
import type { z } from "zod";
import { env } from "@/lib/env";
import { db } from "@/lib/providers/db";
import { ai, costCents, type AiTask } from "@/lib/providers/ai";
import { extractJson } from "@/lib/ai/schemas";
import { reportError } from "@/lib/providers/monitoring";

/** Daily per-user AI budget in cents (BUILD_PROMPT: cost/user/day <= $0.15;
 * budget set above that to absorb retries, still a hard server-side cap). */
export const DAILY_BUDGET_CENTS = Number(process.env.AI_DAILY_BUDGET_CENTS) || 40;
export const DAILY_REQUEST_CAP = Number(process.env.AI_DAILY_REQUEST_CAP) || 120;

export class AiDisabledError extends Error {
  constructor() { super("AI features are temporarily disabled"); }
}
export class BudgetExceededError extends Error {
  constructor() { super("Daily AI budget reached — try again tomorrow"); }
}
export class AiParseError extends Error {
  constructor(msg: string) { super(msg); }
}

export async function assertBudget(userId: string): Promise<void> {
  if (env.aiKillSwitch) throw new AiDisabledError();
  const usage = await db().getUsageToday(userId);
  if (usage.cost_cents >= DAILY_BUDGET_CENTS || usage.requests >= DAILY_REQUEST_CAP) {
    throw new BudgetExceededError();
  }
}

/**
 * Per-user serialization lock (M2). assertBudget (read) and addUsage (write)
 * are separate steps, so N concurrent requests could all pass the check before
 * any usage lands and overshoot the daily cap by N×. We chain each user's AI
 * calls through a single in-memory promise so the check→spend window can't be
 * raced within one instance. Single-instance today; the horizontal-scale
 * upgrade is a Postgres advisory lock / `select ... for update` on the usage
 * row (or Upstash), which the SupabaseDb.add_ai_usage RPC path can adopt.
 */
const userLocks = new Map<string, Promise<unknown>>();

function withUserLock<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const prev = userLocks.get(userId) ?? Promise.resolve();
  // Run fn after whatever is queued for this user; swallow the predecessor's
  // rejection so one failure doesn't poison the chain.
  const run = prev.catch(() => undefined).then(fn);
  userLocks.set(userId, run);
  // Best-effort cleanup so the map doesn't grow unbounded across users.
  void run.catch(() => undefined).finally(() => {
    if (userLocks.get(userId) === run) userLocks.delete(userId);
  });
  return run;
}

export async function generateJson<S extends z.ZodTypeAny>(args: {
  userId: string;
  task: AiTask;
  system: string;
  user: string;
  schema: S;
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const { userId, task, system, user, schema } = args;
  const maxTokens = args.maxTokens ?? 4096;

  // Serialize the check→spend window per user so concurrent requests can't all
  // pass assertBudget before any usage is recorded (M2).
  return withUserLock(userId, async () => {
    await assertBudget(userId);

    const attempt = async (prompt: string) => {
      const res = await ai().complete({ system, user: prompt, maxTokens, task });
      await db().addUsage(userId, res.inputTokens, res.outputTokens, costCents(res.inputTokens, res.outputTokens));
      return res.text;
    };

    let text = await attempt(user);
    let parsed = schema.safeParse(safeJson(extractJson(text)));
    if (parsed.success) return parsed.data;

    // One retry with the parse error appended (spec-mandated), then fail closed.
    const errorNote = `\n\nYour previous response failed validation with this error:\n${firstIssues(parsed.error)}\nRespond again with ONLY a valid JSON object matching the schema exactly.`;
    text = await attempt(user + errorNote);
    parsed = schema.safeParse(safeJson(extractJson(text)));
    if (parsed.success) return parsed.data;

    reportError(new AiParseError(`AI JSON validation failed twice for task ${task}`), { task });
    throw new AiParseError("The AI response could not be validated. Please try again.");
  });
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function firstIssues(error: z.ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((i) => `${i.path.length > 0 ? i.path.join(".") : "root"}: ${i.message}`)
    .join("; ");
}
