/** Shared domain types — mirrors supabase/migrations/0001_init.sql */

export type ExperienceLevel = "entry" | "mid" | "senior" | "exec";
export type InterviewFear = "freezing_up" | "behavioral" | "technical" | "salary_talk";
export type InterviewType = "phone_screen" | "behavioral" | "technical" | "panel";
export type SubStatus = "trialing" | "active" | "past_due" | "paused" | "canceled" | "none";
export type MockMode = "voice" | "text";
export type PlanId = "weekly" | "monthly" | "landjob";

export interface Profile {
  id: string;
  email: string;
  target_role: string | null;
  experience_level: ExperienceLevel | null;
  interview_date: string | null; // ISO date
  biggest_fear: InterviewFear | null;
  interview_type: InterviewType | null;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  title: string;
  company: string;
  posting_text: string;
  parsed_requirements: { skills: string[]; responsibilities: string[]; qualifications: string[] } | null;
  created_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  storage_path: string | null;
  extracted_text: string;
  created_at: string;
}

export interface PrepQuestion {
  question: string;
  category: "behavioral" | "role_specific" | "company_culture" | "curveball";
  why_asked: string;
  strong_answer_outline: string;
}

export interface PrepPack {
  id: string;
  job_id: string;
  user_id: string;
  questions: PrepQuestion[];
  company_intel: string;
  content_hash: string;
  created_at: string;
}

export interface MockSession {
  id: string;
  job_id: string;
  user_id: string;
  mode: MockMode;
  started_at: string;
  completed_at: string | null;
}

export interface AnswerScores {
  structure: number;
  relevance: number;
  confidence: number;
  conciseness: number;
  justifications: { structure: string; relevance: string; confidence: string; conciseness: string };
}

export interface MockAnswer {
  id: string;
  session_id: string;
  user_id: string;
  question: string;
  transcript: string;
  audio_path: string | null;
  scores: AnswerScores | null;
  feedback: string;
  improved_answer: string;
  created_at: string;
}

export interface SavedAnswer {
  id: string;
  user_id: string;
  question: string;
  answer: string;
  source: "star" | "mock";
  created_at: string;
}

export interface Subscription {
  user_id: string;
  stripe_customer_id: string | null;
  stripe_sub_id: string | null;
  status: SubStatus;
  plan: PlanId | null;
  current_period_end: string | null;
  updated_at: string;
}

export interface AiUsageDay {
  user_id: string;
  day: string; // YYYY-MM-DD
  input_tokens: number;
  output_tokens: number;
  requests: number;
  cost_cents: number;
}

export interface Outcome {
  id: string;
  user_id: string;
  got_offer: boolean;
  testimonial: string | null;
  created_at: string;
}

export function isEntitled(status: SubStatus): boolean {
  return status === "trialing" || status === "active" || status === "past_due";
}
