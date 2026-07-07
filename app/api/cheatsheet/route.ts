/** Streams the one-page cheat-sheet PDF for the user's latest job (feature 13). */
import { NextResponse } from "next/server";
import { requireEntitled, toErrorResponse, HttpError } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { renderCheatSheetPdf } from "@/lib/cheatsheet";

export async function GET() {
  try {
    const session = await requireEntitled();
    const jobs = await db().listJobs(session.userId);
    const job = jobs[0];
    if (!job) throw new HttpError(400, "Generate a prep pack first.");
    const pack = await db().getPrepPackByJob(job.id, session.userId);
    if (!pack) throw new HttpError(400, "Generate a prep pack first.");
    const saved = await db().listSavedAnswers(session.userId);

    const pdf = await renderCheatSheetPdf({
      company: job.company,
      role: job.title,
      companyIntel: pack.company_intel,
      questions: pack.questions,
      bestAnswers: saved,
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="interviewace-cheatsheet-${job.company.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
