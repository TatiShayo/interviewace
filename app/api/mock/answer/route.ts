/**
 * Submit one mock-interview answer: transcribe (if audio) -> score against the
 * calibrated rubric -> rewrite stronger -> persist. Every step re-validates the
 * session's ownership server-side (PLAYBOOK 2.4 object-level auth).
 */
import { NextResponse } from "next/server";
import { requireEntitled, toErrorResponse, HttpError } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { voice } from "@/lib/providers/voice";
import { generateJson } from "@/lib/ai/generate";
import { scoringSchema } from "@/lib/ai/schemas";
import { scoringSystemPrompt, scoringUserPrompt } from "@/lib/prompts";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";
import { track } from "@/lib/providers/analytics";

const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15MB cap (short spoken answers)

export async function POST(req: Request) {
  try {
    const session = await requireEntitled();
    const rl = rateLimit(`mock_answer:${session.userId}`, LIMITS.ai.limit, LIMITS.ai.windowMs);
    if (!rl.ok) throw new HttpError(429, "Too many requests. Please slow down.");

    const contentType = req.headers.get("content-type") ?? "";
    let sessionId: string;
    let question: string;
    let transcript: string;
    const audioPath: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      sessionId = String(form.get("sessionId") ?? "");
      question = String(form.get("question") ?? "");
      const file = form.get("audio");
      if (!(file instanceof Blob)) throw new HttpError(400, "Missing audio.");
      if (file.size > MAX_AUDIO_BYTES) throw new HttpError(400, "Recording too long — keep answers under a few minutes.");
      const buf = Buffer.from(await file.arrayBuffer());
      transcript = await voice().transcribe(buf, file.type || "audio/webm");
      // Persisted audio path is intentionally omitted here (v1: transcript is
      // the durable artifact; raw audio is not retained beyond the request to
      // minimize PII surface — matches the resume-minimization stance).
    } else {
      const body = (await req.json()) as { sessionId?: string; question?: string; transcript?: string };
      sessionId = body.sessionId ?? "";
      question = body.question ?? "";
      transcript = (body.transcript ?? "").trim();
      if (!transcript) throw new HttpError(400, "Please provide an answer.");
    }

    if (!sessionId || !question) throw new HttpError(400, "Missing session or question.");
    const mockSession = await db().getSession(sessionId, session.userId);
    if (!mockSession) throw new HttpError(404, "Session not found.");

    const jobs = await db().listJobs(session.userId);
    const job = jobs.find((j) => j.id === mockSession.job_id) ?? jobs[0] ?? null;

    const out = await generateJson({
      userId: session.userId,
      task: "scoring",
      system: scoringSystemPrompt,
      user: scoringUserPrompt({
        question,
        transcript,
        role: job?.title ?? "this role",
        company: job?.company ?? "the company",
      }),
      schema: scoringSchema,
      maxTokens: 2048,
    });

    const answer = await db().createAnswer({
      session_id: sessionId,
      user_id: session.userId,
      question,
      transcript,
      audio_path: audioPath,
      scores: out.scores,
      feedback: out.feedback,
      improved_answer: out.improved_answer,
    });

    track("mock_answer_scored", session.userId, { session_id: sessionId });

    return NextResponse.json({ answer });
  } catch (e) {
    return toErrorResponse(e);
  }
}
