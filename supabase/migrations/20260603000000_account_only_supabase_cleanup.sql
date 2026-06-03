-- Align existing Supabase projects with the account-only app flow and the
-- current four-category happiness tag model.

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

update public.happiness_items as hi
set tags = tag_defaults.tags
from (
  values
    ('h21', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h22', array['혼자', '실내', '짧게', '휴식']::text[]),
    ('h23', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h24', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h25', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h26', array['혼자', '실내', '짧게', '휴식']::text[]),
    ('h27', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h28', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h29', array['함께', '실내', '짧게', '활동적']::text[]),
    ('h30', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h31', array['혼자', '실외', '짧게', '휴식']::text[]),
    ('h32', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h33', array['함께', '실외', '길게', '휴식']::text[]),
    ('h34', array['혼자', '실내', '길게', '활동적']::text[]),
    ('h35', array['혼자', '실내', '길게', '활동적']::text[]),
    ('h36', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h37', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h38', array['혼자', '실내', '짧게', '휴식']::text[]),
    ('h39', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h40', array['혼자', '실외', '짧게', '휴식']::text[]),
    ('h41', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h42', array['혼자', '실내', '짧게', '활동적']::text[]),
    ('h43', array['함께', '실내', '짧게', '휴식']::text[]),
    ('h44', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h45', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h46', array['혼자', '실외', '길게', '활동적']::text[]),
    ('h47', array['혼자', '실내', '길게', '휴식']::text[]),
    ('h48', array['혼자', '실내', '짧게', '활동적']::text[])
) as tag_defaults(id, tags)
where hi.id = tag_defaults.id
  and hi.source = 'system';

delete from public.happiness_items
where source = 'custom'
  and owner_user_id is null;

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
