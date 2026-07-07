import type { Metadata } from "next";
import { SeoPage, SeoSection } from "@/components/SeoPage";

export const metadata: Metadata = {
  title: "STAR Method Practice — InterviewAce",
  description:
    "Practice the STAR method (Situation, Task, Action, Result) with a guided builder and AI feedback that pulls from your real resume.",
};

const FAQ = [
  {
    q: "What if I don't have a perfect example?",
    a: "Use your closest real experience and be honest about scope — a smaller, true story with a clear result beats an exaggerated one. Interviewers can usually tell.",
  },
  {
    q: "How long should a STAR answer be?",
    a: "Aim for 60–90 seconds spoken aloud. Situation and Task should be brief (a sentence or two each); spend most of your time on Action and Result.",
  },
];

export default function StarMethodPage() {
  return (
    <SeoPage
      eyebrow="STAR method"
      title="Practice the STAR method until it's automatic"
      intro="Situation, Task, Action, Result — the structure every strong behavioral answer follows. Most candidates know the framework but freeze when asked to apply it live. Here's how to actually practice it."
      faq={FAQ}
    >
      <SeoSection h2="The four parts, briefly">
        <ul className="list-inside list-disc space-y-1.5">
          <li><strong>Situation</strong> — the context, in one or two sentences. Enough to orient the interviewer, no more.</li>
          <li><strong>Task</strong> — what you specifically were responsible for, not what the team was doing.</li>
          <li><strong>Action</strong> — the decisions you made and why. This is where most of your answer should live.</li>
          <li><strong>Result</strong> — what happened, ideally with a number. Then, if it fits, what you&apos;d repeat or do differently.</li>
        </ul>
      </SeoSection>

      <SeoSection h2="The mistake almost everyone makes">
        <p>
          Most STAR answers fail on Result, not Action — candidates describe what they did in detail, then trail off
          with &ldquo;and it worked out well&rdquo; instead of naming what actually changed. If you don&apos;t have an
          exact number, use a real approximation and say so: &ldquo;support tickets dropped noticeably, roughly 30-40%
          the following month&rdquo; is more credible than a suspiciously precise stat you can&apos;t back up.
        </p>
      </SeoSection>

      <SeoSection h2="Practice it against your actual questions">
        <p>
          InterviewAce&apos;s STAR builder gives you a guided form for each section, with an AI suggestion button
          that pulls only from your real resume — it will never invent an employer, project, or metric you
          didn&apos;t provide. Draft the answer, save it to your answer bank, then practice saying it out loud in a
          mock interview and get scored on whether the structure actually held up under pressure.
        </p>
      </SeoSection>
    </SeoPage>
  );
}
