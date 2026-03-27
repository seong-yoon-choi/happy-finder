begin;

update public.happiness_items
set category = case
  when category = '일주일행복' then '기분전환'
  when category = '한달행복' then '제대로'
  else category
end
where category in ('일주일행복', '한달행복');

alter table public.happiness_items
drop constraint if exists happiness_items_category_check;

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

insert into public.happiness_items (id, title, description, category, source, is_active)
values
  ('h21', '일기 쓰기', '오늘의 기분을 짧게라도 적으며 마음을 천천히 정리해보세요.', '소확행', 'system', true),
  ('h22', '좋아하는 양말 신고 하루 시작하기', '좋아하는 양말을 신고 하루를 시작하면 기분이 조금 더 산뜻해질 수 있어요.', '소확행', 'system', true),
  ('h23', '셀프 칭찬 한마디 하기', '거울을 보며 오늘의 나에게 짧은 칭찬 한마디를 건네보세요.', '소확행', 'system', true),
  ('h24', '휴대폰 배경화면 바꾸기', '마음에 드는 사진이나 이미지를 골라 기분 좋은 화면으로 바꿔보세요.', '소확행', 'system', true),
  ('h25', '비 오는 날 빗소리 듣기', '비가 오는 날엔 잠깐 멈춰서 빗소리를 들으며 마음을 쉬게 해보세요.', '소확행', 'system', true),
  ('h26', '핸드크림 바르고 향 맡기', '좋아하는 향을 가까이 두고 천천히 맡아보며 기분을 다독여보세요.', '소확행', 'system', true),
  ('h27', '옷 사기', '입고 싶었던 옷 한 벌을 골라 기분 전환이 되는 소비를 해보세요.', '기분전환', 'system', true),
  ('h28', '보고 싶었던 영화 보기', '미뤄뒀던 영화를 보며 잠깐 다른 세계에 푹 빠져보세요.', '기분전환', 'system', true),
  ('h29', '노래방 가기', '마음껏 노래를 부르며 쌓여 있던 기분을 시원하게 풀어보세요.', '기분전환', 'system', true),
  ('h30', '쉬는 날 계획하기', '다가오는 쉬는 날에 하고 싶은 일을 골라 기대감을 만들어보세요.', '기분전환', 'system', true),
  ('h31', '서점에서 책 구경하기', '서점에 들러 표지와 제목을 천천히 보며 마음 가는 책을 찾아보세요.', '기분전환', 'system', true),
  ('h32', '사고 싶었던 물건 사기', '계속 눈에 밟히던 물건을 드디어 사며 만족감을 느껴보세요.', '기분전환', 'system', true),
  ('h33', '공연 보러 가기', '라이브로만 느낄 수 있는 분위기와 에너지를 직접 경험해보세요.', '제대로', 'system', true),
  ('h34', '나만의 취미 만들기', '꾸준히 즐길 수 있는 취미 하나를 정해 나만의 시간을 만들어보세요.', '제대로', 'system', true),
  ('h35', '하고 싶은 공부 시작하기', '예전부터 배우고 싶었던 주제를 골라 첫 페이지를 열어보세요.', '제대로', 'system', true),
  ('h36', '방 정리하기', '미뤄둔 공간을 정리하면서 생활 분위기까지 가볍게 바꿔보세요.', '제대로', 'system', true),
  ('h37', '혼자 놀기 계획하기', '오롯이 혼자 즐길 하루를 상상하며 나만의 코스를 짜보세요.', '제대로', 'system', true)
on conflict (id) do update
set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  source = excluded.source,
  is_active = excluded.is_active;

commit;
