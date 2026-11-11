# 17. 게이트웨이 공유 저장소 영속화 · 인증 · 서버측 4-에이전트

- 우선순위: P1
- 상태: 완료

## 배경
- `server/index.js`의 초기 구현과 문서 주장의 차이는 다음과 같았습니다.
  - 공유 링크 저장소가 프로세스 메모리 `Map`이었습니다(`sharedEvaluationsStore`).
  - `/api/v1/auth/sso-login`은 서명 없는 base64 JSON을 토큰으로 발급했습니다.
  - `/api/v1/evaluate`는 단일 프롬프트 1회 호출이었습니다.

## 진행 기록
- 2026-11-10 구현 반영:
  - **서버측 4-에이전트 연동**: `server/index.js`의 `/api/v1/evaluate`가 `src/services/multiAgentEvaluator.js`의 `executeMultiAgentEvaluation` 4-에이전트 파이프라인(Stage 1 Grounding → Stage 2 Critic → Stage 3/4 Supervisor·Interviewer `Promise.allSettled` 병렬)을 기본 실행하도록 연결했습니다 (`server/Dockerfile`에도 `COPY src/ ./src/` 추가).
  - **공유 저장소 파일 영속화**: `server/data/shared_evaluations.json`에 공유 스냅샷과 협업 메모를 자동 저장·로드하여 단일 인스턴스 재시작 시 데이터가 유지되도록 했습니다(단, 다중 인스턴스 간 공유 DB나 Redis는 여전히 미연동).
  - **HMAC-SHA256 토큰 서명**: `/api/v1/auth/sso-login`이 `crypto.createHmac('sha256', SSO_SECRET)`으로 서명된 토큰을 발급하고 `/api/v1/auth/verify`에서 위변조를 검증하도록 구현했습니다(단, 외부 IdP OAuth 실연동 없는 데모 시뮬레이션).
