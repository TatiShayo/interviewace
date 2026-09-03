/**
 * Scoring Algorithm & Feedback Metric Computations Tests.
 * Covers:
 *  - Scoring schema rubric bounds and float-to-int normalization
 *  - calculateReadinessScore mathematical correctness (10-100 scale)
 *  - computeAverageScores precision and dimensional consistency
 *  - practiceStreak algorithm edge cases (continuity, gaps, multiple sessions/day)
 *  - daysUntil and formatDateHuman date handling
 */
import { describe, it, expect } from "vitest";
import {
  calculateReadinessScore,
  computeAverageScores,
  practiceStreak,
  daysUntil,
  formatDateHuman,
} from "@/lib/utils";
import { scoringSchema } from "@/lib/ai/schemas";

describe("Scoring Schema — Rubric Boundaries & Robustness", () => {
  it("validates a well-formed score payload", () => {
    const raw = {
      scores: {
        structure: 7,
        relevance: 8,
        confidence: 6,
        conciseness: 7,
        justifications: {
          structure: "Well structured with Situation and Action",
          relevance: "Directly addressed the core role requirement",
          confidence: "Strong language throughout",
          conciseness: "Within 60 seconds",
        },
      },
      feedback: "Great structure and concrete details from your experience.",
      improved_answer: "In my previous role as Senior Engineer, I led the core database migration...",
    };

    const parsed = scoringSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scores.structure).toBe(7);
      expect(parsed.data.scores.relevance).toBe(8);
    }
  });

  it("coerces and rounds floating point scores from LLMs to integers (1-10)", () => {
    const raw = {
      scores: {
        structure: 7.6, // should round to 8
        relevance: 6.2, // should round to 6
        confidence: "8.5", // string number should coerce to 9
        conciseness: 4.0, // float should be 4
        justifications: {
          structure: "ok",
          relevance: "ok",
          confidence: "ok",
          conciseness: "ok",
        },
      },
      feedback: "Work on conciseness and deliver the result upfront.",
      improved_answer: "At Acme I managed the full lifecycle of the authentication service...",
    };

    const parsed = scoringSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scores.structure).toBe(8);
      expect(parsed.data.scores.relevance).toBe(6);
      expect(parsed.data.scores.confidence).toBe(9);
      expect(parsed.data.scores.conciseness).toBe(4);
    }
  });

  it("clamps scores to the 1-10 range", () => {
    const raw = {
      scores: {
        structure: 15, // should clamp to 10
        relevance: -2, // should clamp to 1
        confidence: 10,
        conciseness: 1,
        justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
      },
      feedback: "Feedback on the overall answer structure.",
      improved_answer: "Improved version of the answer with strong action words.",
    };

    const parsed = scoringSchema.safeParse(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.scores.structure).toBe(10);
      expect(parsed.data.scores.relevance).toBe(1);
    }
  });
});

