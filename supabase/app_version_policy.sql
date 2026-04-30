create table if not exists public.app_version_policy (
  platform text primary key check (platform in ('android', 'ios')),
  latest_version text not null,
  latest_build integer,
  minimum_version text not null,
  minimum_build integer,
  store_url text not null,
  force_update boolean not null default false,
  is_enabled boolean not null default true,
  title text not null default '업데이트가 필요합니다',
  message text not null default '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.app_version_policy
  add column if not exists latest_build integer,
  add column if not exists minimum_build integer,
  add column if not exists force_update boolean not null default false,
  add column if not exists is_enabled boolean not null default true,
  add column if not exists title text not null default '업데이트가 필요합니다',
  add column if not exists message text not null default '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.',
  add column if not exists created_at timestamptz not null default timezone('utc', now()),
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

create or replace function public.set_app_version_policy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_app_version_policy_updated_at on public.app_version_policy;
create trigger set_app_version_policy_updated_at
before update on public.app_version_policy
for each row
execute function public.set_app_version_policy_updated_at();

alter table public.app_version_policy enable row level security;

drop policy if exists "Anyone can read enabled app version policy" on public.app_version_policy;
create policy "Anyone can read enabled app version policy"
on public.app_version_policy
for select
to anon, authenticated
using (is_enabled = true);

insert into public.app_version_policy (
  platform,
  latest_version,
  latest_build,
  minimum_version,
  minimum_build,
  store_url,
  force_update,
  is_enabled,
  title,
  message
)
values (
  'android',
  '1.0.24',
  25,
  '1.0.0',
  1,
  'https://play.google.com/store/apps/details?id=net.happyfinder.app',
  false,
  true,
  '업데이트가 필요합니다',
  '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.'
)
on conflict (platform) do update
set
  latest_version = excluded.latest_version,
  latest_build = excluded.latest_build,
  store_url = excluded.store_url,
  title = excluded.title,
  message = excluded.message,
  updated_at = timezone('utc', now());

-- iOS App Store 숫자 ID가 생기면 store_url을 실제 주소로 바꾸고 is_enabled를 true로 변경하세요.
insert into public.app_version_policy (
  platform,
  latest_version,
  latest_build,
  minimum_version,
  minimum_build,
  store_url,
  force_update,
  is_enabled,
  title,
  message
)
values (
  'ios',
  '1.0.0',
  1,
  '1.0.0',
  1,
  'https://apps.apple.com/app/id0000000000',
  false,
  false,
  '업데이트가 필요합니다',
  '더 안정적인 이용을 위해 최신 버전으로 업데이트해주세요.'
)
on conflict (platform) do nothing;
