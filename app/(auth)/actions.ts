"use server";

/**
 * Auth server actions. PLAYBOOK 2.2/2.4: rate-limited, disposable-email blocked
 * at signup (trial farming), profile row created on signup, analytics on both.
 * Errors are generic to the client.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signIn, signUp } from "@/lib/auth";
import { db } from "@/lib/providers/db";
import { isDisposableEmail, isValidEmail } from "@/lib/security/disposable";
import { rateLimit, LIMITS } from "@/lib/security/ratelimit";
import { track } from "@/lib/providers/analytics";

export type ActionState = { error?: string };

async function ipKey(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  return fwd ? fwd.split(",")[0].trim() : "unknown";
}

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const limit = rateLimit(`signup:${await ipKey()}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!limit.ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  if (isDisposableEmail(email)) return { error: "Please use a permanent email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const res = await signUp(email, password);
  if (!res.ok) return { error: res.error };

  await db().upsertProfile({ id: res.session.userId, email: res.session.email });
  track("account_created", res.session.userId, { source: "web" });
  redirect("/onboarding");
}

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const limit = rateLimit(`login:${await ipKey()}`, LIMITS.auth.limit, LIMITS.auth.windowMs);
  if (!limit.ok) return { error: "Too many attempts. Please wait a few minutes and try again." };

  if (!isValidEmail(email)) return { error: "Enter a valid email address." };
  const res = await signIn(email, password);
  if (!res.ok) return { error: res.error };

  await db().upsertProfile({ id: res.session.userId, email: res.session.email });
  track("login", res.session.userId, {});
  redirect(next.startsWith("/") ? next : "/dashboard");
}
