import Link from "next/link";
import { LinkButton, Card, Badge } from "@/components/ui";

/**
 * Landing page. "Your interview is Thursday. Be ready by tonight."
 * Hero → how it works → comparison vs $148/mo incumbents → pricing → FAQ.
 * No purple gradients, no generic three-card grid (PLAYBOOK 1.1).
 */

const FAQ: { q: string; a: string }[] = [
  {
    q: "How is this different from just using ChatGPT?",
    a: "InterviewAce reads the actual job posting and your resume, then gives you the 15 questions this specific panel is likely to ask — with an outline for each that pulls from your real experience. Then you practice out loud and get scored. It is a rehearsal, not a chat.",
  },
  {
    q: "Do I need to talk out loud?",
    a: "The voice mock is where the improvement happens, but you can also practice in text mode. Your microphone audio is private, stored encrypted, and you can delete any session.",
  },
  {
    q: "What does it cost?",
    a: "$6.99/week with a 3-day free trial (card required), or $19.99/month. There is also a flat $34.99 'Land The Job' plan that covers 60 days. Cancel anytime from settings.",
  },
  {
    q: "Is my resume data safe?",
    a: "Your resume lives in a private store, is never used to train any model, and is automatically deleted 90 days after your last activity. You can export or delete everything yourself at any time.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <span className="font-display text-xl font-semibold text-[var(--color-navy)]">InterviewAce</span>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="px-3 py-2 text-sm font-medium text-[var(--color-navy)] hover:underline">
            Log in
          </Link>
          <LinkButton href="/signup" size="sm">
            Start prep
          </LinkButton>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pt-12 pb-20 md:pt-20">
        <Badge className="mb-6">Interview prep, ready in under an hour</Badge>
        <h1 className="font-display max-w-3xl text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] text-[var(--color-navy)]">
          Your interview is Thursday.
          <br />
          Be ready by tonight.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">
          Paste the job posting, upload your resume, and get the questions you&apos;ll actually be asked. Practice out
          loud with an AI interviewer, get scored, and walk in with a salary-negotiation script.
        </p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <LinkButton href="/signup" size="lg">
            Build my prep plan
          </LinkButton>
          <LinkButton href="#how" size="lg" variant="secondary">
            See how it works
          </LinkButton>
        </div>
        <p className="mt-4 text-sm text-[var(--color-muted)]">
          3-day free trial · Cancel anytime · <span className="tnum">$6.99</span>/week after
        </p>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-[var(--color-line)] bg-white/50">
        <div className="mx-auto max-w-6xl px-5 py-16">
          <h2 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Four steps to composure</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Paste the posting", "Drop in the job link or text and your resume. We extract what the panel cares about."],
              ["02", "Get your questions", "15 likely questions — behavioral, role-specific, culture, curveballs — each with a strong-answer outline from your own experience."],
              ["03", "Practice out loud", "An AI interviewer asks; you answer. We transcribe, score structure, relevance, confidence and conciseness, then rewrite your answer stronger."],
              ["04", "Walk in ready", "A one-page cheat sheet, a salary-negotiation script, and a countdown that keeps you calm."],
            ].map(([n, t, d]) => (
              <li key={n}>
                <div className="tnum font-display text-2xl text-[var(--color-brass)]">{n}</div>
                <h3 className="mt-2 font-medium text-[var(--color-navy)]">{t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted)]">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-navy)]">How it compares</h2>
        <Card className="mt-8 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-[var(--color-muted)]">
                <th className="p-4 font-medium">&nbsp;</th>
                <th className="p-4 font-medium text-[var(--color-navy)]">InterviewAce</th>
                <th className="p-4 font-medium">Incumbents</th>
              </tr>
            </thead>
            <tbody className="[&_td]:border-b [&_td]:border-[var(--color-line)] [&_td]:p-4">
              {[
                ["Price", "$6.99/week", "$148/month"],
                ["Ready in", "Under an hour", "Full course"],
                ["Questions from your actual posting", "Yes", "Sometimes"],
                ["Out-loud scored practice", "Yes", "Yes"],
                ["Salary-negotiation script", "Yes", "Add-on"],
              ].map(([k, us, them]) => (
                <tr key={k}>
                  <td className="font-medium text-[var(--color-navy)]">{k}</td>
                  <td className="tnum text-[var(--color-navy)]">{us}</td>
                  <td className="tnum text-[var(--color-muted)]">{them}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <p className="mt-3 text-xs text-[var(--color-muted)]">
          Comparison reflects publicly listed pricing at time of writing. Not affiliated with any competitor.
        </p>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-y border-[var(--color-line)] bg-white/50">
        <div className="mx-auto max-w-4xl px-5 py-16">
          <h2 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Simple pricing</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { name: "Weekly", price: "$6.99", unit: "/week", note: "3-day free trial", featured: true },
              { name: "Monthly", price: "$19.99", unit: "/month", note: "Save vs weekly" },
              { name: "Land The Job", price: "$34.99", unit: "/60 days", note: "Best for serious searchers" },
            ].map((p) => (
              <Card
                key={p.name}
                className={p.featured ? "border-[var(--color-brass)] p-6 ring-1 ring-[var(--color-brass)]" : "p-6"}
              >
                {p.featured && <Badge className="mb-3 border-[var(--color-brass)] text-[var(--color-brass)]">Most popular</Badge>}
                <div className="font-medium text-[var(--color-navy)]">{p.name}</div>
                <div className="mt-2">
                  <span className="tnum font-display text-4xl font-semibold text-[var(--color-navy)]">{p.price}</span>
                  <span className="text-sm text-[var(--color-muted)]">{p.unit}</span>
                </div>
                <div className="mt-1 text-sm text-[var(--color-muted)]">{p.note}</div>
              </Card>
            ))}
          </div>
          <div className="mt-8">
            <LinkButton href="/signup" size="lg">
              Start your free trial
            </LinkButton>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-5 py-16">
        <h2 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Questions, answered</h2>
        <div className="mt-8 divide-y divide-[var(--color-line)]">
          {FAQ.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none font-medium text-[var(--color-navy)] marker:content-none">
                {f.q}
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-[var(--color-navy)]">InterviewAce</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/login" className="hover:underline">Log in</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
