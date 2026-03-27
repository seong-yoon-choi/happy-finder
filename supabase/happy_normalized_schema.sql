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
  category text not null,
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

update public.happiness_items
set category = case
  when category = '일주일행복' then '기분전환'
  when category = '한달행복' then '제대로'
  else category
end
where category in ('일주일행복', '한달행복');

alter table public.happiness_items
drop constraint if exists happiness_items_category_check;

alter table public.happiness_items
add constraint happiness_items_category_check
check (category in ('소확행', '기분전환', '제대로'));

update public.happiness_items
set is_active = false
where source = 'system'
  and id in (
    'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'h7', 'h8', 'h9', 'h10',
    'h11', 'h12', 'h13', 'h14', 'h15',
    'h16', 'h17', 'h18', 'h19', 'h20'
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
  ('h21', '일기 쓰기', '오늘의 기분을 짧게라도 적으며 마음을 천천히 정리해보세요.', '소확행', 'system', true),
  ('h22', '좋아하는 양말 신고 하루 시작하기', '좋아하는 양말을 신고 하루를 시작하면 기분이 조금 더 산뜻해질 수 있어요.', '소확행', 'system', true),
  ('h23', '셀프 칭찬 한마디 하기', '거울을 보며 오늘의 나에게 짧은 칭찬 한마디를 건네보세요.', '소확행', 'system', true),
  ('h24', '휴대폰 배경화면 바꾸기', '마음에 드는 사진이나 이미지를 골라 기분 좋은 화면으로 바꿔보세요.', '소확행', 'system', true),
  ('h25', '비 오는 날 빗소리 듣기', '비가 오는 날엔 잠깐 멈춰서 빗소리를 들으며 마음을 쉬게 해보세요.', '소확행', 'system', true),
  ('h26', '핸드크림 바르고 향 맡기', '좋아하는 향을 가까이 두고 천천히 맡아보며 기분을 다독여보세요.', '소확행', 'system', true),
  ('h27', '옷 사기', '입고 싶었던 옷 한 벌을 골라 기분 전환이 되는 소비를 해보세요.', '기분전환', 'system', true),
  ('h28', '보고 싶었던 영화 보기', '미뤄뒀던 영화를 보며 잠깐 다른 세계에 푹 빠져보세요.', '기분전환', 'system', true),
  ('h29', '노래방 가기', '마음껏 노래를 부르며 쌓여 있던 기분을 시원하게 풀어보세요.', '기분전환', 'system', true),
  ('h30', '쉬는 날 계획하기', '다가오는 쉬는 날에 하고 싶은 일을 골라 기대감을 만들어보세요.', '기분전환', 'system', true),
  ('h31', '서점에서 책 구경하기', '서점에 들러 표지와 제목을 천천히 보며 마음 가는 책을 찾아보세요.', '기분전환', 'system', true),
  ('h32', '사고 싶었던 물건 사기', '계속 눈에 밟히던 물건을 드디어 사며 만족감을 느껴보세요.', '기분전환', 'system', true),
  ('h33', '공연 보러 가기', '라이브로만 느낄 수 있는 분위기와 에너지를 직접 경험해보세요.', '제대로', 'system', true),
  ('h34', '나만의 취미 만들기', '꾸준히 즐길 수 있는 취미 하나를 정해 나만의 시간을 만들어보세요.', '제대로', 'system', true),
  ('h35', '하고 싶은 공부 시작하기', '예전부터 배우고 싶었던 주제를 골라 첫 페이지를 열어보세요.', '제대로', 'system', true),
  ('h36', '방 정리하기', '미뤄둔 공간을 정리하면서 생활 분위기까지 가볍게 바꿔보세요.', '제대로', 'system', true),
  ('h37', '혼자 놀기 계획하기', '오롯이 혼자 즐길 하루를 상상하며 나만의 코스를 짜보세요.', '제대로', 'system', true)
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
