/**
 * Job-posting-by-URL — server-side fetch + HTML-to-text extraction so
 * onboarding isn't paste-only (BUILD_PROMPT feature 11). SSRF-guarded via
 * lib/security/ssrf.ts (http(s) only, DNS-resolved and private/loopback/
 * link-local/cloud-metadata ranges blocked, 10s timeout, 2MB cap — all
 * enforced inside fetchExternal). Graceful fallback: on any failure the
 * client falls back to manual paste, never a dead end.
 */
import { NextResponse } from "next/server";
import { requireUser, toErrorResponse, HttpError } from "@/lib/entitlement";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";
import { fetchExternal, htmlToText, SsrfBlockedError } from "@/lib/security/ssrf";

const MAX_TEXT_CHARS = 40_000;

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const rl = rateLimit(`parse_posting_url:${session.userId}`, LIMITS.fetchUrl.limit, LIMITS.fetchUrl.windowMs);
    if (!rl.ok) throw new HttpError(429, "Too many requests. Please slow down.");

    const body = (await req.json().catch(() => ({}))) as { url?: string };
    const raw = (body.url ?? "").trim();
    if (!raw) throw new HttpError(400, "Please provide a URL.");

    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      throw new HttpError(400, "That doesn't look like a valid URL.");
    }

    let html: string;
    try {
      html = await fetchExternal(url.toString());
    } catch (e) {
      if (e instanceof SsrfBlockedError) throw new HttpError(400, e.message);
      throw new HttpError(400, "We couldn't reach that page — try pasting the posting text instead.");
    }

    const text = htmlToText(html).slice(0, MAX_TEXT_CHARS);
    if (text.length < 40) {
      throw new HttpError(400, "That page didn't have enough readable text — try pasting the posting instead.");
    }

    return NextResponse.json({ text });
  } catch (e) {
    return toErrorResponse(e);
  }
}
