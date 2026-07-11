import type { NextConfig } from "next";

// Next.js dev-mode webpack HMR wraps every module in eval(...) (the default
// `eval-source-map`-style devtool) — without 'unsafe-eval' in dev, that eval is
// silently blocked by CSP and the client bundle never executes: React hydrates
// nothing, no onChange/onClick handlers attach, every "controlled" input looks
// filled (raw DOM value) while state never updates. Production builds don't
// eval, so this relaxation is dev-only and never weakens the shipped CSP.
const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), geolocation=(), browsing-topics=(), microphone=(self)",
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js requires inline styles for streaming; scripts restricted to self + PostHog
      `script-src 'self' 'unsafe-inline' https://*.posthog.com${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      `connect-src 'self' https://*.posthog.com https://*.supabase.co https://*.sentry.io wss://*.supabase.co${isDev ? " ws:" : ""}`,
      "frame-src https://checkout.stripe.com https://js.stripe.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@react-pdf/renderer"],
  // Dev server only: Next.js 15 blocks cross-origin requests to /_next/*
  // (including the fetch that powers <form action={serverAction}>) unless the
  // request's origin is explicitly allowlisted. The e2e suite (and any
  // "reachable over the LAN" dev workflow) hits the app via 127.0.0.1 rather
  // than localhost, which otherwise trips this and surfaces as a client-side
  // "Failed to fetch" TypeError on every server action. Production is
  // unaffected — this option is a no-op outside `next dev`.
  ...(isDev ? { allowedDevOrigins: ["127.0.0.1", "localhost"] } : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
