/**
 * zod schemas for every LLM response. PLAYBOOK 2.6: validate every LLM
 * response before use; retry once with the parse error; fail closed.
 * (No "server-only" here: pure schemas, unit-tested directly.)
 */
import { z } from "zod";

const score = z
  .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/).transform(Number)])
  .transform((v) => Math.min(10, Math.max(1, Math.round(Number(v)))));

export const prepQuestionSchema = z.object({
  question: z.string().min(8),
  category: z.enum(["behavioral", "role_specific", "company_culture", "curveball"]),
  why_asked: z.string().min(4),
  strong_answer_outline: z.string().min(10),
});

export const prepPackSchema = z.object({
  questions: z.array(prepQuestionSchema).min(10).max(25).transform((arr) => arr.slice(0, 15)),
  company_intel: z.string().min(10),
});
export type PrepPackOut = z.infer<typeof prepPackSchema>;

export const scoringSchema = z.object({
  scores: z.object({
    structure: score,
    relevance: score,
    confidence: score,
    conciseness: score,
    justifications: z.object({
      structure: z.string().default(""),
      relevance: z.string().default(""),
      confidence: z.string().default(""),
      conciseness: z.string().default(""),
    }),
  }),
  feedback: z.string().min(10),
  improved_answer: z.string().min(20),
});
export type ScoringOut = z.infer<typeof scoringSchema>;

export const starSuggestSchema = z.object({ suggestion: z.string().min(5) });
export type StarSuggestOut = z.infer<typeof starSuggestSchema>;

export const negotiationSchema = z.object({
  opening_script: z.string().min(10),
  counter_script: z.string().min(10),
  phrases: z.array(z.string().min(2)).min(2).max(10),
  email_template: z.string().min(10),
  walk_away_guidance: z.string().min(10),
});
export type NegotiationOut = z.infer<typeof negotiationSchema>;

export const roleplaySchema = z.object({
  recruiter_reply: z.string().min(2),
  coaching_tip: z.string().min(2),
});
export type RoleplayOut = z.infer<typeof roleplaySchema>;

export const letterSchema = z.object({
  letter: z.string().min(20),
  subject_line: z.string().min(2),
});
export type LetterOut = z.infer<typeof letterSchema>;

export const followupSchema = z.object({
  email: z.string().min(15),
  subject_line: z.string().min(2),
});
export type FollowupOut = z.infer<typeof followupSchema>;

export const parseJobSchema = z.object({
  title: z.string().min(1).default("Interview role"),
  company: z.string().min(1).default("the company"),
  skills: z.array(z.string()).max(30).default([]),
  responsibilities: z.array(z.string()).max(30).default([]),
  qualifications: z.array(z.string()).max(30).default([]),
});
export type ParseJobOut = z.infer<typeof parseJobSchema>;

/** Strip markdown fences / stray prose around a JSON object or array before parsing. */
export function extractJson(text: string): string {
  if (!text) return "{}";
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : trimmed;

  const startObj = body.indexOf("{");
  const endObj = body.lastIndexOf("}");
  const startArr = body.indexOf("[");
  const endArr = body.lastIndexOf("]");

  if (startObj >= 0 && (startArr === -1 || startObj < startArr) && endObj > startObj) {
    return body.slice(startObj, endObj + 1);
  }
  if (startArr >= 0 && endArr > startArr) {
    return body.slice(startArr, endArr + 1);
  }
  return body;
}
