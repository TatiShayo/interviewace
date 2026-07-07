/**
 * zod schemas for every LLM response. PLAYBOOK 2.6: validate every LLM
 * response before use; retry once with the parse error; fail closed.
 * (No "server-only" here: pure schemas, unit-tested directly.)
 */
import { z } from "zod";

const score = z.number().int().min(1).max(10);

export const prepQuestionSchema = z.object({
  question: z.string().min(8),
  category: z.enum(["behavioral", "role_specific", "company_culture", "curveball"]),
  why_asked: z.string().min(4),
  strong_answer_outline: z.string().min(10),
});

export const prepPackSchema = z.object({
  questions: z.array(prepQuestionSchema).length(15),
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
      structure: z.string(),
      relevance: z.string(),
      confidence: z.string(),
      conciseness: z.string(),
    }),
  }),
  feedback: z.string().min(10),
  improved_answer: z.string().min(20),
});
export type ScoringOut = z.infer<typeof scoringSchema>;

export const starSuggestSchema = z.object({ suggestion: z.string().min(10) });
export type StarSuggestOut = z.infer<typeof starSuggestSchema>;

export const negotiationSchema = z.object({
  opening_script: z.string().min(20),
  counter_script: z.string().min(20),
  phrases: z.array(z.string().min(4)).min(3).max(8),
  email_template: z.string().min(20),
  walk_away_guidance: z.string().min(10),
});
export type NegotiationOut = z.infer<typeof negotiationSchema>;

export const roleplaySchema = z.object({
  recruiter_reply: z.string().min(4),
  coaching_tip: z.string().min(4),
});
export type RoleplayOut = z.infer<typeof roleplaySchema>;

export const letterSchema = z.object({
  letter: z.string().min(50),
  subject_line: z.string().min(3),
});
export type LetterOut = z.infer<typeof letterSchema>;

export const followupSchema = z.object({
  email: z.string().min(30),
  subject_line: z.string().min(3),
});
export type FollowupOut = z.infer<typeof followupSchema>;

export const parseJobSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  skills: z.array(z.string()).max(30),
  responsibilities: z.array(z.string()).max(30),
  qualifications: z.array(z.string()).max(30),
});
export type ParseJobOut = z.infer<typeof parseJobSchema>;

/** Strip markdown fences / stray prose around a JSON object before parsing. */
export function extractJson(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence ? fence[1].trim() : trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return body.slice(start, end + 1);
  return body;
}
