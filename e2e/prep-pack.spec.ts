import { test, expect } from "@playwright/test";
import { signUpAndReachDashboard } from "./helpers";

/**
 * M8 — prep-pack view: an entitled user can open /prep and see the full
 * generated pack (company intel, filterable question cards with a
 * strong-answer outline, save-outline-to-answer-bank action).
 */
test("entitled user views the full prep pack", async ({ page }) => {
  await signUpAndReachDashboard(page);

  await page.goto("/prep");

  // Company intel block renders.
  await expect(page.getByText(/Company intel/i)).toBeVisible();

  // Category filter tabs render and are clickable.
  const behavioralTab = page.getByRole("button", { name: /^Behavioral$/ });
  await expect(behavioralTab).toBeVisible();
  await behavioralTab.click();

  // At least one question card is visible with its strong-answer outline.
  await expect(page.getByText(/Strong-answer outline/i).first()).toBeVisible();
  await expect(page.getByText(/Why they ask:/i).first()).toBeVisible();

  // Save outline to answer bank.
  const saveBtn = page.getByRole("button", { name: /Save outline/i }).first();
  await saveBtn.click();
  await expect(page.getByRole("button", { name: /^Saved$/ }).first()).toBeVisible({ timeout: 10_000 });

  // Switch back to "All" and confirm more cards are shown.
  await page.getByRole("button", { name: /^All$/ }).click();
  await expect(page.locator("text=Why they ask:").first()).toBeVisible();
});
