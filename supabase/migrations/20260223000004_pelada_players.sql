create table if not exists public.pelada_players (
  pelada_id text not null references public.peladas (id) on delete cascade,
  id text not null,
  user_id uuid null references auth.users (id) on delete set null,
  display_name text not null,
  nick text not null,
  photo_url text null,
  primary_position text not null,
  secondary_position text null,
  dominant_foot text not null check (dominant_foot in ('DIREITO', 'ESQUERDO', 'AMBOS')),
  presence_count integer not null default 0,
  attributes jsonb not null,
  overall integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (pelada_id, id)
);

create index if not exists pelada_players_pelada_id_idx on public.pelada_players (pelada_id);

alter table public.pelada_players enable row level security;

drop policy if exists "Members can read pelada players" on public.pelada_players;
create policy "Members can read pelada players"
  on public.pelada_players for select
  using (public.is_pelada_member(pelada_players.pelada_id, auth.uid()));

drop policy if exists "Admins can add pelada players" on public.pelada_players;
create policy "Admins can add pelada players"
  on public.pelada_players for insert
  with check (public.is_pelada_admin(pelada_players.pelada_id, auth.uid()));

drop policy if exists "Admins can update pelada players" on public.pelada_players;
create policy "Admins can update pelada players"
  on public.pelada_players for update
  using (public.is_pelada_admin(pelada_players.pelada_id, auth.uid()))
  with check (public.is_pelada_admin(pelada_players.pelada_id, auth.uid()));

drop policy if exists "Admins can delete pelada players" on public.pelada_players;
create policy "Admins can delete pelada players"
  on public.pelada_players for delete
  using (public.is_pelada_admin(pelada_players.pelada_id, auth.uid()));

drop policy if exists "Service role can manage pelada players" on public.pelada_players;
create policy "Service role can manage pelada players"
  on public.pelada_players for all
  using (auth.jwt() ->> 'role' = 'service_role');

