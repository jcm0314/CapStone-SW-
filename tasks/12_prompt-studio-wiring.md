# 12. Prompt Studio 설정을 실제 에이전트 프롬프트에 반영

- 우선순위: P2
- 상태: 완료

## 배경
- MILESTONES "Milestone 5: Custom Prompt Studio"가 완료로 표기되어 있습니다.
- `src/services/promptStudioService.js`의 `formatCustomPromptAddendum()`은 테스트에서만 쓰입니다. **에이전트 프롬프트 어디에서도 호출되지 않습니다.**
  - 사용자가 `PromptStudioModal`에서 저장한 기업 인재상, 금기어, 지시문이 평가에 반영되지 않습니다.

## 목표
- 저장된 Prompt Studio 설정을 Grounding/Critic/Supervisor/Interviewer 프롬프트와 단일 프롬프트 백업 엔진에 주입합니다.

## 작업 내용
- [x] 4개 에이전트 프롬프트에 `formatCustomPromptAddendum()` 결과 삽입
- [x] `aiEvaluator.analyzeWithGeminiAPI` 프롬프트에도 삽입
- [x] 테스트: 저장된 회사명/금기어가 에이전트 프롬프트에 포함되는지 검증

## 완료 기준
- 신규 테스트 추가, 정적 import 검사 통과

## 진행 기록
- 2026-11-10 변경 파일
  - `src/services/promptStudioService.js`: `hasCustomPromptSettings()`, `getActivePromptAddendum()` 추가
    - **설계 판단**: 사용자가 Prompt Studio에서 **저장한 경우에만** addendum을 주입합니다. 저장하지 않으면 빈 문자열입니다.
    - 기본 프리셋(LG그룹)을 모든 테넌트 평가에 자동 주입하면 데모 프리셋이 평가를 왜곡할 수 있기 때문입니다.
    - "기본 프리셋도 항상 적용"으로 바꾸려면 `getActivePromptAddendum`에서 조건만 제거하면 됩니다.
  - `src/services/agents/groundingAgent.js`, `criticAgent.js`, `supervisorAgent.js`, `interviewerAgent.js`: 지원자 정보 블록 아래에 `${getActivePromptAddendum()}` 삽입
  - `src/services/aiEvaluator.js` (단일 프롬프트 백업 엔진): 같은 방식으로 삽입
  - `src/services/promptStudioService.test.js`: 테스트 2건 추가 (미저장 시 빈 addendum, 저장 시 Grounding 프롬프트에 회사명/금기어 포함)
- 검증: 정적 import 검사 `errors=0 warnings=0`
- 한계: B2B 게이트웨이 경로(`server/index.js`)는 클라이언트 localStorage 설정을 받지 않아서 반영되지 않습니다. 서버에서도 반영하려면 테넌트별 설정 저장소가 필요합니다(17번과 연계).
