import { test, expect } from "@playwright/test";

/**
 * M8 — end-to-end money path against mock providers (zero third-party keys):
 *   signup -> 6-step onboarding -> real prep pack -> blurred-teaser paywall ->
 *   mock trial checkout -> entitled dashboard -> text-mode mock -> scores.
 *
 * This is the Definition-of-Done happy path from BUILD_PROMPT. It uses the
 * text-mode fallback in the mock (headless has no microphone) and the internal
 * dev mock-checkout (no Stripe key) which flips the subscription to `trialing`.
 */

const JOB_POSTING = `Senior Product Manager — Growth at Northwind Labs.
We are hiring a Senior PM to own our activation and onboarding funnel. You will
run discovery with customers, define the roadmap, partner with engineering and
design, and ship measurable improvements to trial-to-paid conversion. You should
have 5+ years of product management experience, strong SQL and experimentation
skills, and a track record of shipping growth features at scale. Bonus: prior
experience with PLG motions and subscription pricing.`;

const RESUME = `Jordan Rivera — Product Manager.
At Brightwave I owned the onboarding funnel and lifted trial-to-paid conversion
from 18% to 27% over two quarters by rebuilding the activation flow and running
14 A/B tests. Led a squad of 4 engineers and 1 designer. Earlier at Contoso I
shipped the self-serve upgrade path that added $1.2M ARR. Strong SQL, comfortable
with experimentation platforms.`;

test("new user completes the full money path to scored mock", async ({ page }) => {
  const email = `e2e_${Date.now()}@example.com`;
  const password = "test-password-123";

  // --- Signup ---
  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  // New users land in onboarding. Generous timeout: `next dev` compiles each
  // route on first hit, and /signup + /onboarding compiling back-to-back can
  // take well past a typical 30s budget on a cold cache.
  await page.waitForURL(/\/onboarding/, { timeout: 60_000 });

  // --- Onboarding step 1: role ---
  await page.getByPlaceholder(/Senior Product Manager/i).fill("Senior Product Manager");
  await page.getByRole("button", { name: /^Continue$/ }).click();

  // Step 2: experience level (choice auto-advances)
  await page.getByRole("button", { name: /Senior/ }).first().click();

  // Step 3: interview date (in ~5 days)
  const d = new Date();
  d.setDate(d.getDate() + 5);
  const iso = d.toISOString().slice(0, 10);
  await page.locator('input[type="date"]').fill(iso);
  await page.getByRole("button", { name: /^Continue$/ }).click();

  // Step 4: biggest fear (auto-advances)
  await page.getByRole("button", { name: /Behavioral/ }).first().click();

  // Step 5: interview type (auto-advances)
  await page.getByRole("button", { name: /Behavioral round/ }).click();

  // Step 6: paste posting + resume, build the plan
  await page.getByPlaceholder(/paste the full job description/i).fill(JOB_POSTING);
  await page.getByPlaceholder(/paste your resume text/i).fill(RESUME);
  await page.getByRole("button", { name: /Build my prep plan/i }).click();

  // --- Paywall: personalized prep plan + trial CTA ---
  // Extra generous: this step both compiles /paywall AND runs a real prep-pack
  // generation call through the AI gateway.
  await page.waitForURL(/\/paywall/, { timeout: 90_000 });
  await expect(page.getByText(/Prep Plan —/i)).toBeVisible();
  // At least one real, readable question should be present (unblurred teaser).
  await expect(page.locator("ol li").first()).toBeVisible();

  // --- Start the mock trial (dev mock-checkout flips sub to trialing) ---
  await page.getByRole("button", { name: /Start .* free trial/i }).click();

  // Lands on the entitled dashboard.
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByText(/Northwind Labs|Senior Product Manager/i).first()).toBeVisible();

  // Readiness + answer bank + streak metrics render.
  await expect(page.getByText(/Readiness/i)).toBeVisible();

  // --- Text-mode mock interview ---
  await page.goto("/mock");
  await page.getByRole("button", { name: /Start mock interview/i }).click();

  // First question asked -> switch to typing (headless has no mic).
  await page.getByRole("button", { name: /Type instead/i }).click();

  // Answer each of the 5 questions in text mode.
  for (let i = 0; i < 5; i++) {
    const box = page.getByPlaceholder(/Type your answer/i);
    await expect(box).toBeVisible({ timeout: 20_000 });
    await box.fill(
      "At Brightwave I owned the onboarding funnel and lifted trial-to-paid conversion from 18 to 27 percent " +
        "over two quarters by rebuilding the activation flow and running fourteen A/B tests. I led a squad of four " +
        "engineers and one designer, and the result was a durable lift that held the next quarter."
    );
    await page.getByRole("button", { name: /Submit answer/i }).click();

    // Score reveal appears with the four dimensions.
    const nextBtn = page.getByRole("button", { name: i === 4 ? /See my results/i : /Next question/i });
    await expect(nextBtn).toBeVisible({ timeout: 30_000 });
    await nextBtn.click();
  }

  // --- Summary: scored radar renders ---
  await expect(page.getByRole("button", { name: /Practice again/i })).toBeVisible({ timeout: 20_000 });
  // A per-answer feedback card is shown.
  await expect(page.getByText(/Save improved answer/i).first()).toBeVisible();
});
