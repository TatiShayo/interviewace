"use client";

/**
 * Route-segment error boundary for the authenticated app. Catches render/data
 * errors in any /(app) page so a single failing panel degrades to a recoverable
 * message instead of a blank screen. `reset()` re-renders the segment.
 * We deliberately do NOT surface `error.message` (may contain internal detail);
 * `error.digest` is the server-correlatable id Next.js already logged.
 */
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Client-side breadcrumb only — the server already reported the original
    // error via the monitoring provider. No PII/body is logged here.
    console.error("app segment error", error.digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
        This screen hit an unexpected error. Your saved answers and prep pack are safe. Try again — if it keeps
        happening, refresh the page.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
      {error.digest && (
        <p className="mt-4 text-xs text-[var(--color-muted)]">Reference: {error.digest}</p>
      )}
    </div>
  );
}
