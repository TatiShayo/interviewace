# PROJECT_STATE — InterviewAce — AI Interview Prep Copilot (Web-first PWA)

> Single source of truth for build continuity. Update after every milestone.
> A fresh session with zero memory must be able to resume from this file alone.
> Trust the DISK over this file if they ever disagree.

## Status: IN PROGRESS — resumed 2026-07-07

Everything runs with ZERO third-party keys: every provider (AI, voice, DB, auth,
payments, email, analytics, monitoring) has a typed mock behind its interface.
Mock data lives in `.mockdata/` (gitignored).

## Architecture (on disk, committed)
- `lib/env.ts` — typed env access + `has.*` feature flags (key present?).
- `lib/providers/*` — ai (Anthropic claude-sonnet-5 / mock fixtures), voice
  (OpenAI Whisper+TTS / silent-wav mock), db (Supabase service-role / JSON-file
  MockDb), email (Resend / jsonl), analytics (PostHog / jsonl), monitoring
  (Sentry envelope / console), payments (Stripe / dev mock-checkout).
- `lib/auth.ts` — Supabase Auth OR HMAC-cookie + scrypt MockAuth.
- `lib/ai/{generate,schemas}.ts` — central `generateJson` gateway: kill switch,
  per-user daily budget, zod validation + one retry, usage recording.
- `lib/prompts.ts` — all system prompts, untrusted-content delimiters + sanitize.
- `lib/security/{ssrf,ratelimit,disposable}.ts`, `lib/entitlement.ts`, `middleware.ts`.
- `supabase/migrations/0001_init.sql` — full schema + RLS default-deny + storage buckets.
- `app/` — Next 15 App Router. Design system in `app/globals.css` ("executive calm").

## Done
- M0 Scaffold verification: fixed 2 scaffold type errors (Stripe apiVersion,
  implicit-any) + 3 lint errors. Added design system (globals.css), root layout
  (Newsreader+Inter, PWA manifest), UI primitives (components/ui.tsx), landing
  page, supabase migration 0001. `tsc --noEmit` + `eslint` + `next build` all green.

## Next (milestone order — MONEY PATH FIRST)
- M1: 6-step onboarding → blurred-teaser paywall → Stripe trial subscription e2e.
- M2: AI core — prep-pack generation UI with streaming.
- M3: Voice mock — recorder, Whisper mock, TTS mock, scoring, radar summary.
- M4: Modules — STAR builder, answer bank, negotiation, cover letter, dashboard,
  cheat-sheet PDF, interview-day mode, outcome loop.
- M5: Marketing/SEO pages. M6: Polish. M7: Security tests. M8: QA (Playwright e2e).

## NEEDS HUMAN (keys/accounts — build runs on mocks until provided)
See `.env.example` for the full list. Nothing blocks the build; each missing key
just keeps its provider in mock mode.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  — real Postgres/Auth/Storage. Run `supabase/migrations/0001_init.sql` on the project.
- `ANTHROPIC_API_KEY` — real prep-pack/scoring generation (else deterministic mock).
- `OPENAI_API_KEY` — real Whisper transcription + TTS voice (else canned transcript + silent wav).
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{WEEKLY,MONTHLY,LANDJOB}`
  — real checkout/subscriptions (else internal dev mock-checkout that flips to trialing).
- `RESEND_API_KEY` (+ `RESEND_FROM`) — real lifecycle email (else `.mockdata/emails.jsonl`).
- `NEXT_PUBLIC_POSTHOG_KEY` — real analytics (else `.mockdata/events.jsonl`).
- `SENTRY_DSN` — real error monitoring (else console).
- `ADMIN_EMAILS` — comma-separated allowlist for `/admin`.
- `CRON_SECRET` — protects retention/purge cron endpoints.

## NEEDS HUMAN (ops — cannot be done from this environment)
- Vercel project + deploy; set env vars in Vercel dashboard.
- Register Stripe webhook endpoint (`/api/stripe/webhook`) + copy signing secret.
- Create Stripe products/prices for the 3 plans; put price IDs in env.
- Create Supabase project, run the migration, create `resumes` + `audio` buckets (migration does this).
