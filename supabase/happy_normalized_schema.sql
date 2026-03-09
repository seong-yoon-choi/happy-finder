create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text,
  theme text not null default 'light' check (theme in ('light', 'dark')),
  reminders_enabled boolean not null default false,
  streak_current integer not null default 0 check (streak_current >= 0),
  streak_last_date date,
  onboarding_completed_at timestamptz,
  age_confirmed_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nickname is null or char_length(btrim(nickname)) between 1 and 8),
  check (
    onboarding_completed_at is null
    or (
      nickname is not null
      and age_confirmed_at is not null
      and terms_accepted_at is not null
      and privacy_accepted_at is not null
    )
  )
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner" on public.profiles;
create policy "Profiles are viewable by owner"
on public.profiles
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Profiles are insertable by owner" on public.profiles;
create policy "Profiles are insertable by owner"
on public.profiles
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Profiles are updatable by owner" on public.profiles;
create policy "Profiles are updatable by owner"
on public.profiles
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, nickname)
  values (
    new.id,
    nullif(btrim(coalesce(new.raw_user_meta_data ->> 'nickname', '')), '')
  )
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create table if not exists public.user_reminders (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id) on delete cascade,
  time_of_day time not null,
  sort_order integer not null default 0 check (sort_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, time_of_day)
);

alter table public.user_reminders enable row level security;

drop policy if exists "Reminders are viewable by owner" on public.user_reminders;
create policy "Reminders are viewable by owner"
on public.user_reminders
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Reminders are insertable by owner" on public.user_reminders;
create policy "Reminders are insertable by owner"
on public.user_reminders
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Reminders are updatable by owner" on public.user_reminders;
create policy "Reminders are updatable by owner"
on public.user_reminders
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Reminders are deletable by owner" on public.user_reminders;
create policy "Reminders are deletable by owner"
on public.user_reminders
for delete
using ((select auth.uid()) = user_id);

drop trigger if exists set_user_reminders_updated_at on public.user_reminders;
create trigger set_user_reminders_updated_at
before update on public.user_reminders
for each row
execute function public.set_updated_at();

create index if not exists idx_user_reminders_user_sort
on public.user_reminders (user_id, sort_order);

-- Keep item ids as text so existing app ids like h1, h2, c_... can migrate without remapping.
create table if not exists public.happiness_items (
  id text primary key,
  title text not null,
  description text not null,
  category text not null check (category in ('소확행', '일주일행복', '한달행복')),
  source text not null check (source in ('system', 'custom')),
  owner_user_id uuid references auth.users(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(btrim(title)) between 1 and 20),
  check (char_length(btrim(description)) between 1 and 100),
  check (
    (source = 'system' and owner_user_id is null)
    or (source = 'custom' and owner_user_id is not null)
  )
);

alter table public.happiness_items enable row level security;

drop policy if exists "System items are public and custom items are owner only" on public.happiness_items;
create policy "System items are public and custom items are owner only"
on public.happiness_items
for select
using (
  is_active
  and (
    source = 'system'
    or owner_user_id = (select auth.uid())
  )
);

drop policy if exists "Users can insert own custom items" on public.happiness_items;
create policy "Users can insert own custom items"
on public.happiness_items
for insert
with check (
  source = 'custom'
  and owner_user_id = (select auth.uid())
);

drop policy if exists "Users can update own custom items" on public.happiness_items;
create policy "Users can update own custom items"
on public.happiness_items
for update
using (
  source = 'custom'
  and owner_user_id = (select auth.uid())
)
with check (
  source = 'custom'
  and owner_user_id = (select auth.uid())
);

drop policy if exists "Users can delete own custom items" on public.happiness_items;
create policy "Users can delete own custom items"
on public.happiness_items
for delete
using (
  source = 'custom'
  and owner_user_id = (select auth.uid())
);

drop trigger if exists set_happiness_items_updated_at on public.happiness_items;
create trigger set_happiness_items_updated_at
before update on public.happiness_items
for each row
execute function public.set_updated_at();

create index if not exists idx_happiness_items_category_source
on public.happiness_items (category, source);

create index if not exists idx_happiness_items_owner
on public.happiness_items (owner_user_id)
where owner_user_id is not null;

create or replace function public.can_access_item(target_item_id text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.happiness_items hi
    where hi.id = target_item_id
      and hi.is_active
      and (
        hi.source = 'system'
        or hi.owner_user_id = (select auth.uid())
      )
  );
$$;

