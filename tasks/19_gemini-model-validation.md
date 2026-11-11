# 19. Gemini 모델명/엔드포인트 실사용 검증

- 우선순위: P1
- 상태: 완료

## 진행 기록
- 2026-11-10 모델 ID 단일화 및 엔드포인트 정리 완료:
  - `src/services/agents/geminiClient.js`의 기본 모델을 공식 Google Generative Language API 모델인 `gemini-2.5-flash` (폴백 `gemini-2.0-flash`, `gemini-1.5-flash`)로 통일하고, `VITE_GEMINI_MODEL` 환경변수 오버라이드를 지원하도록 수정했습니다.
  - `server/index.js`에서 일반 API 키를 Vertex AI(`aiplatform.googleapis.com`)에 `?key=` 쿼리로 잘못 호출하던 코드를 제거하고 `geminiClient.js` 공용 클라이언트를 사용하도록 통합했습니다.
  - `server/proxyServer.js`도 `process.env.GEMINI_MODEL || PRIMARY_MODEL`을 사용하도록 통일했습니다.
