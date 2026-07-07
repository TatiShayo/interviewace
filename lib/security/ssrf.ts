/**
 * SSRF-guarded external fetch for the job-posting-by-URL feature.
 * BUILD_PROMPT threat model: http(s) only; resolve DNS and block
 * private/loopback/link-local/cloud-metadata ranges; 10s timeout; 2MB cap.
 */
import "server-only";
import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    // loopback, link-local, unique-local, unspecified, v4-mapped handled below
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    const v4 = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) return isPrivateIp(v4[1]);
    return false;
  }
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // malformed -> block
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast/reserved
  return false;
}

export class SsrfBlockedError extends Error {}

export async function assertPublicHost(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError("Only http(s) URLs are allowed");
  }
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) throw new SsrfBlockedError("Blocked IP range");
    return;
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new SsrfBlockedError("Blocked host");
  }
  let addrs: { address: string }[];
  try {
    addrs = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new SsrfBlockedError("Host could not be resolved");
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new SsrfBlockedError("Blocked IP range");
  }
}

/** Fetch an external page with SSRF protections. Returns raw body text. */
export async function fetchExternal(rawUrl: string): Promise<string> {
  const url = new URL(rawUrl);
  await assertPublicHost(url);
  const res = await fetch(url.toString(), {
    redirect: "manual", // do not follow redirects into private ranges
    headers: { "User-Agent": "InterviewAceBot/1.0 (+job posting reader)", Accept: "text/html,text/plain" },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (!loc) throw new Error("Redirect without location");
    const next = new URL(loc, url);
    await assertPublicHost(next);
    const res2 = await fetch(next.toString(), {
      redirect: "manual",
      headers: { "User-Agent": "InterviewAceBot/1.0 (+job posting reader)", Accept: "text/html,text/plain" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res2.ok) throw new Error(`Fetch failed (${res2.status})`);
    return readCapped(res2);
  }
  if (!res.ok) throw new Error(`Fetch failed (${res.status})`);
  return readCapped(res);
}

async function readCapped(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Strip HTML to readable text before it goes anywhere near the LLM. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
