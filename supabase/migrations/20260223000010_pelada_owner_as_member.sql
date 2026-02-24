create or replace function public.is_pelada_member(_pelada_id text, _user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.peladas p
    where p.id = _pelada_id
      and p.admin_user_id = _user_id
  )
  or exists (
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
    from public.peladas p
    where p.id = _pelada_id
      and p.admin_user_id = _user_id
  )
  or exists (
    select 1
    from public.pelada_members pm
    where pm.pelada_id = _pelada_id
      and pm.user_id = _user_id
      and pm.role = 'ADMIN'
  );
$$;

