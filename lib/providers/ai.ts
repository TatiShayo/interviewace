/**
 * LLM provider interface. Real: Anthropic claude-sonnet-5 via official SDK,
 * with prompt caching enabled on system prompts (cache_control ephemeral).
 * Mock: deterministic fixtures so the whole product runs with zero keys.
 */
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env, has } from "@/lib/env";

export type AiTask =
  | "prep_pack"
  | "scoring"
  | "star_suggest"
  | "negotiation"
  | "roleplay"
  | "cover_letter"
  | "followup"
  | "parse_job";

export interface AiResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

export interface AiProvider {
  complete(args: { system: string; user: string; maxTokens: number; task: AiTask }): Promise<AiResult>;
}

const MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-20241022";
// claude-3-5-sonnet pricing: $3/MTok in, $15/MTok out (cache reads cheaper; we
// bill the conservative full rate for the budget guard).
export function costCents(inputTokens: number, outputTokens: number): number {
  const safeIn = Math.max(0, Number.isFinite(inputTokens) ? Math.floor(inputTokens) : 0);
  const safeOut = Math.max(0, Number.isFinite(outputTokens) ? Math.floor(outputTokens) : 0);
  return Math.ceil(((safeIn * 3 + safeOut * 15) / 1_000_000) * 100);
}

/** Transient upstream failures worth one retry: network blips, rate limits, 5xx. */
function isTransient(err: unknown): boolean {
  const status = (err as { status?: number })?.status;
  if (status === 429 || (typeof status === "number" && status >= 500)) return true;
  // SDK connection/timeout errors carry no HTTP status.
  const name = (err as { name?: string })?.name ?? "";
  return name === "APIConnectionError" || name === "APIConnectionTimeoutError";
}

