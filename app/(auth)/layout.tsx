import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-6xl px-5 py-5">
        <Link href="/" className="font-display text-xl font-semibold text-[var(--color-navy)]">
          InterviewAce
        </Link>
      </header>
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </main>
  );
}
