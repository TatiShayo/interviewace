import { redirect } from "next/navigation";
import { requireUser, getSubStatus } from "@/lib/entitlement";
import { isEntitled } from "@/lib/types";
import { db } from "@/lib/providers/db";
import { AppNav } from "@/components/AppNav";

/**
 * Entitlement gate for every paid app route (defense in depth beyond
 * middleware, which only checks cookie presence). Unauthenticated -> /login;
 * authenticated-but-not-entitled -> back through onboarding/paywall.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUser().catch(() => null);
  if (!session) redirect("/login");

  const status = await getSubStatus(session.userId);
  if (!isEntitled(status)) {
    const profile = await db().getProfile(session.userId);
    // Finished onboarding (has a role) but hasn't paid -> paywall; else onboarding.
    redirect(profile?.target_role ? "/paywall" : "/onboarding");
  }

  const profile = await db().getProfile(session.userId);
  return (
    <div className="min-h-screen">
      <AppNav email={session.email} interviewDate={profile?.interview_date ?? null} />
      <div className="mx-auto max-w-3xl px-5 py-6">{children}</div>
    </div>
  );
}
