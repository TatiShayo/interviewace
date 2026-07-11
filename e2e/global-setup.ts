/**
 * Playwright global setup: pre-warm every route the money-path spec visits.
 *
 * `next dev` compiles each route on-demand on its first request (the on-demand
 * entries system), which can take 10-25s per route on a cold cache / slow
 * disk. Left alone, that JIT cost lands mid-test and blows through normal
 * navigation timeouts unpredictably. Warming routes once here — sequentially,
 * with a generous per-route budget — keeps the actual test's timeouts
 * meaningful (measuring real app behavior, not webpack compile variance).
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE_URL = `http://127.0.0.1:${PORT}`;

const ROUTES = [
  "/",
  "/signup",
  "/login",
  "/onboarding",
  "/paywall",
  "/dashboard",
  "/mock",
  "/prep",
  "/answers",
];

async function warm(path: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    await fetch(`${BASE_URL}${path}`, { signal: controller.signal, redirect: "manual" });
  } catch {
    // Best-effort: if a route fails to warm, the test itself will surface it
    // with a real error rather than a misleading webpack-compile timeout.
  } finally {
    clearTimeout(timeout);
  }
}

export default async function globalSetup(): Promise<void> {
  for (const route of ROUTES) {
    await warm(route);
  }
}
