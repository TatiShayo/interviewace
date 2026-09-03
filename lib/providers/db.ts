/**
 * Data access layer. Two implementations behind one interface:
 *  - SupabaseDb — real Postgres via service-role client (server only)
 *  - MockDb    — JSON file store (.mockdata/db.json) so the whole app runs
 *                with zero keys. Never used when Supabase keys are present.
 *
 * All methods take an explicit userId that callers derive from the verified
 * session — never from client input.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, has } from "@/lib/env";
import { uid } from "@/lib/utils";
import type {
  AiUsageDay, AnswerScores, Job, MockAnswer, MockSession, Outcome, PrepPack,
  PrepQuestion, Profile, Resume, SavedAnswer, Subscription, SubStatus, PlanId, MockMode,
} from "@/lib/types";

export interface Db {
  // profiles
  upsertProfile(p: { id: string; email: string }): Promise<Profile>;
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile | null>;
  // jobs
  createJob(j: { user_id: string; title: string; company: string; posting_text: string; parsed_requirements?: Job["parsed_requirements"] }): Promise<Job>;
  getJob(id: string, userId: string): Promise<Job | null>;
  listJobs(userId: string): Promise<Job[]>;
  // resumes
  createResume(r: { user_id: string; storage_path: string | null; extracted_text: string }): Promise<Resume>;
  getLatestResume(userId: string): Promise<Resume | null>;
  deleteUserResumes(userId: string): Promise<void>;
  // prep packs
  createPrepPack(p: { job_id: string; user_id: string; questions: PrepQuestion[]; company_intel: string; content_hash: string }): Promise<PrepPack>;
  getPrepPackByJob(jobId: string, userId: string): Promise<PrepPack | null>;
  getPrepPackByHash(userId: string, hash: string): Promise<PrepPack | null>;
  deletePrepPacksForJob(jobId: string, userId: string): Promise<void>;
  // mock sessions
  createSession(s: { job_id: string; user_id: string; mode: MockMode }): Promise<MockSession>;
  getSession(id: string, userId: string): Promise<MockSession | null>;
  completeSession(id: string, userId: string): Promise<void>;
  countSessionsToday(userId: string): Promise<number>;
  listSessions(userId: string): Promise<MockSession[]>;
  deleteSession(id: string, userId: string): Promise<void>;
  // mock answers
  createAnswer(a: { session_id: string; user_id: string; question: string; transcript: string; audio_path: string | null; scores: AnswerScores | null; feedback: string; improved_answer: string }): Promise<MockAnswer>;
  listAnswersBySession(sessionId: string, userId: string): Promise<MockAnswer[]>;
  listAnswersByUser(userId: string): Promise<MockAnswer[]>;
  // answer bank
  saveAnswer(a: { user_id: string; question: string; answer: string; source: "star" | "mock" }): Promise<SavedAnswer>;
  listSavedAnswers(userId: string, limit?: number): Promise<SavedAnswer[]>;
  deleteSavedAnswer(id: string, userId: string): Promise<void>;
  // subscriptions
  getSubscription(userId: string): Promise<Subscription | null>;
  upsertSubscription(s: { user_id: string; stripe_customer_id?: string | null; stripe_sub_id?: string | null; status: SubStatus; plan?: PlanId | null; current_period_end?: string | null }): Promise<Subscription>;
  findUserByStripeCustomer(customerId: string): Promise<string | null>;
  // ai usage / budget
  addUsage(userId: string, inputTokens: number, outputTokens: number, costCents: number): Promise<void>;
  getUsageToday(userId: string): Promise<AiUsageDay>;
  // stripe webhook idempotency
  insertStripeEventOnce(eventId: string): Promise<boolean>;
  // outcomes
  saveOutcome(o: { user_id: string; got_offer: boolean; testimonial?: string | null }): Promise<Outcome>;
  aggregateOutcomes(): Promise<{ total: number; offers: number }>;
  // admin metrics
  countProfiles(): Promise<number>;
  countSubsByStatus(): Promise<Record<string, number>>;
  sumUsageSince(dayIso: string): Promise<{ cost_cents: number; requests: number }>;
  countSessionsSince(sinceIso: string): Promise<number>;
  // account lifecycle
  deleteAllUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<Record<string, unknown>>;
  purgeStaleResumes(cutoffIso: string): Promise<number>;
  // lifecycle email cron (BUILD_PROMPT 14/15): scoped fields only, never full profile dumps
  listEntitledProfilesWithInterviewDate(): Promise<{ id: string; email: string; interview_date: string }[]>;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* MockDb — JSON file store for keyless local development             */
