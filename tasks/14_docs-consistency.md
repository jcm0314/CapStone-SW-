# 14. 문서 정합성 정리 (ARCHITECTURE/README/ISSUES/CI 표기)

- 우선순위: P1
- 상태: 완료

## 배경
- `docs/ARCHITECTURE.md` §1은 "백엔드 서버 구축 없이"라고 쓰지만 `server/index.js`(Express 게이트웨이)가 존재합니다. 멀티에이전트 파이프라인도 반영되어 있지 않습니다.
- `docs/ISSUES.md`는 #1~#4를 모두 `Proposed`로 표기합니다. 반면 MILESTONES는 같은 항목(Web Worker, Fuzzy, PII, Cache)을 완료로 표기합니다.
  - 실제로는 Fuzzy/PII/Cache는 구현되었고, Web Worker는 미사용입니다.
- README의 "Vitest 51 Tests 100% Passed" 배지는 이 환경에서 재현되지 않았습니다(01). MILESTONES는 "28개 단체 테스트"라고 적고 있습니다.
- README는 Supabase RLS·Realtime·Redis 캐시를 구현 완료로 설명하지만, 코드상으로는 연동되어 있지 않습니다(16, 17, 18).

## 목표
- 사실과 다른 기술 서술을 바로잡고, "구현 현황 및 알려진 한계" 섹션으로 현재 상태를 투명하게 드러냅니다.
- 마케팅성 문구, 배포 링크, 수상 관련 서술은 사용자 판단이 필요하므로 그대로 둡니다.

## 작업 내용
- [x] ARCHITECTURE.md §1을 SPA + Express BFF 게이트웨이 + 4-에이전트 구조로 갱신
- [x] ISSUES.md 상태 열을 실제 구현 상태로 갱신
- [x] README에 "구현 현황 및 알려진 한계" 섹션을 추가하고 `tasks/00_INDEX.md` 링크
- [x] MILESTONES의 테스트 수 표기를 정정하고, 미완 항목은 각주로 표기

## 완료 기준
- 위 4개 문서가 갱신되고, 각 서술이 코드 경로 근거를 가질 것

## 진행 기록
- 2026-11-10 변경 파일
  - `docs/ARCHITECTURE.md` §1
    - "백엔드 서버 구축 없이" 문구를 삭제했습니다.
    - BYOK(브라우저 4-에이전트)와 B2B(게이트웨이 단일 프롬프트) 두 평가 경로를 표로 정리했습니다.
    - PII, 캐시, 공유 API의 실제 위치와 미연동 항목(Supabase, Web Worker, Redis)을 명시했습니다.
  - `docs/ISSUES.md`: #1~#4 상태를 `Proposed`에서 실제 상태로 바꾸고 근거 경로를 달았습니다. #1, #4는 Partial, #2, #3은 Done입니다.
  - `docs/MILESTONES.md`
    - Task 6.2.3의 "28개 단체 테스트"를 정정했습니다(게이트웨이 테스트 8건, 전체 61건).
    - "코드 대조 각주" 섹션(M2 Web Worker, M5 Prompt Studio, M6 미구현 항목)을 추가했습니다.
  - `README.md`
    - 테스트 배지를 "51 Tests 100% Passed"에서 "61 Unit Tests"로 바꿨습니다(통과 여부는 미검증이라 표기하지 않음).
    - Node 22.12 요구 사항을 명시했습니다.
    - dev 포트를 5173에서 3000으로 정정했습니다(`vite.config.js` 기준).
    - 테스트 수 표기를 정정했습니다.
    - 다이어그램의 "SHA-256 In-Memory / Redis Cache" 노드를 실제 구현에 맞게 수정했습니다.
    - **"구현 현황 및 알려진 한계"** 표를 추가하고 `tasks/00_INDEX.md`를 링크했습니다.
  - `CONTRIBUTING.md`, `docs/COLLABORATION_SPEC.md` 91행: "51개" 고정 표기를 정정했습니다.
- 테스트 수 최종 집계 (정적): `it(` 정의 59개 / 15개 파일. `tenantSchema.test.js`가 테넌트 3곳에 대해 `it`을 생성하므로 실행 기준 **61건 예상**입니다.
- **의도적으로 수정하지 않은 부분 (사용자 판단 필요)**
  - README의 운영 배포 링크, 마케팅 수치(건당 4원, 98.7% 마진 등), 비교표의 "Supabase RLS 100% 강제 격리"·"실시간 Live 동기화" 문구. 상단 소개는 그대로 두었고, 아래의 한계 표로 보완했습니다.
  - `docs/2026_DANKOOK_STARTUP_APPLICATION.md`(제출 문서)의 "Vitest 51개 100% Pass" 등 실증 서술
  - `docs/COLLABORATION_SPEC.md` 15, 74행의 "Supabase Realtime… 51개 테스트 100% 통과" 현황 서술
  - `CHANGELOG.md`의 과거 릴리스 기록(28개, Node 20). 이력 문서라서 그대로 보존했습니다.
