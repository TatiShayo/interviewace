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
  const safeLimit = Math.max(1, Number.isFinite(limit) ? Math.floor(limit) : 1);
  const safeWindow = Math.max(1000, Number.isFinite(windowMs) ? Math.floor(windowMs) : 60_000);
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
  const times = (buckets.get(key) ?? []).filter((t) => now - t < safeWindow);
  if (times.length >= safeLimit) {
    const oldest = times.length > 0 ? Math.min(...times) : now;
    buckets.set(key, times);
    const retry = Math.max(1, Math.ceil((oldest + safeWindow - now) / 1000));
    return { ok: false, remaining: 0, retryAfterSeconds: retry };
  }
  times.push(now);
  buckets.set(key, times);
  return { ok: true, remaining: safeLimit - times.length, retryAfterSeconds: 0 };
}

/** Standard limits per surface. */
export const LIMITS = {
  auth: { limit: 10, windowMs: 15 * 60_000 }, // 10 attempts / 15 min / key
  ai: { limit: 20, windowMs: 60_000 }, // 20 AI calls / min / user (budget is the real cap)
  // Pre-paywall (unpaid) prep-pack generation. Fires 2 Claude calls each and is
  // the only AI surface reachable before entitlement, so it gets a tighter
  // throttle than the entitled `ai` tier — the per-user daily budget is still
  // the hard cost cap, this bounds burst abuse from throwaway free accounts.
  onboarding: { limit: 5, windowMs: 60_000 },
  upload: { limit: 10, windowMs: 60_000 },
  fetchUrl: { limit: 6, windowMs: 60_000 },
  general: { limit: 120, windowMs: 60_000 },
} as const;

/**
 * Throttle helper for server actions (which return {ok:false} rather than an
 * HTTP status). Returns a friendly error string when over the limit, else null.
 * AI-invoking server actions must call this — the same cost-abuse guard the AI
 * route handlers already enforce.
 */
export const RATE_LIMIT_MESSAGE = "You're going a little fast — give it a few seconds and try again.";
export function limitOr(key: string, tier: { limit: number; windowMs: number }): string | null {
  return rateLimit(key, tier.limit, tier.windowMs).ok ? null : RATE_LIMIT_MESSAGE;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}
