insert into public.profiles (user_id, nickname)
select
  au.id,
  nullif(btrim(coalesce(au.raw_user_meta_data ->> 'nickname', '')), '')
from auth.users as au
left join public.profiles as p
  on p.user_id = au.id
where p.user_id is null
on conflict (user_id) do nothing;
