# 04. LLM 프롬프트에 지원자 성명 원문이 전송되는 문제 제거

- 우선순위: P0
- 상태: 완료

## 배경
- `src/services/aiEvaluator.js`는 본문을 `anonymizePII(rawText, name)`으로 마스킹한 뒤 에이전트에 전달합니다.
- 그런데 각 에이전트 프롬프트는 `- 성명: ${name}`으로 **원래 성명을 그대로 외부 LLM(Gemini)에 보냅니다.**
  - `src/services/agents/groundingAgent.js`, `criticAgent.js`, `supervisorAgent.js`, `interviewerAgent.js`
  - `src/services/aiEvaluator.js`의 `analyzeWithGeminiAPI` (`[지원자 성명]: ${name}`)
  - B2B 게이트웨이 경로: 클라이언트가 `name`을 body에 담아 보내고, `server/index.js`가 `[Candidate Name]: ${name}`을 프롬프트에 넣습니다.
- 이는 ISSUES #3, README의 "블라인드 채용" 주장과 정면으로 충돌합니다.

## 목표
- 외부 LLM으로 나가는 프롬프트에 지원자 성명이 포함되지 않도록 합니다.

## 작업 내용
- [x] 4개 에이전트와 단일 프롬프트에서 성명 라인을 `[익명 지원자]`로 대체
- [x] `server/index.js` 프롬프트에서 성명을 제거하고, 응답의 `name`은 요청값을 그대로 유지
- [x] 회귀 테스트: 멀티에이전트 실행 시 `callGeminiJson`에 전달된 프롬프트에 성명이 없는지 검증

## 완료 기준
- `src/services`와 `server`의 프롬프트 템플릿에 `${name}` 삽입이 0건일 것

## 진행 기록
- 2026-11-10 변경 파일
  - `src/services/agents/groundingAgent.js`, `criticAgent.js`, `supervisorAgent.js`, `interviewerAgent.js`: `- 성명: ${name}` → `- 성명: [익명 지원자] (블라인드 채용 정책상 성명은 전송되지 않습니다)`
  - `src/services/aiEvaluator.js` (단일 프롬프트 백업 엔진): 같은 방식으로 대체
  - `server/index.js` (B2B 게이트웨이): `[Candidate Name]: ${name}` → `[ANONYMIZED]`. 응답 JSON의 `name` 필드는 요청값을 그대로 씁니다(자사 게이트웨이 내부 처리이며 LLM으로 전송하지 않음).
  - `src/services/multiAgentEvaluator.test.js`: 4개 에이전트 호출 프롬프트에 '김민준'이 없음을 검증하는 assertion 추가
- 검증
  - `src/`, `server/`의 `*.js|*.jsx`에서 `${name}` 검색 결과, 남은 곳은 `ReportExporter.jsx`(로컬 CSV 파일명과 화면 보고서) 2건뿐입니다. 외부 전송 경로가 아닙니다.
  - 각 에이전트 함수 시그니처의 `name` 파라미터는 호환성을 위해 남겨 두었습니다(미사용).
- 남은 한계: 마스킹 토큰(`[성명 익명화]` 등)이 들어간 본문을 LLM이 그대로 인용하면 원문과 정확히 일치하지 않습니다. 이 경우 fuzzy 매칭(threshold 0.70)에 의존합니다.
