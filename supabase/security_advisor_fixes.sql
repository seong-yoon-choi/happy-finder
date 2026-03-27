-- Apply this in the Supabase SQL Editor to clear current Security Advisor
-- warnings for functions that were already created without an explicit search_path.

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

do $$
begin
  if to_regclass('public.happiness_items') is not null then
    execute $fn$
      alter table public.happiness_items
      add column if not exists is_public boolean not null default false;

      update public.happiness_items
      set is_public = true
      where source = 'system';

      create or replace function public.can_access_item(target_item_id text)
      returns boolean
      language sql
      stable
      set search_path = public
      as $body$
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
      $body$;
    $fn$;
  end if;
end;
$$;