/* ------------------------------------------------------------------ */

interface MockStore {
  profiles: Profile[];
  jobs: Job[];
  resumes: Resume[];
  prep_packs: PrepPack[];
  mock_sessions: MockSession[];
  mock_answers: MockAnswer[];
  saved_answers: SavedAnswer[];
  subscriptions: Subscription[];
  ai_usage: AiUsageDay[];
  stripe_events: string[];
  outcomes: Outcome[];
}

const EMPTY_STORE: MockStore = {
  profiles: [], jobs: [], resumes: [], prep_packs: [], mock_sessions: [],
  mock_answers: [], saved_answers: [], subscriptions: [], ai_usage: [],
  stripe_events: [], outcomes: [],
};

class MockDb implements Db {
  private file: string;
  constructor() {
    const dir = path.join(process.cwd(), ".mockdata");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    this.file = path.join(dir, "db.json");
  }
  private read(): MockStore {
    try {
      return { ...EMPTY_STORE, ...JSON.parse(fs.readFileSync(this.file, "utf8")) };
    } catch {
      return structuredClone(EMPTY_STORE);
    }
  }
  private write(s: MockStore) {
    fs.writeFileSync(this.file, JSON.stringify(s, null, 2));
  }

  async upsertProfile(p: { id: string; email: string }): Promise<Profile> {
    const s = this.read();
    let row = s.profiles.find((x) => x.id === p.id);
    if (!row) {
      row = {
        id: p.id, email: p.email, target_role: null, experience_level: null,
        interview_date: null, biggest_fear: null, interview_type: null,
        referral_code: uid().slice(0, 8), referred_by: null,
        created_at: new Date().toISOString(),
      };
      s.profiles.push(row);
      this.write(s);
    }
    return row;
  }
  async getProfile(userId: string) {
    return this.read().profiles.find((x) => x.id === userId) ?? null;
  }
  async updateProfile(userId: string, patch: Partial<Profile>) {
    const s = this.read();
    const row = s.profiles.find((x) => x.id === userId);
    if (!row) return null;
    const { id: _id, ...safePatch } = patch;
    for (const [k, v] of Object.entries(safePatch)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      (row as unknown as Record<string, unknown>)[k] = v;
    }
    this.write(s);
    return row;
  }
  async createJob(j: { user_id: string; title: string; company: string; posting_text: string; parsed_requirements?: Job["parsed_requirements"] }) {
    const s = this.read();
    const row: Job = {
      id: uid(), user_id: j.user_id, title: j.title, company: j.company,
      posting_text: j.posting_text, parsed_requirements: j.parsed_requirements ?? null,
      created_at: new Date().toISOString(),
    };
    s.jobs.push(row);
    this.write(s);
    return row;
  }
  async getJob(id: string, userId: string) {
    return this.read().jobs.find((x) => x.id === id && x.user_id === userId) ?? null;
  }
  async listJobs(userId: string) {
    return this.read().jobs.filter((x) => x.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async createResume(r: { user_id: string; storage_path: string | null; extracted_text: string }) {
    const s = this.read();
    const row: Resume = { id: uid(), created_at: new Date().toISOString(), ...r };
    s.resumes.push(row);
    this.write(s);
    return row;
  }
  async getLatestResume(userId: string) {
    const rows = this.read().resumes.filter((x) => x.user_id === userId);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  }
  async deleteUserResumes(userId: string) {
    const s = this.read();
    s.resumes = s.resumes.filter((x) => x.user_id !== userId);
    this.write(s);
  }
  async createPrepPack(p: { job_id: string; user_id: string; questions: PrepQuestion[]; company_intel: string; content_hash: string }) {
    const s = this.read();
    const row: PrepPack = { id: uid(), created_at: new Date().toISOString(), ...p };
    s.prep_packs.push(row);
    this.write(s);
    return row;
  }
  async getPrepPackByJob(jobId: string, userId: string) {
    const rows = this.read().prep_packs.filter((x) => x.job_id === jobId && x.user_id === userId);
    return rows.sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null;
  }
  async getPrepPackByHash(userId: string, hash: string) {
    return this.read().prep_packs.find((x) => x.user_id === userId && x.content_hash === hash) ?? null;
  }
  async deletePrepPacksForJob(jobId: string, userId: string) {
    const s = this.read();
    s.prep_packs = s.prep_packs.filter((x) => !(x.job_id === jobId && x.user_id === userId));
    this.write(s);
  }
  async createSession(x: { job_id: string; user_id: string; mode: MockMode }) {
    const s = this.read();
    const row: MockSession = { id: uid(), started_at: new Date().toISOString(), completed_at: null, ...x };
    s.mock_sessions.push(row);
    this.write(s);
    return row;
  }
  async getSession(id: string, userId: string) {
    return this.read().mock_sessions.find((x) => x.id === id && x.user_id === userId) ?? null;
  }
  async completeSession(id: string, userId: string) {
    const s = this.read();
    const row = s.mock_sessions.find((x) => x.id === id && x.user_id === userId);
    if (row) {
      row.completed_at = new Date().toISOString();
      this.write(s);
    }
  }
  async countSessionsToday(userId: string) {
    const t = today();
    return this.read().mock_sessions.filter((x) => x.user_id === userId && x.started_at.startsWith(t)).length;
  }
  async listSessions(userId: string) {
    return this.read().mock_sessions.filter((x) => x.user_id === userId).sort((a, b) => b.started_at.localeCompare(a.started_at));
  }
  async deleteSession(id: string, userId: string) {
    const s = this.read();
    s.mock_sessions = s.mock_sessions.filter((x) => !(x.id === id && x.user_id === userId));
    s.mock_answers = s.mock_answers.filter((x) => !(x.session_id === id && x.user_id === userId));
    this.write(s);
  }
  async createAnswer(a: { session_id: string; user_id: string; question: string; transcript: string; audio_path: string | null; scores: AnswerScores | null; feedback: string; improved_answer: string }) {
    const s = this.read();
    const row: MockAnswer = { id: uid(), created_at: new Date().toISOString(), ...a };
    s.mock_answers.push(row);
    this.write(s);
    return row;
  }
  async listAnswersBySession(sessionId: string, userId: string) {
    return this.read().mock_answers.filter((x) => x.session_id === sessionId && x.user_id === userId);
  }
  async listAnswersByUser(userId: string) {
    return this.read().mock_answers.filter((x) => x.user_id === userId).sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  async saveAnswer(a: { user_id: string; question: string; answer: string; source: "star" | "mock" }) {
    const s = this.read();
    const row: SavedAnswer = { id: uid(), created_at: new Date().toISOString(), ...a };
    s.saved_answers.push(row);
    this.write(s);
    return row;
  }
  async listSavedAnswers(userId: string, limit = 500) {
    return this.read()
      .saved_answers.filter((x) => x.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  }
  async deleteSavedAnswer(id: string, userId: string) {
    const s = this.read();
    s.saved_answers = s.saved_answers.filter((x) => !(x.id === id && x.user_id === userId));
    this.write(s);
  }
  async getSubscription(userId: string) {
    return this.read().subscriptions.find((x) => x.user_id === userId) ?? null;
  }
  async upsertSubscription(x: { user_id: string; stripe_customer_id?: string | null; stripe_sub_id?: string | null; status: SubStatus; plan?: PlanId | null; current_period_end?: string | null }) {
    const s = this.read();
    let row = s.subscriptions.find((r) => r.user_id === x.user_id);
    if (!row) {
      row = { user_id: x.user_id, stripe_customer_id: null, stripe_sub_id: null, status: "none", plan: null, current_period_end: null, updated_at: new Date().toISOString() };
      s.subscriptions.push(row);
    }
    for (const [k, v] of Object.entries(x)) {
      if (k === "__proto__" || k === "constructor" || k === "prototype") continue;
      (row as unknown as Record<string, unknown>)[k] = v;
    }
    row.updated_at = new Date().toISOString();
    this.write(s);
    return row;
  }
  async findUserByStripeCustomer(customerId: string) {
    return this.read().subscriptions.find((x) => x.stripe_customer_id === customerId)?.user_id ?? null;
  }
  async addUsage(userId: string, inputTokens: number, outputTokens: number, costCents: number) {
    const s = this.read();
    const t = today();
    let row = s.ai_usage.find((x) => x.user_id === userId && x.day === t);
    if (!row) {
      row = { user_id: userId, day: t, input_tokens: 0, output_tokens: 0, requests: 0, cost_cents: 0 };
      s.ai_usage.push(row);
    }
    row.input_tokens += Math.max(0, Number.isFinite(inputTokens) ? Math.floor(inputTokens) : 0);
    row.output_tokens += Math.max(0, Number.isFinite(outputTokens) ? Math.floor(outputTokens) : 0);
    row.requests += 1;
    row.cost_cents += Math.max(0, Number.isFinite(costCents) ? Math.floor(costCents) : 0);
    this.write(s);
  }
  async getUsageToday(userId: string) {
    const t = today();
    return (
      this.read().ai_usage.find((x) => x.user_id === userId && x.day === t) ??
      { user_id: userId, day: t, input_tokens: 0, output_tokens: 0, requests: 0, cost_cents: 0 }
    );
  }
  async insertStripeEventOnce(eventId: string) {
    const s = this.read();
    if (s.stripe_events.includes(eventId)) return false;
    s.stripe_events.push(eventId);
    this.write(s);
    return true;
  }
  async saveOutcome(o: { user_id: string; got_offer: boolean; testimonial?: string | null }) {
    const s = this.read();
    const row: Outcome = { id: uid(), user_id: o.user_id, got_offer: o.got_offer, testimonial: o.testimonial ?? null, created_at: new Date().toISOString() };
    s.outcomes.push(row);
    this.write(s);
    return row;
  }
  async aggregateOutcomes() {
    const rows = this.read().outcomes;
    return { total: rows.length, offers: rows.filter((x) => x.got_offer).length };
  }
  async countProfiles() {
    return this.read().profiles.length;
  }
  async countSubsByStatus() {
    const out: Record<string, number> = {};
    for (const x of this.read().subscriptions) out[x.status] = (out[x.status] ?? 0) + 1;
    return out;
  }
  async sumUsageSince(dayIso: string) {
    const rows = this.read().ai_usage.filter((x) => x.day >= dayIso);
    return {
      cost_cents: rows.reduce((a, x) => a + x.cost_cents, 0),
      requests: rows.reduce((a, x) => a + x.requests, 0),
    };
  }
  async countSessionsSince(sinceIso: string) {
    return this.read().mock_sessions.filter((x) => x.started_at >= sinceIso).length;
  }
  async deleteAllUserData(userId: string) {
    const s = this.read();
    s.profiles = s.profiles.filter((x) => x.id !== userId);
    s.jobs = s.jobs.filter((x) => x.user_id !== userId);
    s.resumes = s.resumes.filter((x) => x.user_id !== userId);
    s.prep_packs = s.prep_packs.filter((x) => x.user_id !== userId);
    s.mock_sessions = s.mock_sessions.filter((x) => x.user_id !== userId);
    s.mock_answers = s.mock_answers.filter((x) => x.user_id !== userId);
    s.saved_answers = s.saved_answers.filter((x) => x.user_id !== userId);
    s.subscriptions = s.subscriptions.filter((x) => x.user_id !== userId);
    s.ai_usage = s.ai_usage.filter((x) => x.user_id !== userId);
    s.outcomes = s.outcomes.filter((x) => x.user_id !== userId);
    this.write(s);
  }
  async exportUserData(userId: string) {
    const s = this.read();
    return {
      profile: s.profiles.find((x) => x.id === userId) ?? null,
      jobs: s.jobs.filter((x) => x.user_id === userId),
      resumes: s.resumes.filter((x) => x.user_id === userId),
      prep_packs: s.prep_packs.filter((x) => x.user_id === userId),
      mock_sessions: s.mock_sessions.filter((x) => x.user_id === userId),
      mock_answers: s.mock_answers.filter((x) => x.user_id === userId),
      saved_answers: s.saved_answers.filter((x) => x.user_id === userId),
      outcomes: s.outcomes.filter((x) => x.user_id === userId),
    };
  }
  async purgeStaleResumes(cutoffIso: string) {
    const s = this.read();
    const before = s.resumes.length;
    s.resumes = s.resumes.filter((x) => x.created_at >= cutoffIso);
    this.write(s);
    return before - s.resumes.length;
  }
  async listEntitledProfilesWithInterviewDate() {
    const s = this.read();
    const entitled = new Set(
      s.subscriptions.filter((x) => x.status === "trialing" || x.status === "active" || x.status === "past_due").map((x) => x.user_id)
    );
    return s.profiles
      .filter((p) => p.interview_date && entitled.has(p.id))
      .map((p) => ({ id: p.id, email: p.email, interview_date: p.interview_date as string }));
  }
}

/* ------------------------------------------------------------------ */
/* SupabaseDb — real implementation (service role, server only)       */
/* ------------------------------------------------------------------ */

class SupabaseDb implements Db {
  private c: SupabaseClient;
  constructor() {
    this.c = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false },
    });
  }
  private async one<T>(q: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T | null> {
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    return (data as T) ?? null;
  }

  async upsertProfile(p: { id: string; email: string }) {
    const existing = await this.getProfile(p.id);
    if (existing) return existing;
    return (await this.one<Profile>(
      this.c.from("profiles").insert({ id: p.id, email: p.email, referral_code: uid().slice(0, 8) }).select().single()
    ))!;
  }
  async getProfile(userId: string) {
    return this.one<Profile>(this.c.from("profiles").select("*").eq("id", userId).maybeSingle());
  }
  async updateProfile(userId: string, patch: Partial<Profile>) {
    const { id: _id, ...rest } = patch;
    return this.one<Profile>(this.c.from("profiles").update(rest).eq("id", userId).select().single());
  }
  async createJob(j: Parameters<Db["createJob"]>[0]) {
    return (await this.one<Job>(this.c.from("jobs").insert(j).select().single()))!;
  }
  async getJob(id: string, userId: string) {
    return this.one<Job>(this.c.from("jobs").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  }
  async listJobs(userId: string) {
    return (await this.one<Job[]>(this.c.from("jobs").select("*").eq("user_id", userId).order("created_at", { ascending: false }))) ?? [];
  }
  async createResume(r: Parameters<Db["createResume"]>[0]) {
    return (await this.one<Resume>(this.c.from("resumes").insert(r).select().single()))!;
  }
  async getLatestResume(userId: string) {
    return this.one<Resume>(this.c.from("resumes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle());
  }
  async deleteUserResumes(userId: string) {
    await this.one(this.c.from("resumes").delete().eq("user_id", userId));
  }
  async createPrepPack(p: Parameters<Db["createPrepPack"]>[0]) {
    return (await this.one<PrepPack>(this.c.from("prep_packs").insert(p).select().single()))!;
  }
  async getPrepPackByJob(jobId: string, userId: string) {
    return this.one<PrepPack>(this.c.from("prep_packs").select("*").eq("job_id", jobId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle());
  }
  async getPrepPackByHash(userId: string, hash: string) {
    return this.one<PrepPack>(this.c.from("prep_packs").select("*").eq("user_id", userId).eq("content_hash", hash).limit(1).maybeSingle());
  }
  async deletePrepPacksForJob(jobId: string, userId: string) {
    await this.one(this.c.from("prep_packs").delete().eq("job_id", jobId).eq("user_id", userId));
  }
  async createSession(x: Parameters<Db["createSession"]>[0]) {
    return (await this.one<MockSession>(this.c.from("mock_sessions").insert(x).select().single()))!;
  }
  async getSession(id: string, userId: string) {
    return this.one<MockSession>(this.c.from("mock_sessions").select("*").eq("id", id).eq("user_id", userId).maybeSingle());
  }
  async completeSession(id: string, userId: string) {
    await this.one(this.c.from("mock_sessions").update({ completed_at: new Date().toISOString() }).eq("id", id).eq("user_id", userId));
  }
  async countSessionsToday(userId: string) {
    const start = today() + "T00:00:00Z";
    const { count, error } = await this.c.from("mock_sessions").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("started_at", start);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async listSessions(userId: string) {
    return (await this.one<MockSession[]>(this.c.from("mock_sessions").select("*").eq("user_id", userId).order("started_at", { ascending: false }))) ?? [];
  }
  async deleteSession(id: string, userId: string) {
    await this.one(this.c.from("mock_answers").delete().eq("session_id", id).eq("user_id", userId));
    await this.one(this.c.from("mock_sessions").delete().eq("id", id).eq("user_id", userId));
  }
  async createAnswer(a: Parameters<Db["createAnswer"]>[0]) {
    return (await this.one<MockAnswer>(this.c.from("mock_answers").insert(a).select().single()))!;
  }
  async listAnswersBySession(sessionId: string, userId: string) {
    return (await this.one<MockAnswer[]>(this.c.from("mock_answers").select("*").eq("session_id", sessionId).eq("user_id", userId).order("created_at"))) ?? [];
  }
  async listAnswersByUser(userId: string) {
    return (await this.one<MockAnswer[]>(this.c.from("mock_answers").select("*").eq("user_id", userId).order("created_at", { ascending: false }))) ?? [];
  }
  async saveAnswer(a: Parameters<Db["saveAnswer"]>[0]) {
    return (await this.one<SavedAnswer>(this.c.from("saved_answers").insert(a).select().single()))!;
  }
  async listSavedAnswers(userId: string, limit = 500) {
    return (await this.one<SavedAnswer[]>(this.c.from("saved_answers").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit))) ?? [];
  }
  async deleteSavedAnswer(id: string, userId: string) {
    await this.one(this.c.from("saved_answers").delete().eq("id", id).eq("user_id", userId));
  }
  async getSubscription(userId: string) {
    return this.one<Subscription>(this.c.from("subscriptions").select("*").eq("user_id", userId).maybeSingle());
  }
  async upsertSubscription(x: Parameters<Db["upsertSubscription"]>[0]) {
    return (await this.one<Subscription>(
      this.c.from("subscriptions").upsert({ ...x, updated_at: new Date().toISOString() }, { onConflict: "user_id" }).select().single()
    ))!;
  }
  async findUserByStripeCustomer(customerId: string) {
    const row = await this.one<{ user_id: string }>(this.c.from("subscriptions").select("user_id").eq("stripe_customer_id", customerId).maybeSingle());
    return row?.user_id ?? null;
  }
  async addUsage(userId: string, inputTokens: number, outputTokens: number, costCents: number) {
    const { error } = await this.c.rpc("add_ai_usage", {
      p_user_id: userId, p_input: inputTokens, p_output: outputTokens, p_cost_cents: costCents,
    });
    if (error) throw new Error(error.message);
  }
  async getUsageToday(userId: string) {
    const t = today();
    return (
      (await this.one<AiUsageDay>(this.c.from("ai_usage").select("*").eq("user_id", userId).eq("day", t).maybeSingle())) ??
      { user_id: userId, day: t, input_tokens: 0, output_tokens: 0, requests: 0, cost_cents: 0 }
    );
  }
  async insertStripeEventOnce(eventId: string) {
    const { error } = await this.c.from("stripe_events").insert({ id: eventId });
    if (error) {
      if (error.message.includes("duplicate") || error.message.includes("unique")) return false;
      throw new Error(error.message);
    }
    return true;
  }
  async saveOutcome(o: Parameters<Db["saveOutcome"]>[0]) {
    return (await this.one<Outcome>(this.c.from("outcomes").insert(o).select().single()))!;
  }
  async aggregateOutcomes() {
    const rows = (await this.one<{ got_offer: boolean }[]>(this.c.from("outcomes").select("got_offer"))) ?? [];
    return { total: rows.length, offers: rows.filter((x) => x.got_offer).length };
  }
  async countProfiles() {
    const { count, error } = await this.c.from("profiles").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async countSubsByStatus() {
    const rows = (await this.one<{ status: string }[]>(this.c.from("subscriptions").select("status"))) ?? [];
    const out: Record<string, number> = {};
    for (const x of rows) out[x.status] = (out[x.status] ?? 0) + 1;
    return out;
  }
  async sumUsageSince(dayIso: string) {
    const rows = (await this.one<{ cost_cents: number; requests: number }[]>(this.c.from("ai_usage").select("cost_cents, requests").gte("day", dayIso))) ?? [];
    return {
      cost_cents: rows.reduce((a, x) => a + x.cost_cents, 0),
      requests: rows.reduce((a, x) => a + x.requests, 0),
    };
  }
  async countSessionsSince(sinceIso: string) {
    const { count, error } = await this.c.from("mock_sessions").select("id", { count: "exact", head: true }).gte("started_at", sinceIso);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  async deleteAllUserData(userId: string) {
    // storage objects first (resumes + audio are sensitive PII)
    const resumes = (await this.one<Resume[]>(this.c.from("resumes").select("*").eq("user_id", userId))) ?? [];
    const paths = resumes.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
    if (paths.length) await this.c.storage.from("resumes").remove(paths);
    const { data: audio } = await this.c.storage.from("audio").list(userId);
    if (audio?.length) await this.c.storage.from("audio").remove(audio.map((f) => userId + "/" + f.name));
    for (const t of ["mock_answers", "mock_sessions", "prep_packs", "saved_answers", "resumes", "jobs", "outcomes", "ai_usage", "subscriptions"]) {
      await this.one(this.c.from(t).delete().eq("user_id", userId));
    }
    await this.one(this.c.from("profiles").delete().eq("id", userId));
    await this.c.auth.admin.deleteUser(userId).catch(() => undefined);
  }
  async exportUserData(userId: string) {
    const [profile, jobs, resumes, packs, sessions, answers, saved, outcomes] = await Promise.all([
      this.getProfile(userId), this.listJobs(userId),
      this.one<Resume[]>(this.c.from("resumes").select("*").eq("user_id", userId)),
      this.one<PrepPack[]>(this.c.from("prep_packs").select("*").eq("user_id", userId)),
      this.listSessions(userId), this.listAnswersByUser(userId), this.listSavedAnswers(userId),
      this.one<Outcome[]>(this.c.from("outcomes").select("*").eq("user_id", userId)),
    ]);
    return { profile, jobs, resumes, prep_packs: packs, mock_sessions: sessions, mock_answers: answers, saved_answers: saved, outcomes };
  }
  async purgeStaleResumes(cutoffIso: string) {
    const rows = (await this.one<Resume[]>(this.c.from("resumes").select("*").lt("created_at", cutoffIso))) ?? [];
    const paths = rows.map((r) => r.storage_path).filter((p): p is string => Boolean(p));
    if (paths.length) await this.c.storage.from("resumes").remove(paths);
    if (rows.length) await this.one(this.c.from("resumes").delete().lt("created_at", cutoffIso));
    return rows.length;
  }
  async listEntitledProfilesWithInterviewDate() {
    const subs =
      (await this.one<{ user_id: string }[]>(
        this.c.from("subscriptions").select("user_id").in("status", ["trialing", "active", "past_due"])
      )) ?? [];
    const ids = subs.map((s) => s.user_id);
    if (ids.length === 0) return [];
    const rows =
      (await this.one<{ id: string; email: string; interview_date: string }[]>(
        this.c.from("profiles").select("id,email,interview_date").in("id", ids).not("interview_date", "is", null)
      )) ?? [];
    return rows;
  }
}

let _db: Db | null = null;
export function db(): Db {
  if (!_db) _db = has.supabaseAdmin ? new SupabaseDb() : new MockDb();
  return _db;
}
export const isMockDb = () => !has.supabaseAdmin;
