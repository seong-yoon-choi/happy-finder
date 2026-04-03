begin;

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
  )
  and (
    reporter_user_id is null
    or reporter_user_id = (select auth.uid())
  )
);

commit;
