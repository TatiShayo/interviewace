/**
 * Error monitoring. Real: Sentry store API via DSN (no heavyweight SDK — the
 * envelope POST is ~30 lines and keeps the client bundle clean). Mock: console.
 * PLAYBOOK 2.7: never include PII or request bodies in reports.
 */
import "server-only";
import { env, has } from "@/lib/env";

function parseDsn(dsn: string): { endpoint: string; key: string } | null {
  try {
    const u = new URL(dsn);
    const projectId = u.pathname.replace(/^\//, "");
    if (!projectId || !u.username) return null;
    return {
      endpoint: `${u.protocol}//${u.host}/api/${projectId}/store/`,
      key: u.username,
    };
  } catch {
    return null;
  }
}

export function reportError(error: unknown, context?: Record<string, string | number | boolean>): void {
  const err = error instanceof Error ? error : new Error(String(error));
  // Never block the request path on monitoring.
  void (async () => {
    if (!has.sentry) {
      console.error(`[monitoring] ${err.message}`, context ?? {});
      return;
    }
    const dsn = parseDsn(env.sentryDsn);
    if (!dsn) return;
    try {
      await fetch(dsn.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=interviewace/1.0`,
        },
        body: JSON.stringify({
          message: err.message,
          level: "error",
          platform: "node",
          timestamp: Date.now() / 1000,
          exception: {
            values: [{ type: err.name, value: err.message, stacktrace: undefined }],
          },
          tags: context ?? {},
          // PLAYBOOK: no request bodies, no PII.
        }),
        signal: AbortSignal.timeout(3000),
      });
    } catch {
      // swallow — monitoring must never take the app down
    }
  })();
}
