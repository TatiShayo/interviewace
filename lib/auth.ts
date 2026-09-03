/**
 * Auth. Two implementations behind one interface:
 *  - Supabase Auth (email+password) via @supabase/ssr when keys are present
 *  - MockAuth: HMAC-signed session cookie + scrypt-hashed local users file,
 *    so signup/login works with zero keys. Never active when Supabase is
 *    configured.
 */
import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env, has } from "@/lib/env";
import { uid } from "@/lib/utils";

export interface Session {
  userId: string;
  email: string;
}

const COOKIE = "ia_session";
const SESSION_DAYS = 30;

function secret(): string {
  // In mock mode a stable local secret is fine; production auth is Supabase.
  return env.cronSecret || "interviewace-dev-secret-not-for-production";
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

function encodeSession(s: Session): string {
  const payload = Buffer.from(
    JSON.stringify({ u: s.userId, e: s.email, x: Date.now() + SESSION_DAYS * 86_400_000 })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decodeSession(value: string): Session | null {
  const [payload, mac] = value.split(".");
  if (!payload || !mac) return null;
  const expected = sign(payload);
  const macBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (macBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(macBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { u: string; e: string; x: number };
    if (!data.u || !data.e || Date.now() > data.x) return null;
    return { userId: data.u, email: data.e };
  } catch {
    return null;
  }
}

/* ---------------- Mock local user store (dev only) ---------------- */

interface MockUser {
  id: string;
  email: string;
  salt: string;
  hash: string;
}

function usersFile(): string {
  const dir = path.join(process.cwd(), ".mockdata");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, "users.json");
}

function readUsers(): MockUser[] {
  try {
    return JSON.parse(fs.readFileSync(usersFile(), "utf8")) as MockUser[];
  } catch {
    return [];
  }
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 32).toString("hex");
}

/* ---------------- Supabase helpers ---------------- */

async function supabaseServer() {
  const store = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list: { name: string; value: string; options?: Record<string, unknown> }[]) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // called from a Server Component — middleware refresh covers it
        }
      },
    },
  });
}

/* ---------------- Public API ---------------- */

export async function getSession(): Promise<Session | null> {
  if (has.supabase) {
    const supabase = await supabaseServer();
    const { data } = await supabase.auth.getUser();
    if (!data.user?.email) return null;
    return { userId: data.user.id, email: data.user.email };
  }
  const store = await cookies();
  const raw = store.get(COOKIE)?.value;
  return raw ? decodeSession(raw) : null;
}

export type AuthResult = { ok: true; session: Session } | { ok: false; error: string };

export async function signUp(email: string, password: string): Promise<AuthResult> {
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };
  if (has.supabase) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error || !data.user) return { ok: false, error: error?.message ?? "Sign up failed." };
    return { ok: true, session: { userId: data.user.id, email } };
  }
  const users = readUsers();
  if (users.some((u) => u.email === email.toLowerCase())) {
    return { ok: false, error: "An account with this email already exists." };
  }
  const salt = crypto.randomBytes(16).toString("hex");
  const user: MockUser = { id: uid(), email: email.toLowerCase(), salt, hash: hashPassword(password, salt) };
  users.push(user);
  fs.writeFileSync(usersFile(), JSON.stringify(users, null, 2));
  const session = { userId: user.id, email: user.email };
  await setSessionCookie(session);
  return { ok: true, session };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  if (has.supabase) {
    const supabase = await supabaseServer();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user?.email) return { ok: false, error: "Invalid email or password." };
    return { ok: true, session: { userId: data.user.id, email: data.user.email } };
  }
  const user = readUsers().find((u) => u.email === email.toLowerCase());
  if (!user) return { ok: false, error: "Invalid email or password." };
  const hash = hashPassword(password, user.salt);
  const hashBuf = Buffer.from(hash);
  const userHashBuf = Buffer.from(user.hash);
  if (hashBuf.length !== userHashBuf.length || !crypto.timingSafeEqual(hashBuf, userHashBuf)) {
    return { ok: false, error: "Invalid email or password." };
  }
  const session = { userId: user.id, email: user.email };
  await setSessionCookie(session);
  return { ok: true, session };
}

export async function signOut(): Promise<void> {
  if (has.supabase) {
    const supabase = await supabaseServer();
    await supabase.auth.signOut();
    return;
  }
  const store = await cookies();
  store.delete(COOKIE);
}

async function setSessionCookie(session: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86_400,
  });
}
