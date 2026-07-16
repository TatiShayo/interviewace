# ARCHITECTURE — InterviewAce

AI interview-prep copilot. Next.js 15 (App Router) web-first PWA. Every external
dependency has a typed provider interface with a real implementation and a mock,
so the whole product runs with **zero third-party keys** (mocks write to a
gitignored `.mockdata/`).

---

## System overview

```
Browser (App Router, Framer Motion)
  │
  ├─ middleware.ts ............ cookie-presence gate (defense layer 1)
  ├─ app/(app)/layout.tsx ..... requireUser + getSubStatus (layer 2)
  └─ Route handlers / Server Actions
        └─ lib/entitlement.ts .. requireUser / requireEntitled (layer 3, authoritative)
              │
              ├─ lib/ai/generate.ts ... central LLM gateway (budget, retry, validate)
              │     └─ lib/providers/ai.ts ...... Anthropic claude-sonnet-5 | MockAi
              ├─ lib/providers/db.ts .......... Supabase service-role | MockDb (JSON files)
              ├─ lib/providers/voice.ts ....... OpenAI Whisper+TTS | silent-wav mock
              ├─ lib/providers/payments.ts .... Stripe | dev mock-checkout
              ├─ lib/providers/email.ts ....... Resend | jsonl
              ├─ lib/providers/analytics.ts ... PostHog | jsonl
              ├─ lib/providers/monitoring.ts .. Sentry envelope | console
              └─ lib/security/ssrf.ts ......... pinned-IP external fetch (job-posting URL)
```

Provider selection is by env-key presence (`lib/env.ts` `has.*` flags). No code
branch depends on `NODE_ENV`; a key being set is the single switch.

---

## Modules

### `lib/env.ts`
Typed env access + `has.{anthropic,openai,supabase,stripe,resend,posthog,sentry}`
feature flags and `aiKillSwitch`. The only place `process.env` is read for
provider selection.

### `lib/providers/*` — the seam
Each file exports an interface, a real class, a mock class, and a memoized
accessor (`ai()`, `db()`, …). The rest of the app imports only the accessor and
the interface; it never knows which implementation is live.

- **ai.ts** — `claude-sonnet-5` via the official SDK with ephemeral prompt
  caching on system prompts; retry-once-with-backoff on transient upstream
  failures (429/5xx/connection errors only, never 4xx); refusal → throw. Mock
  returns deterministic per-task fixtures and is **inert by construction**
  (never interprets user content — the prompt-injection fail-safe).
- **db.ts** — `SupabaseDb` (service-role) and `MockDb` (JSON files). Every
  per-user method takes an explicit `userId` and filters on it (`.eq("user_id",
  …)`) in BOTH impls on read/update/delete. `add_ai_usage` is an atomic upsert
  RPC on Supabase.
- **voice.ts / payments.ts / email.ts / analytics.ts / monitoring.ts** — same
  real|mock shape.

### `lib/ai/` — the LLM gateway
- **generate.ts** — `generateJson()` is the single choke point for every AI
  call: kill-switch → **per-user daily budget/request cap** → LLM call → usage
  recording → zod validation → one retry with the parse error appended → fail
  closed. The check→spend window is **serialized per user** through an in-memory
  promise chain so concurrent requests can't all pass the budget check before
  any usage lands (atomic budget; documented Postgres-advisory-lock upgrade for
  horizontal scale).
- **schemas.ts** — zod schemas for every task + `extractJson` (tolerant JSON
  extraction from model output).
- **prepPack.ts** — prep-pack generation cached by `hash(posting + resume)`,
  **user-scoped** (`getPrepPackByHash(userId, hash)`) so identical inputs from
  two users never cross-leak.

### `lib/prompts.ts` — trust boundary
All system prompts, server-only. `wrapUntrusted()` + `sanitizeUntrusted()` put
every attacker-controlled input (job posting, resume, fetched page, transcript,
**interview question**, negotiation context/history) inside
`<untrusted_content>` delimiters, neutralize breakout tags (`</untrusted_content>`
→ `[removed]`), strip control chars, and cap length. System prompts instruct the
model to treat delimited content strictly as data.

### `lib/security/`
- **ssrf.ts** — `fetchExternal()` resolves DNS once, validates every IP against
  private/loopback/link-local/CGNAT/metadata/multicast (v4 + v6-mapped), then
  connects to the **pinned IP** via `node:http/https` with a custom `lookup`
  (closes DNS-rebinding TOCTOU). http(s) only, 10s timeout, **2MB streaming
  cap** (socket destroyed mid-body), single manual redirect hop re-validated and
  re-pinned. `htmlToText` strips script/style/comments before any LLM use.
- **ratelimit.ts** — in-memory per-key sliding window with tiered limits (AI,
  upload, fetchUrl, auth). Bounded by an eviction sweep. Per-instance; Upstash
  is the documented scale path.
- **disposable.ts** — disposable-email blocklist for trial abuse.

### `lib/entitlement.ts` — authorization
`requireUser()` (401 if no verified session) and `requireEntitled()` (re-reads
subscription from DB, 402 if not entitled) guard every API route and paid
action. `toErrorResponse()` returns generic messages to clients (details to
Sentry) with an allowlist of safe user-facing messages.

### `lib/emails/`, `lib/cheatsheet.tsx`, `lib/utils.ts`
Shared HTML email shell + one sender per lifecycle trigger; `@react-pdf/renderer`
one-page cheat sheet; `practiceStreak()` and misc helpers.

### `app/`
Next 15 App Router. `(app)/` is the authenticated product (dashboard, prep,
mock, star, answers, negotiation, letters, cheatsheet, settings, outcome).
`app/api/` route handlers. Marketing/SEO + legal pages are static. Design system
in `app/globals.css` ("executive calm"). `/admin` is ADMIN_EMAILS-allowlisted,
aggregate metrics only (no per-user PII).

---

## Data flow — the money path
signup → 6-step onboarding (paste/upload/URL posting + resume) →
`generatePrepPack` (real Claude or deterministic mock, cached by hash) →
blurred-teaser paywall → Stripe Checkout (or dev mock-checkout → `trialing`) →
gated `/dashboard` → voice/text mock (transcribe → score) → answer bank / STAR /
negotiation / letters / cheat-sheet.

## Schema (`supabase/migrations/0001_init.sql`)
`profiles, jobs, resumes, prep_packs, mock_sessions, mock_answers,
saved_answers, subscriptions, stripe_events, ai_usage`. **RLS default-deny** with
owner policies on every table (second layer under the explicit `userId`
filtering). `user_id` (+ recency/hash composite) indexes on every hot table.
`resumes`/`audio` storage buckets private.

## Route gating (defense in depth)
1. `middleware.ts` — cookie presence only (cheap redirect).
2. `app/(app)/layout.tsx` — `requireUser` + entitlement, redirects to
   `/onboarding` or `/paywall`.
3. `lib/entitlement.ts` on every route/action — **authoritative**, re-checks
   session + subscription server-side, never trusts client flags.

## External services
Anthropic (LLM), OpenAI (Whisper/TTS), Supabase (Postgres/Auth/Storage), Stripe
(payments), Resend (email), PostHog (analytics), Sentry (monitoring). All
optional in dev via mocks. Enumerated with setup steps in
`PROJECT_STATE.md` → NEEDS HUMAN.

## Notes / dead code
No unused providers. `purgeStaleResumes` exists on the Db interface but its cron
route is not yet wired (tracked in PROJECT_STATE "Not yet built"). Trial
day-1/day-2 lifecycle senders exist but aren't scheduled yet.
