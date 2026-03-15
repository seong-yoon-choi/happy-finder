create table if not exists public.website_inquiries (
  id uuid primary key default gen_random_uuid(),
  submission_type text not null check (submission_type in ('qna', 'feedback')),
  name text,
  email text,
  subject text,
  message text not null check (char_length(trim(message)) between 1 and 3000),
  score integer check (score between 1 and 5 or score is null),
  status text not null default 'received' check (status in ('received', 'reviewing', 'resolved', 'archived')),
  page_path text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists website_inquiries_created_at_idx
  on public.website_inquiries (created_at desc);

create index if not exists website_inquiries_submission_type_idx
  on public.website_inquiries (submission_type);

alter table public.website_inquiries enable row level security;

drop policy if exists "Anyone can submit website inquiries" on public.website_inquiries;
create policy "Anyone can submit website inquiries"
on public.website_inquiries
for insert
to anon, authenticated
with check (true);
