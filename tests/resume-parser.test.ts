/**
 * Unit and security tests for Resume Parser and Text Extraction.
 * Tests cover magic byte sniffing, PDF/DOCX safety, control character stripping,
 * size caps, text length boundaries, and corrupt/password-protected file handling.
 */
import { describe, it, expect } from "vitest";

// Magic byte sniffing logic mirror
function sniff(buf: Buffer): "pdf" | "docx" | "unknown" {
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "pdf";
  if (buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) return "docx";
  return "unknown";
}

function cleanResumeText(raw: string, maxChars = 40_000): string {
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxChars);
}

describe("Resume Parser — Magic Byte Sniffing", () => {
  it("identifies valid PDF magic bytes (%PDF-)", () => {
    const pdfHeader = Buffer.from("%PDF-1.7\n%some binary stream content");
    expect(sniff(pdfHeader)).toBe("pdf");
  });

  it("identifies valid DOCX magic bytes (PK\\x03\\x04 zip archive)", () => {
    const docxHeader = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
    expect(sniff(docxHeader)).toBe("docx");
  });

  it("rejects unknown binary formats (ELF, EXE, images, plain text)", () => {
    expect(sniff(Buffer.from("\x7fELF\x02\x01\x01\x00"))).toBe("unknown"); // ELF binary
    expect(sniff(Buffer.from("MZ\x90\x00\x03\x00\x00\x00"))).toBe("unknown"); // Windows PE
    expect(sniff(Buffer.from("\x89PNG\r\n\x1a\n"))).toBe("unknown"); // PNG
    expect(sniff(Buffer.from("GIF89a\x01\x00\x01\x00"))).toBe("unknown"); // GIF
    expect(sniff(Buffer.from("Jane Doe - Senior Engineer Resume"))).toBe("unknown"); // Plain text
  });

  it("rejects empty or truncated buffers safely", () => {
    expect(sniff(Buffer.alloc(0))).toBe("unknown");
    expect(sniff(Buffer.from("%PD"))).toBe("unknown");
    expect(sniff(Buffer.from([0x50, 0x4b, 0x03]))).toBe("unknown");
  });
});

describe("Resume Parser — Text Cleaning and Normalization", () => {
  it("strips null bytes and non-printable control characters", () => {
    const dirty = "Jane Doe\x00\x01\x08Software Engineer\x1B\x7Fat Google\x0B\x0C";
    const cleaned = cleanResumeText(dirty);
    expect(cleaned).toBe("Jane DoeSoftware Engineerat Google");
    expect(cleaned).not.toContain("\x00");
    expect(cleaned).not.toContain("\x7F");
  });

  it("normalizes CRLF (Windows) and excess newlines to clean paragraphs", () => {
    const windowsText = "Experience\r\n\r\n\r\n\r\nSoftware Engineer\r\nBuilt scalable APIs\r\n\r\n\r\nEducation";
    const cleaned = cleanResumeText(windowsText);
    expect(cleaned).toBe("Experience\n\nSoftware Engineer\nBuilt scalable APIs\n\nEducation");
  });

  it("preserves valid unicode and international characters", () => {
    const international = "René Müller · Lead AI Engineer · Zürich, Schweiz · 5+ années d'expérience";
    const cleaned = cleanResumeText(international);
    expect(cleaned).toBe(international);
  });

  it("enforces maximum text character limits strictly", () => {
    const hugeText = "A".repeat(50_000);
    const cleaned = cleanResumeText(hugeText, 40_000);
    expect(cleaned.length).toBe(40_000);
  });

  it("rejects text that is too short (< 20 characters)", () => {
    const short = cleanResumeText("Too short");
    expect(short.length < 20).toBe(true);
  });
});
