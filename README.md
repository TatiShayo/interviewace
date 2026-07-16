# InterviewAce

**AI interview-prep copilot.** Paste a job posting and your resume, get the 15
questions this specific panel is most likely to ask, rehearse them in a scored
voice mock, and walk in with a one-page cheat sheet. Web-first PWA built on
Next.js 15.

> Portfolio note: this is a production-shaped build. Every external dependency
> (LLM, voice, database, auth, payments, email, analytics, monitoring) sits
> behind a typed provider interface with a real implementation **and** a mock,
> so the entire product — signup through scored mock interview — runs end to end
> with **zero third-party API keys**. Mocks persist to a gitignored
> `.mockdata/`.

## What it does
- **Personalized prep pack** — 15 posting-specific questions (behavioral /
  role-specific / culture / curveball) with "why they ask" and a resume-grounded
  answer outline, plus company intel. Cached by `hash(posting+resume)`.
- **Scored voice mock interview** — live-waveform recording (type-instead
  fallback), Whisper transcription, a calibrated 4-dimension rubric, and a
  rewritten-stronger version of your own answer. Radar-chart summary.
- **STAR builder, Answer Bank, salary-negotiation script + recruiter role-play,
  cover-letter / follow-up generator, one-page PDF cheat sheet.**
- **Lifecycle**: interview-date emails (day-before / day-of + cheat sheet /
  day-after), streaks, GDPR export + self-serve deletion.

## Stack
Next.js 15 App Router · TypeScript · Framer Motion · Tailwind-style design tokens
· Supabase (Postgres/Auth/Storage) · Anthropic `claude-sonnet-5` · OpenAI
Whisper/TTS · Stripe · Resend · PostHog · Sentry · Vitest · Playwright.

## Run locally
```bash
npm install
npm run dev        # http://localhost:3000 — runs fully on mocks, no keys needed
```
Add real keys in `.env` (see `.env.example`) to switch any provider from mock to
live; each key is an independent switch.

## Verification gate
```bash
npx tsc --noEmit
npx eslint .
NODE_OPTIONS=--max-old-space-size=4096 npx next build
npx vitest run           # unit + security suites
npx playwright test      # e2e money path
```

## Security posture
Hardened against the LLM-app threat model (see `AUDIT_LOG.md` +
`REVIEW_FINDINGS.md` for the full audit):
- **SSRF** — external URL fetch resolves DNS once, validates the IP, then pins
  the connection to that exact IP (no rebinding TOCTOU); http(s) only,
  private/metadata ranges blocked, 2MB streaming cap, redirects re-validated.
- **Prompt injection** — every untrusted input (posting, resume, fetched page,
  transcript, interview question, negotiation history) is wrapped in
  `<untrusted_content>` delimiters with breakout-tag neutralization; system
  prompts treat delimited content strictly as data.
- **AuthZ / IDOR** — every object access re-checks ownership server-side by a
  session-derived `userId`; Supabase RLS default-deny as a second layer.
- **Cost controls** — per-user daily AI budget enforced server-side and
  serialized (atomic check→spend), per-request max_tokens, kill-switch env flag,
  mock sessions capped 3/day.
- **Uploads** — size cap + magic-byte sniff before parsing; raw resume never
  persisted (extracted text only).
- **Privacy** — no PII in logs/analytics/Sentry; entitlement re-verified on
  every paid route.

## Repo map
- `app/` — App Router (product, API routes, marketing/SEO, `/admin`).
- `lib/` — providers, AI gateway, prompts, security, entitlement.
- `supabase/migrations/0001_init.sql` — schema + RLS + storage buckets.
- `tests/` — unit + security (SSRF, prompt-injection, RLS-deny, budget/kill-switch).
- `e2e/` — Playwright money-path specs.
- `ARCHITECTURE.md` · `AUDIT_LOG.md` · `REVIEW_FINDINGS.md` · `PROJECT_STATE.md`
  · `PLAYBOOK.md`.

## Operating cadence
Weekly funnel review in `/admin` (MRR, trial→paid, AI cost/active-user vs the
15%-of-ARPU target). Kill/scale at $500 after 30 days of real distribution.

## Deploy
Vercel + Supabase + Stripe. Set every var from `.env.example` in the Vercel
dashboard; run the migration on the Supabase project; register the Stripe webhook
and copy the signing secret. Full checklist in `PROJECT_STATE.md` → NEEDS HUMAN.
