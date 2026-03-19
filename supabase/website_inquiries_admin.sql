-- Apply this after website_inquiries.sql.
-- Update the email below if the administrator account changes.

drop policy if exists "Admin can read website inquiries" on public.website_inquiries;
create policy "Admin can read website inquiries"
on public.website_inquiries
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'sychoi04180605@gmail.com'
);

drop policy if exists "Admin can update website inquiries" on public.website_inquiries;
create policy "Admin can update website inquiries"
on public.website_inquiries
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'sychoi04180605@gmail.com'
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = 'sychoi04180605@gmail.com'
);
