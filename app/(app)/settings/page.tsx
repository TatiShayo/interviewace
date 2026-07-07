import { requireUser } from "@/lib/entitlement";
import { db } from "@/lib/providers/db";
import { PLANS } from "@/lib/providers/payments";
import { Card } from "@/components/ui";
import { SettingsView } from "./SettingsView";

/** Settings: subscription management, referral, data export/deletion (GDPR). */
export default async function SettingsPage() {
  const session = await requireUser();
  const [sub, saved, profile] = await Promise.all([
    db().getSubscription(session.userId),
    db().listSavedAnswers(session.userId),
    db().getProfile(session.userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Settings</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Account</h1>
      </div>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Subscription</p>
        <p className="mt-1.5 font-medium text-[var(--color-navy)] capitalize">
          {sub?.plan ? `${PLANS[sub.plan].label} — ${sub.status}` : "No active plan"}
        </p>
        {sub?.current_period_end && (
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Renews {new Date(sub.current_period_end).toLocaleDateString()}
          </p>
        )}
      </Card>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Your referral code</p>
        <p className="tnum mt-1.5 font-display text-xl font-semibold text-[var(--color-navy)]">
          {profile?.referral_code ?? "—"}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Share it — you both get a free week when someone signs up with it.
        </p>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted)]">Your stored value</p>
        <p className="mt-1.5 text-sm text-[var(--color-ink)]">
          Your answer bank holds <span className="tnum font-medium">{saved.length}</span>{" "}
          {saved.length === 1 ? "answer" : "answers"} — pausing keeps all of it for your next search.
        </p>
      </Card>

      <SettingsView hasSubscription={Boolean(sub?.stripe_customer_id)} status={sub?.status ?? "none"} />
    </div>
  );
}
