/**
 * AI interviewer voice: text-in, audio-out. Gated by entitlement + rate limit
 * like every AI-adjacent route (cost-abuse threat model). Text is capped and
 * is always app-authored question text, never arbitrary user content, so no
 * prompt-injection surface here — but we still cap length defensively.
 */
import { NextResponse } from "next/server";
import { requireEntitled, toErrorResponse, HttpError } from "@/lib/entitlement";
import { voice } from "@/lib/providers/voice";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";

export async function POST(req: Request) {
  try {
    const session = await requireEntitled();
    const rl = rateLimit(`mock_tts:${session.userId}`, LIMITS.ai.limit, LIMITS.ai.windowMs);
    if (!rl.ok) throw new HttpError(429, "Too many requests. Please slow down.");

    const { text } = (await req.json()) as { text?: string };
    if (!text || !text.trim()) throw new HttpError(400, "Missing text.");

    const { audio, mimeType } = await voice().synthesize(text.slice(0, 2000));
    return new NextResponse(new Uint8Array(audio), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
