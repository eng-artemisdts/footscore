alter table public.pelada_players
  add column if not exists sport public.pelada_sport not null default 'FUTEBOL';

create or replace function public.validate_pelada_player_attributes(_sport public.pelada_sport, _attributes jsonb)
returns boolean
language sql
immutable
as $$
  select
    jsonb_typeof(_attributes) = 'object'
    and (
      case _sport
        when 'FUTEBOL' then
          (_attributes ?& array['pace','shooting','passing','dribbling','defending','physical'])
          and (_attributes - 'pace' - 'shooting' - 'passing' - 'dribbling' - 'defending' - 'physical') = '{}'::jsonb
          and jsonb_typeof(_attributes->'pace') = 'number' and ((_attributes->>'pace')::numeric between 0 and 99)
          and jsonb_typeof(_attributes->'shooting') = 'number' and ((_attributes->>'shooting')::numeric between 0 and 99)
          and jsonb_typeof(_attributes->'passing') = 'number' and ((_attributes->>'passing')::numeric between 0 and 99)
          and jsonb_typeof(_attributes->'dribbling') = 'number' and ((_attributes->>'dribbling')::numeric between 0 and 99)
          and jsonb_typeof(_attributes->'defending') = 'number' and ((_attributes->>'defending')::numeric between 0 and 99)
          and jsonb_typeof(_attributes->'physical') = 'number' and ((_attributes->>'physical')::numeric between 0 and 99)
        else false
      end
    );
$$;

alter table public.pelada_players
  drop constraint if exists pelada_players_attributes_by_sport_chk;

alter table public.pelada_players
  add constraint pelada_players_attributes_by_sport_chk
  check (public.validate_pelada_player_attributes(sport, attributes));

create or replace function public.sync_pelada_player_sport()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select p.sport into new.sport
  from public.peladas p
  where p.id = new.pelada_id;

  if new.sport is null then
    raise exception 'Pelada inválida para jogador';
  end if;

  return new;
end;
$$;

drop trigger if exists pelada_players_sync_sport on public.pelada_players;
create trigger pelada_players_sync_sport
  before insert or update on public.pelada_players
  for each row execute function public.sync_pelada_player_sport();

