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
  const domain = email.toLowerCase().split("@")[1]?.trim();
  if (!domain) return true;
  if (BASE_BLOCKLIST.has(domain)) return true;
  const extra = (process.env.DISPOSABLE_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return extra.includes(domain);
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}
