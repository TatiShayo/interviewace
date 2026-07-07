import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthForm } from "../AuthForm";
import { signupAction } from "../actions";

export default async function SignupPage() {
  if (await getSession()) redirect("/onboarding");
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold text-[var(--color-navy)]">Be ready by tonight</h1>
      <p className="mt-2 mb-7 text-sm leading-relaxed text-[var(--color-muted)]">
        Create your account to build a prep plan for your specific interview. Takes about three minutes.
      </p>
      <AuthForm mode="signup" action={signupAction} />
    </div>
  );
}
