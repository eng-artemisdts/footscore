do $$
begin
  if not exists (select 1 from pg_type where typname = 'pelada_sport') then
    create type public.pelada_sport as enum ('FUTEBOL');
  end if;
end $$;

create table if not exists public.peladas (
  id text primary key,
  name text not null,
  sport public.pelada_sport not null default 'FUTEBOL',
  admin_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists peladas_admin_user_id_idx on public.peladas (admin_user_id);

create table if not exists public.pelada_members (
  pelada_id text not null references public.peladas (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'MEMBER' check (role in ('ADMIN', 'MEMBER')),
  created_at timestamptz not null default now(),
  primary key (pelada_id, user_id)
);

create index if not exists pelada_members_user_id_idx on public.pelada_members (user_id);

create or replace function public.add_admin_pelada_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.pelada_members (pelada_id, user_id, role)
  values (new.id, new.admin_user_id, 'ADMIN')
  on conflict (pelada_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_pelada_created_add_admin_member on public.peladas;
create trigger on_pelada_created_add_admin_member
  after insert on public.peladas
  for each row execute function public.add_admin_pelada_member();

alter table public.peladas enable row level security;
alter table public.pelada_members enable row level security;

create policy "Members can read peladas"
  on public.peladas for select
  using (
    exists (
      select 1
      from public.pelada_members pm
      where pm.pelada_id = peladas.id
        and pm.user_id = auth.uid()
    )
  );

create policy "Users can create own peladas"
  on public.peladas for insert
  with check (auth.uid() = admin_user_id);

create policy "Admins can update own peladas"
  on public.peladas for update
  using (auth.uid() = admin_user_id)
  with check (auth.uid() = admin_user_id);

create policy "Admins can delete own peladas"
  on public.peladas for delete
  using (auth.uid() = admin_user_id);

create policy "Members can read pelada members"
  on public.pelada_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.peladas p
      where p.id = pelada_members.pelada_id
        and p.admin_user_id = auth.uid()
    )
  );

create policy "Admins can add pelada members"
  on public.pelada_members for insert
  with check (
    exists (
      select 1
      from public.peladas p
      where p.id = pelada_members.pelada_id
        and p.admin_user_id = auth.uid()
    )
  );

create policy "Admins can update pelada members"
  on public.pelada_members for update
  using (
    exists (
      select 1
      from public.peladas p
      where p.id = pelada_members.pelada_id
        and p.admin_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.peladas p
      where p.id = pelada_members.pelada_id
        and p.admin_user_id = auth.uid()
    )
  );

create policy "Members can leave or admins can remove"
  on public.pelada_members for delete
  using (
    user_id = auth.uid()
    or exists (
      select 1
      from public.peladas p
      where p.id = pelada_members.pelada_id
        and p.admin_user_id = auth.uid()
    )
  );

create policy "Service role can manage peladas"
  on public.peladas for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role can manage pelada members"
  on public.pelada_members for all
  using (auth.jwt() ->> 'role' = 'service_role');

