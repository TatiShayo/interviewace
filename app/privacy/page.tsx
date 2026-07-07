import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — InterviewAce",
  description: "How InterviewAce collects, uses, retains, and deletes your data.",
};

/**
 * Plain-language privacy policy (BUILD_PROMPT cross-cutting requirement).
 * Lists actual subprocessors (PLAYBOOK 2.7) and states retention explicitly.
 */
export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-16">
      <Link href="/" className="text-sm font-medium text-[var(--color-navy)] hover:underline">
        ← Back
      </Link>
      <h1 className="font-display mt-6 text-3xl font-semibold text-[var(--color-navy)]">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--color-muted)]">Last updated: 2026-07-07</p>

      <div className="prose-content mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--color-ink)]">
        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">What we collect</h2>
          <p className="mt-2">
            Your email and password (or your identity via Supabase Auth), the job postings and resume text you paste
            or upload, your interview date and preferences, audio recordings and transcripts from mock interviews,
            and usage events (which screens you visit, which features you use) via PostHog.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">How we use it</h2>
          <p className="mt-2">
            Solely to generate your interview prep pack, score your mock answers, and run the product — including
            sending you the lifecycle emails you&apos;d expect (your pack is ready, a reminder the day before your
            interview, a good-luck email with your cheat sheet the day of). We never sell your data, and your resume
            or transcripts are never used to train any AI model.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Retention</h2>
          <p className="mt-2">
            Resumes and mock-interview audio are automatically deleted 90 days after your last activity. Your answer
            bank, prep packs, and profile persist until you delete your account, at which point everything — resumes,
            transcripts, audio, saved answers, job postings — is permanently removed.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Your rights</h2>
          <p className="mt-2">
            From Settings, you can export a full copy of your data as JSON at any time, or permanently delete your
            account and all associated data with one confirmation. These are self-serve — no support ticket required.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Subprocessors</h2>
          <p className="mt-2">
            Supabase (database, authentication, file storage), Vercel (hosting), Stripe (payments), Anthropic (AI
            question generation and scoring), OpenAI (voice transcription and text-to-speech), Resend (transactional
            email), PostHog (product analytics), Sentry (error monitoring). Each processes only the minimum data its
            function requires.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Security</h2>
          <p className="mt-2">
            Resumes and audio live in private storage accessed only via short-lived signed URLs after an authorization
            check. Every database table enforces row-level security so you can only ever read your own data. We never
            log full prompts or resume contents.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-[var(--color-navy)]">Contact</h2>
          <p className="mt-2">
            Questions about this policy or your data: reach us via the support link in your account settings.
          </p>
        </section>
      </div>
    </main>
  );
}
