import Link from "next/link";
import { LinkButton, Card } from "@/components/ui";

/**
 * Shared shell for the 5 SEO landing pages (BUILD_PROMPT feature 10). Same
 * "executive calm" design system as the main landing page — SEO pages are a
 * front door, not a template dump, so they get the real nav/footer + a
 * consistent structure: hook -> content sections -> FAQ -> CTA.
 */
export function SeoPage({
  eyebrow,
  title,
  intro,
  children,
  faq,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: React.ReactNode;
  faq?: { q: string; a: string }[];
}) {
  return (
    <main className="min-h-screen">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Link href="/" className="font-display text-xl font-semibold text-[var(--color-navy)]">
          InterviewAce
        </Link>
        <LinkButton href="/signup" size="sm">
          Start prep
        </LinkButton>
      </header>

      <article className="mx-auto max-w-3xl px-5 pb-20 pt-8">
        <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-brass)]">{eyebrow}</p>
        <h1 className="font-display mt-2 text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight text-[var(--color-navy)]">
          {title}
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--color-muted)]">{intro}</p>

        <div className="prose-content mt-10 space-y-8">{children}</div>

        {faq && faq.length > 0 && (
          <section className="mt-14">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-navy)]">Questions, answered</h2>
            <div className="mt-6 divide-y divide-[var(--color-line)]">
              {faq.map((f) => (
                <details key={f.q} className="group py-4">
                  <summary className="cursor-pointer list-none font-medium text-[var(--color-navy)] marker:content-none">
                    {f.q}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--color-muted)]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        <Card className="mt-14 p-7 text-center">
          <p className="font-display text-2xl font-semibold text-[var(--color-navy)]">
            Your interview is coming. Be ready by tonight.
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted)]">3-day free trial · Cancel anytime</p>
          <LinkButton href="/signup" size="lg" className="mt-5">
            Build my prep plan
          </LinkButton>
        </Card>
      </article>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-5 py-8 text-sm text-[var(--color-muted)] sm:flex-row sm:items-center sm:justify-between">
          <span className="font-display text-[var(--color-navy)]">InterviewAce</span>
          <nav className="flex gap-4">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/" className="hover:underline">Home</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}

export function SeoSection({ h2, children }: { h2: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl font-semibold text-[var(--color-navy)]">{h2}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-[var(--color-ink)]">{children}</div>
    </section>
  );
}
