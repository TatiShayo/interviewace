/**
 * M7 — Token-budget + AI kill-switch tests.
 * Threat model (BUILD_PROMPT cost guards + PLAYBOOK 2.6): a per-user daily
 * budget (cents + request count) is enforced SERVER-SIDE before any AI call,
 * and an env kill-switch disables AI instantly without redeploy.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AiUsageDay } from "@/lib/types";

// Controllable env + usage doubles.
const envState = { aiKillSwitch: false };
const usageState: AiUsageDay = {
  user_id: "u1", day: "2026-07-07", input_tokens: 0, output_tokens: 0, requests: 0, cost_cents: 0,
};

vi.mock("@/lib/env", () => ({
  env: {
    get aiKillSwitch() {
      return envState.aiKillSwitch;
    },
  },
  has: {},
}));

vi.mock("@/lib/providers/db", () => ({
  db: () => ({ getUsageToday: async () => ({ ...usageState }) }),
}));

vi.mock("@/lib/providers/ai", () => ({
  costCents: () => 0,
  ai: () => ({ complete: async () => ({ text: "{}", inputTokens: 0, outputTokens: 0 }) }),
}));
vi.mock("@/lib/providers/monitoring", () => ({ reportError: () => {} }));

const { assertBudget, AiDisabledError, BudgetExceededError, DAILY_BUDGET_CENTS, DAILY_REQUEST_CAP } =
  await import("@/lib/ai/generate");

beforeEach(() => {
  envState.aiKillSwitch = false;
  usageState.cost_cents = 0;
  usageState.requests = 0;
});

describe("AI kill-switch", () => {
  it("throws AiDisabledError when the kill-switch is on, before any usage check", async () => {
    envState.aiKillSwitch = true;
    await expect(assertBudget("u1")).rejects.toBeInstanceOf(AiDisabledError);
  });

  it("permits calls when the kill-switch is off and budget is available", async () => {
    await expect(assertBudget("u1")).resolves.toBeUndefined();
  });
});

describe("per-user daily budget", () => {
  it("blocks when the cost budget is reached", async () => {
    usageState.cost_cents = DAILY_BUDGET_CENTS;
    await expect(assertBudget("u1")).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("blocks when the daily request cap is reached", async () => {
    usageState.requests = DAILY_REQUEST_CAP;
    await expect(assertBudget("u1")).rejects.toBeInstanceOf(BudgetExceededError);
  });

  it("allows when just under both limits", async () => {
    usageState.cost_cents = DAILY_BUDGET_CENTS - 1;
    usageState.requests = DAILY_REQUEST_CAP - 1;
    await expect(assertBudget("u1")).resolves.toBeUndefined();
  });

  it("keeps the daily budget in a range consistent with the $0.15/user/day target", () => {
    // Budget is above the $0.15 activation cost (to absorb retries) but still a
    // hard cap well under runaway spend.
    expect(DAILY_BUDGET_CENTS).toBeGreaterThanOrEqual(15);
    expect(DAILY_BUDGET_CENTS).toBeLessThanOrEqual(100);
  });
});
