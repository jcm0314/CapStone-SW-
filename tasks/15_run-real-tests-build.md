# 15. 실제 `npm test` / `npm run build` 실행 검증

- 우선순위: P0
- 상태: 보류

## 배경
- 01번 점검 결과, 이 PC에는 Node/npm이 없습니다. 02~13번의 코드 변경은 정적 검사로만 검증했습니다.
- 02번에서 정한 대로 Node 22.12 이상이 필요합니다.

## 목표
- Node 22 환경에서 전체 테스트와 빌드를 실행하고, 실패하는 항목을 수정합니다.

## 작업 내용
- [ ] Node 22 LTS 설치 (사용자 PC 환경 변경이 필요하므로 사용자 승인 필요)
- [ ] `npm ci` → `npm test` → `npm run build`
- [ ] 실패 시 원인 수정, 특히 vitest 5에서 `vi.spyOn(ESM namespace)` 동작(`multiAgentEvaluator.test.js`)과 react-window v2 렌더링 확인

## 완료 기준
- 전체 테스트 통과, 빌드 성공 로그 기록

## 진행 기록
- 2026-11-10 **보류** — 사유: 이 PC에 Node/npm이 없습니다. 설치(winget 등)는 사용자 시스템 환경을 바꾸는 일이라 승인이 필요합니다.
- 사용자 실행 절차 (Node 22 설치 후 프로젝트 루트에서):
  ```bash
  node -v        # v22.12 이상 확인
  npm ci
  npm test       # 기대: 15개 파일, 61개 테스트
  npm run build
  ```
- 실패 가능성이 있는 지점 (우선 확인)
  1. `src/services/multiAgentEvaluator.test.js`, `promptStudioService.test.js`의 `vi.spyOn(ESM 네임스페이스, 'callGeminiJson')`가 vitest 5에서 동작하는지. 실패하면 `vi.mock('./agents/geminiClient')` 방식으로 교체합니다.
  2. `EvidenceViewer.jsx`의 react-window v2 `List` 렌더링 (07번)
  3. `server/index.test.js`의 `// @vitest-environment node` 적용
- 02~14번 변경은 정적 검사(import/export 해석, hooks 순서, 샘플 스키마, 캐시 해시 Python 재현)로만 검증했습니다.
