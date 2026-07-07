/**
 * M7 — RLS / tenant-isolation deny-test.
 * Threat model (PLAYBOOK 2.2): a user must never read another user's rows.
 *
 * Two layers are asserted:
 *  1. DATA-ACCESS LAYER: every Db method is scoped by an explicit userId derived
 *     server-side from the verified session. Passing user B's id must never
 *     return user A's resumes / jobs / mock_answers / saved answers / prep packs.
 *     (Runs against the keyless MockDb — the same interface SupabaseDb implements.)
 *  2. SQL POLICY LAYER: the migration enables RLS default-deny on every table
 *     with owner-scoped policies. Asserted structurally (no live Postgres here).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { uid } from "@/lib/utils";
import { db } from "@/lib/providers/db";

const A = "attacker-victim-" + uid();
const B = "attacker-other-" + uid();

describe("data-access layer denies cross-user reads (MockDb / SupabaseDb contract)", () => {
  let victimJobId = "";
  let victimSessionId = "";

  beforeAll(async () => {
    const d = db();
    await d.upsertProfile({ id: A, email: `${A}@example.com` });
    await d.upsertProfile({ id: B, email: `${B}@example.com` });

    const job = await d.createJob({ user_id: A, title: "Secret PM", company: "VictimCo", posting_text: "confidential posting" });
    victimJobId = job.id;
    await d.createResume({ user_id: A, storage_path: null, extracted_text: "VICTIM RESUME — private PII" });
    await d.createPrepPack({ job_id: job.id, user_id: A, questions: [], company_intel: "secret intel", content_hash: "h" });
    const session = await d.createSession({ job_id: job.id, user_id: A, mode: "text" });
    victimSessionId = session.id;
    await d.createAnswer({
      session_id: session.id, user_id: A, question: "Q?", transcript: "victim transcript",
      audio_path: null, scores: null, feedback: "", improved_answer: "",
    });
    await d.saveAnswer({ user_id: A, question: "Saved Q", answer: "victim saved answer", source: "star" });
  });

  it("B cannot read A's job by id", async () => {
    expect(await db().getJob(victimJobId, B)).toBeNull();
    expect(await db().getJob(victimJobId, A)).not.toBeNull(); // owner still can
  });

  it("B's job list excludes A's jobs", async () => {
    const list = await db().listJobs(B);
    expect(list.find((j) => j.user_id === A)).toBeUndefined();
  });

  it("B cannot read A's latest resume (PII isolation)", async () => {
    expect(await db().getLatestResume(B)).toBeNull();
    expect(await db().getLatestResume(A)).not.toBeNull();
  });

  it("B cannot read A's prep pack by job id", async () => {
    expect(await db().getPrepPackByJob(victimJobId, B)).toBeNull();
  });

  it("B cannot read A's mock session or its answers", async () => {
    expect(await db().getSession(victimSessionId, B)).toBeNull();
    expect(await db().listAnswersBySession(victimSessionId, B)).toHaveLength(0);
    expect(await db().listAnswersByUser(B)).toHaveLength(0);
  });

  it("B cannot read A's saved answers", async () => {
    const saved = await db().listSavedAnswers(B);
    expect(saved.find((s) => s.answer.includes("victim"))).toBeUndefined();
  });

  it("B cannot delete A's saved answer or session (scoped mutations)", async () => {
    const aSaved = await db().listSavedAnswers(A);
    expect(aSaved.length).toBeGreaterThan(0);
    await db().deleteSavedAnswer(aSaved[0].id, B); // wrong owner -> no-op
    expect(await db().listSavedAnswers(A)).toHaveLength(aSaved.length);
    await db().deleteSession(victimSessionId, B); // wrong owner -> no-op
    expect(await db().getSession(victimSessionId, A)).not.toBeNull();
  });
});

describe("SQL migration enforces RLS default-deny with owner policies", () => {
  let sql = "";
  beforeAll(() => {
    sql = readFileSync(join(process.cwd(), "supabase/migrations/0001_init.sql"), "utf8");
  });

  const ownerTables = ["jobs", "resumes", "prep_packs", "mock_sessions", "mock_answers", "saved_answers", "subscriptions", "ai_usage", "outcomes"];

  it("enables row level security on every user-data table", () => {
    for (const t of [...ownerTables, "profiles", "stripe_events"]) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`, "i"));
    }
  });

  it("owner-scoped tables gate select on auth.uid() = user_id", () => {
    // policies are generated in a loop; assert the loop covers all owner tables
    for (const t of ownerTables) {
      expect(sql).toContain(`'${t}'`);
    }
    expect(sql).toMatch(/for select using \(auth\.uid\(\) = user_id\)/i);
    expect(sql).toMatch(/for insert with check \(auth\.uid\(\) = user_id\)/i);
  });

  it("profiles are readable only by their owner", () => {
    expect(sql).toMatch(/create policy profiles_select on public\.profiles for select using \(auth\.uid\(\) = id\)/i);
  });

  it("stripe_events has RLS on but no client policy (deny-all by default)", () => {
    expect(sql).toMatch(/alter table public\.stripe_events\s+enable row level security/i);
    expect(sql).not.toMatch(/create policy \w*stripe_events\w*/i);
  });

  it("resume + audio storage buckets are private (not public)", () => {
    expect(sql).toMatch(/insert into storage\.buckets.*'resumes','resumes',false/is);
    expect(sql).toMatch(/insert into storage\.buckets.*'audio','audio',false/is);
  });
});
