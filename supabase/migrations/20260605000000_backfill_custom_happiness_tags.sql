-- Backfill missing four-axis tags for existing user-created happiness items.
-- The app now expects one tag from each axis: relation, place, time, and action.

update public.happiness_items as hi
set tags = array[
  coalesce(
    (
      select tag
      from unnest(hi.tags) as tag
      where tag = any(array['혼자', '함께']::text[])
      limit 1
    ),
    case
      when custom_items.text_blob ~ '(함께|같이|친구|가족|연인|부모|아이|동료|사람|모임|대화|만나|우리|강아지|고양이|반려)' then '함께'
      else '혼자'
    end
  ),
  coalesce(
    (
      select tag
      from unnest(hi.tags) as tag
      where tag = any(array['실내', '실외']::text[])
      limit 1
    ),
    case
      when custom_items.text_blob ~ '(산책|공원|바다|산|하늘|밖|외출|야외|거리|길|여행|드라이브|꽃|자연|햇살|해변|캠핑|등산|자전거)' then '실외'
      else '실내'
    end
  ),
  coalesce(
    (
      select tag
      from unnest(hi.tags) as tag
      where tag = any(array['짧게', '길게']::text[])
      limit 1
    ),
    case
      when custom_items.text_blob ~ '(여행|주말|하루|오래|길게|긴|영화|독서|책|운동|산책|캠핑|등산|드라이브|정리|청소|요리|만들기|취미|프로젝트)' then '길게'
      else '짧게'
    end
  ),
  coalesce(
    (
      select tag
      from unnest(hi.tags) as tag
      where tag = any(array['활동적', '휴식']::text[])
      limit 1
    ),
    case
      when custom_items.text_blob ~ '(걷|산책|운동|뛰|달리|등산|자전거|청소|정리|요리|만들|꾸미|그리|쓰|춤|외출|여행|드라이브|공부|작업)' then '활동적'
      else '휴식'
    end
  )
]
from (
  select
    id,
    coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(category, '') as text_blob
  from public.happiness_items
  where source = 'custom'
) as custom_items
where hi.id = custom_items.id
  and hi.source = 'custom'
  and (
    not hi.tags && array['혼자', '함께']::text[]
    or not hi.tags && array['실내', '실외']::text[]
    or not hi.tags && array['짧게', '길게']::text[]
    or not hi.tags && array['활동적', '휴식']::text[]
  );
