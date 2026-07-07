"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, Input, Label } from "@/components/ui";
import type { ActionState } from "./actions";

export function AuthForm({
  mode,
  action,
  next,
}: {
  mode: "signup" | "login";
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  next?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const isSignup = mode === "signup";

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@work.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={isSignup ? "At least 8 characters" : "Your password"}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "One moment…" : isSignup ? "Create account" : "Log in"}
      </Button>
      <p className="text-center text-sm text-[var(--color-muted)]">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--color-navy)] hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-[var(--color-navy)] hover:underline">
              Start your prep
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
