-- Macro Tracker: initial schema
-- Run this in your Supabase SQL editor

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── meals ───────────────────────────────────────────────────────────────────
create table if not exists meals (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  description text not null,
  -- macros stored as a JSONB object: {calories, protein_g, carbs_g, fat_g}
  macros      jsonb not null default '{}',
  image_url   text,
  raw_input   text not null default '',
  notes       text
);

-- Index for daily queries
create index if not exists meals_created_at_idx on meals (created_at);

-- ─── food_images (reference library) ─────────────────────────────────────────
-- Stores previously identified food photos so Claude can reference them later
create table if not exists food_images (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  image_url   text not null,
  description text not null,
  macros      jsonb not null default '{}'
);

-- ─── Storage bucket (run via Supabase dashboard or CLI) ───────────────────────
-- Create a public bucket called "meal-images":
--   Dashboard → Storage → New bucket → Name: meal-images → Public: true
--
-- Or via SQL (requires pg_net / storage admin access):
-- insert into storage.buckets (id, name, public)
-- values ('meal-images', 'meal-images', true)
-- on conflict do nothing;
