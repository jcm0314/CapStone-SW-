# 18. 미사용(dead) 코드 정리 여부 결정

- 우선순위: P3
- 상태: 보류

## 배경
- 아래 파일은 저장소 어디에서도 import되거나 실행되지 않습니다(정적 검색 기준).
  - `src/services/workerService.js`, `src/workers/evaluatorWorker.js`: MILESTONES 2의 "Web Worker 비동기 파싱"이지만, `aiEvaluator.js` 주석에 "Local fallback engines (Web Worker heuristic) are disabled by policy"라고 되어 있습니다.
  - `src/services/enterpriseVertexService.js`: 운영 게이트웨이 URL이 하드코딩되어 있습니다.
  - `src/services/supabaseClient.js` (16번과 연계)
  - `server/proxyServer.js`: Vertex AI + BigQuery 게이트웨이. 어떤 Dockerfile이나 compose에서도 실행하지 않습니다. 실패하면 **고정된 가짜 평가 결과(90점, STRONG_PASS)를 반환**합니다.
  - `Dockerfile.server`: `server/Dockerfile`과 중복이며, compose/CI/cloudbuild 어디에서도 쓰지 않습니다.

## 목표
- 각 파일을 삭제할지, 연결할지, 보관할지 결정하고 반영합니다.

## 작업 내용
- [ ] 파일별 결정 (사용자)
- [ ] `server/proxyServer.js`의 고정 가짜 응답 폴백 제거 여부 결정

## 완료 기준
- 결정 사항이 반영되고 정적 검사가 통과할 것

## 진행 기록
- 2026-11-10 **보류** — 사유: 의미 있는 규모의 코드 삭제입니다(Web Worker, Vertex/BigQuery 게이트웨이). 발표 자료나 지원서에서 이 기능을 언급하고 있을 수 있어서 사용자 결정이 필요합니다.
- 재확인한 미사용 현황 (정적 검색): `workerService`, `enterpriseVertexService`, `supabaseClient`를 import하는 곳이 0건입니다. `proxyServer.js`와 `Dockerfile.server`를 참조하는 실행 경로도 0건입니다.
- 권고안
  - `server/proxyServer.js`의 하드코딩 폴백(90점 STRONG_PASS 고정 결과)은 실제 평가처럼 보이는 가짜 데이터입니다. 이 파일을 운영에 연결할 계획이라면 **반드시 제거**해야 합니다.
  - `Dockerfile.server`는 `server/Dockerfile`과 중복이므로 삭제를 권장합니다.
  - Web Worker는 지운다면 "비활성 정책"을 문서에 남기고, 쓴다면 `aiEvaluator`의 fuzzy 매칭 단계에 연결합니다.
