# InterviewAce — Vision Review (Round 1)

**Date:** 2026-07-24  
**Viewport Targets:** Desktop 1280×800, Mobile 375×812  
**Reviewed by:** Automated Vision-in-the-Loop pipeline

---

## Screenshots Captured

| Page | Desktop | Mobile |
|------|---------|--------|
| Home | ✅ `home_desktop.png` | ✅ `home_mobile.png` |
| Login | ✅ `login_desktop.png` | ✅ `login_mobile.png` |
| Pricing | ✅ `pricing_desktop.png` | ✅ `pricing_mobile.png` |

All 6 screenshots captured successfully at both viewports.

---

## Visual Rubric Review

### ✅ Typography Hierarchy
- **H1 desktop**: Large, bold serif/grotesque `"Your interview is Thursday. Be ready by tonight."` — commanding, high impact, clear hierarchy.
- **H2 sections**: `"Four steps to composure"`, `"How it compares"`, `"Simple pricing"` — consistent sizing, good rhythm.
- **Body text**: Small, legible grey on near-white background. Line-height adequate.
- **Weight variation**: Strong — heavy H1, medium H2, light body, numbered step labels.

### ✅ Color Contrast
- Background: Light grey-white `#F5F5F0` (warm off-white).
- Primary text: Near-black `#1A1A2E` — high contrast, WCAG AA/AAA.
- Accent/highlight: Warm gold/amber used for numbered steps and pricing highlight — decorative, not primary text, acceptable.
- CTA button: Dark navy fill with white text — very high contrast.
- Link text: Gold/amber on off-white — borderline at small sizes, recommend checking at WCAG AA.

### ✅ Primary CTA — Clear per screen
- **Home desktop**: `Build my prep plan` (dark navy, filled) + `See how it works` (ghost) — clear primary/secondary hierarchy, above the fold.
- **Home mobile**: `Build my prep plan` stacks to full-width, above the fold — excellent mobile CTA presence.
- **Pricing**: `Start your free trial` — single unambiguous CTA below tier cards.
- Sticky nav on desktop has `Start prep` button in brand color — always accessible.

### ✅ Responsive Layout (Mobile)
- Hero stacks perfectly: badge → H1 → body → CTAs → fine print — single column, no horizontal overflow.
- Feature steps collapse to single column list — readable.
- Comparison table scrolls horizontally on mobile (acceptable) — column labels present.
- Pricing cards stack vertically with `Most popular` badge preserved.
- Footer minimal, links preserved at mobile.

### ✅ No Emoji as UI Icons
- No emoji used as functional UI elements. Numbered steps (01–04) use text. Clean.

### ✅ No Blank/Undefined States
- No `undefined`, `null`, or empty error states visible on any page.
- All placeholder text and labels are real content.

### ⚠️ Issues Found

| Severity | Page | Issue |
|----------|------|-------|
| **LOW** | Home | Bottom-left `N` avatar (Next.js dev indicator) visible — production build should suppress this. |
| **LOW** | Login | Login page is a redirect to external auth — screenshots show very minimal UI. No loading state for magic link confirmation flow visible. |
| **INFO** | Pricing | Pricing exists inline on homepage — `/pricing` route navigates to the homepage pricing section. This is fine but could benefit from a standalone page for SEO. |

---

## Recommendations

1. **Remove Next.js dev overlay** from production build (`suppressHydrationWarning` or env check).
2. **Add a post-login loading state** — after user enters email, provide a clear "Check your inbox" confirmation screen rather than a blank redirect.
3. **Consider a dedicated `/pricing` page** for better SEO and direct linking.
4. **Audit gold accent at small sizes** — run axe-core or Colour Contrast Analyser on the `#B8900A`-like amber against `#F5F5F0`.

---

## Verdict

**STRONG PASS.** InterviewAce has the best visual execution among Wave 1 projects. The hero is impact-driven with clear hierarchy, the mobile layout is fully responsive with no overflow or stacking issues, and CTAs are unambiguous at every viewport. Minor dev-mode artifacts are the only callouts.
