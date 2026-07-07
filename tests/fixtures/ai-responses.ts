/**
 * Recorded AI-response fixtures for the JSON-parsing unit tests (M8).
 * Covers the three contract cases the gateway must handle:
 *   - valid on first attempt
 *   - malformed on first attempt, valid on retry
 *   - malformed twice -> fail closed (throw, never return junk)
 */
import type { PrepPackOut } from "@/lib/ai/schemas";

/** A well-formed prep pack (exactly 15 questions, correct category mix). */
export function validPrepPackJson(): string {
  const cats: PrepPackOut["questions"][number]["category"][] = [
    "behavioral", "behavioral", "behavioral", "behavioral", "behavioral",
    "role_specific", "role_specific", "role_specific", "role_specific", "role_specific",
    "company_culture", "company_culture", "company_culture",
    "curveball", "curveball",
  ];
  const questions = cats.map((category, i) => ({
    question: `Tell me about a specific time #${i + 1} you handled the situation this posting describes.`,
    category,
    why_asked: "Probing for concrete, owned judgment rather than a rehearsed story.",
    strong_answer_outline:
      "1) Name the stakes from your resume. 2) The decision you owned. 3) The action with a real metric. 4) Result and what you would repeat.",
  }));
  return JSON.stringify({
    questions,
    company_intel:
      "A scaling team that values operators who ship; interviewers anchor on the metrics named in the posting.",
  });
}

/** Same valid JSON but wrapped in a markdown fence + chatty preamble. */
export function validPrepPackFenced(): string {
  return "Sure! Here is the prep pack you asked for:\n\n```json\n" + validPrepPackJson() + "\n```\nLet me know if you need changes.";
}

/** Not JSON at all — a refusal-style prose reply. */
export function malformedProse(): string {
  return "I'm sorry, but I can't help with that request. Let me know if there's anything else.";
}

/** JSON-ish but violates the schema (only 3 questions, wrong length). */
export function malformedWrongShape(): string {
  return JSON.stringify({
    questions: [
      { question: "Too few questions here.", category: "behavioral", why_asked: "n/a", strong_answer_outline: "outline goes here." },
    ],
    company_intel: "short",
  });
}

/** A valid scoring response for the scoring-path tests. */
export function validScoringJson(): string {
  return JSON.stringify({
    scores: {
      structure: 6,
      relevance: 5,
      confidence: 4,
      conciseness: 5,
      justifications: {
        structure: "Clear situation, late result.",
        relevance: "Answered but drifted from the role.",
        confidence: "Some hedging language.",
        conciseness: "About 20% too long.",
      },
    },
    feedback: "Lead with the result and a number, then explain how. Cut the hedges.",
    improved_answer:
      "I owned the migration blocking our two biggest customers, scoped it to the three riskiest services, and shipped a week early with zero rollbacks; support tickets dropped 40% the next quarter.",
  });
}
