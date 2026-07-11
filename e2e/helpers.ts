import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/**
 * Shared e2e fixtures/helpers: the signup -> 6-step onboarding -> paywall ->
 * mock trial checkout -> entitled dashboard path is the setup precondition
 * for most other specs (prep-pack view, mock interview, etc.), so it lives
 * here once rather than being copy-pasted per spec file.
 */
export const JOB_POSTING = `Senior Product Manager — Growth at Northwind Labs.
We are hiring a Senior PM to own our activation and onboarding funnel. You will
run discovery with customers, define the roadmap, partner with engineering and
design, and ship measurable improvements to trial-to-paid conversion. You should
have 5+ years of product management experience, strong SQL and experimentation
skills, and a track record of shipping growth features at scale. Bonus: prior
experience with PLG motions and subscription pricing.`;

export const RESUME = `Jordan Rivera — Product Manager.
At Brightwave I owned the onboarding funnel and lifted trial-to-paid conversion
from 18% to 27% over two quarters by rebuilding the activation flow and running
14 A/B tests. Led a squad of 4 engineers and 1 designer. Earlier at Contoso I
shipped the self-serve upgrade path that added $1.2M ARR. Strong SQL, comfortable
with experimentation platforms.`;

export async function signUpAndReachDashboard(page: Page): Promise<{ email: string }> {
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const password = "test-password-123";

  await page.goto("/signup");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /create account/i }).click();

  await page.waitForURL(/\/onboarding/, { timeout: 60_000 });

  // Step 1: role
  await page.getByPlaceholder(/Senior Product Manager/i).fill("Senior Product Manager");
  await page.getByRole("button", { name: /^Continue$/ }).click();

  // Step 2: experience level (auto-advances)
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

  await page.waitForURL(/\/paywall/, { timeout: 90_000 });
  await expect(page.getByText(/Prep Plan —/i)).toBeVisible();

  await page.getByRole("button", { name: /Start .* free trial/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 60_000 });
  await expect(page.getByText(/Readiness/i)).toBeVisible();

  return { email };
}
