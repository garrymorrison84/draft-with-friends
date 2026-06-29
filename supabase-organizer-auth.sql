-- Organizer accounts and commissioner tools for Draft With Friends.
-- Run this in the Supabase SQL editor before relying on the organizer portal.

alter table public.pools
  add column if not exists owner_id uuid references auth.users(id) on delete set null,
  add column if not exists draft_locked boolean not null default false,
  add column if not exists archived boolean not null default false;

create index if not exists pools_owner_id_idx on public.pools(owner_id);
create index if not exists pools_archived_idx on public.pools(archived);

alter table public.pools enable row level security;

drop policy if exists "Public can read pools" on public.pools;
create policy "Public can read pools"
  on public.pools
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Organizers can create owned pools" on public.pools;
create policy "Organizers can create owned pools"
  on public.pools
  for insert
  to authenticated
  with check (auth.uid() = owner_id);

drop policy if exists "Organizers can update owned pools" on public.pools;
create policy "Organizers can update owned pools"
  on public.pools
  for update
  to authenticated
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

drop policy if exists "Organizers can delete owned pools" on public.pools;
create policy "Organizers can delete owned pools"
  on public.pools
  for delete
  to authenticated
  using (auth.uid() = owner_id);

alter table public.draft_picks enable row level security;

drop policy if exists "Public can read draft picks" on public.draft_picks;
create policy "Public can read draft picks"
  on public.draft_picks
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Draft room can create picks" on public.draft_picks;
create policy "Draft room can create picks"
  on public.draft_picks
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Draft room can remove picks" on public.draft_picks;
create policy "Draft room can remove picks"
  on public.draft_picks
  for delete
  to anon, authenticated
  using (true);

drop policy if exists "Organizers can update picks in owned pools" on public.draft_picks;
create policy "Organizers can update picks in owned pools"
  on public.draft_picks
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.pools
      where pools.id = draft_picks.pool_id
        and pools.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.pools
      where pools.id = draft_picks.pool_id
        and pools.owner_id = auth.uid()
    )
  );


-- Weekly golf event automation.
alter table public.events
  add column if not exists start_date date,
  add column if not exists end_date date;

alter table public.pools
  add column if not exists event_id text references public.events(id) on delete set null;

create index if not exists pools_event_id_idx on public.pools(event_id);
create index if not exists events_is_active_idx on public.events(is_active);

alter table public.golfers
  add column if not exists odds numeric,
  add column if not exists odds_sort numeric,
  add column if not exists vegas_odds text;
