# 15. 실제 `npm test` / `npm run build` 실행 검증

- 우선순위: P0
- 상태: 완료

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
- 2026-11-10 1차 점검 시 보류 후, Node 런타임이 설치된 환경에서 `npx vitest run` 및 `npm run build`를 실제 실행하여 전체 단위 테스트 통과 및 프로덕션 번들 빌드 성공을 확인했습니다.
- `scripts/doctor/stage-g-infra.mjs` 및 `stage-h-network.mjs`를 추가하여 `node scripts/doctor.mjs --quick` 진단 스크립트도 정상 실행되도록 완성했습니다.
