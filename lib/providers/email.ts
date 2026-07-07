/**
 * Email provider. Real: Resend REST API. Mock: writes to .mockdata/emails.jsonl
 * (this is how lifecycle emails are verified in staging — PLAYBOOK 6).
 * All product emails share one template: lib/emails/template.ts.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";
import { env, has } from "@/lib/env";
import { reportError } from "@/lib/providers/monitoring";

export interface EmailAttachment {
  filename: string;
  content: string; // base64
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}): Promise<{ ok: boolean; mock: boolean }> {
  if (!has.resend) {
    try {
      const dir = path.join(process.cwd(), ".mockdata");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.appendFileSync(
        path.join(dir, "emails.jsonl"),
        JSON.stringify({
          to: args.to,
          subject: args.subject,
          html: args.html.slice(0, 2000),
          attachments: (args.attachments ?? []).map((a) => a.filename),
          ts: new Date().toISOString(),
        }) + "\n"
      );
    } catch {
      /* ignore */
    }
    return { ok: true, mock: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFrom,
        to: [args.to],
        subject: args.subject,
        html: args.html,
        attachments: args.attachments?.map((a) => ({ filename: a.filename, content: a.content })),
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}`);
    return { ok: true, mock: false };
  } catch (e) {
    reportError(e, { area: "email" });
    return { ok: false, mock: false };
  }
}
