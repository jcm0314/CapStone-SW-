# 01. 실행 환경 점검 및 테스트/빌드 베이스라인 기록

- 우선순위: P0
- 상태: 완료

## 배경
- `README.md` 143~151행에는 "Vitest 14개 스위트, 51개 테스트"와 `npm run build` 검증이 적혀 있습니다.
- `docs/MILESTONES.md`에는 모든 마일스톤이 "100% 완료"로 표기되어 있습니다.
- 위 주장을 실제로 재현할 수 있는지부터 확인해야 합니다.

## 목표
- Node/npm 설치 여부, `node_modules` 유무를 확인합니다.
- `npm install`, `npm test`, `npm run build`의 실제 실행 결과를 기록합니다.
- 실행할 수 없다면 정적 분석으로 대체 베이스라인을 남깁니다.

## 작업 내용
- [x] `node`, `npm` 명령 존재 여부 확인 (PATH 및 일반 설치 경로)
- [x] `node_modules` 존재 여부 확인
- [x] 실행 가능하면 `npm install` → `npm test` → `npm run build` (실행 불가: Node 미설치)
- [x] 실행이 불가능하면 정적 import/export 검사 스크립트로 대체 검증
- [x] 테스트 케이스 수를 정적으로 집계해서 README 주장(51개)과 비교

## 완료 기준
- 실행 결과 또는 실행 불가 사유와 대체 검증 결과가 아래 진행 기록에 남아 있을 것

## 진행 기록
- 2026-11-10 점검 결과
  - `node`, `npm` 모두 PATH에 없습니다. `C:\Program Files\nodejs`, nvm, volta, scoop 경로에도 없습니다. deno, bun, docker도 없습니다. (Python 3.14만 있음)
  - `node_modules`가 없습니다. → `npm install`, `npm test`, `npm run build`는 **실행할 수 없습니다.**
  - Node 설치는 사용자 PC 환경을 바꾸는 일이라 임의로 하지 않았습니다. 실제 실행은 15번으로 넘깁니다.
- 대체 검증: 정적 ESM import/export 검사 스크립트(Python)를 작성했습니다.
  - 검사 항목: 상대경로 import가 실제 파일로 해석되는지, named/default export가 존재하는지, 외부 패키지가 package.json에 선언되어 있는지, 조기 `return null` 뒤에 hook을 호출하는지
  - 베이스라인 출력:
    ```
    checked 59 files
    WARN  src\components\EvidenceViewer.jsx: EvidenceViewer has early `return null` before hook calls (rules-of-hooks)
    WARN  src\components\HITLEditorModal.jsx: HITLEditorModal has early `return null` before hook calls (rules-of-hooks)
    WARN  src\components\ShareModal.jsx: ShareModal has early `return null` before hook calls (rules-of-hooks)
    WARN  src\components\SSOProfileModal.jsx: SSOProfileModal has early `return null` before hook calls (rules-of-hooks)
    errors=0 warnings=4
    ```
  - import/export 해석 오류는 0건입니다. 즉 빌드를 막는 모듈 해석 문제는 정적으로는 발견되지 않았습니다.
- 테스트 수 정적 집계: `it(` 51건, 14개 파일. README의 "14개 스위트, 51개 테스트"와 **개수는 일치**합니다. 다만 통과 여부는 검증하지 못했습니다.
  - 반면 MILESTONES Task 6.2.3은 "28개", CI 스텝 이름은 "(28 Tests)"로 표기가 서로 다릅니다(14번에서 정리).
- 추가로 발견한 사항 (후속 작업 근거)
  - lock 파일의 의존성이 Node 22 이상을 요구하지만 CI/Docker는 Node 20입니다 → 02
  - react-window 2.3.3에는 `FixedSizeList`가 없습니다 → 07
