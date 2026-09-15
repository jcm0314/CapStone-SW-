# 🎯 HR AX Smart Evaluator Milestones & Roadmap (프로젝트 마일스톤)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 단계별 마일스톤(Milestones), 로드맵, 목표 및 세부 이행 태스크를 정의하는 관리 문서입니다.

---

## 📌 마일스톤 한눈에 보기 (Milestone Overview)

```
 [Milestone 1] ──► [Milestone 2] ──► [Milestone 3] ──► [Milestone 4] ──► [Milestone 5]
 Core Grounding      Performance &       Fuzzy Match &       Batch Upload &      Enterprise HR
 Engine (v1.0.0)    Testing (v1.1.0)     PII Masking (v1.2.0) Local DB (v1.3.0)  Prompt Studio (v2.0.0)
   [완료 ✓]            [진행 대기]           [계획 수립]           [계획 수립]          [계획 수립]
```

---

### 📍 Milestone 1: Core Grounding Engine & HR Dashboard (`v1.0.0`) - [완료 ✓]
- **목표**: 근거 기반 자기소개서 AI 역량 평가 시스템 1차 MVP 구축 및 검증.
- **주요 성과 및 달성 과제**:
  - [x] 지원서 본문 Exact Substring Matching 기반 문장 태깅 (🟢 긍정 / 🔴 리스크 / 🟡 면접 검증)
  - [x] 5대 역량 항목 및 가중치 슬라이더 정산 알고리즘
  - [x] 100점 만점 SVG 스코어 게이지 & Recharts 다면 레이더 차트
  - [x] 약점/검증필요 문장 기반 맞춤형 심층 면접 질문 생성기 (Interview Kit)
  - [x] 다중 지원자 매트릭스 비교 & 1클릭 HR 서류 평가서 PDF/인쇄/복사 모달
  - [x] Google Gemini 2.5/1.5 Flash API 실시간 연동 & 스마트 룰기반 fallback 서비스

---

### 📍 Milestone 2: Performance Optimization & Automated Testing (`v1.1.0`) - [차기 진행 과제]
- **목표**: 대용량 파싱 시 UI 렌더링 병목 해소 및 단위 테스트 커버리지 80% 확보.
- **세부 태스크**:
  - [ ] **[Issue #1 해결] Web Worker 파싱 분리**: `aiEvaluator.js` 정규식 탐색 및 문장 분할을 백그라운드 Worker 쓰레드로 이전하여 UI Freeze 현상 완벽 방지.
  - [ ] **[Issue #1 해결] Virtual Scrolling 도입**: 지원서 본문 및 근거 카드가 100개 이상일 때 `react-window`를 통해 리액트 DOM 렌더링 부하 절감.
  - [ ] **Vitest / React Testing Library 도입**: `aiEvaluator.js` 분석 엔진 및 가중치 정산 함수 단위 테스트 추가.
  - [ ] **Husky & lint-staged 설정**: Git 커밋 전 자동 ESLint & Prettier 검사 훅 구성.

---

### 📍 Milestone 3: Advanced Fuzzy Matching & PII Masking Filter (`v1.2.0`)
- **목표**: 본문 하이라이터 매칭 정확도 99% 달성 및 개인정보 보호 규정 준수.
- **세부 태스크**:
  - [ ] **[Issue #2 해결] Fuzzy Matching Engine**: Levenshtein Distance(편집 거리) 알고리즘 도입으로 원문 줄바꿈(`\n`)이나 오타가 발생해도 95% 이상 유사한 문장 정확히 하이라이트.
  - [ ] **[Issue #3 해결] Client-side PII Masking Filter**: 지원자의 성명, 전화번호(`010-****-****`), 이메일, 주민번호 등 개인정보를 Gemini API 전송 직전 익명화 선처리.

---

### 📍 Milestone 4: Batch Multi-File Upload & Local Caching (`v1.3.0`)
- **목표**: 대량 채용 서류 일괄 업로드 파이프라인 구축 및 API 과부하 방지.
- **세부 태스크**:
  - [ ] **PDF / TXT / DOCX 다중 지원서 파싱**: `pdfjs-dist`를 도입하여 서류 파일 일괄 업로드 및 분석 지원.
  - [ ] **[Issue #4 해결] IndexedDB / LocalStorage Caching**: 동일한 자소서 원문 및 가중치 조합에 대한 분석 결과 브라우저 캐싱.
  - [ ] **[Issue #4 해결] Async Request Throttling Queue**: API RPM 초과(HTTP 429) 예방을 위한 동시 요청 제한 큐 구현.
  - [ ] **CSV / Excel 일괄 다운로드**: 지원자 전체 평가 점수 및 근거 요약표 엑셀 내보내기.

---

### 📍 Milestone 5: Enterprise Prompt Studio & Plagiarism Matrix (`v2.0.0`)
- **목표**: 대기업 인사팀 맞춤형 인재상 프롬프트 스튜디오 및 자소서 간 상호 유사도 탐지.
- **세부 태스크**:
  - [ ] **Custom HR Prompt Studio**: 기업별 독자적 인재상, 핵심 가치, 금기어를 설정하는 커스텀 프롬프트 에디터 제공.
  - [ ] **지원자 간 자소서 표절 및 상호 유사도 매트릭스 (Plagiarism Matrix)**: 제출된 서류들 간 텍스트 유사도 검사 지원.

---

© 2026 HR AX Smart Evaluator Roadmap & Milestones.
