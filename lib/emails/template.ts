/**
 * One shared lifecycle-email template (PLAYBOOK 3.2: "all emails via Resend
 * with a shared, well-designed template"). "Executive calm" typography —
 * Newsreader-style serif headline via web-safe Georgia fallback since email
 * clients don't reliably load custom fonts, navy/porcelain/brass palette.
 */
export function emailShell(args: { preheader: string; heading: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string }): string {
  const { preheader, heading, bodyHtml, ctaLabel, ctaUrl } = args;
  return `<!doctype html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#F7F5F1;font-family:Georgia,'Times New Roman',serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F1;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:#FFFFFF;border-radius:12px;border:1px solid #E4E0D8;overflow:hidden;">
        <tr><td style="background:#0F2A43;padding:20px 28px;">
          <span style="color:#B08D4A;font-size:13px;font-weight:bold;letter-spacing:0.06em;text-transform:uppercase;font-family:Arial,sans-serif;">InterviewAce</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 14px;color:#0F2A43;font-size:24px;line-height:1.3;">${heading}</h1>
          <div style="color:#333333;font-size:15px;line-height:1.6;font-family:Arial,sans-serif;">${bodyHtml}</div>
          ${
            ctaLabel && ctaUrl
              ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:22px;"><tr><td style="background:#0F2A43;border-radius:8px;"><a href="${ctaUrl}" style="display:inline-block;padding:13px 26px;color:#F7F5F1;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">${ctaLabel}</a></td></tr></table>`
              : ""
          }
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #E4E0D8;">
          <p style="margin:0;color:#9AA3AE;font-size:12px;font-family:Arial,sans-serif;">InterviewAce · Your interview is soon. Be ready.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
