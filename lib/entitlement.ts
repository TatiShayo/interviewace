/**
 * Server-side auth + entitlement guards for route handlers and layouts.
 * PLAYBOOK 2.2: never trust client-supplied user ids or entitlement flags —
 * every guard derives the user from the verified session and re-checks the
 * subscription in the database.
 */
import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";
import { db } from "@/lib/providers/db";
import { isEntitled, type SubStatus } from "@/lib/types";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

export async function requireUser(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sign in required");
  return session;
}

export async function getSubStatus(userId: string): Promise<SubStatus> {
  const sub = await db().getSubscription(userId);
  return sub?.status ?? "none";
}

/** Guard for all paid features and every AI route (cost-abuse threat model). */
export async function requireEntitled(): Promise<Session> {
  const session = await requireUser();
  const status = await getSubStatus(session.userId);
  if (!isEntitled(status)) throw new HttpError(402, "An active trial or subscription is required");
  return session;
}

/** Uniform error responses: generic messages to clients, details to Sentry. */
export function toErrorResponse(e: unknown): NextResponse {
  if (e instanceof HttpError) {
    return NextResponse.json({ error: e.message }, { status: e.status });
  }
  const msg = e instanceof Error ? e.message : "Unexpected error";
  // Known safe user-facing errors bubble their message; anything else is generic.
  const safe = [
    "Daily AI budget reached",
    "AI features are temporarily disabled",
    "The AI response could not be validated",
    "Only http(s) URLs are allowed",
    "Blocked IP range",
    "Blocked host",
  ].some((p) => msg.startsWith(p));
  return NextResponse.json({ error: safe ? msg : "Something went wrong. Please try again." }, { status: safe ? 400 : 500 });
}
