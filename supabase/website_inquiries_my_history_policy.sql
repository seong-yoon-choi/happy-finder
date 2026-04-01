drop policy if exists "Users can read own website inquiries" on public.website_inquiries;
create policy "Users can read own website inquiries"
on public.website_inquiries
for select
to authenticated
using (
  account_user_id = (select auth.uid())
  or (
    email is not null
    and lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
  or (
    account_email is not null
    and lower(account_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  )
);
