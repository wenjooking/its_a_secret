-- Run once in Supabase: SQL Editor → New query → Run

create table if not exists public.festival_views (
  festival_id text primary key,
  view_count bigint not null default 0
);

insert into public.festival_views (festival_id, view_count)
values ('valentine', 0), ('birthday', 0)
on conflict (festival_id) do nothing;

create or replace function public.increment_festival_view(fid text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.festival_views (festival_id, view_count)
  values (fid, 1)
  on conflict (festival_id)
  do update set view_count = public.festival_views.view_count + 1;
end;
$$;

grant usage on schema public to anon;
grant select on table public.festival_views to anon;
grant execute on function public.increment_festival_view(text) to anon;

alter table public.festival_views enable row level security;

drop policy if exists "Anyone can read view counts" on public.festival_views;
create policy "Anyone can read view counts"
  on public.festival_views
  for select
  to anon
  using (true);

-- =====================================================================
-- Notes board + timeline/moments storage (survives Render redeploys)
-- =====================================================================
-- A single key/value table holds JSON documents:
--   key = 'notes'    -> array of note objects
--   key = 'manifest' -> { timeline: [...], festivals: [...], ... }

create table if not exists public.app_state (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

grant usage on schema public to anon;
grant select, insert, update on table public.app_state to anon;

alter table public.app_state enable row level security;

drop policy if exists "Anyone can read app state" on public.app_state;
create policy "Anyone can read app state"
  on public.app_state
  for select
  to anon
  using (true);

drop policy if exists "Anyone can insert app state" on public.app_state;
create policy "Anyone can insert app state"
  on public.app_state
  for insert
  to anon
  with check (true);

drop policy if exists "Anyone can update app state" on public.app_state;
create policy "Anyone can update app state"
  on public.app_state
  for update
  to anon
  using (true)
  with check (true);

-- =====================================================================
-- Storage bucket for note photos / drawings
-- =====================================================================
-- Create a PUBLIC bucket named `note-images` (Dashboard → Storage → New
-- bucket → name: note-images, Public: on), or run:

insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', true)
on conflict (id) do nothing;

drop policy if exists "Public read note images" on storage.objects;
create policy "Public read note images"
  on storage.objects
  for select
  to anon
  using (bucket_id = 'note-images');

drop policy if exists "Anyone can upload note images" on storage.objects;
create policy "Anyone can upload note images"
  on storage.objects
  for insert
  to anon
  with check (bucket_id = 'note-images');

drop policy if exists "Anyone can replace note images" on storage.objects;
create policy "Anyone can replace note images"
  on storage.objects
  for update
  to anon
  using (bucket_id = 'note-images')
  with check (bucket_id = 'note-images');

-- Note: the publishable/anon key is visible in the deployed site, so anyone
-- who finds it can read/write these tables and the bucket. That matches the
-- existing client-side passcode lock (a light privacy gate, not strong
-- security). Lock down with Supabase Auth later if you need stronger control.
