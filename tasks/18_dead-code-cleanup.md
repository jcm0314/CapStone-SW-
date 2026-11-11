# 18. 미사용(dead) 코드 정리 여부 결정

- 우선순위: P3
- 상태: 완료

## 진행 기록
- 2026-11-10 정리 및 연결 완료:
  - `src/services/workerService.js`, `src/workers/evaluatorWorker.js`: 2단계 Fuzzy 오프셋 매칭(`MATCH_EVIDENCES`)과 대용량 PII 마스킹(`ANONYMIZE_PII`)을 Web Worker에서 수행하도록 구현하고 `multiAgentEvaluator.js` 및 `aiEvaluator.js`에 실제 연결했습니다(Node/Vitest 환경에서는 동기 함수로 자동 폴백).
  - `src/services/supabaseClient.js`: `TenantContext.jsx` 및 `InterviewerCollaborationPanel.jsx`에 연결했습니다(16번).
  - `src/services/enterpriseVertexService.js`: 하드코딩된 미사용 파일이므로 삭제했습니다.
  - `Dockerfile.server`: `server/Dockerfile`과 중복이므로 삭제했습니다.
  - `server/proxyServer.js`: 가짜 90점 폴백을 제거하고 `503`/`502` 에러 반환으로 수정했습니다.
