alter table public.website_inquiries
  add column if not exists admin_reply text,
  add column if not exists replied_at timestamptz,
  add column if not exists replied_by_email text,
  add column if not exists reply_email_id text;

alter table public.website_inquiries
  drop constraint if exists website_inquiries_admin_reply_check;

alter table public.website_inquiries
  add constraint website_inquiries_admin_reply_check
  check (
    admin_reply is null
    or char_length(trim(admin_reply)) between 1 and 5000
  );
