# 28. AI 실연동 (서버측 Gemini API)

- 우선순위: 후순위
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
현재 라이브/로컬 어디서도 실제 AI 분석이 동작하지 않습니다. 연동 방식은 [ADR-AI-01 (API vs MCP)](../docs/adr/ADR-AI-01_api-vs-mcp.md)에서 **서버측 Gemini API 직접 호출**로 권장했습니다. 20·21번(환각·PII)을 먼저 고친 뒤 진행합니다.

## 관련 파일
- `server/index.js` 또는 Spring AI Worker
- `src/services/agents/*`
- `infra/` (Secret Manager)

## 할 일
- [ ] GCP에서 Generative Language API 활성화, 키는 Secret Manager
- [ ] 에이전트 호출을 서버로 이동 (브라우저 직접 호출 제거)
- [ ] `responseSchema`로 JSON 구조 강제
- [ ] 타임아웃·재시도·호출량 제한·비용 로깅
- [ ] 실제 자소서 N건으로 정확도 실측 (매칭률·점수 편차)

## 완료 기준
- 라이브에서 실제 자소서 평가가 끝까지 성공, 키가 브라우저에 노출되지 않음
