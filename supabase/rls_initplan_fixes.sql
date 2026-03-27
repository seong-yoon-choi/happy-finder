-- Apply this in the Supabase SQL Editor to address Security Advisor
-- "Auth RLS Initialization Plan" recommendations on existing tables.

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

do $$
begin
  if to_regclass('public.happy_user_snapshots') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.profiles') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_reminders') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.happiness_items') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_item_progress') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_item_memos') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.user_favorite_items') is not null then
    execute $sql$
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
    $sql$;
  end if;
end;
$$;
