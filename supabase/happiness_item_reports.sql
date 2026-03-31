begin;

create table if not exists public.happiness_item_reports (
  id uuid primary key default gen_random_uuid(),
  item_id text not null references public.happiness_items(id) on delete cascade,
  reported_item_owner_user_id uuid references auth.users(id) on delete set null,
  reporter_user_id uuid references auth.users(id) on delete set null,
  reason_codes text[] not null,
  other_reason text,
  item_snapshot_title text not null,
  item_snapshot_description text not null,
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed', 'dismissed', 'resolved')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (cardinality(reason_codes) >= 1),
  check (other_reason is null or char_length(btrim(other_reason)) between 1 and 500),
  check (char_length(btrim(item_snapshot_title)) between 1 and 20),
  check (char_length(btrim(item_snapshot_description)) between 1 and 100)
);

alter table public.happiness_item_reports enable row level security;

drop policy if exists "Reports are insertable by app users" on public.happiness_item_reports;
create policy "Reports are insertable by app users"
on public.happiness_item_reports
for insert
with check (
  exists (
    select 1
    from public.happiness_items hi
    where hi.id = item_id
      and hi.is_active
      and hi.source = 'custom'
      and hi.is_public
      and (
        (select auth.uid()) is null
        or hi.owner_user_id is distinct from (select auth.uid())
      )
  )
  and (
    reporter_user_id is null
    or reporter_user_id = (select auth.uid())
  )
);

drop policy if exists "Reporters can read their own reports" on public.happiness_item_reports;
create policy "Reporters can read their own reports"
on public.happiness_item_reports
for select
using (
  reporter_user_id = (select auth.uid())
);

create index if not exists idx_happiness_item_reports_item_created
on public.happiness_item_reports (item_id, created_at desc);

create index if not exists idx_happiness_item_reports_status_created
on public.happiness_item_reports (review_status, created_at desc);

commit;
