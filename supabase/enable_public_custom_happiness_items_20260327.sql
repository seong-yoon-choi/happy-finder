begin;

alter table public.happiness_items
add column if not exists is_public boolean not null default false;

update public.happiness_items
set is_public = true
where source = 'system';

drop policy if exists "System items are public and custom items are owner only" on public.happiness_items;
drop policy if exists "Visible happiness items are readable" on public.happiness_items;

create policy "Visible happiness items are readable"
on public.happiness_items
for select
using (
  is_active
  and (
    source = 'system'
    or is_public
    or owner_user_id = (select auth.uid())
  )
);

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
        or hi.is_public
        or hi.owner_user_id = (select auth.uid())
      )
  );
$$;

commit;
