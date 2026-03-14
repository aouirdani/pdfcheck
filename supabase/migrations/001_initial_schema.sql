-- ============================================================
-- iLovePDF Clone - Initial Schema
-- Run in Supabase SQL Editor or via `supabase db push`
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

create type job_status as enum ('pending', 'processing', 'done', 'error');

create type job_tool as enum (
  'merge', 'split', 'compress', 'rotate', 'reorder', 'add-pages',
  'jpg-to-pdf', 'word-to-pdf', 'powerpoint-to-pdf', 'excel-to-pdf', 'html-to-pdf',
  'pdf-to-jpg', 'pdf-to-word', 'pdf-to-ppt', 'pdf-to-excel',
  'edit-pdf', 'watermark', 'sign', 'annotate',
  'protect', 'unlock', 'ocr', 'page-numbers'
);

-- ─── PROFILES ────────────────────────────────────────────────────────────────

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'premium', 'team')),
  jobs_this_month int not null default 0,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── JOBS ────────────────────────────────────────────────────────────────────

create table if not exists jobs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  tool job_tool not null,
  status job_status not null default 'pending',
  progress int not null default 0 check (progress >= 0 and progress <= 100),
  input_paths text[] not null default '{}',
  output_path text,
  error_message text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table jobs enable row level security;

create policy "Users can view own jobs" on jobs
  for select using (auth.uid() = user_id or user_id is null);

create policy "Users can create jobs" on jobs
  for insert with check (auth.uid() = user_id or user_id is null);

create policy "Users can update own jobs" on jobs
  for update using (auth.uid() = user_id or user_id is null);

create policy "Users can delete own jobs" on jobs
  for delete using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists jobs_updated_at on jobs;
create trigger jobs_updated_at
  before update on jobs
  for each row execute procedure update_updated_at();

-- Cleanup old anonymous jobs (older than 24h)
create or replace function cleanup_anonymous_jobs()
returns void as $$
begin
  delete from jobs
  where user_id is null
    and created_at < now() - interval '24 hours';
end;
$$ language plpgsql security definer;

-- ─── STORAGE ─────────────────────────────────────────────────────────────────

-- Run in Supabase Dashboard > Storage > Create bucket named "pdf-files"
-- Then apply these policies:

-- insert into storage.buckets (id, name, public) values ('pdf-files', 'pdf-files', false);

-- Storage RLS policies (run in SQL editor after bucket creation):
/*
create policy "Authenticated upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pdf-files' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anon upload" on storage.objects
  for insert to anon
  with check (bucket_id = 'pdf-files' and (storage.foldername(name))[1] = 'anon');

create policy "Owner read" on storage.objects
  for select using (
    bucket_id = 'pdf-files' and (
      auth.uid()::text = (storage.foldername(name))[1]
      or (storage.foldername(name))[1] = 'anon'
    )
  );

create policy "Owner delete" on storage.objects
  for delete using (
    bucket_id = 'pdf-files' and auth.uid()::text = (storage.foldername(name))[1]
  );
*/

-- ─── REALTIME ────────────────────────────────────────────────────────────────

-- Enable realtime for jobs table
alter publication supabase_realtime add table jobs;

-- ─── INDEXES ─────────────────────────────────────────────────────────────────

create index if not exists jobs_user_id_idx on jobs (user_id);
create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_created_at_idx on jobs (created_at desc);
