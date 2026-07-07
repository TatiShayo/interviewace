"use client";

import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { openBillingPortal, pauseSubscription, exportMyData, deleteMyAccount } from "./actions";
import type { SubStatus } from "@/lib/types";

export function SettingsView({ hasSubscription, status }: { hasSubscription: boolean; status: SubStatus }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function pause() {
    setMessage(null);
    startTransition(async () => {
      const res = await pauseSubscription();
      setMessage(res.ok ? "Your subscription is paused — your answer bank is safe. Come back anytime." : res.error);
    });
  }

  async function exportData() {
    const data = await exportMyData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "interviewace-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {hasSubscription && (
        <Card className="p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Manage billing</p>
          <p className="mt-1.5 text-sm text-[var(--color-muted)]">Update payment method, view invoices, or cancel.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={openBillingPortal}>
              <Button type="submit" variant="secondary" size="sm">
                Open billing portal
              </Button>
            </form>
            {status !== "paused" && (
              <Button variant="ghost" size="sm" onClick={pause} disabled={pending}>
                Pause instead of cancel
              </Button>
            )}
          </div>
          {message && <p className="mt-2 text-sm text-[var(--color-navy)]">{message}</p>}
        </Card>
      )}

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Your data</p>
        <p className="mt-1.5 text-sm text-[var(--color-muted)]">
          Export everything we have on you, or permanently delete your account and all data (resumes, transcripts,
          audio, answers).
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={exportData}>
            Export my data
          </Button>
          {!confirmingDelete ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirmingDelete(true)}>
              Delete my account
            </Button>
          ) : (
            <form action={deleteMyAccount} className="flex items-center gap-2">
              <span className="text-sm text-[var(--color-danger)]">Are you sure? This can&apos;t be undone.</span>
              <Button type="submit" size="sm" className="bg-[var(--color-danger)] hover:bg-[var(--color-danger)]">
                Yes, delete everything
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </Button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
