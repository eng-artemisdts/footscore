alter table public.pelada_members
  add column if not exists payment_status text not null default 'REGULAR'
  check (payment_status in ('REGULAR', 'IRREGULAR'));

create table if not exists public.pelada_events (
  id text primary key,
  pelada_id text not null references public.peladas (id) on delete cascade,
  starts_at timestamptz not null,
  location text not null,
  min_people integer not null default 10 check (min_people >= 2 and min_people <= 100),
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists pelada_events_pelada_starts_idx on public.pelada_events (pelada_id, starts_at);

alter table public.pelada_events enable row level security;

drop policy if exists "Members can read pelada events" on public.pelada_events;
create policy "Members can read pelada events"
  on public.pelada_events for select
  using (public.is_pelada_member(pelada_events.pelada_id, auth.uid()));

drop policy if exists "Admins can create pelada events" on public.pelada_events;
create policy "Admins can create pelada events"
  on public.pelada_events for insert
  with check (
    auth.uid() = pelada_events.created_by
    and public.is_pelada_admin(pelada_events.pelada_id, auth.uid())
  );

drop policy if exists "Admins can update pelada events" on public.pelada_events;
create policy "Admins can update pelada events"
  on public.pelada_events for update
  using (public.is_pelada_admin(pelada_events.pelada_id, auth.uid()))
  with check (public.is_pelada_admin(pelada_events.pelada_id, auth.uid()));

drop policy if exists "Admins can delete pelada events" on public.pelada_events;
create policy "Admins can delete pelada events"
  on public.pelada_events for delete
  using (public.is_pelada_admin(pelada_events.pelada_id, auth.uid()));

drop policy if exists "Service role can manage pelada events" on public.pelada_events;
create policy "Service role can manage pelada events"
  on public.pelada_events for all
  using (auth.jwt() ->> 'role' = 'service_role');

create table if not exists public.pelada_event_confirmations (
  pelada_event_id text not null references public.pelada_events (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('CONFIRMED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pelada_event_id, user_id)
);

create index if not exists pelada_event_confirmations_event_idx on public.pelada_event_confirmations (pelada_event_id);
create index if not exists pelada_event_confirmations_user_idx on public.pelada_event_confirmations (user_id);

alter table public.pelada_event_confirmations enable row level security;

create or replace function public.is_pelada_member_payment_regular(_pelada_id text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.pelada_members pm
    where pm.pelada_id = _pelada_id
      and pm.user_id = _user_id
      and pm.payment_status = 'REGULAR'
  );
$$;

drop policy if exists "Members can read pelada event confirmations" on public.pelada_event_confirmations;
create policy "Members can read pelada event confirmations"
  on public.pelada_event_confirmations for select
  using (
    public.is_pelada_member(
      (select e.pelada_id from public.pelada_events e where e.id = pelada_event_confirmations.pelada_event_id),
      auth.uid()
    )
  );

drop policy if exists "Members can confirm own presence" on public.pelada_event_confirmations;
create policy "Members can confirm own presence"
  on public.pelada_event_confirmations for insert
  with check (
    auth.uid() = pelada_event_confirmations.user_id
    and public.is_pelada_member(
      (select e.pelada_id from public.pelada_events e where e.id = pelada_event_confirmations.pelada_event_id),
      auth.uid()
    )
    and public.is_pelada_member_payment_regular(
      (select e.pelada_id from public.pelada_events e where e.id = pelada_event_confirmations.pelada_event_id),
      auth.uid()
    )
  );

drop policy if exists "Members can update own confirmation" on public.pelada_event_confirmations;
create policy "Members can update own confirmation"
  on public.pelada_event_confirmations for update
  using (auth.uid() = pelada_event_confirmations.user_id)
  with check (
    auth.uid() = pelada_event_confirmations.user_id
    and public.is_pelada_member(
      (select e.pelada_id from public.pelada_events e where e.id = pelada_event_confirmations.pelada_event_id),
      auth.uid()
    )
    and (
      pelada_event_confirmations.status = 'CANCELLED'
      or public.is_pelada_member_payment_regular(
        (select e.pelada_id from public.pelada_events e where e.id = pelada_event_confirmations.pelada_event_id),
        auth.uid()
      )
    )
  );

drop policy if exists "Service role can manage pelada event confirmations" on public.pelada_event_confirmations;
create policy "Service role can manage pelada event confirmations"
  on public.pelada_event_confirmations for all
  using (auth.jwt() ->> 'role' = 'service_role');

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists pelada_events_touch_updated_at on public.pelada_events;
create trigger pelada_events_touch_updated_at
  before update on public.pelada_events
  for each row execute function public.touch_updated_at();

drop trigger if exists pelada_event_confirmations_touch_updated_at on public.pelada_event_confirmations;
create trigger pelada_event_confirmations_touch_updated_at
  before update on public.pelada_event_confirmations
  for each row execute function public.touch_updated_at();

