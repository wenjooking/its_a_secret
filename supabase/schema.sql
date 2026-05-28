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

create policy "Anyone can read view counts"
  on public.festival_views
  for select
  to anon
  using (true);
