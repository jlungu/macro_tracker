-- Add emoji column to meals for visual meal identification
alter table meals add column emoji text not null default '🍽️';
