/** Mark a mock session complete once all questions are answered. */
import { NextResponse } from "next/server";
import { requireEntitled, toErrorResponse, HttpError } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireEntitled();
    const { id } = await params;
    const mockSession = await db().getSession(id, session.userId);
    if (!mockSession) throw new HttpError(404, "Session not found.");
    await db().completeSession(id, session.userId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return toErrorResponse(e);
  }
}
