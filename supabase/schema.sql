-- Mini Notes schema: one table + Row Level Security.
-- Run this once in the Supabase SQL editor.

create table public.notes (
  id         bigint generated always as identity primary key,
  -- default auth.uid(): the database fills in the logged-in user's id itself.
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  -- Defense in depth: the server validates length too, but the DB is the last line.
  content    text not null check (char_length(content) between 1 and 500),
  created_at timestamptz not null default now()
);

-- RLS on: with no policies, nobody (except the service role) can read or write.
alter table public.notes enable row level security;

-- Signed-in users can only read their own notes.
create policy "Users can read own notes"
  on public.notes for select
  to authenticated
  using (auth.uid() = user_id);

-- Signed-in users can only insert notes for themselves.
create policy "Users can insert own notes"
  on public.notes for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Only the two actions we need (no update/delete for now).
grant select, insert on public.notes to authenticated;
