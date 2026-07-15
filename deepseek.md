# interviewace — DeepSeek Audit

**Date:** 2026-07-13
**Path:** `C:\Users\TATI\Desktop\DEV\interviewace\`
**Stack:** TypeScript / Next.js 15 + Supabase + Anthropic Claude + Stripe
**Tier:** 2 — High
**Dependencies:** None installed

---

## 🔴 Security Vulnerabilities

| Severity | File | Line(s) | Vulnerability | Exact Fix |
|----------|------|---------|---------------|-----------|
| 🟡 MEDIUM | `lib/ai/generate.ts` | 74 | `return JSON.parse(text)` — LLM output parsed without try-catch. Can crash with 500 error. | Wrap: `try { return JSON.parse(text) } catch { throw new Error("AI response was not valid JSON") }`. |
| ✅ | `lib/auth.ts` | — | HMAC-SHA256 session cookies with `scrypt` hashed passwords. Timing-safe comparison. Secure cookie flags. Excellent. | — |
| ✅ | `lib/entitlement.ts` | — | `requireUser()` / `requireEntitled()` server-side guards. Always re-validates session. Good. | — |
| ✅ | `lib/security/ratelimit.ts` | — | Per-user sliding-window rate limiter. Good. | — |
| ✅ | `tests/rls-deny.test.ts` | — | RLS/object-level auth tests (cross-user access denial). Good. | — |
| ✅ | `e2e/helpers.ts` | 27 | `test-password-123` — test-only password, no production exposure. Fine. | — |

---

## 🟠 Performance Issues

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟠 HIGH | `lib/providers/db.ts` | 111-122 | `fs.mkdirSync`, `fs.readFileSync`, `fs.writeFileSync` — synchronous file I/O on every DB operation in serverless. Data lost between invocations. Same pattern in `lib/auth.ts` (66, 72, 131) and `lib/providers/analytics.ts` (18). | Migrate to Supabase-only for production. For dev mock, use in-memory store with async persistence. Remove all sync I/O. |

---

## 🟡 UI/UX Improvements

| Severity | File | Line(s) | Issue | Exact Fix |
|----------|------|---------|-------|-----------|
| 🟠 HIGH | `app/(app)/dashboard/page.tsx` | 115 | **`Suspense fallback={null}`** — dashboard shows blank space while loading. Users see nothing for seconds. | Add skeleton fallback: `<Suspense fallback={<DashboardSkeleton />}>`. |
| 🟡 MEDIUM | `lib/cheatsheet.tsx` | 13-24 | Hardcoded colors (`#0F2A43`, `#B08D4A`, `#333`, `#9AA3AE`) in cheatsheet PDF. | Tokenize or use CSS custom properties. |
| 🟡 MEDIUM | `components/AppNav.tsx` | 46 | Mobile menu may not trap focus when open — keyboard users can tab behind the overlay. | Add focus trap: on open, set `tabIndex={-1}` on background content, focus first menu item. Restore on close. |
| ✅ | `app/globals.css` | 67-70 | Custom `:focus-visible` ring (brass color). Good. | — |
| ✅ | `app/(auth)/AuthForm.tsx` | 40 | `role="alert"` for errors, ARIA labels on icons. Good. | — |

---

## 🔧 Session: 2026-07-14 — Multi-Agent Deep Audit Sweep (Round 1)

### Audit findings (no code changes needed)

| Severity | Finding | Status |
|----------|---------|--------|
| 🟡 | `secret()` mock fallback `"interviewace-dev-secret-not-for-production"` in `lib/auth.ts` — should gate behind production check | Deferred |
| ✅ | Full security headers via `next.config.ts` (CSP, HSTS, X-Frame-Options, Permissions-Policy) | Clean |
| ✅ | Cookie-presence middleware on 12 protected prefixes, server-side verification | Clean |
| ✅ | `error.message` safelist pattern in `lib/entitlement.ts` — only 6 known-safe messages passed through | Clean |
| ✅ | Playwright e2e, vitest, full quality toolkit | Clean |

| Category | Package | Issue | Fix |
|----------|---------|-------|-----|
| 🔴 CRITICAL | `pdf-parse` | **UNMAINTAINED** — last published 2020. No updates in 5+ years. Security risk. | Replace with `pdfjs-dist` (maintained by Mozilla) or `unpdf` (lighter, modern). |
| 🟡 MEDIUM | `mammoth ^1.11.0` | DOCX parser — maintained but heavy. | Keep if DOCX parsing is critical; otherwise remove. |
| 🟡 MEDIUM | `next ^15.5.0` | Loose caret. | Pin. |
| 🟡 MEDIUM | `@anthropic-ai/sdk ^0.60.0` | Loose caret — Anthropic SDK changes frequently. | Pin. |
| 🟡 MEDIUM | `stripe ^18.0.0` | Loose caret — could get breaking changes. | Pin. |
| 🟡 MEDIUM | `recharts ^2.15.0` | Different version from billflow/bookflow/postpilot (^3.8.1). | Consider standardizing across portfolio. |

### Missing Dev Tooling
- No `.nvmrc`

---

## 📋 Priority Fix Queue

1. **[HIGH — Suspense null]** `app/(app)/dashboard/page.tsx:115` — Replace `fallback={null}` with `<DashboardSkeleton />`.
2. **[HIGH — Sync I/O]** `lib/providers/db.ts:111-122` — Remove all sync file I/O. Use in-memory store for mock mode.
3. **[CRITICAL — Unmaintained Dep]** Replace `pdf-parse` with `pdfjs-dist` or `unpdf`.
4. **[MEDIUM — JSON.parse]** `lib/ai/generate.ts:74` — Wrap in try-catch.
5. **[MEDIUM — Colors]** Tokenize hardcoded colors in cheatsheet PDF.
6. **[MEDIUM — Focus Trap]** `components/AppNav.tsx:46` — Add focus trap to mobile menu.