insert into public.happiness_items (id, title, description, category, source, is_active)
values
  ('h1', '길고양이 찾기', '귀여운 길고양이를 찾아서 행복해져 보세요!', '소확행', 'system', true),
  ('h2', '풀냄새 맡기', '평소에 맡기 힘들었던 산뜻한 풀냄새로 기분을 행복하게 해보세요.', '소확행', 'system', true),
  ('h3', '따뜻한 커피 한 잔', '여유롭게 마시는 커피 한 잔의 향기를 즐겨보세요.', '소확행', 'system', true),
  ('h4', '좋아하는 음악 듣기', '하루를 마무리하며 좋아하는 노래를 감상하세요.', '소확행', 'system', true),
  ('h5', '맛있는 주말 브런치', '일주일에 한 번, 나를 위한 맛있는 식사를 대접하세요.', '일주일행복', 'system', true),
  ('h6', '새로운 곳 산책하기', '이번 주는 가보지 않았던 새로운 길을 걸어보세요.', '일주일행복', 'system', true),
  ('h7', '책 한 권 다 읽기', '한 달간 조금씩 읽어 책 한 권을 완독하는 성취감을 느껴보세요.', '한달행복', 'system', true),
  ('h8', '나만의 여행 떠나기', '한 달에 하루, 오롯이 나를 위한 당일치기 여행을 다녀오세요.', '한달행복', 'system', true),
  ('h9', '창문 열고 바람 쐬기', '잠깐 창문을 열고 시원한 바람을 느끼며 머리를 환기해보세요.', '소확행', 'system', true),
  ('h10', '좋아하는 간식 하나 사기', '작지만 확실한 만족을 주는 간식 하나로 오늘을 더 달콤하게 만들어보세요.', '소확행', 'system', true),
  ('h11', '하늘 사진 찍기', '오늘의 하늘을 찍어두고 잠깐 멈춰 서서 계절의 분위기를 느껴보세요.', '소확행', 'system', true),
  ('h12', '햇살 아래 10분 걷기', '잠깐이라도 햇살을 받으며 걷다 보면 몸과 마음이 조금 가벼워질 거예요.', '소확행', 'system', true),
  ('h13', '가보고 싶던 카페 가기', '이번 주엔 저장만 해둔 카페에 직접 가서 새로운 기분을 만나보세요.', '일주일행복', 'system', true),
  ('h14', '영화 한 편 제대로 보기', '한 주에 한 번은 좋아하는 영화나 보고 싶던 작품에 집중해보세요.', '일주일행복', 'system', true),
  ('h15', '꽃 한 송이 두기', '책상이나 방에 꽃 한 송이를 두면 일주일의 분위기가 달라질 수 있어요.', '일주일행복', 'system', true),
  ('h16', '주말 아침 천천히 시작하기', '알람에 쫓기지 않고 여유롭게 아침을 시작하는 시간도 큰 행복이에요.', '일주일행복', 'system', true),
  ('h17', '작은 목표 하나 완성하기', '한 달 안에 끝낼 수 있는 목표 하나를 정하고 마무리하는 성취를 느껴보세요.', '한달행복', 'system', true),
  ('h18', '나만의 플레이리스트 만들기', '한 달 동안 들을 곡을 골라 나만의 플레이리스트를 완성해보세요.', '한달행복', 'system', true),
  ('h19', '감사 기록 남기기', '한 달 동안 감사했던 순간을 모아보면 예상보다 많은 행복이 보일 거예요.', '한달행복', 'system', true),
  ('h20', '사진첩 정리하며 추억 보기', '미뤄둔 사진을 정리하며 지나온 좋은 순간들을 천천히 돌아보세요.', '한달행복', 'system', true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source = excluded.source,
  is_active = excluded.is_active;

create table if not exists public.user_item_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.happiness_items(id) on delete cascade,
  enjoy_count integer not null check (enjoy_count > 0),
  last_enjoyed_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_item_progress enable row level security;

drop policy if exists "Progress is viewable by owner" on public.user_item_progress;
create policy "Progress is viewable by owner"
on public.user_item_progress
for select
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Progress is insertable by owner" on public.user_item_progress;
create policy "Progress is insertable by owner"
on public.user_item_progress
for insert
with check (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Progress is updatable by owner" on public.user_item_progress;
create policy "Progress is updatable by owner"
on public.user_item_progress
for update
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
)
with check (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop trigger if exists set_user_item_progress_updated_at on public.user_item_progress;
create trigger set_user_item_progress_updated_at
before update on public.user_item_progress
for each row
execute function public.set_updated_at();

create index if not exists idx_user_item_progress_item
on public.user_item_progress (item_id);

create index if not exists idx_user_item_progress_user_last_enjoyed
on public.user_item_progress (user_id, last_enjoyed_on desc);

create table if not exists public.user_item_memos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.happiness_items(id) on delete cascade,
  content text not null check (char_length(btrim(content)) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_item_memos enable row level security;

drop policy if exists "Memos are viewable by owner" on public.user_item_memos;
create policy "Memos are viewable by owner"
on public.user_item_memos
for select
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Memos are insertable by owner" on public.user_item_memos;
create policy "Memos are insertable by owner"
on public.user_item_memos
for insert
with check (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Memos are updatable by owner" on public.user_item_memos;
create policy "Memos are updatable by owner"
on public.user_item_memos
for update
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
)
with check (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Memos are deletable by owner" on public.user_item_memos;
create policy "Memos are deletable by owner"
on public.user_item_memos
for delete
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop trigger if exists set_user_item_memos_updated_at on public.user_item_memos;
create trigger set_user_item_memos_updated_at
before update on public.user_item_memos
for each row
execute function public.set_updated_at();

create index if not exists idx_user_item_memos_user_item
on public.user_item_memos (user_id, item_id, created_at desc);

create table if not exists public.user_favorite_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.happiness_items(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_favorite_items enable row level security;

drop policy if exists "Favorites are viewable by owner" on public.user_favorite_items;
create policy "Favorites are viewable by owner"
on public.user_favorite_items
for select
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Favorites are insertable by owner" on public.user_favorite_items;
create policy "Favorites are insertable by owner"
on public.user_favorite_items
for insert
with check (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

drop policy if exists "Favorites are deletable by owner" on public.user_favorite_items;
create policy "Favorites are deletable by owner"
on public.user_favorite_items
for delete
using (
  (select auth.uid()) = user_id
  and public.can_access_item(item_id)
);

create index if not exists idx_user_favorite_items_item
on public.user_favorite_items (item_id);
