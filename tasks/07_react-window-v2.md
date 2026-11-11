# 07. react-window v2 API 반영 (가상 스크롤 실제 동작)

- 우선순위: P1
- 상태: 완료

## 배경
- `package-lock.json`에 설치된 버전은 `react-window@2.3.3`입니다.
- v2는 `FixedSizeList`를 제공하지 않고, `List`(`rowComponent`, `rowCount`, `rowHeight`, `rowProps`, `listRef`) API를 씁니다.
- `src/components/EvidenceViewer.jsx` 7행 `ReactWindow.FixedSizeList || ...`는 항상 `undefined`입니다. 그래서 **가상 스크롤 없이 일반 목록으로 폴백**됩니다.
- 이는 README·MILESTONES의 "react-window 가상 스크롤" 주장과 다릅니다.
- `scrollToItem`도 v2에는 없습니다(v2는 `scrollToRow`).

## 목표
- react-window v2 `List`로 근거 카드 목록을 실제로 가상화하고, 선택한 근거로 자동 스크롤되게 합니다.

## 작업 내용
- [x] `import { List } from 'react-window'`로 변경
- [x] `EvidenceCardRow`를 v2 rowComponent 시그니처(`{ index, style, ...rowProps }`)로 변경
- [x] `listRef` + `scrollToRow({ index, align: 'smart' })`로 자동 스크롤
- [x] `List`가 없을 때 쓰는 폴백 렌더링은 유지

## 완료 기준
- 정적 import 검사 통과
- 실제 렌더링 확인은 Node 설치 후 15번에서

## 진행 기록
- 2026-11-10 API 확인: unpkg에 공개된 `react-window@2.3.3/dist/react-window.d.ts`를 조회했습니다.
  - export 목록: `List`, `Grid`, `useListRef` 등. `FixedSizeList`는 없습니다.
  - List props: `rowComponent`, `rowCount`, `rowHeight`, `rowProps`(필수, `index`/`style`/`ariaAttributes` 키 금지), `listRef`, `style`
  - ref API: `scrollToRow({ index, align: 'auto'|'center'|'end'|'smart'|'start', behavior })`
- 변경 파일: `src/components/EvidenceViewer.jsx`
  - `import * as ReactWindow` + `FixedSizeList` 해석 코드 → `import { List } from 'react-window'`
  - `EvidenceCardRow({ index, style, data })` → `EvidenceCardRow({ index, style, filteredEvidences, activeQuoteId, setActiveQuoteId })`
  - `<List ref height itemCount itemSize itemData>{Row}</List>` → `<List listRef rowComponent rowCount rowHeight={145} rowProps style={{height:460}} />`
  - `scrollToItem(idx, 'smart')` → `scrollToRow({ index: idx, align: 'smart' })`
  - 폴백 목록 렌더링도 새 시그니처에 맞췄습니다.
- 검증: 정적 import 검사 `errors=0 warnings=0`. 남은 `FixedSizeList`/`itemData`/`scrollToItem` 참조는 0건입니다.
- 브라우저 실제 렌더링 확인은 15번(Node 설치 후)으로 넘깁니다.
