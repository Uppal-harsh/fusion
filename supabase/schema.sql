create extension if not exists pgcrypto;

create table if not exists public.fusion_users (
  email text primary key,
  name text,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fusion_history (
  id uuid primary key default gen_random_uuid(),
  user_email text not null references public.fusion_users(email) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  query text not null,
  task_type text not null,
  top_model text not null,
  confidence double precision not null,
  synthesized_answer text not null,
  ranking jsonb not null,
  scores jsonb not null,
  benchmark jsonb not null
);

create table if not exists public.fusion_user_settings (
  user_email text primary key references public.fusion_users(email) on delete cascade,
  theme text not null default 'system',
  default_task_type text not null default 'general',
  auto_run boolean not null default false,
  compact_view boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fusion_event_logs (
  id uuid primary key default gen_random_uuid(),
  user_email text references public.fusion_users(email) on delete set null,
  event_type text not null,
  route text not null,
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists fusion_history_user_email_created_at_idx
  on public.fusion_history(user_email, created_at desc);

create index if not exists fusion_event_logs_user_email_created_at_idx
  on public.fusion_event_logs(user_email, created_at desc);

create or replace function public.set_fusion_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists fusion_users_set_updated_at on public.fusion_users;
create trigger fusion_users_set_updated_at
before update on public.fusion_users
for each row
execute function public.set_fusion_updated_at();

drop trigger if exists fusion_user_settings_set_updated_at on public.fusion_user_settings;
create trigger fusion_user_settings_set_updated_at
before update on public.fusion_user_settings
for each row
execute function public.set_fusion_updated_at();
