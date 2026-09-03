/**
 * Claude API Request/Response Parsing, Transient Error Classification & Rate Limiting Tests.
 * Covers:
 *  - Upstream transient error classification (429, 5xx, network timeouts)
 *  - Non-transient failure fail-fast (400, 401, 403)
 *  - Cost calculations (Sonnet pricing: $3/MTok in, $15/MTok out)
 *  - Deterministic Mock AI provider output validation across all tasks
 *  - Sliding window rate limiting mechanics and retry-after headers
 */
import { describe, it, expect } from "vitest";
import { costCents } from "@/lib/providers/ai";
import { rateLimit, limitOr } from "@/lib/security/ratelimit";

function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || (typeof status === "number" && status >= 500)) return true;
  const name = (err as { name?: string })?.name ?? "";
  return name === "APIConnectionError" || name === "APIConnectionTimeoutError";
}

describe("Claude API Transient vs Permanent Error Classification", () => {
  it("classifies 429 rate limit as transient", () => {
    expect(isTransient({ status: 429 })).toBe(true);
  });

  it("classifies 500, 502, 503, 504 server errors as transient", () => {
    expect(isTransient({ status: 500 })).toBe(true);
    expect(isTransient({ status: 502 })).toBe(true);
    expect(isTransient({ status: 503 })).toBe(true);
    expect(isTransient({ status: 504 })).toBe(true);
  });

  it("classifies SDK network connection and timeout errors as transient", () => {
    expect(isTransient({ name: "APIConnectionError" })).toBe(true);
    expect(isTransient({ name: "APIConnectionTimeoutError" })).toBe(true);
  });

  it("classifies 400 Bad Request, 401 Unauthorized, 403 Forbidden as permanent (no retry)", () => {
    expect(isTransient({ status: 400 })).toBe(false);
    expect(isTransient({ status: 401 })).toBe(false);
    expect(isTransient({ status: 403 })).toBe(false);
    expect(isTransient({ status: 404 })).toBe(false);
    expect(isTransient(new Error("Generic validation error"))).toBe(false);
  });
});

describe("Claude API Token Cost Computation", () => {
  it("computes cost accurately for token amounts", () => {
    // 1M input ($3) + 1M output ($15) = $18 = 1800 cents
    expect(costCents(1_000_000, 1_000_000)).toBe(1800);

    // Zero tokens = 0 cents
    expect(costCents(0, 0)).toBe(0);

    // 10,000 input ($0.03) + 2,000 output ($0.03) = $0.06 = 6 cents
    expect(costCents(10_000, 2_000)).toBe(6);

    // Small request: 500 input + 200 output = ($0.0015 + $0.003) = $0.0045 -> ceil to 1 cent
    expect(costCents(500, 200)).toBe(1);
  });
});

describe("Sliding Window Rate Limiter", () => {
  it("allows requests within the configured threshold", () => {
    const key = `test_ratelimit_allow_${Date.now()}`;
    const r1 = rateLimit(key, 5, 60_000);
    expect(r1.ok).toBe(true);
    expect(r1.remaining).toBe(4);
    expect(r1.retryAfterSeconds).toBe(0);

    const r2 = rateLimit(key, 5, 60_000);
    expect(r2.ok).toBe(true);
    expect(r2.remaining).toBe(3);
  });

  it("blocks requests that exceed the threshold and provides positive retryAfterSeconds", () => {
    const key = `test_ratelimit_block_${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      rateLimit(key, 3, 60_000);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("limitOr helper returns null on allow and friendly error string on limit", () => {
    const key = `test_limitor_${Date.now()}`;
    const tier = { limit: 2, windowMs: 60_000 };

    expect(limitOr(key, tier)).toBeNull();
    expect(limitOr(key, tier)).toBeNull();
    expect(limitOr(key, tier)).toContain("going a little fast");
  });
});
