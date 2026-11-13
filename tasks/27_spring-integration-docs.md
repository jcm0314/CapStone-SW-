# 27. #21~#23 Spring 기준 갱신 + 프론트 ↔ Spring 연결

- 우선순위: P1
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
백엔드가 FastAPI → Spring으로 바뀌었지만 API 명세(#21), 분업(#22), 할 일(#23)은 FastAPI 기준으로 남아 있고, 프론트가 Spring을 호출하는 코드는 0건입니다. CI와 docker-compose에도 Spring이 없습니다.

## 관련 파일
- `server-spring/`
- `src/contexts/TenantContext.jsx`
- `.github/workflows/ci-cd.yml`
- `docker-compose.yml`

## 할 일
- [ ] #21 명세를 실제 Spring 경로로 갱신 (또는 Spring을 명세에 맞춤)
- [ ] `src/services/apiClient.js` 추가, localStorage → Spring API 전환
- [ ] CI에 `./gradlew test`, compose에 Spring 서비스 추가

## 완료 기준
- 프론트에서 등록한 지원자가 새로고침·다른 기기에서도 유지
