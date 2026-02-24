create or replace function public.get_pelada_user_names(_pelada_id text, _user_ids uuid[])
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    u.id as user_id,
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
      nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(u.email), '')
    ) as name
  from auth.users u
  join public.pelada_members pm
    on pm.user_id = u.id
   and pm.pelada_id = _pelada_id
  where public.is_pelada_member(_pelada_id, auth.uid())
    and (
      _user_ids is null
      or array_length(_user_ids, 1) is null
      or u.id = any(_user_ids)
    );
$$;

revoke all on function public.get_pelada_user_names(text, uuid[]) from public;
grant execute on function public.get_pelada_user_names(text, uuid[]) to authenticated;
