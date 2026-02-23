create or replace function public.is_pelada_member(_pelada_id text, _user_id uuid)
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
  );
$$;

create or replace function public.is_pelada_admin(_pelada_id text, _user_id uuid)
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
      and pm.role = 'ADMIN'
  );
$$;

drop policy if exists "Members can read peladas" on public.peladas;
drop policy if exists "Users can create own peladas" on public.peladas;
drop policy if exists "Admins can update own peladas" on public.peladas;
drop policy if exists "Admins can delete own peladas" on public.peladas;
drop policy if exists "Service role can manage peladas" on public.peladas;

create policy "Members can read peladas"
  on public.peladas for select
  using (public.is_pelada_member(peladas.id, auth.uid()));

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

create policy "Service role can manage peladas"
  on public.peladas for all
  using (auth.jwt() ->> 'role' = 'service_role');

drop policy if exists "Members can read pelada members" on public.pelada_members;
drop policy if exists "Admins can add pelada members" on public.pelada_members;
drop policy if exists "Admins can update pelada members" on public.pelada_members;
drop policy if exists "Members can leave or admins can remove" on public.pelada_members;
drop policy if exists "Service role can manage pelada members" on public.pelada_members;

create policy "Members can read pelada members"
  on public.pelada_members for select
  using (public.is_pelada_member(pelada_members.pelada_id, auth.uid()));

create policy "Admins can add pelada members"
  on public.pelada_members for insert
  with check (public.is_pelada_admin(pelada_members.pelada_id, auth.uid()));

create policy "Admins can update pelada members"
  on public.pelada_members for update
  using (public.is_pelada_admin(pelada_members.pelada_id, auth.uid()))
  with check (public.is_pelada_admin(pelada_members.pelada_id, auth.uid()));

create policy "Members can leave or admins can remove"
  on public.pelada_members for delete
  using (
    pelada_members.user_id = auth.uid()
    or public.is_pelada_admin(pelada_members.pelada_id, auth.uid())
  );

create policy "Service role can manage pelada members"
  on public.pelada_members for all
  using (auth.jwt() ->> 'role' = 'service_role');

