import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthForm } from "../AuthForm";
import { loginAction } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getSession()) redirect("/dashboard");
  const { next } = await searchParams;
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Welcome back</h1>
      <p className="mt-2 mb-7 text-sm leading-relaxed text-[var(--color-muted)]">
        Log in to pick up where you left off — your answer bank and prep plans are waiting.
      </p>
      <AuthForm mode="login" action={loginAction} next={next} />
    </div>
  );
}
