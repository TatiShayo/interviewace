/**
 * Typed environment access. Every third-party integration is optional:
 * a missing key flips its provider into mock mode so the build never stalls.
 * Server-only secrets must NEVER be imported from client components.
 */
export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  aiKillSwitch: process.env.AI_KILL_SWITCH === "1" || process.env.AI_KILL_SWITCH === "true",
  cronSecret: process.env.CRON_SECRET ?? "",

  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",

  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",

  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceWeekly: process.env.STRIPE_PRICE_WEEKLY ?? "",
  stripePriceMonthly: process.env.STRIPE_PRICE_MONTHLY ?? "",
  stripePriceLandJob: process.env.STRIPE_PRICE_LANDJOB ?? "",

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFrom: process.env.RESEND_FROM ?? "InterviewAce <hello@interviewace.app>",

  sentryDsn: process.env.SENTRY_DSN ?? "",
} as const;

export const has = {
  supabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  supabaseAdmin: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
  anthropic: Boolean(env.anthropicApiKey),
  openai: Boolean(env.openaiApiKey),
  stripe: Boolean(env.stripeSecretKey),
  resend: Boolean(env.resendApiKey),
  sentry: Boolean(env.sentryDsn),
} as const;
