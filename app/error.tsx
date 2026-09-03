"use client";

/**
 * Root-level segment error boundary. Catches render/data errors in root-level
 * pages (onboarding, paywall, auth, landing) so a transient error degrades
 * gracefully to a recoverable screen.
 */
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("root segment error", error.digest ?? "");
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-5 py-16 text-center">
      <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Something went wrong</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">
        We encountered an unexpected error loading this page. Please try again.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
      </div>
      {error.digest && <p className="mt-4 text-xs text-[var(--color-muted)]">Reference: {error.digest}</p>}
    </div>
  );
}
