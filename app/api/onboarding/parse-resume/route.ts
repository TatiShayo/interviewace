/**
 * Resume file upload — extracts text from PDF (pdf-parse) or DOCX (mammoth)
 * so onboarding isn't limited to paste-only (BUILD_PROMPT feature 11).
 * Runs pre-paywall, so this is gated by requireUser (not requireEntitled) —
 * same as the rest of the onboarding server actions.
 *
 * PLAYBOOK 2.3 upload hygiene: size cap enforced server-side, type verified
 * by magic bytes (not just the client-sent MIME/extension), never persisted
 * to storage here — only the extracted text is kept (matches the paste flow,
 * minimizes PII surface: no raw resume file at rest).
 */
import { NextResponse } from "next/server";
import { requireUser, toErrorResponse, HttpError } from "@/lib/entitlement";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";

const MAX_BYTES = 8 * 1024 * 1024; // 8MB — resumes are short documents
const MAX_TEXT_CHARS = 40_000; // matches the paste-flow cap in onboarding/actions.ts

function sniff(buf: Buffer): "pdf" | "docx" | "unknown" {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  // DOCX (and other OOXML) files are zip archives: magic bytes "PK\x03\x04".
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx";
  return "unknown";
}

export async function POST(req: Request) {
  try {
    const session = await requireUser();
    const rl = rateLimit(`parse_resume:${session.userId}`, LIMITS.upload.limit, LIMITS.upload.windowMs);
    if (!rl.ok) throw new HttpError(429, "Too many uploads. Please slow down.");

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof Blob)) throw new HttpError(400, "No file provided.");
    if (file.size === 0) throw new HttpError(400, "That file is empty.");
    if (file.size > MAX_BYTES) throw new HttpError(400, "That file is too large (max 8MB).");

    const buf = Buffer.from(await file.arrayBuffer());
    const kind = sniff(buf);
    if (kind === "unknown") throw new HttpError(400, "Please upload a PDF or DOCX file.");

    let text: string;
    if (kind === "pdf") {
      const pdfParse = (await import("pdf-parse")).default;
      const parsed = await pdfParse(buf);
      text = parsed.text;
    } else {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer: buf });
      text = result.value;
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_TEXT_CHARS);
    if (text.length < 20) {
      throw new HttpError(400, "We couldn't read text from that file — try pasting your resume instead.");
    }

    return NextResponse.json({ text });
  } catch (e) {
    return toErrorResponse(e);
  }
}
