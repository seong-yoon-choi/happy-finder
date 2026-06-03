alter table public.happiness_items
add column if not exists tags text[] not null default '{}'::text[];

alter table public.happiness_items
drop constraint if exists happiness_items_tags_check;

update public.happiness_items as hi
set tags = coalesce((
  select array_agg(tag order by first_ord)
  from (
    select tag, min(ord) as first_ord
    from unnest(hi.tags) with ordinality as selected_tags(tag, ord)
    where tag = any(array[
      '혼자',
      '함께',
      '실내',
      '실외',
      '짧게',
      '길게',
      '활동적',
      '휴식'
    ]::text[])
    group by tag
  ) as cleaned_tags
), '{}'::text[]);

alter table public.happiness_items
drop constraint if exists happiness_items_tags_check;

alter table public.happiness_items
add constraint happiness_items_tags_check
check (
  cardinality(tags) <= 4
  and tags <@ array[
    '혼자',
    '함께',
    '실내',
    '실외',
    '짧게',
    '길게',
    '활동적',
    '휴식'
  ]::text[]
);

create index if not exists idx_happiness_items_tags
on public.happiness_items
using gin (tags);
