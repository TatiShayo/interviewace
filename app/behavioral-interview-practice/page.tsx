import type { Metadata } from "next";
import { SeoPage, SeoSection } from "@/components/SeoPage";

export const metadata: Metadata = {
  title: "Behavioral Interview Practice — InterviewAce",
  description:
    "Practice behavioral interview questions specific to your target role and resume, out loud, with AI scoring and a stronger rewrite of every answer.",
};

const FAQ = [
  {
    q: "What makes a question 'behavioral'?",
    a: "It asks about a real past situation — 'tell me about a time when...' — rather than a hypothetical or a technical fact. Interviewers use them because past behavior predicts future behavior better than a hypothetical answer does.",
  },
  {
    q: "Should I prepare a story for every possible question?",
    a: "No — prepare 6-8 strong stories from your real experience that each demonstrate a different skill (conflict resolution, ownership, failure recovery, leading under ambiguity), then adapt the framing to whatever specific question is asked.",
  },
  {
    q: "What if my honest answer makes me look bad?",
    a: "Frame the situation honestly but center the answer on what you did and learned, not on assigning blame. A well-told failure story often lands better than a forced success story.",
  },
];

export default function BehavioralInterviewPage() {
  return (
    <SeoPage
      eyebrow="Behavioral interviews"
      title="Behavioral interview practice that's specific to your role"
      intro="Generic behavioral-question lists don't prepare you for the ones your specific panel will actually ask. Real practice starts with questions pulled from the posting you're interviewing for, answered with your real experience."
      faq={FAQ}
    >
      <SeoSection h2="The five behavioral archetypes worth having a story for">
        <ul className="list-inside list-disc space-y-1.5">
          <li>Shipping under a hard deadline and what you cut.</li>
          <li>A disagreement with a teammate or manager, and how it resolved.</li>
          <li>A project or decision that failed, and your specific role in it.</li>
          <li>Hard feedback you received and what changed afterward.</li>
          <li>The most ambiguous problem you&apos;ve owned end to end.</li>
        </ul>
      </SeoSection>

      <SeoSection h2="Why 'tell me about yourself' isn't generic when done right">
        <p>
          It becomes a real behavioral question the moment you tie it to the specific role: instead of a chronological
          resume recap, open with the one or two experiences most relevant to what this posting actually needs, and
          let the rest of the interview fill in the gaps.
        </p>
      </SeoSection>

      <SeoSection h2="Practice against your actual panel, not a generic list">
        <p>
          Paste your job posting into InterviewAce and the prep pack generates behavioral questions tuned to what
          this specific panel is likely to probe — then the voice mock lets you answer out loud and get scored on
          structure, relevance, confidence, and conciseness, with a rewrite that keeps your real facts but sharpens
          the delivery.
        </p>
      </SeoSection>
    </SeoPage>
  );
}
