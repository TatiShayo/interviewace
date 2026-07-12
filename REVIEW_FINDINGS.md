# REVIEW_FINDINGS — Security + Reliability Review (2026-07-12)

Scope: full pass over PLAYBOOK Part 2 checklist — IDOR, prompt injection, SSRF,
upload hygiene, token budget, entitlement, PII, rate limiting — plus
reliability/perf (cache scoping, pagination, indexes, retries, error boundaries).

Severity: HIGH = exploitable with real impact; MEDIUM = exploitable under
realistic conditions or defense-in-depth gap; LOW = hardening; INFO = verified OK.

---

## HIGH

### H1. SSRF DNS-rebinding TOCTOU in `lib/security/ssrf.ts`
`assertPublicHost` resolves the hostname and validates every IP, but the
subsequent `fetch(url)` performs its **own, independent DNS resolution**. An
attacker-controlled DNS server can answer the validation lookup with a public
IP and the fetch-time lookup with `127.0.0.1` / `169.254.169.254` (classic
rebinding, TTL 0), reaching internal services and cloud metadata. The same gap
applies to the single followed redirect.
**Fix:** resolve once, validate, then connect to the *pinned* IP via
`node:http/https` with a custom `lookup` that always returns the validated
address (TLS `servername` stays the hostname so cert validation still works).
**Status: FIXED** — `fetchExternal` rewritten around a pinned-IP requester;
redirect hop re-validates and re-pins.

## MEDIUM

### M1. Prompt injection via client-supplied `question` (scoring + STAR routes)
`POST /api/mock/answer` and the STAR `suggestStarSection` action accept a
free-text `question` field from the client. `scoringUserPrompt` /
`starSuggestUserPrompt` interpolated it into the **trusted** zone of the user
prompt (only `"`→`'` replaced), outside the `<untrusted_content>` delimiters —
unlike every other user-supplied input. A crafted "question" could carry
instructions the model treats as trusted task context (e.g. force 10/10 scores,
exfiltrate the system prompt into `improved_answer`).
**Fix:** wrap `question` in `wrapUntrusted(...)` in both prompts (and the
letters `extra` path was already wrapped; job title/company are LLM-parsed
short strings — now length-capped + newline-stripped before interpolation).
**Status: FIXED** — `lib/prompts.ts`.

### M2. Per-user AI budget check is not atomic (`lib/ai/generate.ts`)
`assertBudget` (read) and `addUsage` (write) are separate steps; N concurrent
requests all pass the check before any usage lands, so a user can overshoot
`AI_DAILY_BUDGET_CENTS` by up to N× the priciest call. Rate limiting (20/min)
bounds it but doesn't close it.
**Fix:** serialize per-user AI calls through an in-memory per-user promise
chain (single instance today; documented Upstash/`select for update` upgrade
path for horizontal scale). Budget is now check→spend under the lock.
**Status: FIXED**.

## LOW

### L1. `CRON_SECRET` compared with `!==` (timing side-channel)
`app/api/cron/lifecycle/route.ts` compared the bearer token with string
equality. **Fix:** constant-time compare via `crypto.timingSafeEqual`.
**Status: FIXED**.

### L2. Unbounded text-mode transcript accepted by `/api/mock/answer`
JSON-mode `transcript` had no server-side length cap before DB persistence
(prompt layer caps at 60k chars, but the stored row didn't). **Fix:** reject
transcripts > 20k chars with a friendly 400. **Status: FIXED**.

### L3. `clientIp()` trusts `x-forwarded-for`
Spoofable when not behind a trusted proxy; on Vercel the platform sets it, so
per-IP limits hold in the target deployment. Documented; no code change.
**Status: ACCEPTED (documented)**.

### L4. Dev mock-checkout is a state-changing GET
`/api/dev/mock-checkout` flips the sub to `trialing` on GET (CSRF-shaped), but
it hard-404s whenever Stripe is configured, so it is unreachable in production.
**Status: ACCEPTED (dev-only by construction)**.

### L5. In-memory rate limiter / budget lock are per-instance
Both reset on deploy and don't coordinate across instances. Acceptable for a
single-region v1 (documented in code + README); swap for Upstash Ratelimit at
scale. Sweep keeps the map bounded (hour-old entries evicted, empty keys
deleted). **Status: ACCEPTED (documented)**.

## INFO — audited, found correct

- **IDOR:** every `Db` method on jobs / resumes / prep_packs / mock_sessions /
  mock_answers / saved_answers takes an explicit `userId` and filters on it in
  BOTH MockDb and SupabaseDb (`.eq("user_id", …)` on read, update, delete).
  All routes/actions derive `userId` from `requireUser`/`requireEntitled`,
  never from client input. Supabase RLS is default-deny with owner policies
  as a second layer.
- **Prompt-injection delimiters:** negotiation (offer/market/location/context/
  history), cover-letter (posting/resume/extra), STAR (draft/resume), scoring
  (transcript), parse-job (posting), prep-pack (posting/resume) all wrapped in
  `<untrusted_content>` with breakout-tag neutralization + control-char strip
  (`sanitizeUntrusted`). Fetched URLs pass through `htmlToText` (script/style/
  noscript/comments stripped) before any LLM use. (M1 was the one gap.)
- **SSRF (other properties):** http(s)-only, private/loopback/link-local/
  CGNAT/metadata/multicast v4 + v6 (incl. v4-mapped) blocked, malformed IPs
  fail closed, redirects not auto-followed (single manual hop, re-validated),
  10s timeout, 2MB **streaming** cap (reader cancelled mid-body).
- **Resume upload:** 8MB cap checked before parsing, magic-byte sniff (`%PDF-`
  / `PK\x03\x04`) before `pdf-parse`/`mammoth` dynamic import, text-only
  output capped at 40k chars, raw file never persisted. `Blob.size` reflects
  actual received bytes, so the cap holds pre-parse.
- **Entitlement:** `requireEntitled()` re-reads session + subscription from DB
  on every AI/paid route and mock session/answer/tts/cheatsheet; middleware is
  cookie-presence only by design (defense in depth via layout + per-route).
- **Stripe:** webhook signature verified, idempotent via `stripe_events`
  insert-once, prices/plans server-side only.
- **Prep-pack cache:** `getPrepPackByHash(userId, hash)` is user-scoped in
  both DB impls — no cross-user leakage even for identical posting+resume.
- **PII:** analytics events carry ids/flags only (no email/resume text);
  Sentry reporter sends message + tags only (no request bodies); the only
  `console.error` is the mock monitoring sink. Cron email sender fetches
  scoped fields (`id,email,interview_date`) rather than full profiles.
- **DB indexes:** user_id (+ recency/hash composites) indexes exist on every
  hot table in `supabase/migrations/0001_init.sql`; `add_ai_usage` is an
  atomic upsert RPC.
