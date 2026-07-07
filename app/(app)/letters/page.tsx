import { LettersView } from "./LettersView";

/** Cover letter + follow-up email generator (BUILD_PROMPT feature 7). */
export default function LettersPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">Letters</p>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Cover letter & follow-up</h1>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Generated from your latest job posting and resume — copy and send.
        </p>
      </div>
      <LettersView />
    </div>
  );
}
