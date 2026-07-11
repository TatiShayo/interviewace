import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright e2e config (M8). Runs the app in mock mode (zero third-party keys)
 * and drives the full money path: signup -> onboarding -> mock trial checkout ->
 * prep pack -> text-mode mock -> scores. Cross-platform: `next dev` is launched
 * by Playwright's webServer so `npm run test:e2e` works on Windows and CI alike.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Pre-compiles every route the spec visits so the test's own timeouts
  // measure app behavior, not `next dev`'s on-demand webpack compile cost.
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  // Generous: `next dev` compiles each route on first hit, which can take
  // well past typical e2e budgets on a cold cache / slow disk.
  timeout: 240_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    actionTimeout: 30_000,
    navigationTimeout: 60_000,
    // Grant no mic: the mock flow uses the text-mode fallback deterministically.
    permissions: [],
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Start a clean dev server on an isolated port with all providers mocked.
    command: `npx next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      NEXT_PUBLIC_APP_URL: BASE_URL,
      NODE_ENV: "development",
    },
  },
});
