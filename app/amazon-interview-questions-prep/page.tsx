import type { Metadata } from "next";
import { SeoPage, SeoSection } from "@/components/SeoPage";

export const metadata: Metadata = {
  title: "Amazon Interview Questions & Prep — InterviewAce",
  description:
    "The Amazon interview questions you'll actually face, mapped to leadership principles, plus AI-scored practice against your real answers.",
};

const LEADERSHIP_PRINCIPLES = [
  ["Customer Obsession", "Tell me about a time you went against conventional wisdom to help a customer."],
  ["Ownership", "Describe a time you took on something outside your role because it needed to get done."],
  ["Invent and Simplify", "Tell me about a time you simplified a complex process."],
  ["Bias for Action", "Describe a decision you made without complete data."],
  ["Deliver Results", "Tell me about a time you had to deliver results despite significant obstacles."],
];

export default function AmazonPrepPage() {
  return (
    <SeoPage
      eyebrow="Amazon interview prep"
      title="Amazon interview questions, mapped to leadership principles"
      intro="Amazon's loop leans harder on behavioral structure than almost any other company — every question maps back to one or more of its 16 leadership principles, and interviewers are trained to probe for specifics. Here's what to actually expect, and how to prepare for your specific role."
    >
      <SeoSection h2="Why Amazon interviews feel different">
        <p>
          Amazon interviewers write down your answer verbatim and score it against a leadership principle rubric —
          vague answers get filtered out regardless of how strong your resume is. The bar isn&apos;t eloquence, it&apos;s
          specificity: a real situation, a real decision you made, a real measurable result.
        </p>
      </SeoSection>

      <SeoSection h2="Five leadership principles that show up most">
        <div className="space-y-3">
          {LEADERSHIP_PRINCIPLES.map(([lp, q]) => (
            <div key={lp} className="rounded-[var(--radius)] border border-[var(--color-line)] bg-white/60 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">{lp}</p>
              <p className="mt-1 text-sm text-[var(--color-ink)]">{q}</p>
            </div>
          ))}
        </div>
      </SeoSection>

      <SeoSection h2="How to prepare for the loop this week">
        <p>
          Paste the actual Amazon job posting you&apos;re interviewing for into InterviewAce — the prep pack it
          generates is tuned to weight behavioral questions toward leadership principles and pull role-specific
          questions from the posting&apos;s stated responsibilities, not a generic template. Then practice each
          answer out loud; the scoring rubric checks for STAR structure, which is exactly what Amazon interviewers
          are trained to listen for.
        </p>
      </SeoSection>

      <SeoSection h2="Bar raiser rounds">
        <p>
          One interviewer in the loop is a &ldquo;bar raiser&rdquo; from outside your hiring team, focused purely on
          leadership principles rather than role skills — expect their questions to feel less technical and more
          about judgment, ownership, and how you handle ambiguity or conflict.
        </p>
      </SeoSection>
    </SeoPage>
  );
}
