create table if not exists public.happy_user_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.happy_user_snapshots enable row level security;

drop policy if exists "Users can view own snapshot" on public.happy_user_snapshots;
create policy "Users can view own snapshot"
on public.happy_user_snapshots
for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own snapshot" on public.happy_user_snapshots;
create policy "Users can insert own snapshot"
on public.happy_user_snapshots
for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own snapshot" on public.happy_user_snapshots;
create policy "Users can update own snapshot"
on public.happy_user_snapshots
for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create or replace function public.set_snapshot_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_happy_snapshot_updated_at on public.happy_user_snapshots;

create trigger set_happy_snapshot_updated_at
before update on public.happy_user_snapshots
for each row
execute function public.set_snapshot_updated_at();
