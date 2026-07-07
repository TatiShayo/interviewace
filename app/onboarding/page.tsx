import { redirect } from "next/navigation";
import { requireUser, getSubStatus } from "@/lib/entitlement";
import { isEntitled } from "@/lib/types";
import { db } from "@/lib/providers/db";
import { track } from "@/lib/providers/analytics";
import { OnboardingWizard } from "./Wizard";

export default async function OnboardingPage() {
  const session = await requireUser();
  // Already subscribed users skip straight to the app.
  if (isEntitled(await getSubStatus(session.userId))) redirect("/dashboard");

  const profile = await db().getProfile(session.userId);
  track("onboarding_started", session.userId, {});

  return (
    <OnboardingWizard
      initial={{
        target_role: profile?.target_role ?? "",
        experience_level: profile?.experience_level ?? "",
        interview_date: profile?.interview_date ?? "",
        biggest_fear: profile?.biggest_fear ?? "",
        interview_type: profile?.interview_type ?? "",
      }}
    />
  );
}
