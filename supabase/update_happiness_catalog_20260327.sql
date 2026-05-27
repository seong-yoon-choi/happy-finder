begin;

alter table public.happiness_items
add column if not exists is_public boolean not null default false;

alter table public.happiness_items
drop constraint if exists happiness_items_category_check;

update public.happiness_items
set category = case
  when category = '일주일행복' then '기분전환'
  when category = '한달행복' then '제대로'
  else category
end
where category in ('일주일행복', '한달행복');

alter table public.happiness_items
add constraint happiness_items_category_check
check (category in ('소확행', '기분전환', '제대로'));

update public.happiness_items
set is_active = false
where source = 'system'
  and id in (
    'h1', 'h2', 'h3', 'h4', 'h5',
    'h6', 'h7', 'h8', 'h9', 'h10',
    'h11', 'h12', 'h13', 'h14', 'h15',
    'h16', 'h17', 'h18', 'h19', 'h20'
  );

update public.happiness_items
set is_public = true
where source = 'system';

insert into public.happiness_items (id, title, description, category, source, is_active, is_public)
values
  ('h21', '일기 쓰기', '오늘의 기분을 짧게라도 적으며 마음을 천천히 정리해보세요.', '소확행', 'system', true, true),
  ('h22', '좋아하는 양말 신고 하루 시작하기', '좋아하는 양말을 신고 하루를 시작하면 기분이 조금 더 산뜻해질 수 있어요.', '소확행', 'system', true, true),
  ('h23', '셀프 칭찬 한마디 하기', '거울을 보며 오늘의 나에게 짧은 칭찬 한마디를 건네보세요.', '소확행', 'system', true, true),
  ('h24', '휴대폰 배경화면 바꾸기', '마음에 드는 사진이나 이미지를 골라 기분 좋은 화면으로 바꿔보세요.', '소확행', 'system', true, true),
  ('h25', '비 오는 날 빗소리 듣기', '비가 오는 날엔 잠깐 멈춰서 빗소리를 들으며 마음을 쉬게 해보세요.', '소확행', 'system', true, true),
  ('h26', '핸드크림 바르고 향 맡기', '좋아하는 향을 가까이 두고 천천히 맡아보며 기분을 다독여보세요.', '소확행', 'system', true, true),
  ('h27', '옷 사기', '입고 싶었던 옷 한 벌을 골라 기분 전환이 되는 소비를 해보세요.', '기분전환', 'system', true, true),
  ('h28', '보고 싶었던 영화 보기', '미뤄뒀던 영화를 보며 잠깐 다른 세계에 푹 빠져보세요.', '기분전환', 'system', true, true),
  ('h29', '노래방 가기', '마음껏 노래를 부르며 쌓여 있던 기분을 시원하게 풀어보세요.', '기분전환', 'system', true, true),
  ('h30', '쉬는 날 계획하기', '다가오는 쉬는 날에 하고 싶은 일을 골라 기대감을 만들어보세요.', '기분전환', 'system', true, true),
  ('h31', '서점에서 책 구경하기', '서점에 들러 표지와 제목을 천천히 보며 마음 가는 책을 찾아보세요.', '기분전환', 'system', true, true),
  ('h32', '사고 싶었던 물건 사기', '계속 눈에 밟히던 물건을 드디어 사며 만족감을 느껴보세요.', '기분전환', 'system', true, true),
  ('h33', '공연 보러 가기', '라이브로만 느낄 수 있는 분위기와 에너지를 직접 경험해보세요.', '제대로', 'system', true, true),
  ('h34', '나만의 취미 만들기', '꾸준히 즐길 수 있는 취미 하나를 정해 나만의 시간을 만들어보세요.', '제대로', 'system', true, true),
  ('h35', '하고 싶은 공부 시작하기', '예전부터 배우고 싶었던 주제를 골라 첫 페이지를 열어보세요.', '제대로', 'system', true, true),
  ('h36', '방 정리하기', '미뤄둔 공간을 정리하면서 생활 분위기까지 가볍게 바꿔보세요.', '제대로', 'system', true, true),
  ('h37', '혼자 놀기 계획하기', '오롯이 혼자 즐길 하루를 상상하며 나만의 코스를 짜보세요.', '제대로', 'system', true, true),
  ('h38', '마음에 드는 문장 메모하기', '오늘 마음을 건드린 문장 하나를 적어두고 오래 간직해보세요.', '소확행', 'system', true, true),
  ('h39', '옛 사진 보며 추억 떠올리기', '갤러리 속 오래된 사진을 보며 지나간 좋은 순간을 천천히 떠올려보세요.', '소확행', 'system', true, true),
  ('h40', '길가에 피어 있는 꽃의 꽃말 찾아보기', '우연히 마주친 꽃의 이름과 꽃말을 찾아보며 작은 재미를 느껴보세요.', '소확행', 'system', true, true),
  ('h41', '자주 쓰는 소지품에 이름 지어주기', '매일 쓰는 물건에 작은 이름을 붙이며 애정을 더해보세요.', '소확행', 'system', true, true),
  ('h42', '작은 소품 하나 사서 방 꾸미기', '마음에 드는 작은 소품 하나로 방 분위기를 가볍게 바꿔보세요.', '기분전환', 'system', true, true),
  ('h43', '주변 사람에게 작은 선물 건네기', '고마운 마음을 담아 작은 선물 하나를 전해보세요.', '기분전환', 'system', true, true),
  ('h44', '옛 물건 꺼내보기', '예전에 아끼던 물건을 다시 꺼내 보며 그때의 마음을 떠올려보세요.', '기분전환', 'system', true, true),
  ('h45', '가사를 보며 노래를 천천히 음미하기', '익숙한 노래도 가사를 따라가며 들으면 또 다른 감정이 보일 수 있어요.', '기분전환', 'system', true, true),
  ('h46', '평소보다 먼 거리를 걸어가 보기', '조금 더 멀리 걸어가며 생각을 비우고 몸의 리듬을 느껴보세요.', '제대로', 'system', true, true),
  ('h47', '주변 사람이나 스스로에게 편지 쓰기', '전하고 싶었던 마음을 글로 적으며 감정을 차분히 정리해보세요.', '제대로', 'system', true, true),
  ('h48', '생각만 하던 일 실행해보기', '미루기만 했던 일을 오늘 바로 시작하며 작은 추진력을 만들어보세요.', '제대로', 'system', true, true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source = excluded.source,
  is_active = excluded.is_active,
  is_public = excluded.is_public;

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

commit;
