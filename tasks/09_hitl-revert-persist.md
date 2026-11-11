# 09. HITL 롤백 결과가 테넌트 저장소에 반영되지 않는 문제 수정

- 우선순위: P2
- 상태: 완료

## 배경
- `src/App.jsx`의 `handleSaveHITL`은 `saveTenantApplicants(updatedList)`를 호출합니다.
- 그런데 `handleRevertHITL`(243~263행)은 상태와 캐시만 갱신하고 **테넌트 localStorage에는 저장하지 않습니다.**
  - 새로고침하면 롤백 전(보정된) 상태가 다시 나타납니다.
- 롤백할 때 `originalAnalysis`도 남아 있어서 "보정됨" 상태가 일관되지 않습니다.

## 목표
- 롤백도 저장과 같은 경로로 테넌트 저장소에 영속화합니다.

## 작업 내용
- [x] `handleRevertHITL`에서 갱신된 목록을 `saveTenantApplicants`로 저장
- [x] 롤백한 지원자 객체에서 `originalAnalysis`, `lastEditedAt` 제거

## 완료 기준
- 코드상 저장 경로가 Save와 동일할 것

## 진행 기록
- 2026-11-10 변경 파일: `src/App.jsx`의 `handleRevertHITL`
  - 구조 분해로 `originalAnalysis`, `lastEditedAt`을 제거하고, `analysis`를 원본 AI 초안으로 복원했습니다.
  - `orgId: currentTenant.id`를 바인딩합니다(Save와 동일).
  - `updatedList`를 만들어 `setApplicantList` 후 `saveTenantApplicants(updatedList)`를 호출합니다. 이제 Save와 저장 경로가 같습니다.
  - 기존의 `saveAnalysisToCache` 호출은 그대로 유지했습니다.
- 검증: 정적 import 검사 `errors=0 warnings=0`. Save/Revert 두 핸들러 모두 `saveTenantApplicants`를 호출하는지 코드 리뷰로 확인했습니다.
