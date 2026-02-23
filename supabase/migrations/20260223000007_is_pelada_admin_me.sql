create or replace function public.is_pelada_admin_me(_pelada_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_pelada_admin(_pelada_id, auth.uid());
$$;

