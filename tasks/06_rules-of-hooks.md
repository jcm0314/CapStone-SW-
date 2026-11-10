# 06. React Hooks 규칙 위반(조기 return) 컴포넌트 수정

- 우선순위: P1
- 상태: 완료

## 배경
- 다음 컴포넌트는 `if (...) return null;`을 hook 호출보다 **먼저** 실행합니다. Rules of Hooks 위반입니다.
  - `src/components/EvidenceViewer.jsx` (62행 → 66~84행 hooks)
  - `src/components/ShareModal.jsx` (8행 → 10~19행 hooks). App에서 항상 렌더링되고 `isOpen`만 토글됩니다.
  - `src/components/HITLEditorModal.jsx` (15행 → 17~42행 hooks)
  - `src/components/SSOProfileModal.jsx` (7행 → 9~10행 hooks)
- 렌더마다 hook 개수가 달라지면 React 개발 모드 경고나 상태 유실이 생길 수 있습니다.

## 목표
- 조건 검사를 바깥 래퍼 컴포넌트로 옮겨, 내부 컴포넌트는 항상 같은 순서로 hook을 호출하도록 합니다.

## 작업 내용
- [x] 4개 컴포넌트를 "가드 래퍼(default export) + 본문 컴포넌트" 구조로 분리
- [x] 정적 검사 스크립트(조기 return → hook 순서)로 재검증

## 완료 기준
- 정적 검사 경고 0건
- 각 컴포넌트의 props 인터페이스가 그대로일 것

## 진행 기록
- 2026-11-10 변경 파일
  - `src/components/EvidenceViewer.jsx`: `EvidenceViewer`(가드) → `EvidenceViewerContent`(hooks). `rawText`, `groundingEvidences`가 없을 때를 위한 기본값(`''`, `[]`)도 추가했습니다.
  - `src/components/ShareModal.jsx`: `ShareModal`(가드) → `ShareModalContent`
  - `src/components/HITLEditorModal.jsx`: `HITLEditorModal`(가드, props 그대로 전달) → `HITLEditorModalContent`
  - `src/components/SSOProfileModal.jsx`: `SSOProfileModal`(가드) → `SSOProfileModalContent`
  - default export 이름과 props는 바꾸지 않았습니다. 호출부(`App.jsx`, `Header.jsx`)는 수정할 필요가 없습니다.
- 검증
  - 정적 검사 스크립트의 함수 본문 추출을 중괄호 매칭 방식으로 개선한 뒤 실행했습니다. 수정 전에는 경고 4건, 수정 후 출력은 다음과 같습니다.
    ```
    checked 60 files
    errors=0 warnings=0
    ```
