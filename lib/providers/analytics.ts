/**
 * Server-side PostHog capture. Every event documented in /analytics.md.
 * PLAYBOOK 2.7 + Part 5: no PII in event properties; object_action naming.
 * Mock (no key): appended to .mockdata/events.jsonl so funnels are testable.
 */
import "server-only";
import fs from "node:fs";
import path from "node:path";

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "";
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

export function track(event: string, distinctId: string, properties?: Record<string, string | number | boolean>): void {
  void (async () => {
    try {
      if (!POSTHOG_KEY) {
        const dir = path.join(process.cwd(), ".mockdata");
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.appendFileSync(
          path.join(dir, "events.jsonl"),
          JSON.stringify({ event, distinctId, properties: properties ?? {}, ts: new Date().toISOString() }) + "\n"
        );
        return;
      }
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_KEY,
          event,
          distinct_id: distinctId,
          properties: properties ?? {},
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // analytics must never break the product
    }
  })();
}
