drop policy if exists "Users can join pelada as member" on public.pelada_members;

create policy "Users can join pelada as member"
  on public.pelada_members for insert
  with check (
    pelada_members.user_id = auth.uid()
    and pelada_members.role = 'MEMBER'
  );

