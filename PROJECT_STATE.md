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
- `lib/ai/{generate,schemas,prepPack}.ts` — central `generateJson` gateway: kill
  switch, per-user daily budget, zod validation + one retry, usage recording;
  prep-pack generation cached by hash(posting+resume).
- `lib/prompts.ts` — all system prompts (prep-pack, scoring, STAR suggest,
  negotiation + roleplay, cover letter, follow-up, parse-job), untrusted-content
  delimiters + sanitize.
- `lib/security/{ssrf,ratelimit,disposable}.ts`, `lib/entitlement.ts`, `middleware.ts`.
- `lib/emails/{template,lifecycle}.ts` — shared HTML email shell + one sender
  per lifecycle trigger (pack ready, weakest-question nudge, readiness
  progress, day-before, day-of + cheat-sheet attachment, day-after survey,
  win-back).
- `lib/cheatsheet.tsx` — @react-pdf/renderer one-page cheat sheet.
- `supabase/migrations/0001_init.sql` — full schema + RLS default-deny + storage buckets.
- `app/` — Next 15 App Router. Design system in `app/globals.css` ("executive calm").
- Route gating (defense in depth): `middleware.ts` (cookie presence only) →
  `app/(app)/layout.tsx` (`requireUser` + `getSubStatus`/`isEntitled`, redirects
  to `/onboarding` or `/paywall`) → `lib/entitlement.ts` `requireEntitled()` on
  every paid/API route (re-checks session + subscription server-side, never
  trusts client flags).

## Done
- **M0** Scaffold verification: fixed 2 scaffold type errors (Stripe apiVersion,
  implicit-any) + 3 lint errors. Added design system (globals.css), root layout
  (Newsreader+Inter, PWA manifest), UI primitives (components/ui.tsx), landing
  page, supabase migration 0001.
- **M1** Money path end-to-end: auth pages (signup/login, server actions) →
  6-step onboarding wizard (role → experience → interview date → biggest fear →
  interview type → paste posting/resume → animated "Building your prep plan"
  that generates a REAL pack via `generatePrepPack`) → blurred-teaser paywall
  (3 real questions unlocked + rest locked with category labels, letterpress
  card, plan comparison, placeholder-marked testimonial) → Stripe Checkout
  (`lib/providers/payments.ts`, mock-checkout dev route flips sub to
  `trialing`) → `/dashboard` with countdown, readiness score, next-best-action,
  answer-bank stored-value nudge. Verified: fresh user completes onboarding and
  lands on a gated dashboard after mock trial start.
- **M2** Prep-pack full UI (`app/(app)/prep/`): staggered spring-reveal question
  cards, category filter tabs, regenerate (re-runs the cached pipeline),
  save-outline-to-answer-bank per card, company intel block.
- **M3** Voice mock interview (`app/(app)/mock/`, `app/api/mock/*`): session
  start caps mock sessions at 3/day server-side and picks 5 questions from the
  latest prep pack; `Recorder.tsx` does live-waveform MediaRecorder capture
  with a type-instead fallback; `InterviewerOrb.tsx` is the signature breathing
  orb (speaking/listening/thinking states, respects reduced-motion);
  `/api/mock/answer` transcribes (voice provider) then scores via the
  calibrated rubric; session summary (`ScoreRadar.tsx`) counts scores up with
  spring physics into a recharts radar chart.
- **M4** Modules:
  - `app/(app)/star/` — guided Situation/Task/Action/Result builder, one AI
    suggestion button per section (resume-grounded, never fabricates).
  - `app/(app)/answers/` — searchable Answer Bank, delete, stored-value framing.
  - `app/(app)/negotiation/` — script generator (opening/counter/phrases/email/
    walk-away) + hardball-recruiter role-play chat.
  - `app/(app)/letters/` — cover letter + follow-up email generator, tone
    selector, copy button.
  - `app/(app)/cheatsheet/` + `app/api/cheatsheet/` — one-page PDF (top 8
    questions, saved answers, company facts, 3 questions to ask, app-watermark
    footer).
  - `app/(app)/settings/` — Stripe billing portal, pause-instead-of-cancel
    (keeps answer bank), GDPR data export (JSON download) + account deletion,
    referral code surfaced.
  - `app/(app)/outcome/` + dashboard wiring — one-question "got the offer?"
    survey (YES → testimonial request + referral code; NO → regenerate-prep
    CTA), shown via `?outcome=1` (day-after email link) or once the interview
    date has passed.
  - `app/(app)/dashboard/FlashcardMode.tsx` — day-of interview-day mode: the
    whole dashboard swaps to a condensed flip-through flashcard review of the
    answer bank.
  - `app/(app)/dashboard/page.tsx` — 4-metric row (countdown, readiness,
    answer bank, practice streak via `lib/utils.ts` `practiceStreak()` —
    consecutive days with a mock session).
  - `lib/emails/lifecycle.ts` + `app/api/cron/lifecycle/` — CRON_SECRET-gated
    daily cron sends day-before/day-of(+cheat-sheet attachment)/day-after
    emails by scanning `db().listEntitledProfilesWithInterviewDate()` (added
    to the Db interface, scoped fields only — never a full profile dump).
