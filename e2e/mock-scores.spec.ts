import { test, expect } from "@playwright/test";
import { signUpAndReachDashboard } from "./helpers";

/**
 * M8 — text-mode mock interview: an entitled user runs a full 5-question
 * mock session using the type-instead fallback (headless has no microphone)
 * and reaches the scored summary (radar + per-answer feedback + save action).
 */
test("entitled user completes a text-mode mock interview and sees scores", async ({ page }) => {
  await signUpAndReachDashboard(page);

  await page.goto("/mock");
  await page.getByRole("button", { name: /Start mock interview/i }).click();

  for (let i = 0; i < 5; i++) {
    // Generous on the first iteration: `/api/mock/session` (and `/api/mock/tts`)
    // JIT-compile on first hit under `next dev`, which on a slow/cold box can
    // take well past a typical 20s budget (see playwright.config.ts comments).
    await expect(page.getByText(new RegExp(`Question ${i + 1} of 5`, "i"))).toBeVisible({
      timeout: i === 0 ? 60_000 : 20_000,
    });

    // The Recorder unmounts/remounts fresh per question, so "Type instead"
    // must be clicked every iteration rather than once before the loop.
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
    await expect(page.getByText(/^Structure$/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/^Relevance$/i)).toBeVisible();
    await expect(page.getByText(/^Confidence$/i)).toBeVisible();
    await expect(page.getByText(/^Conciseness$/i)).toBeVisible();
    await expect(page.getByText(/A stronger version/i)).toBeVisible();

    const nextBtn = page.getByRole("button", { name: i === 4 ? /See my results/i : /Next question/i });
    await expect(nextBtn).toBeVisible();
    await nextBtn.click();
  }

  // --- Summary: scored radar + per-answer feedback renders ---
  await expect(page.getByRole("button", { name: /Practice again/i })).toBeVisible({ timeout: 20_000 });
  const saveLink = page.getByText(/Save improved answer/i).first();
  await expect(saveLink).toBeVisible();
  await saveLink.click();
  await expect(page.getByText(/Saved to answer bank/i).first()).toBeVisible({ timeout: 10_000 });
});
