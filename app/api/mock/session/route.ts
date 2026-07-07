/**
 * Start a mock interview session. Cost guard (BUILD_PROMPT 16): mock sessions
 * capped at 3/day per user, enforced server-side (never trust a client flag).
 * Picks up to 5 questions from the user's latest prep pack.
 */
import { NextResponse } from "next/server";
import { requireEntitled, toErrorResponse, HttpError } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";
import { track } from "@/lib/providers/analytics";

const SESSIONS_PER_DAY = 3;
const QUESTIONS_PER_SESSION = 5;

export async function POST(req: Request) {
  try {
    const session = await requireEntitled();

    const rl = rateLimit(`mock_session:${session.userId}`, LIMITS.ai.limit, LIMITS.ai.windowMs);
    if (!rl.ok) throw new HttpError(429, "Too many requests. Please slow down.");

    const count = await db().countSessionsToday(session.userId);
    if (count >= SESSIONS_PER_DAY) {
      throw new HttpError(429, "You've used all 3 practice sessions for today. Come back tomorrow.");
    }

    const body = (await req.json().catch(() => ({}))) as { jobId?: string; mode?: "voice" | "text" };
    const jobs = await db().listJobs(session.userId);
    const job = body.jobId ? await db().getJob(body.jobId, session.userId) : jobs[0];
    if (!job) throw new HttpError(400, "Generate a prep pack before starting a mock session.");

    const pack = await db().getPrepPackByJob(job.id, session.userId);
    if (!pack || pack.questions.length === 0) {
      throw new HttpError(400, "Generate a prep pack before starting a mock session.");
    }

    // Weighted pick: prioritize behavioral + role-specific (the questions the
    // scoring rubric and negotiation module most benefit from practicing).
    const shuffled = [...pack.questions].sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, QUESTIONS_PER_SESSION);

    const mockSession = await db().createSession({
      job_id: job.id,
      user_id: session.userId,
      mode: body.mode === "text" ? "text" : "voice",
    });

    track("mock_session_started", session.userId, { mode: mockSession.mode, session_id: mockSession.id });

    return NextResponse.json({
      sessionId: mockSession.id,
      company: job.company,
      role: job.title,
      questions: questions.map((q) => ({ question: q.question, category: q.category })),
      remainingToday: SESSIONS_PER_DAY - count - 1,
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
