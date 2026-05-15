alter table public.happiness_items
add column if not exists tags text[] not null default '{}'::text[];

alter table public.happiness_items
drop constraint if exists happiness_items_tags_check;

alter table public.happiness_items
add constraint happiness_items_tags_check
check (
  cardinality(tags) <= 3
  and tags <@ array[
    '혼자',
    '함께',
    '실내',
    '실외',
    '짧게',
    '길게',
    '무료',
    '유료',
    '활동적',
    '휴식',
    '즐거움',
    '편안함',
    '설렘',
    '뿌듯함',
    '위로',
    '감동',
    '새로움'
  ]::text[]
);

create index if not exists idx_happiness_items_tags
on public.happiness_items
using gin (tags);
