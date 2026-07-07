/**
 * Rate limiting (PLAYBOOK 2.4): per-key sliding window, stricter on expensive
 * paths. In-memory per server instance — sufficient for a single-region
 * Vercel deployment's abuse profile v1; swap for Upstash Ratelimit when
 * horizontal scale demands it (documented in README).
 */
const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  // periodic sweep so the map can't grow unbounded
  if (now - lastSweep > 60_000) {
    for (const [k, times] of buckets) {
      const alive = times.filter((t) => now - t < 3_600_000);
      if (alive.length === 0) buckets.delete(k);
      else buckets.set(k, alive);
    }
    lastSweep = now;
  }
  const times = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    const oldest = Math.min(...times);
    buckets.set(key, times);
    return { ok: false, remaining: 0, retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  times.push(now);
  buckets.set(key, times);
  return { ok: true, remaining: limit - times.length, retryAfterSeconds: 0 };
}

/** Standard limits per surface. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 }, // 10 attempts / 15 min / key
  ai: { limit: 20, windowMs: 60_000 }, // 20 AI calls / min / user (budget is the real cap)
  upload: { limit: 10, windowMs: 60_000 },
  fetchUrl: { limit: 6, windowMs: 60_000 },
  general: { limit: 120, windowMs: 60_000 },
} as const;

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}
