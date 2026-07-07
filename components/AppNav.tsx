"use client";

/**
 * Persistent app nav with the quietly-urgent interview countdown
 * (brass on navy, tabular nums — BUILD_PROMPT art direction) and a slide-out
 * menu on mobile.
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { daysUntil } from "@/lib/utils";
import { signOutAction } from "@/app/(app)/actions";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/prep", label: "Prep pack" },
  { href: "/mock", label: "Practice" },
  { href: "/answers", label: "Answer bank" },
  { href: "/negotiation", label: "Negotiation" },
  { href: "/letters", label: "Letters" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({ email, interviewDate }: { email: string; interviewDate: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const days = daysUntil(interviewDate);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-porcelain)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
        <Link href="/dashboard" className="font-display text-lg font-semibold text-[var(--color-navy)]">
          InterviewAce
        </Link>

        <div className="flex items-center gap-3">
          {days !== null && days >= 0 && (
            <span className="tnum rounded-full bg-[var(--color-navy)] px-3 py-1 text-xs font-medium text-[var(--color-brass)]">
              {days === 0 ? "Interview today" : `${days}d to interview`}
            </span>
          )}
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-navy)] hover:bg-[var(--color-porcelain-2)]"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-line)] bg-[var(--color-porcelain)] px-5 py-3">
          <ul className="space-y-0.5">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "block rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium",
                    pathname === l.href
                      ? "bg-white text-[var(--color-navy)]"
                      : "text-[var(--color-muted)] hover:bg-white/60"
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-line)] pt-3">
            <span className="truncate text-xs text-[var(--color-muted)]">{email}</span>
            <form action={signOutAction}>
              <button className="text-xs font-medium text-[var(--color-navy)] hover:underline">Sign out</button>
            </form>
          </div>
        </nav>
      )}
    </header>
  );
}
