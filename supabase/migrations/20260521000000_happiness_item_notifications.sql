begin;

create table if not exists public.happiness_item_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  item_id text references public.happiness_items(id) on delete cascade,
  type text not null check (type in ('empathy')),
  message text not null,
  item_snapshot_title text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint happiness_item_notifications_unique_empathy
    unique (recipient_user_id, actor_user_id, item_id, type),
  check (char_length(btrim(message)) between 1 and 120),
  check (char_length(btrim(item_snapshot_title)) between 1 and 20)
);

alter table public.happiness_item_notifications enable row level security;

drop policy if exists "Users can read own happiness notifications" on public.happiness_item_notifications;
create policy "Users can read own happiness notifications"
on public.happiness_item_notifications
for select
using ((select auth.uid()) = recipient_user_id);

drop policy if exists "Users can mark own happiness notifications read" on public.happiness_item_notifications;
create policy "Users can mark own happiness notifications read"
on public.happiness_item_notifications
for update
using ((select auth.uid()) = recipient_user_id)
with check ((select auth.uid()) = recipient_user_id);

drop policy if exists "Users can delete own happiness notifications" on public.happiness_item_notifications;
create policy "Users can delete own happiness notifications"
on public.happiness_item_notifications
for delete
using ((select auth.uid()) = recipient_user_id);

create index if not exists idx_happiness_item_notifications_recipient_created
on public.happiness_item_notifications (recipient_user_id, created_at desc);

create or replace function public.create_happiness_item_empathy_notification(target_item_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_actor_id uuid := auth.uid();
  target_owner_id uuid;
  target_title text;
  notification_id uuid;
begin
  if current_actor_id is null or nullif(btrim(coalesce(target_item_id, '')), '') is null then
    return null;
  end if;

  select hi.owner_user_id, hi.title
    into target_owner_id, target_title
  from public.happiness_items hi
  where hi.id = target_item_id
    and hi.source = 'custom'
    and hi.is_active
    and hi.is_public
    and hi.owner_user_id is not null;

  if target_owner_id is null or target_owner_id = current_actor_id then
    return null;
  end if;

  insert into public.happiness_item_notifications (
    recipient_user_id,
    actor_user_id,
    item_id,
    type,
    message,
    item_snapshot_title,
    read_at
  )
  values (
    target_owner_id,
    current_actor_id,
    target_item_id,
    'empathy',
    '누군가가 내 행복에 공감을 했습니다.',
    target_title,
    null
  )
  on conflict on constraint happiness_item_notifications_unique_empathy
  do update set
    message = excluded.message,
    item_snapshot_title = excluded.item_snapshot_title,
    created_at = now(),
    read_at = null
  returning id into notification_id;

  return notification_id;
end;
$$;

revoke execute on function public.create_happiness_item_empathy_notification(text) from public;
grant execute on function public.create_happiness_item_empathy_notification(text) to authenticated;

do $$
begin
  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'happiness_item_notifications'
  ) then
    alter publication supabase_realtime add table public.happiness_item_notifications;
  end if;
exception
  when duplicate_object then
    null;
end $$;

commit;
