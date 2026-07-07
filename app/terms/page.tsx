import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — InterviewAce",
  description: "The terms that govern your use of InterviewAce.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/" className="text-sm font-medium text-[var(--color-navy)] hover:underline">
        ← Back
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold text-[var(--color-navy)]">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Last updated: 2026-07-07</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--color-ink)]">
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">The service</h2>
          <p className="mt-2">
            InterviewAce generates interview preparation materials — likely questions, practice scoring, negotiation
            scripts, cover letters — using AI models based on the job postings and resume text you provide. Outputs
            are guidance, not guarantees: you remain responsible for the accuracy of anything you submit to an
            employer.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Subscriptions and billing</h2>
          <p className="mt-2">
            Plans are billed in advance via Stripe. The weekly plan includes a 3-day free trial; a card is required to
            start it, and you will be charged automatically when the trial ends unless you cancel first. You can
            cancel or pause anytime from Settings — pausing keeps your saved answers for when you return. Refunds are
            handled case-by-case; contact us via account settings.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Acceptable use</h2>
          <p className="mt-2">
            Don&apos;t use InterviewAce to generate content for someone else&apos;s job application under false
            pretenses, to submit job postings containing malware or attempts to manipulate our AI systems, or to
            abuse rate limits or free trials (including via disposable email addresses). We may suspend accounts that
            violate these terms.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Your content</h2>
          <p className="mt-2">
            You retain ownership of the job postings, resumes, and answers you submit. You grant us a limited license
            to process that content solely to provide the service back to you. We do not use your content to train
            AI models.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Disclaimer</h2>
          <p className="mt-2">
            The service is provided &ldquo;as is.&rdquo; AI-generated questions, scores, and scripts are estimates
            based on the information you provide and general interview practice — they are not a promise of any
            interview outcome.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Changes</h2>
          <p className="mt-2">
            We may update these terms as the product changes. Material changes will be reflected here with an updated
            date.
          </p>
        </section>
      </div>
    </main>
  );
}
