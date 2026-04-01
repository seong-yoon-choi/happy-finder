alter table public.website_inquiries
  add column if not exists account_user_id uuid references auth.users(id) on delete set null,
  add column if not exists account_email text;

create index if not exists website_inquiries_account_user_id_idx
  on public.website_inquiries (account_user_id, created_at desc)
  where account_user_id is not null;

create index if not exists website_inquiries_email_idx
  on public.website_inquiries (email, created_at desc)
  where email is not null;

create index if not exists website_inquiries_account_email_idx
  on public.website_inquiries (account_email, created_at desc)
  where account_email is not null;

update public.website_inquiries as wi
set
  account_user_id = au.id,
  account_email = lower(trim(au.email))
from auth.users as au
where wi.account_user_id is null
  and wi.email is not null
  and trim(wi.email) <> ''
  and lower(trim(wi.email)) = lower(trim(au.email));

drop policy if exists "Anyone can submit website inquiries" on public.website_inquiries;
create policy "Anyone can submit website inquiries"
on public.website_inquiries
for insert
to anon, authenticated
with check (
  submission_type in ('qna', 'feedback')
  and char_length(trim(message)) between 1 and 3000
  and (name is null or char_length(trim(name)) between 1 and 120)
  and (email is null or email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')
  and (account_email is null or account_email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$')
  and (subject is null or char_length(trim(subject)) between 1 and 200)
  and score is null
  and status = 'received'
  and (page_path is null or char_length(page_path) <= 500)
  and (user_agent is null or char_length(user_agent) <= 1000)
  and admin_reply is null
  and replied_at is null
  and replied_by_email is null
  and reply_email_id is null
  and (
    account_user_id is null
    or account_user_id = (select auth.uid())
  )
  and (
    account_email is null
    or (
      (select auth.uid()) is not null
      and lower(account_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
    )
  )
);
