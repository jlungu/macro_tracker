-- Personal food database: remembers foods the user has logged for quick re-use
create table foods (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,
  serving_size text not null,
  macros       jsonb not null,
  use_count    integer not null default 1,
  created_at   timestamptz not null default now()
);
create index foods_user_name_idx on foods (user_id, lower(name));
create index foods_user_use_count_idx on foods (user_id, use_count desc);
alter table foods enable row level security;
create policy "users own foods" on foods for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
