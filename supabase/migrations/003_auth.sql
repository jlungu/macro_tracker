-- Add per-user auth support
-- Run in Supabase SQL editor

-- ─── meals: add user_id (nullable so existing rows are preserved) ─────────────
alter table meals add column user_id uuid references auth.users(id) on delete cascade;
drop index if exists meals_created_at_idx;
create index meals_user_date_idx on meals (user_id, created_at);
alter table meals enable row level security;
create policy "users own meals" on meals
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── targets: replace single-row design with per-user rows ───────────────────
drop table if exists targets;
create table targets (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  calories  numeric not null default 2000,
  protein_g numeric not null default 150,
  carbs_g   numeric not null default 200,
  fat_g     numeric not null default 65
);
alter table targets enable row level security;
create policy "users own targets" on targets
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── After first sign-in ──────────────────────────────────────────────────────
-- Find your UUID in Supabase > Authentication > Users, then run:
--   update meals set user_id = 'YOUR-UUID-HERE' where user_id is null;
