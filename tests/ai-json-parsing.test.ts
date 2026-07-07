/**
 * M8 — AI JSON parsing unit tests for the central generateJson gateway.
 * Contract (BUILD_PROMPT + PLAYBOOK 2.6): validate every LLM response against a
 * zod schema; on failure retry ONCE with the parse error appended; then fail
 * closed. Cases: valid / malformed-then-retry / malformed-twice-fails-closed.
 *
 * The AI provider and Db are mocked so the test exercises the gateway logic
 * (validation, retry, budget, usage recording) in isolation with no keys.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  validPrepPackJson,
  validPrepPackFenced,
  malformedProse,
  malformedWrongShape,
} from "./fixtures/ai-responses";
import { prepPackSchema, extractJson } from "@/lib/ai/schemas";

// ---- Mock the AI provider: a scripted queue of raw text responses. ----
const scriptedResponses: string[] = [];
const completeCalls: { user: string }[] = [];

vi.mock("@/lib/providers/ai", () => ({
  costCents: (i: number, o: number) => Math.ceil(((i * 3 + o * 15) / 1_000_000) * 100),
  ai: () => ({
    complete: async ({ user }: { user: string }) => {
      completeCalls.push({ user });
      const text = scriptedResponses.shift() ?? "{}";
      return { text, inputTokens: 10, outputTokens: 10 };
    },
  }),
}));

// ---- Mock the Db: budget always available, usage recorded in-memory. ----
const usage = { requests: 0, cost_cents: 0 };
vi.mock("@/lib/providers/db", () => ({
  db: () => ({
    getUsageToday: async () => ({ ...usage }),
    addUsage: async (_u: string, _i: number, _o: number, c: number) => {
      usage.requests += 1;
      usage.cost_cents += c;
    },
  }),
}));

// Monitoring is a no-op in tests.
vi.mock("@/lib/providers/monitoring", () => ({ reportError: () => {} }));

// Import AFTER mocks are registered.
const { generateJson, AiParseError } = await import("@/lib/ai/generate");

function queue(...responses: string[]) {
  scriptedResponses.length = 0;
  scriptedResponses.push(...responses);
}

const baseArgs = {
  userId: "user-1",
  task: "prep_pack" as const,
  system: "system prompt",
  user: "generate the pack",
  schema: prepPackSchema,
};

beforeEach(() => {
  scriptedResponses.length = 0;
  completeCalls.length = 0;
  usage.requests = 0;
  usage.cost_cents = 0;
});

describe("generateJson — valid on first attempt", () => {
  it("parses a valid response without retrying", async () => {
    queue(validPrepPackJson());
    const out = await generateJson(baseArgs);
    expect(out.questions).toHaveLength(15);
    expect(completeCalls).toHaveLength(1); // no retry
    expect(usage.requests).toBe(1);
  });

  it("parses valid JSON wrapped in a markdown fence + prose", async () => {
    queue(validPrepPackFenced());
    const out = await generateJson(baseArgs);
    expect(out.questions).toHaveLength(15);
    expect(completeCalls).toHaveLength(1);
  });
});

describe("generateJson — malformed then valid on retry", () => {
  it("retries once with the parse error appended, then succeeds", async () => {
    queue(malformedProse(), validPrepPackJson());
    const out = await generateJson(baseArgs);
    expect(out.questions).toHaveLength(15);
    expect(completeCalls).toHaveLength(2); // one retry happened
    // The retry prompt must carry the validation-failure note.
    expect(completeCalls[1].user).toContain("failed validation");
    expect(usage.requests).toBe(2); // both attempts billed
  });

  it("retries when JSON is well-formed but violates the schema", async () => {
    queue(malformedWrongShape(), validPrepPackJson());
    const out = await generateJson(baseArgs);
    expect(out.questions).toHaveLength(15);
    expect(completeCalls).toHaveLength(2);
  });
});

describe("generateJson — malformed twice fails closed", () => {
  it("throws AiParseError and never returns junk", async () => {
    queue(malformedProse(), malformedWrongShape());
    await expect(generateJson(baseArgs)).rejects.toBeInstanceOf(AiParseError);
    expect(completeCalls).toHaveLength(2); // exactly one retry, no infinite loop
  });

  it("fails closed on two totally non-JSON responses", async () => {
    queue(malformedProse(), malformedProse());
    await expect(generateJson(baseArgs)).rejects.toThrow(/could not be validated/i);
  });
});

describe("extractJson helper", () => {
  it("strips markdown fences", () => {
    expect(JSON.parse(extractJson("```json\n{\"a\":1}\n```"))).toEqual({ a: 1 });
  });
  it("strips leading/trailing prose around a JSON object", () => {
    expect(JSON.parse(extractJson("Here you go: {\"a\":1} — hope that helps"))).toEqual({ a: 1 });
  });
  it("returns the body unchanged when already clean", () => {
    expect(JSON.parse(extractJson('{"a":1}'))).toEqual({ a: 1 });
  });
});
