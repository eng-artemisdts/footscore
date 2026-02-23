create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  stripe_customer_id text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  subscription_status text not null default 'free' check (subscription_status in ('free', 'active', 'past_due', 'canceled', 'trialing')),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Service role can manage profiles"
  on public.profiles for all
  using (auth.jwt() ->> 'role' = 'service_role');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, plan, subscription_status)
  values (new.id, 'free', 'free');
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
