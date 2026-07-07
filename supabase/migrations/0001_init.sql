-- InterviewAce initial schema.
-- PLAYBOOK 2.2: RLS on EVERY table, default-deny, then explicit owner policies.
-- Service-role writes bypass RLS (server routes re-validate the session first);
-- these policies protect against any client using the anon key directly.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  target_role text,
  experience_level text check (experience_level in ('entry','mid','senior','exec')),
  interview_date date,
  biggest_fear text check (biggest_fear in ('freezing_up','behavioral','technical','salary_talk')),
  interview_type text check (interview_type in ('phone_screen','behavioral','technical','panel')),
  referral_code text unique,
  referred_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null,
  posting_text text not null,
  parsed_requirements jsonb,
  created_at timestamptz not null default now()
);
create index if not exists jobs_user_idx on public.jobs(user_id);

-- Resume PII: private, retention window 90 days after last activity (enforced
-- by purgeStaleResumes cron + tested). Never logged. (BUILD_PROMPT security.)
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text,
  extracted_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists resumes_user_idx on public.resumes(user_id);

create table if not exists public.prep_packs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  questions jsonb not null,
  company_intel text not null,
  content_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists prep_packs_job_idx on public.prep_packs(job_id);
create index if not exists prep_packs_hash_idx on public.prep_packs(user_id, content_hash);

create table if not exists public.mock_sessions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('voice','text')),
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists mock_sessions_user_idx on public.mock_sessions(user_id, started_at desc);

create table if not exists public.mock_answers (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mock_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  transcript text not null,
  audio_path text,
  scores jsonb,
  feedback text not null default '',
  improved_answer text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists mock_answers_session_idx on public.mock_answers(session_id);
create index if not exists mock_answers_user_idx on public.mock_answers(user_id);

create table if not exists public.saved_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  question text not null,
  answer text not null,
  source text not null check (source in ('star','mock')),
  created_at timestamptz not null default now()
);
create index if not exists saved_answers_user_idx on public.saved_answers(user_id);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_sub_id text,
  status text not null default 'none' check (status in ('trialing','active','past_due','paused','canceled','none')),
  plan text check (plan in ('weekly','monthly','landjob')),
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists subscriptions_customer_idx on public.subscriptions(stripe_customer_id);

create table if not exists public.ai_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  requests int not null default 0,
  cost_cents int not null default 0,
  primary key (user_id, day)
);
create index if not exists ai_usage_day_idx on public.ai_usage(day);

-- Stripe webhook idempotency (persist processed event ids).
create table if not exists public.stripe_events (
  id text primary key,
  received_at timestamptz not null default now()
);

create table if not exists public.outcomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  got_offer boolean not null,
  testimonial text,
  created_at timestamptz not null default now()
);

-- Atomic per-user daily usage increment (used by SupabaseDb.addUsage).
create or replace function public.add_ai_usage(
  p_user_id uuid, p_input int, p_output int, p_cost_cents int
) returns void language plpgsql security definer as $$
begin
  insert into public.ai_usage (user_id, day, input_tokens, output_tokens, requests, cost_cents)
  values (p_user_id, current_date, p_input, p_output, 1, p_cost_cents)
  on conflict (user_id, day) do update set
    input_tokens = public.ai_usage.input_tokens + excluded.input_tokens,
    output_tokens = public.ai_usage.output_tokens + excluded.output_tokens,
    requests = public.ai_usage.requests + 1,
    cost_cents = public.ai_usage.cost_cents + excluded.cost_cents;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security — default deny, explicit owner policies.
-- ---------------------------------------------------------------------------
alter table public.profiles       enable row level security;
alter table public.jobs           enable row level security;
alter table public.resumes        enable row level security;
alter table public.prep_packs     enable row level security;
alter table public.mock_sessions  enable row level security;
alter table public.mock_answers   enable row level security;
alter table public.saved_answers  enable row level security;
alter table public.subscriptions  enable row level security;
alter table public.ai_usage       enable row level security;
alter table public.stripe_events  enable row level security;
alter table public.outcomes       enable row level security;

-- profiles: a user can see/update only their own row.
create policy profiles_select on public.profiles for select using (auth.uid() = id);
create policy profiles_update on public.profiles for update using (auth.uid() = id);

-- owner-scoped tables: select/insert/update/delete gated on user_id = auth.uid().
do $$
declare t text;
begin
  foreach t in array array['jobs','resumes','prep_packs','mock_sessions','mock_answers','saved_answers','subscriptions','ai_usage','outcomes']
  loop
    execute format('create policy %1$s_owner_sel on public.%1$s for select using (auth.uid() = user_id);', t);
    execute format('create policy %1$s_owner_ins on public.%1$s for insert with check (auth.uid() = user_id);', t);
    execute format('create policy %1$s_owner_upd on public.%1$s for update using (auth.uid() = user_id);', t);
    execute format('create policy %1$s_owner_del on public.%1$s for delete using (auth.uid() = user_id);', t);
  end loop;
end $$;

-- stripe_events: no client access at all (service-role only). RLS on, no policy
-- => default deny for anon/authenticated. This is intentional.

-- Private storage buckets for resumes + audio (signed URLs only).
insert into storage.buckets (id, name, public) values ('resumes','resumes',false)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('audio','audio',false)
  on conflict (id) do nothing;
