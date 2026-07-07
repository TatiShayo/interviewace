"use client";

/**
 * Client-side glue for the dashboard: shows the outcome survey when linked
 * from the day-after email (?outcome=1) or the interview date has passed,
 * and dismisses via a plain client state flag (no need to persist "seen").
 */
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { OutcomeSurvey } from "@/app/(app)/outcome/OutcomeSurvey";

export function DashboardExtras({ interviewPassed }: { interviewPassed: boolean }) {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const shouldShow = !dismissed && (params.get("outcome") === "1" || interviewPassed);

  if (!shouldShow) return null;
  return <OutcomeSurvey onDismiss={() => setDismissed(true)} />;
}
