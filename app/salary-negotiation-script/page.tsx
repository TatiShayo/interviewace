import type { Metadata } from "next";
import { SeoPage, SeoSection } from "@/components/SeoPage";

export const metadata: Metadata = {
  title: "Salary Negotiation Script — InterviewAce",
  description:
    "A salary negotiation script generated from your actual offer, market, and location — exact phrases, an email template, and a role-play round against a hardball recruiter.",
};

const FAQ = [
  {
    q: "What if they say the budget is fixed?",
    a: "That's when you pivot to secondary levers — signing bonus, an earlier review cycle with defined targets, extra equity, or start-date flexibility. The script includes a counter for exactly this.",
  },
  {
    q: "Do I need a competing offer to negotiate?",
    a: "No — it helps, but a clear, calm ask backed by market research works without one. The script adjusts its framing based on whether you have a competing offer.",
  },
  {
    q: "What if I panic and just accept the first number?",
    a: "That's what the role-play mode is for — practice the actual back-and-forth against an AI recruiter trained to push back realistically, so the real conversation isn't the first time you've said the words out loud.",
  },
];

export default function SalaryNegotiationPage() {
  return (
    <SeoPage
      eyebrow="Salary negotiation"
      title="A negotiation script built from your actual offer"
      intro="Generic negotiation advice tells you to 'just ask for more.' A real script gives you the exact words — an opening line, a counter for pushback, and an email template you can send today."
      faq={FAQ}
    >
      <SeoSection h2="What the script includes">
        <ul className="list-inside list-disc space-y-1.5">
          <li>An opening script for the call — how to say you&apos;re excited while signaling the numbers aren&apos;t final.</li>
          <li>A counter script for when they push back on budget.</li>
          <li>Five to eight exact phrases to reach for mid-conversation.</li>
          <li>An email template if you&apos;d rather negotiate in writing.</li>
          <li>Walk-away guidance — set your number before the call, not during it.</li>
        </ul>
      </SeoSection>

      <SeoSection h2="The single biggest mistake">
        <p>
          Naming your number first, out of nerves, before the recruiter has named theirs. Every script InterviewAce
          generates opens by redirecting to their number first — &ldquo;What flexibility do we have on base?&rdquo;
          — because whoever anchors first gives up leverage.
        </p>
      </SeoSection>

      <SeoSection h2="Practice the pushback before it happens">
        <p>
          Recruiters use predictable pressure tactics: budget constraints, artificial deadlines, equity reframing.
          InterviewAce&apos;s role-play mode puts you against an AI recruiter tuned to use exactly these tactics —
          realistically, never abusively — with a coaching tip after every reply so you walk into the real
          conversation having already said the hard part out loud once.
        </p>
      </SeoSection>
    </SeoPage>
  );
}
