import type { Metadata } from "next";
import { SeoPage, SeoSection } from "@/components/SeoPage";

export const metadata: Metadata = {
  title: "AI Mock Interview — InterviewAce",
  description:
    "Practice out loud with an AI interviewer, get transcribed and scored on structure, relevance, confidence, and conciseness, then see a stronger rewrite of your own answer.",
};

const FAQ = [
  {
    q: "Is this just a chatbot?",
    a: "No — it's a five-question voice session. You speak your answer, it's transcribed, then scored against a calibrated rubric (an average answer scores 5-6, not an inflated 8) with a rewrite that keeps your real facts but tightens the delivery.",
  },
  {
    q: "Can I practice without a microphone?",
    a: "Yes — every mock session falls back to a text field if your mic is unavailable or you'd rather type. The scoring rubric is identical either way.",
  },
  {
    q: "How many times can I practice per day?",
    a: "Three mock sessions a day, five questions each. That's enough repetition to actually improve without turning practice into avoidance.",
  },
];

export default function AiMockInterviewPage() {
  return (
    <SeoPage
      eyebrow="AI mock interview"
      title="An AI mock interview that actually scores you"
      intro="Reading sample answers doesn't prepare you to speak under pressure. An AI mock interview closes that gap: you answer out loud, get transcribed, and get scored on the same dimensions a real interviewer is silently judging."
      faq={FAQ}
    >
      <SeoSection h2="What gets scored">
        <ul className="list-inside list-disc space-y-1.5">
          <li><strong>Structure</strong> — does your answer follow a clear arc, ideally STAR?</li>
          <li><strong>Relevance</strong> — does it actually answer the question asked, for this specific role?</li>
          <li><strong>Confidence</strong> — language markers: ownership and specifics versus hedging and vagueness.</li>
          <li><strong>Conciseness</strong> — tight and complete, or rambling and thin?</li>
        </ul>
      </SeoSection>

      <SeoSection h2="Why the scoring is calibrated low">
        <p>
          Most feedback tools inflate scores to feel encouraging — an 8 out of 10 that doesn&apos;t mean anything
          isn&apos;t useful. InterviewAce&apos;s rubric is deliberately strict: an average, generic answer scores
          5-6, a genuinely strong one scores 7-8, and 9-10 is reserved for hire-on-the-spot answers. That calibration
          is what makes the feedback trustworthy enough to actually act on.
        </p>
      </SeoSection>

      <SeoSection h2="The signature moment">
        <p>
          After five questions, your scores count up into a radar chart across all four dimensions — a fast, honest
          snapshot of where you&apos;re actually strong versus where the next hour of practice should go, instead of
          a vague feeling that you &ldquo;did fine.&rdquo;
        </p>
      </SeoSection>
    </SeoPage>
  );
}
