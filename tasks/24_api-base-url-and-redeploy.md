# 24. 프론트 API 주소 빌드 설정 강제 + 라이브 재배포

- 우선순위: P0
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
라이브 프론트는 `VITE_API_GATEWAY_URL` 없이 빌드되어 API 요청을 **자기 주소로** 보내고 HTML(200)을 받습니다. 라이브는 10/20 버전에 멈춰 있고, GCP 프로젝트의 Gemini API도 비활성(403)입니다.

## 관련 파일
- `src/services/aiEvaluator.js:312`
- `src/services/shareService.js:12`
- `Dockerfile`, `cloudbuild.yaml`, `.github/workflows/ci-cd.yml`

## 할 일
- [ ] 프로덕션 빌드에서 `VITE_API_GATEWAY_URL` 미설정 시 빌드 실패(또는 nginx `/api` 프록시)
- [ ] main 기준 재배포
- [ ] 배포 후 `scripts/e2e-smoke/scenarios.mjs`로 라이브 스모크 테스트

## 완료 기준
- 라이브에서 S02 알림이 HTML 파싱 에러가 아닌 실제 결과/명확한 에러
