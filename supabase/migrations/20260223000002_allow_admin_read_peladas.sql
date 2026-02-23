drop policy if exists "Members can read peladas" on public.peladas;

create policy "Members can read peladas"
  on public.peladas for select
  using (
    peladas.admin_user_id = auth.uid()
    or public.is_pelada_member(peladas.id, auth.uid())
  );

