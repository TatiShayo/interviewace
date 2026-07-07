import { NegotiationBuilder } from "./NegotiationBuilder";

/** Salary negotiation module (BUILD_PROMPT feature 6). */
export default function NegotiationPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Negotiation</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Build your negotiation script</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Exact phrases, an email template, and a practice round against a hardball recruiter.
        </p>
      </div>
      <NegotiationBuilder />
    </div>
  );
}