- **Verification gate passed after every milestone above**: `tsc --noEmit`,
  `eslint .`, and `npm run build` (full `next build`, 24 routes) all exit 0 as
  of the last commit on this branch.
- **M6 (in progress)** `/admin` internal metrics page (`app/admin/page.tsx`):
  ADMIN_EMAILS-allowlist gated (redirects to /dashboard if not allowlisted,
  /login if unauthenticated), MRR estimate (blended plan pricing x active
  subs — no per-plan breakdown is stored by design, avoids a full
  subscription-row dump), trials active, trial→paid conversion %, mock
  sessions/24h, AI cost per active user (30d) + % of ARPU vs the 15% target,
  subscription status breakdown, outcome-survey offer rate. Uses only the
  aggregate `Db` methods already built for this (`countProfiles`,
  `countSubsByStatus`, `sumUsageSince`, `countSessionsSince`,
  `aggregateOutcomes`) — no per-user PII rendered.
- **M6 (in progress)** Resume upload + job-posting-by-URL (BUILD_PROMPT
  feature 11): `app/api/onboarding/parse-resume/route.ts` accepts PDF/DOCX
  (magic-byte sniffed, 8MB cap, text-only extraction — no raw file persisted),
  `app/api/onboarding/parse-posting-url/route.ts` calls the existing
  SSRF-guarded `fetchExternal`/`htmlToText` (`lib/security/ssrf.ts`). Both
  gated by `requireUser` (pre-paywall) + the `upload`/`fetchUrl` rate-limit
  tiers. `app/onboarding/Wizard.tsx` gained a URL-fetch input above the
  posting textarea and a file-upload dropzone above the resume textarea;
  paste remains the fallback on any failure (never a dead end).

## Next (milestone order)
- M5: Marketing/SEO — landing page polish (hero demo loop, pricing, FAQ,
  comparison table) + 5 SEO pages (amazon-interview-questions-prep,
  star-method-practice, ai-mock-interview, salary-negotiation-script,
  behavioral-interview-practice).
- M6: Polish — motion/micro-interaction pass, empty/error states, PLAYBOOK
  screenshot test on every screen.
- M7: Security tests — prompt-injection fixtures, SSRF test, RLS deny-test,
  token-budget test.
- M8: QA — Playwright e2e (signup → onboarding → trial checkout → prep pack →
  text-mode mock → scores), unit tests for AI JSON parsing with fixtures.

## Not yet built (tracked, not started)
- `analytics.md` documenting every PostHog event (PLAYBOOK Part 5) — events
  are already being fired (`track(...)` calls throughout) but not catalogued.
- Trial day-1/day-2 lifecycle emails (weakest-question nudge, readiness
  progress) and the win-back email are implemented as senders in
  `lib/emails/lifecycle.ts` but have no cron/trigger wired up yet — only the
  interview-date-based emails are scheduled via `/api/cron/lifecycle`.

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
- `ADMIN_EMAILS` — comma-separated allowlist for `/admin` (page not built yet).
- `CRON_SECRET` — protects `/api/cron/lifecycle` (built) and retention/purge
  cron endpoints (purge logic exists on Db as `purgeStaleResumes`, not yet
  wired to a scheduled route).

## NEEDS HUMAN (ops — cannot be done from this environment)
- Vercel project + deploy; set env vars in Vercel dashboard.
- Register Stripe webhook endpoint (`/api/stripe/webhook`) + copy signing secret.
- Create Stripe products/prices for the 3 plans; put price IDs in env.
- Create Supabase project, run the migration, create `resumes` + `audio` buckets (migration does this).
- Schedule `/api/cron/lifecycle` to run daily (Vercel Cron or external scheduler) once deployed.
