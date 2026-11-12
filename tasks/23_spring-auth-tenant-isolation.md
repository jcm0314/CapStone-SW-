# 23. Spring API 인증 + 테넌트 격리

- 우선순위: P0
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
`SecurityConfig`가 `/api/v1/tenants/**`를 `permitAll`로 열어 두었고 tenantId를 URL 경로에서 받습니다. **로그인 없이 UUID만 바꾸면 다른 회사 지원자를 조회·수정**할 수 있습니다. 명세(#21: JWT의 tenantId만 신뢰)와 ADR(#51: Hibernate Filter)과 다릅니다.

## 관련 파일
- `server-spring/.../config/SecurityConfig.java`
- `server-spring/.../common/tenant/TenantContext.java` (미사용)
- 각 Controller의 `@PathVariable tenantId`

## 할 일
- [ ] JWT 로그인(`POST /auth/login`, `GET /auth/me`)
- [ ] 토큰에서 tenantId 추출 → `TenantContext` 설정 → Hibernate Filter
- [ ] 다른 테넌트 리소스는 404
- [ ] 격리 테스트: A 토큰으로 B 데이터 조회 → 404

## 완료 기준
- 토큰 없이 호출 시 401, 다른 테넌트 접근 시 404
