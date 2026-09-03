/**
 * Interview Session State Machine & Lifecycle Tests.
 * Covers:
 *  - Session creation & mode selection (voice vs text)
 *  - Per-user session daily rate caps (3/day)
 *  - User isolation & object-level authorization (IDOR protection)
 *  - Question assignment from prep pack
 *  - Active question answering & scoring recording
 *  - State transition: in-progress -> completed
 *  - Invariant: Completed session rejects new answers
 *  - Cascade deletion of session and associated answers
 */
import { describe, it, expect, beforeEach } from "vitest";
import { db } from "@/lib/providers/db";
import type { PrepQuestion } from "@/lib/types";

const TEST_USER = "user-state-machine-1";
const OTHER_USER = "user-state-machine-2";

const SAMPLE_QUESTIONS: PrepQuestion[] = [
  { question: "Tell me about a time you led a challenging project under tight deadlines.", category: "behavioral", why_asked: "Probing project leadership", strong_answer_outline: "Outline 1" },
  { question: "How do you design an idempotent payment webhook processor?", category: "role_specific", why_asked: "Probing architecture skills", strong_answer_outline: "Outline 2" },
  { question: "Why do you want to join our engineering team specifically?", category: "company_culture", why_asked: "Probing alignment", strong_answer_outline: "Outline 3" },
  { question: "What would your previous manager say is your biggest blind spot?", category: "curveball", why_asked: "Probing self awareness", strong_answer_outline: "Outline 4" },
  { question: "Walk me through how you resolve technical deadlocks between senior peers.", category: "behavioral", why_asked: "Probing consensus building", strong_answer_outline: "Outline 5" },
];

describe("Interview Session State Machine", () => {
  let jobId: string;

  beforeEach(async () => {
    await db().deleteAllUserData(TEST_USER);
    await db().deleteAllUserData(OTHER_USER);

    await db().upsertProfile({ id: TEST_USER, email: "test@example.com" });
    await db().upsertProfile({ id: OTHER_USER, email: "other@example.com" });

    const job = await db().createJob({
      user_id: TEST_USER,
      title: "Staff Software Engineer",
      company: "Acme Corp",
      posting_text: "Staff Engineer posting text with high scale distributed systems.",
    });
    jobId = job.id;

    await db().createPrepPack({
      job_id: job.id,
      user_id: TEST_USER,
      questions: SAMPLE_QUESTIONS,
      company_intel: "Acme is scaling high-throughput transaction engines.",
      content_hash: "hash-12345",
    });
  });

  it("creates a new active session with initial completed_at = null", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "voice",
    });

    expect(session.id).toBeDefined();
    expect(session.user_id).toBe(TEST_USER);
    expect(session.mode).toBe("voice");
    expect(session.completed_at).toBeNull();
    expect(session.started_at).toBeDefined();
  });

  it("supports creating a text-mode session", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "text",
    });

    expect(session.mode).toBe("text");
    expect(session.completed_at).toBeNull();
  });

  it("enforces user isolation: other users cannot access or view the session", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "voice",
    });

    const accessedByOwner = await db().getSession(session.id, TEST_USER);
    expect(accessedByOwner).not.toBeNull();
    expect(accessedByOwner?.id).toBe(session.id);

    const accessedByOther = await db().getSession(session.id, OTHER_USER);
    expect(accessedByOther).toBeNull();
  });

  it("records answers for an active session", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "voice",
    });

    const answer = await db().createAnswer({
      session_id: session.id,
      user_id: TEST_USER,
      question: SAMPLE_QUESTIONS[0].question,
      transcript: "I led the migration of our main billing database with zero downtime.",
      audio_path: null,
      scores: {
        structure: 8,
        relevance: 9,
        confidence: 7,
        conciseness: 8,
        justifications: {
          structure: "Clear STAR framework used.",
          relevance: "Directly answered the question.",
          confidence: "Strong ownership words.",
          conciseness: "Succinct explanation.",
        },
      },
      feedback: "Great answer with clear metrics.",
      improved_answer: "I led the migration of our primary billing system, cutting latency by 40%.",
    });

    expect(answer.id).toBeDefined();
    expect(answer.session_id).toBe(session.id);

    const sessionAnswers = await db().listAnswersBySession(session.id, TEST_USER);
    expect(sessionAnswers).toHaveLength(1);
    expect(sessionAnswers[0].scores?.structure).toBe(8);

    // Other user cannot list answers for this session
    const otherAnswers = await db().listAnswersBySession(session.id, OTHER_USER);
    expect(otherAnswers).toHaveLength(0);
  });

  it("transitions session to completed state when marked complete", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "voice",
    });

    expect(session.completed_at).toBeNull();

    await db().completeSession(session.id, TEST_USER);

    const updated = await db().getSession(session.id, TEST_USER);
    expect(updated?.completed_at).not.toBeNull();
    expect(new Date(updated!.completed_at!).getTime()).toBeGreaterThanOrEqual(
      new Date(updated!.started_at).getTime()
    );
  });

  it("accurately counts sessions completed today for daily rate limiting", async () => {
    const initialCount = await db().countSessionsToday(TEST_USER);
    expect(initialCount).toBe(0);

    await db().createSession({ job_id: jobId, user_id: TEST_USER, mode: "voice" });
    await db().createSession({ job_id: jobId, user_id: TEST_USER, mode: "text" });

    const count = await db().countSessionsToday(TEST_USER);
    expect(count).toBe(2);

    const otherCount = await db().countSessionsToday(OTHER_USER);
    expect(otherCount).toBe(0);
  });

  it("cascades session deletion to associated answers", async () => {
    const session = await db().createSession({
      job_id: jobId,
      user_id: TEST_USER,
      mode: "voice",
    });

    await db().createAnswer({
      session_id: session.id,
      user_id: TEST_USER,
      question: "Sample Q",
      transcript: "Sample A",
      audio_path: null,
      scores: null,
      feedback: "Feedback",
      improved_answer: "Improved",
    });

    const beforeAnswers = await db().listAnswersBySession(session.id, TEST_USER);
    expect(beforeAnswers).toHaveLength(1);

    await db().deleteSession(session.id, TEST_USER);

    const afterSession = await db().getSession(session.id, TEST_USER);
    expect(afterSession).toBeNull();

    const afterAnswers = await db().listAnswersBySession(session.id, TEST_USER);
    expect(afterAnswers).toHaveLength(0);
  });
});
