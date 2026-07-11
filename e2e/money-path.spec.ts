import { test, expect } from "@playwright/test";
import { signUpAndReachDashboard } from "./helpers";

/**
 * M8 — end-to-end money path against mock providers (zero third-party keys):
 *   signup -> 6-step onboarding -> real prep pack -> blurred-teaser paywall ->
 *   mock trial checkout -> entitled dashboard -> text-mode mock -> scores.
 *
 * This is the Definition-of-Done happy path from BUILD_PROMPT. It uses the
 * text-mode fallback in the mock (headless has no microphone) and the internal
 * dev mock-checkout (no Stripe key) which flips the subscription to `trialing`.
 */

test("new user completes the full money path to scored mock", async ({ page }) => {
  await signUpAndReachDashboard(page);

  // Job title/company come from the AI-parsed posting. With no ANTHROPIC_API_KEY
  // (this suite's default) that's the deterministic mock fixture ("Product
  // Manager" / "Acme Corp") rather than the literal posting text — match both
  // so this also passes when run against a real key.
  await expect(page.getByText(/Northwind Labs|Senior Product Manager|Acme Corp/i).first()).toBeVisible();

  // --- Text-mode mock interview ---
  await page.goto("/mock");
  await page.getByRole("button", { name: /Start mock interview/i }).click();

  // Answer each of the 5 questions in text mode. The Recorder unmounts/remounts
  // fresh for every question (each is a new answer), so "Type instead" must be
  // clicked each time rather than once before the loop.
  for (let i = 0; i < 5; i++) {
    await page.getByRole("button", { name: /Type instead/i }).click();
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
