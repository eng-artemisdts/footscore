insert into public.profiles (id, plan, subscription_status, updated_at)
select id, 'free', 'free', now()
from auth.users
on conflict (id) do nothing;
