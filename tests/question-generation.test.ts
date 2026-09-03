/**
 * Question Generation Logic, Role-Based Question Bank & Prompt Engineering Tests.
 * Covers:
 *  - Prep pack prompt construction with user context & untrusted delimiters
 *  - STAR outline builder prompts
 *  - Salary negotiation and roleplay recruiter prompts
 *  - Cover letter and follow-up email prompt generation
 *  - Content hash determinism (sha256 caching)
 *  - Question bank schema validity and category mix
 */
import { describe, it, expect } from "vitest";
import {
  prepPackSystemPrompt,
  prepPackUserPrompt,
  starSuggestSystemPrompt,
  starSuggestUserPrompt,
  negotiationUserPrompt,
  coverLetterSystemPrompt,
  followupSystemPrompt,
  parseJobSystemPrompt,
  parseJobUserPrompt,
} from "@/lib/prompts";
import { sha256 } from "@/lib/utils";
import { prepQuestionSchema } from "@/lib/ai/schemas";

describe("Prep Pack Prompts & Question Bank", () => {
  it("includes the target company in the system prompt", () => {
    const prompt = prepPackSystemPrompt("Stripe");
    expect(prompt).toContain("Stripe");
    expect(prompt).toContain("CRITICAL SECURITY RULES");
    expect(prompt).toContain("OUTPUT FORMAT");
  });

  it("wraps job posting and candidate resume in untrusted delimiters", () => {
    const userPrompt = prepPackUserPrompt({
      postingText: "Senior Backend Engineer at Stripe building ledger pipelines.",
      resumeText: "5 years building payment infra in Go and PostgreSQL.",
      targetRole: "Senior Backend Engineer",
      experienceLevel: "senior",
      interviewType: "technical",
    });

    expect(userPrompt).toContain('<untrusted_content source="job_posting">');
    expect(userPrompt).toContain("Senior Backend Engineer at Stripe building ledger pipelines.");
    expect(userPrompt).toContain("</untrusted_content>");
    expect(userPrompt).toContain('<untrusted_content source="resume">');
    expect(userPrompt).toContain("5 years building payment infra in Go and PostgreSQL.");
    expect(userPrompt).toContain('target role "Senior Backend Engineer"');
    expect(userPrompt).toContain('experience level "senior"');
    expect(userPrompt).toContain('interview type "technical"');
  });

  it("handles missing resume gracefully in prompt construction", () => {
    const userPrompt = prepPackUserPrompt({
      postingText: "Frontend Engineer at Vercel.",
      resumeText: "",
      targetRole: "Frontend Engineer",
      experienceLevel: "mid",
      interviewType: "behavioral",
    });

    expect(userPrompt).toContain("(no resume provided");
  });

  it("validates question schema categories", () => {
    const validQ = {
      question: "Tell me about a time you resolved a major production outage.",
      category: "behavioral",
      why_asked: "Assessing incident management and composure under stress.",
      strong_answer_outline: "1) Situation and impact. 2) Root cause isolation. 3) Mitigation action. 4) Postmortem.",
    };

    expect(prepQuestionSchema.safeParse(validQ).success).toBe(true);

    const invalidCat = { ...validQ, category: "invalid_category" };
    expect(prepQuestionSchema.safeParse(invalidCat).success).toBe(false);
  });
});

describe("Content Hash Determinism for Prep Pack Caching", () => {
  it("produces identical SHA-256 hashes for identical inputs", async () => {
    const textA = "Posting A + Resume A";
    const textB = "Posting A + Resume A";

    const hashA = await sha256(textA);
    const hashB = await sha256(textB);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("produces different hashes when posting or resume changes", async () => {
    const hash1 = await sha256("Posting 1 + Resume 1");
    const hash2 = await sha256("Posting 1 + Resume 2");

    expect(hash1).not.toBe(hash2);
  });
});

describe("STAR Builder Prompts", () => {
  it("builds STAR suggestion user prompt with section and resume data", () => {
    const prompt = starSuggestUserPrompt({
      question: "Describe a difficult conflict with a product manager.",
      section: "action",
      resumeText: "Led cross-functional API redesign.",
      draftSoFar: "We disagreed on the launch timeline.",
    });

    expect(prompt).toContain("Section to draft: ACTION");
    expect(prompt).toContain("conflict with a product manager");
    expect(prompt).toContain("Led cross-functional API redesign");
    expect(prompt).toContain("We disagreed on the launch timeline");
  });

  it("enforces candidate real experience rules in system prompt", () => {
    const prompt = starSuggestSystemPrompt;
    expect(prompt).toContain("Pull ONLY from the candidate's real resume experience");
    expect(prompt).toContain("never fabricate");
  });
});

describe("Negotiation & Letter Prompts", () => {
  it("builds salary negotiation prompt with offer details and market context", () => {
    const userPrompt = negotiationUserPrompt({
      offerAmount: "$165k base + 0.1% equity",
      market: "Series B FinTech",
      location: "San Francisco, CA",
      competing: true,
      role: "Staff Engineer",
    });

    expect(userPrompt).toContain("Role: Staff Engineer");
    expect(userPrompt).toContain("$165k base + 0.1% equity");
    expect(userPrompt).toContain("Competing offers: yes");
  });

  it("builds cover letter and follow-up prompts with specified tone", () => {
    const coverSys = coverLetterSystemPrompt("confident");
    expect(coverSys).toContain("Tone: confident");
    expect(coverSys).toContain("under 300 words");

    const followSys = followupSystemPrompt("warm");
    expect(followSys).toContain("Tone: warm");
    expect(followSys).toContain("under 150 words");
  });

  it("builds job requirement parsing prompt", () => {
    const sys = parseJobSystemPrompt;
    expect(sys).toContain("extract structured data from a job posting");
    const user = parseJobUserPrompt("We are looking for a Senior Product Manager with SQL and A/B testing experience.");
    expect(user).toContain("Senior Product Manager");
  });
});
