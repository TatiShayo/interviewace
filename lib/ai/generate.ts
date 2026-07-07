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
export const DAILY_BUDGET_CENTS = Number(process.env.AI_DAILY_BUDGET_CENTS ?? 40);
export const DAILY_REQUEST_CAP = Number(process.env.AI_DAILY_REQUEST_CAP ?? 120);

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
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("; ");
}
