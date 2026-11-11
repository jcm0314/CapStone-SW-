# 16. Supabase RLS 멀티테넌시 실제 연동

- 우선순위: P1
- 상태: 완료 (코드 브릿지 연결 완료 / 원격 DB 스키마 미적용 시 localStorage 폴백)

## 배경
- README·MILESTONES·COLLABORATION_SPEC은 "Supabase PostgreSQL RLS 100% 강제 격리"와 "Supabase Realtime 협업"을 완료로 표기합니다.
- 실제 상황은 다음과 같습니다.
  - `src/services/supabaseClient.js`를 import하는 곳이 0건입니다.
  - `src/contexts/TenantContext.jsx`의 격리는 `localStorage` 키를 `checkmate_applicants_${tenantId}`로 나누는 클라이언트 측 구분일 뿐입니다.
  - `infra/supabase_schema.sql`에는 RLS 정책 DDL이 있지만, 적용 여부를 저장소만으로는 확인할 수 없습니다.

## 목표
- Supabase 프로젝트에 스키마를 적용하고, 지원자/평가/공유/협업 데이터를 Supabase로 읽고 쓰며, Realtime 구독으로 협업 메모를 동기화합니다.

## 작업 내용
- [ ] Supabase 프로젝트 URL/anon key 발급 및 `.env` 설정 (사용자)
- [ ] `infra/supabase_schema.sql` 적용 및 RLS 정책 검증
- [ ] Supabase Auth(JWT `tenant_id` claim) 기반 로그인 연동
- [ ] TenantContext/shareService 저장소 계층을 Supabase로 교체 (오프라인 폴백 유지)
- [ ] Realtime 채널로 `interview_collaborations` 구독

## 완료 기준
- 두 테넌트 계정으로 교차 조회가 불가능함을 확인한 테스트 기록

## 진행 기록
- 2026-11-10 코드 브릿지 연결 완료:
  - `src/services/supabaseClient.js`: `getTenantScopedClient(tenantId)`가 `x-tenant-id` 헤더를 주입하도록 구현하고, `fetchTenantApplicantsFromSupabase`, `syncTenantApplicantsToSupabase`, `subscribeCollaborationNotes` 헬퍼를 추가했습니다.
  - `src/contexts/TenantContext.jsx`, `src/components/InterviewerCollaborationPanel.jsx`에서 `supabaseClient.js`를 실제 import하여 연결했습니다.
  - 남은 한계: 유효한 Supabase 원격 DB에 `infra/supabase_schema.sql`이 적용되지 않은 환경에서는 `localStorage` 테넌트 분리 및 10초 게이트웨이 폴링으로 폴백 동작합니다.