describe("Readiness Score Calculation", () => {
  it("returns null when no answers or empty list provided", () => {
    expect(calculateReadinessScore([])).toBeNull();
    expect(calculateReadinessScore(null as unknown as [])).toBeNull();
  });

  it("calculates 100 for perfect 10/10 answers", () => {
    const answers = [
      {
        scores: {
          structure: 10,
          relevance: 10,
          confidence: 10,
          conciseness: 10,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      },
    ];
    expect(calculateReadinessScore(answers)).toBe(100);
  });

  it("calculates 50 for calibrated average 5/10 answers", () => {
    const answers = [
      {
        scores: {
          structure: 5,
          relevance: 5,
          confidence: 5,
          conciseness: 5,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      },
    ];
    expect(calculateReadinessScore(answers)).toBe(50);
  });

  it("averages multiple answers accurately and ignores answers with missing scores", () => {
    const answers = [
      {
        scores: {
          structure: 8,
          relevance: 8,
          confidence: 8,
          conciseness: 8,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      }, // avg = 8 -> 80
      { scores: null }, // ignored
      {
        scores: {
          structure: 6,
          relevance: 6,
          confidence: 6,
          conciseness: 6,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      }, // avg = 6 -> 60
    ];
    // Overall average: (8 + 6) / 2 = 7 -> 70
    expect(calculateReadinessScore(answers)).toBe(70);
  });
});

describe("Dimensional Average Score Computation", () => {
  it("computes dimensional averages with 1-decimal precision", () => {
    const answers = [
      {
        scores: {
          structure: 8,
          relevance: 9,
          confidence: 7,
          conciseness: 6,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      },
      {
        scores: {
          structure: 7,
          relevance: 8,
          confidence: 8,
          conciseness: 7,
          justifications: { structure: "", relevance: "", confidence: "", conciseness: "" },
        },
      },
    ];

    const result = computeAverageScores(answers);
    expect(result).not.toBeNull();
    expect(result?.structure).toBe(7.5);
    expect(result?.relevance).toBe(8.5);
    expect(result?.confidence).toBe(7.5);
    expect(result?.conciseness).toBe(6.5);
    expect(result?.overall).toBe(7.5);
  });
});

describe("Practice Streak Algorithm", () => {
  const NOW = new Date("2026-08-14T15:00:00Z").getTime();
  const TODAY = "2026-08-14";
  const YESTERDAY = "2026-08-13";
  const TWO_DAYS_AGO = "2026-08-12";
  const THREE_DAYS_AGO = "2026-08-11";

  it("returns 0 for empty timestamps list", () => {
    expect(practiceStreak([], NOW)).toBe(0);
  });

  it("returns 1 for a single session completed today", () => {
    expect(practiceStreak([`${TODAY}T10:00:00Z`], NOW)).toBe(1);
  });

  it("returns 1 for a session completed yesterday (alive grace period)", () => {
    expect(practiceStreak([`${YESTERDAY}T14:30:00Z`], NOW)).toBe(1);
  });

  it("returns 2 for sessions on yesterday and today", () => {
    const timestamps = [`${YESTERDAY}T14:00:00Z`, `${TODAY}T09:00:00Z`];
    expect(practiceStreak(timestamps, NOW)).toBe(2);
  });

  it("returns 4 for 4 consecutive days ending today", () => {
    const timestamps = [
      `${THREE_DAYS_AGO}T10:00:00Z`,
      `${TWO_DAYS_AGO}T11:00:00Z`,
      `${YESTERDAY}T12:00:00Z`,
      `${TODAY}T13:00:00Z`,
    ];
    expect(practiceStreak(timestamps, NOW)).toBe(4);
  });

  it("counts multiple sessions on the same calendar day as 1 day", () => {
    const timestamps = [
      `${TODAY}T09:00:00Z`,
      `${TODAY}T12:00:00Z`,
      `${TODAY}T18:00:00Z`,
      `${YESTERDAY}T10:00:00Z`,
      `${YESTERDAY}T15:00:00Z`,
    ];
    expect(practiceStreak(timestamps, NOW)).toBe(2);
  });

  it("returns 0 when the streak is broken (last session 2 days ago)", () => {
    const timestamps = [`${TWO_DAYS_AGO}T10:00:00Z`, `${THREE_DAYS_AGO}T10:00:00Z`];
    expect(practiceStreak(timestamps, NOW)).toBe(0);
  });

  it("handles out of order or invalid timestamp strings safely", () => {
    const timestamps = [
      `${TODAY}T13:00:00Z`,
      "invalid-date-string",
      "",
      `${YESTERDAY}T12:00:00Z`,
      `${TWO_DAYS_AGO}T11:00:00Z`,
    ];
    expect(practiceStreak(timestamps, NOW)).toBe(3);
  });
});

describe("daysUntil & formatDateHuman", () => {
  const NOW = new Date("2026-08-14T10:00:00Z").getTime();

  it("calculates 0 days for today", () => {
    expect(daysUntil("2026-08-14", NOW)).toBe(0);
    expect(daysUntil("2026-08-14T09:00:00Z", NOW)).toBe(0);
  });

  it("calculates 1 day for tomorrow", () => {
    expect(daysUntil("2026-08-15", NOW)).toBe(1);
  });

  it("calculates positive days for future interview dates", () => {
    expect(daysUntil("2026-08-20", NOW)).toBe(6);
  });

  it("calculates negative days for passed interview dates", () => {
    expect(daysUntil("2026-08-13", NOW)).toBe(-1);
  });

  it("returns null for null, undefined, or invalid date strings", () => {
    expect(daysUntil(null)).toBeNull();
    expect(daysUntil(undefined)).toBeNull();
    expect(daysUntil("not-a-date")).toBeNull();
  });

  it("formats dates to human readable string", () => {
    const formatted = formatDateHuman("2026-08-14");
    expect(formatted).toContain("August");
    expect(formatted).toContain("14");
    expect(formatDateHuman(null)).toBe("");
  });
});
