# 16. Supabase RLS 멀티테넌시 실제 연동

- 우선순위: P1
- 상태: 보류

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
- 2026-11-10 **보류** — 사유: Supabase 프로젝트 계정, URL/anon key(시크릿), 원격 DB에 스키마를 적용할 권한이 필요합니다. README에 프로젝트 URL(`armqdmxzhnimjpnvoqin`)이 있지만 접근 권한과 키가 없습니다.
- 사용자 결정 필요
  1. Supabase를 실제로 계속 쓸지 (README의 핵심 주장)
  2. 인증 방식: Supabase Auth만 쓸지, 별도 SSO를 연동할지
  3. 오프라인(localStorage) 폴백을 유지할지
- 착수 시 참고: `src/services/supabaseClient.js`의 `getTenantScopedClient`는 tenantId를 전혀 쓰지 않는 스텁입니다. RLS는 JWT claim 기반으로 설계해야 합니다.