class AnthropicProvider implements AiProvider {
  private client = new Anthropic({ apiKey: env.anthropicApiKey });
  async complete({ system, user, maxTokens }: { system: string; user: string; maxTokens: number; task: AiTask }): Promise<AiResult> {
    const call = () =>
      this.client.messages.create({
        model: MODEL,
        max_tokens: maxTokens,
        // System prompts are stable per task -> prompt caching (BUILD_PROMPT
        // cost guard). Volatile user content stays after the breakpoint.
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        // JSON tasks don't benefit from visible thinking; keep latency low.
        thinking: { type: "disabled" },
        messages: [{ role: "user", content: user }],
      });
    let res;
    try {
      res = await call();
    } catch (err) {
      // Retry ONCE with a short backoff on a transient failure only; never on a
      // 4xx (bad request / auth) which would just fail again and waste latency.
      if (!isTransient(err)) throw err;
      await new Promise((r) => setTimeout(r, 600));
      res = await call();
    }
    if (res.stop_reason === "refusal") throw new Error("AI provider refused the request");
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return {
      text,
      inputTokens:
        res.usage.input_tokens +
        (res.usage.cache_creation_input_tokens ?? 0) +
        (res.usage.cache_read_input_tokens ?? 0),
      outputTokens: res.usage.output_tokens,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Mock fixtures — realistic content, never lorem ipsum (PLAYBOOK 1.5) */
/* ------------------------------------------------------------------ */

type Cat = "behavioral" | "role_specific" | "company_culture" | "curveball";
const MIX: Cat[] = [
  "behavioral", "behavioral", "behavioral", "behavioral", "behavioral",
  "role_specific", "role_specific", "role_specific", "role_specific", "role_specific",
  "company_culture", "company_culture", "company_culture",
  "curveball", "curveball",
];

const MOCK_QUESTION_SEEDS: Record<Cat, string[]> = {
  behavioral: [
    "Tell me about a time you shipped something under a hard deadline. What did you cut, and how did you decide?",
    "Describe a disagreement with a teammate about technical direction. How did you resolve it?",
    "Walk me through a project that failed. What was your specific contribution to the failure?",
    "Tell me about a time you received hard feedback. What changed afterwards?",
    "Describe the most ambiguous problem you have owned end to end.",
  ],
  role_specific: [
    "How would you prioritize the first 90 days in this role, given the responsibilities in the posting?",
    "Walk me through how you would approach the core technical challenge described in the job posting.",
    "Which skill listed in the posting is your weakest, and how would you close the gap?",
    "Describe a system or process you built that maps directly to this role's responsibilities.",
    "How do you measure success for the kind of work this role owns?",
  ],
  company_culture: [
    "Why this company, specifically — not this role at a competitor?",
    "Which of our stated values resonates most with how you already work? Give an example.",
    "What questions do you have about how the team operates?",
  ],
  curveball: [
    "If we called your last manager, what would they say you should keep working on?",
    "You have two strong offers. What makes you walk away from ours?",
  ],
};

function mockPrepPack(): string {
  const counters: Record<string, number> = {};
  const questions = MIX.map((cat) => {
    counters[cat] = counters[cat] ?? 0;
    const q = MOCK_QUESTION_SEEDS[cat][counters[cat] % MOCK_QUESTION_SEEDS[cat].length];
    counters[cat]++;
    return {
      question: q,
      category: cat,
      why_asked:
        cat === "behavioral"
          ? "The panel is probing for evidence of judgment under pressure, not a polished story."
          : cat === "role_specific"
            ? "They want proof you have already done the core job in the posting, at smaller scale is fine."
            : cat === "company_culture"
              ? "They are screening for genuine motivation versus a mass application."
              : "Designed to see how you handle discomfort without rehearsed answers.",
      strong_answer_outline:
        "1) One-line setup naming the company and stakes from your resume. 2) The specific decision you owned. 3) The action you took, with one real metric. 4) Result and what you would repeat here.",
    };
  });
  return JSON.stringify({
    questions,
    company_intel:
      "Mock intel (no API key configured): this company is scaling the team behind its core product and values operators who ship. Review the posting's own language for its stated priorities, recent launches, and the metrics the role is accountable for — expect interviewers to anchor on those.",
  });
}

function mockScoring(): string {
  return JSON.stringify({
    scores: {
      structure: 5,
      relevance: 6,
      confidence: 5,
      conciseness: 4,
      justifications: {
        structure: "Loose arc — the situation was clear but the result arrived late and unquantified.",
        relevance: "Addressed the question, but did not tie back to this role's responsibilities.",
        confidence: "Several hedges ('kind of', 'I think') diluted otherwise real ownership.",
        conciseness: "About 30% longer than needed; the middle section repeated itself.",
      },
    },
    feedback:
      "Biggest fix: state the result in the first 15 seconds, with a number, then explain how. Cut the hedging language entirely — you did the work, so say 'I led' not 'I kind of helped lead'.",
    improved_answer:
      "At my last role I owned the migration that was blocking our two biggest customers. I scoped it to the three highest-risk services, led a team of two through a four-week cutover, and we shipped a week early with zero rollbacks. Support tickets on that surface dropped 40% the next quarter. The lesson I'd bring here: cut scope early, over-communicate the plan, and verify with real traffic before declaring victory.",
  });
}

const MOCK_BY_TASK: Record<AiTask, () => string> = {
  prep_pack: mockPrepPack,
  scoring: mockScoring,
  star_suggest: () =>
    JSON.stringify({
      suggestion:
        "In my previous role, our release pipeline was failing nightly and blocking every team. As the engineer who knew the build system best, it fell to me to stabilize it before the quarterly launch.",
    }),
  negotiation: () =>
    JSON.stringify({
      opening_script:
        "Thank you — I'm genuinely excited about the offer. Before I accept, I want to make sure the compensation reflects the scope we discussed. Based on my research for this role and market, I was expecting base in the range of X to Y. What flexibility do we have?",
      counter_script:
        "I hear you on budget. If base is fixed, I'm open to solving it another way — a signing bonus, an earlier review cycle with defined targets, or additional equity. Which of those has the most room?",
      phrases: [
        "I'm excited to say yes — help me get there on the numbers.",
        "What flexibility do we have on base?",
        "If base is fixed, can we look at a signing bonus?",
        "Can we put a 6-month compensation review with defined targets in writing?",
        "I need until Friday to give you a final answer.",
      ],
      email_template:
        "Subject: Offer — next step\n\nHi {Name},\n\nThank you again for the offer — I'm excited about the team and the work. Before I sign, I'd like to align on compensation: given the scope of the role and current market for comparable positions, I was targeting {range}. Is there flexibility here?\n\nI'm confident we can land this quickly — I'm ready to move once the numbers work.\n\nBest,\n{You}",
      walk_away_guidance:
        "Set your walk-away number before the call, in writing, and do not negotiate against yourself by naming it first. If they can't reach it and won't move on any secondary lever, thank them and keep interviewing — a rushed yes costs more than a slow no.",
    }),
  roleplay: () =>
    JSON.stringify({
      recruiter_reply:
        "I appreciate that, but honestly this is already at the top of the band for this level — and I have two other candidates in process. I'd need an answer by end of day to hold the offer.",
      coaching_tip:
        "Deadline pressure is a standard tactic. Calmly name it: 'I understand — and a decision this important deserves a day. I'll have your answer by tomorrow morning.'",
    }),
  cover_letter: () =>
    JSON.stringify({
      letter:
        "When I saw that your team is taking on the exact problem I spent the last two years solving — reliably shipping under real-world constraints — I stopped scrolling. In my current role I led the project that cut deployment failures by 40%, and the posting reads like a description of that work at larger scale.\n\nWhat I'd bring in the first quarter: a working knowledge of the tools your posting names, a habit of writing down decisions before making them, and results a hiring panel can verify.\n\nI'd welcome twenty minutes to walk through how my experience maps to the role. I'm ready to start contributing quickly.",
      subject_line: "Application — the problem in your posting is the one I've been solving",
    }),
  followup: () =>
    JSON.stringify({
      email:
        "Hi {Name},\n\nThank you for the conversation today — the discussion about the team's roadmap confirmed why I want this role. I keep thinking about the scaling challenge you described; it maps closely to work I've shipped before, and I'd be glad to share the write-up if useful.\n\nHappy to provide anything else you need. Looking forward to next steps.\n\nBest,\n{You}",
      subject_line: "Thank you — and a thought on the scaling question",
    }),
  parse_job: () =>
    JSON.stringify({
      title: "Product Manager",
      company: "Acme Corp",
      skills: ["stakeholder management", "roadmapping", "SQL", "experimentation"],
      responsibilities: ["own the product roadmap", "run discovery with customers", "ship measurable improvements"],
      qualifications: ["3+ years product management", "track record of shipped features", "strong written communication"],
    }),
};

class MockAiProvider implements AiProvider {
  async complete({ user, task }: { system: string; user: string; maxTokens: number; task: AiTask }): Promise<AiResult> {
    // Injection red-team fixture behavior: mock is inert by construction —
    // it never interprets user content, proving the pipeline fails safe.
    const text = MOCK_BY_TASK[task]();
    return { text, inputTokens: Math.ceil(user.length / 4), outputTokens: Math.ceil(text.length / 4) };
  }
}

let _ai: AiProvider | null = null;
export function ai(): AiProvider {
  if (!_ai) _ai = has.anthropic ? new AnthropicProvider() : new MockAiProvider();
  return _ai;
}
export const isMockAi = () => !has.anthropic;
