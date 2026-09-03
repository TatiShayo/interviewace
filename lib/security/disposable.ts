/**
 * Disposable-email blocklist at signup (BUILD_PROMPT: trial farming guard).
 * Curated list of the highest-volume disposable domains; extend server-side
 * without redeploy via DISPOSABLE_EMAIL_DOMAINS (comma-separated).
 */
const BASE_BLOCKLIST = new Set([
  "mailinator.com", "guerrillamail.com", "guerrillamail.net", "sharklasers.com",
  "10minutemail.com", "10minutemail.net", "temp-mail.org", "tempmail.com",
  "tempmail.dev", "tempmailo.com", "throwawaymail.com", "yopmail.com",
  "yopmail.fr", "getnada.com", "nada.email", "dispostable.com",
  "maildrop.cc", "mailnesia.com", "trashmail.com", "trashmail.de",
  "fakeinbox.com", "mytemp.email", "mohmal.com", "tempinbox.com",
  "spamgourmet.com", "mintemail.com", "mailcatch.com", "emailondeck.com",
  "burnermail.io", "inboxkitten.com", "33mail.com", "tempr.email",
  "discard.email", "spambog.com", "mail-temp.com", "moakt.com",
  "tmpmail.org", "tmpmail.net", "disposablemail.com", "mailsac.com",
]);

export function isDisposableEmail(email: string): boolean {
  if (!email || typeof email !== "string") return true;
  const parts = email.toLowerCase().split("@");
  if (parts.length !== 2) return true;
  const local = parts[0]?.trim();
  const domain = parts[1]?.trim();
  if (!local || !domain) return true;

  const isBlocked = (target: string, blocklist: Set<string> | string[]) => {
    for (const b of blocklist) {
      if (target === b || target.endsWith("." + b)) return true;
    }
    return false;
  };

  if (isBlocked(domain, BASE_BLOCKLIST)) return true;
  const extra = (process.env.DISPOSABLE_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return isBlocked(domain, extra);
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  if (email.length < 5 || email.length > 254) return false;
  // RFC 5322 compatible strict check without whitespace, control chars or invalid dots
  return /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/.test(
    email
  );
}
