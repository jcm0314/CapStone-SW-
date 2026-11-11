# 11. 테스트 격리 (네트워크 의존 제거, 서버 테스트 node 환경)

- 우선순위: P2
- 상태: 완료

## 배경
- `src/services/shareService.test.js`, `src/services/aiEvaluator.test.js`는 실제 `fetch`로 `http://localhost:3000/api/...`를 호출합니다. **연결이 실패하는 것을 전제로** 통과하는 테스트입니다.
  - vite dev 서버(포트 3000, `vite.config.js`)가 떠 있으면 동작이 달라지고, 실행 시간도 네트워크 타임아웃에 좌우됩니다.
- `server/index.test.js`는 전역 `environment: 'jsdom'` 설정 아래에서 Express 서버를 띄웁니다. Node 환경이 더 적절합니다.

## 목표
- 단위 테스트가 외부 네트워크나 로컬 포트 상태와 무관하게 결정적으로 동작하게 합니다.

## 작업 내용
- [x] shareService 테스트: `vi.stubGlobal('fetch', ...)`로 네트워크 실패를 명시적으로 모킹
- [x] aiEvaluator 테스트: fetch 모킹으로 게이트웨이 실패 시나리오를 결정적으로 재현하고, 게이트웨이 성공 시나리오 1건 추가
- [x] `server/index.test.js` 상단에 `// @vitest-environment node` 추가

## 완료 기준
- 테스트 코드에 실제 네트워크 호출 의존이 없을 것

## 진행 기록
- 2026-11-10 변경 파일
  - `src/services/shareService.test.js`: `beforeEach`에서 `fetch`를 reject 모킹하고, `afterEach`에서 `vi.unstubAllGlobals()`를 호출합니다. 기존 4개 테스트의 기대값은 그대로입니다(오프라인 폴백 경로를 결정적으로 검증).
  - `src/services/aiEvaluator.test.js`
    - 실패 시나리오에 fetch reject 모킹을 넣고, 네트워크 타임아웃용 15초 제한을 없앴습니다.
    - **신규** 성공 시나리오: 게이트웨이로 보내는 body의 `rawText`에서 이메일이 마스킹되었는지, 결과 `mode`가 'B2B_MANAGED_TOKEN'인지, 원문 `rawText`가 복원되었는지 검증합니다.
    - `beforeEach`에서 localStorage를 초기화해 캐시 간섭을 막습니다.
  - `server/index.test.js`: 첫 줄에 `// @vitest-environment node` 추가
- 검증
  - 남은 실제 네트워크 호출: `server/index.test.js`가 `127.0.0.1` 임시 포트(listen(0))로 자체 서버를 띄우는 것만 남았습니다. 이는 의도된 통합 테스트입니다.
  - Vitest 실행은 15번으로 넘깁니다.
- 테스트 수: 14번 작업 시점에 최종 집계 (`it(` 정의 59개, 실행 기준 61건 예상. 12번의 +2건 포함)
