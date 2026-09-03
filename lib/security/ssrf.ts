/**
 * SSRF-guarded external fetch for the job-posting-by-URL feature.
 * BUILD_PROMPT threat model: http(s) only; resolve DNS and block
 * private/loopback/link-local/cloud-metadata ranges; 10s timeout; 2MB cap.
 */
import "server-only";
import dns from "node:dns/promises";
import net from "node:net";
import http from "node:http";
import https from "node:https";

const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;

export function isPrivateIp(ip: string): boolean {
  if (!ip || typeof ip !== "string") return true;
  const cleanIp = ip.trim().replace(/^\[|\]$/g, "").split("%")[0];
  if (net.isIPv6(cleanIp)) {
    const lower = cleanIp.toLowerCase();
    // loopback, link-local, unique-local, unspecified, documentation, nat64, v4-mapped
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("2001:db8:") || lower.startsWith("64:ff9b:")) return true;
    const v4 = lower.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4) return isPrivateIp(v4[1]);
    return false;
  }
  const parts = cleanIp.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // malformed -> block
  const [a, b, c] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata 169.254.169.254
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && b >= 18 && b <= 19) return true; // Benchmarking (RFC 2544)
  if (a === 192 && b === 0 && c === 2) return true; // TEST-NET-1 (RFC 5737)
  if (a === 198 && b === 51 && c === 100) return true; // TEST-NET-2 (RFC 5737)
  if (a === 203 && b === 0 && c === 113) return true; // TEST-NET-3 (RFC 5737)
  if (a >= 224) return true; // multicast/reserved
  return false;
}

export class SsrfBlockedError extends Error {}

/**
 * Validate the target host and return the vetted IP to pin the connection to.
 * Resolving here AND connecting to this exact address (see pinnedRequest)
 * closes the DNS-rebinding TOCTOU: the IP that was checked is the IP dialed.
 */
export async function assertPublicHost(url: URL): Promise<{ address: string; family: 4 | 6 }> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfBlockedError("Only http(s) URLs are allowed");
  }
  if (net.isIP(url.hostname)) {
    if (isPrivateIp(url.hostname)) throw new SsrfBlockedError("Blocked IP range");
    return { address: url.hostname, family: net.isIPv6(url.hostname) ? 6 : 4 };
  }
  if (url.hostname === "localhost" || url.hostname.endsWith(".local") || url.hostname.endsWith(".internal")) {
    throw new SsrfBlockedError("Blocked host");
  }
  let addrs: { address: string; family: number }[];
  try {
    addrs = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new SsrfBlockedError("Host could not be resolved");
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new SsrfBlockedError("Blocked IP range");
  }
  const pick = addrs[0];
  return { address: pick.address, family: pick.family === 6 ? 6 : 4 };
}

interface PinnedResponse {
  status: number;
  location: string | null;
  body: string;
}

/**
 * HTTP(S) GET that connects to a pre-validated IP while keeping the original
 * hostname for the Host header and TLS SNI/cert validation. The custom
 * `lookup` always returns the pinned address, so no second DNS resolution can
 * swap in a private IP after the check (DNS-rebinding defense). Body is read
 * with a hard streaming byte cap and the socket is destroyed once exceeded.
 */
function pinnedRequest(url: URL, pin: { address: string; family: 4 | 6 }): Promise<PinnedResponse> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": "InterviewAceBot/1.0 (+job posting reader)", Accept: "text/html,text/plain" },
        timeout: TIMEOUT_MS,
        lookup: (_hostname, options, cb) => {
          // Ignore the resolver entirely — connect only to the vetted IP.
          if (typeof options === "object" && options.all) {
            (cb as unknown as (e: null, a: { address: string; family: number }[]) => void)(null, [pin]);
          } else {
            cb(null, pin.address, pin.family);
          }
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > MAX_BYTES) {
            res.destroy(); // stop streaming past the cap
            return;
          }
          chunks.push(chunk);
        });
        const done = () =>
          resolve({
            status: res.statusCode ?? 0,
            location: res.headers.location ?? null,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        res.on("end", done);
        res.on("close", done);
        res.on("error", done); // capped/destroyed streams still return what we have
      }
    );
    req.on("timeout", () => req.destroy(new Error("Fetch timed out")));
    req.on("error", reject);
    req.end();
  });
}

/** Fetch an external page with SSRF protections. Returns raw body text. */
export async function fetchExternal(rawUrl: string): Promise<string> {
  const url = new URL(rawUrl);
  const pin = await assertPublicHost(url);
  const res = await pinnedRequest(url, pin);
  if (res.status >= 300 && res.status < 400) {
    // One manual redirect hop, re-validated and re-pinned — never auto-follow
    // into private ranges.
    if (!res.location) throw new Error("Redirect without location");
    const next = new URL(res.location, url);
    const pin2 = await assertPublicHost(next);
    const res2 = await pinnedRequest(next, pin2);
    if (res2.status < 200 || res2.status >= 300) throw new Error(`Fetch failed (${res2.status})`);
    return res2.body;
  }
  if (res.status < 200 || res.status >= 300) throw new Error(`Fetch failed (${res.status})`);
  return res.body;
}

/** Strip HTML to readable text before it goes anywhere near the LLM. */
export function htmlToText(html: string): string {
  if (!html || typeof html !== "string") return "";
  const bounded = html.slice(0, 500_000);
  return bounded
    .replace(/<script\b[^>]*>[\s\S]*?(?:<\/script>|$)/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?(?:<\/style>|$)/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?(?:<\/noscript>|$)/gi, " ")
    .replace(/<!--[\s\S]*?(?:-->|$)/g, " ")
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
