# Supabase 연결 방법

1. Supabase에서 프로젝트를 만듭니다.
2. `Settings > API`에서 아래 값을 확인합니다.
   - `Project URL`
   - `anon public` key
3. 프로젝트 루트에 `.env.local` 파일을 만들고 아래처럼 넣습니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

4. `Authentication > Providers`에서 필요한 로그인 방식을 켭니다.
   - `Email`
   - `Google`을 쓸 경우 Client ID / Secret 추가
5. `Authentication > URL Configuration`에 개발 주소를 등록합니다.
   - `Site URL`: `http://localhost:5173`
   - 배포 주소가 있으면 같이 추가
6. 개발 서버를 다시 시작합니다.

## 현재 코드 상태

- 인증은 이미 Supabase Auth를 사용합니다.
- 현재 앱 코드는 여전히 snapshot 테이블 `happy_user_snapshots` 기준으로 동작합니다.
- 새로 정리한 권장 스키마는 [happy_normalized_schema.sql](/C:/Users/USER/Desktop/happy%20finder/supabase/happy_normalized_schema.sql)에 추가했습니다.
- 기존 snapshot SQL은 [happy_user_snapshots.sql](/C:/Users/USER/Desktop/happy%20finder/supabase/happy_user_snapshots.sql)에 그대로 남겨뒀습니다.

즉, DB를 새 구조로 바꾸려면 앱의 Supabase 읽기/쓰기 코드도 같이 리팩터링해야 합니다.

## 권장 스키마

이번에 다시 정리한 기준은 "현재 앱 기능을 가장 자연스럽게 담는 구조"입니다.

- `profiles`
  - 닉네임, 테마, 온보딩 완료 여부, 약관 동의, 알림 전체 ON/OFF, 현재 연속 기록
- `user_reminders`
  - 알림 시간 목록
- `happiness_items`
  - 기본 행복 항목 + 사용자가 직접 만든 행복 항목
- `user_item_progress`
  - 사용자별 항목 진행 상태
  - `enjoy_count`, `last_enjoyed_on`만 저장
- `user_item_memos`
  - 항목별 메모
- `user_favorite_items`
  - 즐겨찾기

## 왜 이렇게 나눴는지

- 지금 앱은 "행복을 몇 번 찾았는지"와 "마지막으로 언제 찾았는지"만 있으면 동작합니다.
- 그래서 이벤트 로그 테이블보다 `user_item_progress` 같은 상태 테이블이 현재 요구사항에 더 맞습니다.
- `totalEnjoyCount`, `myCount`, `othersCount`는 필요하면 `user_item_progress` 집계로 계산하면 됩니다.
- 아래 값들은 DB보다 클라이언트 상태로 두는 게 맞습니다.
  - `authFeedback`
  - `cloudSyncStatus`
  - `notificationPermission`
  - `celebrationQueue`
  - `lastTriggeredDate`

특히 `lastTriggeredDate`는 브라우저 알림 중복 방지용이라 기기별 상태에 가깝고, DB에 넣으면 여러 기기에서 동기화 충돌이 생기기 쉽습니다.

## 마이그레이션 주의점

- `items`, `favorites`, `memos`, `theme`, `reminders`는 비교적 옮기기 쉽습니다.
- 현재 snapshot의 `userStamps`는 `count`와 `lastStampedDate`만 있어서, 과거 일자별 이력은 복원할 수 없습니다.
- 그래서 새 스키마도 일단 `user_item_progress` 중심으로 잡았습니다.
- 나중에 통계나 히스토리 화면이 필요해지면 그때 `user_item_enjoyments` 같은 이벤트 테이블을 추가하는 편이 맞습니다.

## 적용 순서 추천

1. [happy_normalized_schema.sql](/C:/Users/USER/Desktop/happy%20finder/supabase/happy_normalized_schema.sql)을 SQL Editor에서 실행
2. 앱 코드의 snapshot 읽기/쓰기를 새 테이블 쿼리로 교체
3. 필요하면 snapshot -> normalized 마이그레이션 스크립트 추가

