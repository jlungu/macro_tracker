-- Daily macro targets (single-user, single row)
create table if not exists targets (
  id         text primary key default 'default',
  calories   numeric not null default 2000,
  protein_g  numeric not null default 150,
  carbs_g    numeric not null default 200,
  fat_g      numeric not null default 65
);

-- Seed the default row
insert into targets (id) values ('default') on conflict do nothing;
