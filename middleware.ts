/**
 * Route gating. Authentication is checked here (cookie presence + redirect);
 * cryptographic session verification and subscription/entitlement checks
 * happen server-side in (app)/layout.tsx and in every API route guard
 * (lib/entitlement.ts) — middleware never trusts the cookie contents.
 */
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard", "/prep", "/mock", "/answers", "/star", "/negotiation",
  "/letters", "/cheatsheet", "/settings", "/onboarding", "/paywall", "/admin",
];

function hasAuthCookie(req: NextRequest): boolean {
  if (req.cookies.get("ia_session")?.value) return true;
  // Supabase SSR cookies: sb-<ref>-auth-token (possibly chunked)
  return req.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (!hasAuthCookie(req)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|api).*)"],
};
