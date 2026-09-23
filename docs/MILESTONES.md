# 🎯 HR AX Smart Evaluator Granular Milestones & Roadmap (디테일 마일스톤 일품 일정표)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 마일스톤을 **스프린트(Sprint) 및 개별 개발 태스크(Task) 단위로 세분화**하여 구체적인 작업 범위, 일정, 담당 모듈 및 검증 기준을 정의하는 세부 일정표입니다.

---

## 📌 깃허브 네이티브 마일스톤 현황 (GitHub Milestones Link)

- 🔗 **GitHub Milestones 페이지 바로가기**: [https://github.com/jcm0314/CapStone-SW-/milestones](https://github.com/jcm0314/CapStone-SW-/milestones)
- 📌 **GitHub Issues 페이지 바로가기**: [https://github.com/jcm0314/CapStone-SW-/issues](https://github.com/jcm0314/CapStone-SW-/issues)

---

## 📅 세분화 마일스톤 & 스프린트 상세 일정표

```
 [Milestone 1] (완료) ──► [Milestone 2] ──► [Milestone 3] ──► [Milestone 4] ──► [Milestone 5]
 Core MVP (v1.0.0)      Web Worker & Test     Fuzzy & PII        Batch & Cache     Enterprise Studio
                         [2026-09-17~09-25]  [2026-09-26~10-05] [2026-10-06~10-20] [2026-10-21~11-10]
```

---

### 📍 [Milestone 1] `v1.0.0 - Core Grounding Engine & HR Dashboard` [완료 ✓]
- **기간**: ~ 2026-09-16 (완료)
- **상태**: Closed / Completed (100%)
- **세부 성과**:
  - `Task 1.1`: Exact Substring Matching 근거 하이라이터 (`EvidenceViewer.jsx`) 🟢/🔴/🟡 구현 완료
  - `Task 1.2`: 5대 역량 슬라이더 & 가중치 정산 알고리즘 (`EvaluationCriteria.jsx`) 완료
  - `Task 1.3`: 100점 만점 게이지 & Recharts 레이더 차트 (`DashboardSummary.jsx`) 완료
  - `Task 1.4`: 서류 약점 기반 맞춤형 심층 면접 질문 생성기 (`InterviewQuestions.jsx`) 완료
  - `Task 1.5`: 지원자 매트릭스 비교 & 1클릭 서류 평가서 모달 (`ReportExporter.jsx`) 완료
  - `Task 1.6`: Gemini 2.5/1.5 Flash API 실시간 연동 & HR Multi-Agent 4대 에이전트 (Supervisor, Grounding, Critic, Interviewer) 오케스트레이션 파이프라인 수립 완료

---

### 📍 [Milestone 2] `v1.1.0 - Web Worker 성능 최적화 & 테스트 구축` [차기 진행]
- **기간**: 2026-09-17 ~ 2026-09-25 (약 9일간)
- **목표**: 프론트엔드 비동기 성능 최적화 및 테스트 커버리지 80% 달성
- **연동 Issue**: 🔴 [Issue #1] `[Performance] 대용량 텍스트 & 대량 지원서 Batch 분석 시 메인 UI 쓰레드 렌더링 병목` ([이슈 #1 바로가기](https://github.com/jcm0314/CapStone-SW-/issues/1))

#### 🔹 Sprint 2.1: Web Worker 백그라운드 파싱 모듈화 (2026-09-17 ~ 2026-09-19) [완료 ✓]
- [x] **Task 2.1.1**: `src/workers/evaluatorWorker.js` 작성
  - 정규식 문장 분할 및 Substring Index 탐색을 백그라운드 Worker 쓰레드로 분리.
- [x] **Task 2.1.2**: `src/services/aiEvaluator.js` 및 `src/services/workerService.js` 비동기 Promise 래퍼 구현.
- [x] **Task 2.1.3**: `ApplicantInput.jsx` 실시간 처리 프로그레스바(%) 구현.

#### 🔹 Sprint 2.2: 대량 근거 카드 Virtual Scrolling 최적화 (2026-09-20 ~ 2026-09-22)
- [ ] **Task 2.2.1**: `react-window` 라이브러리 설치 및 설정.
- [ ] **Task 2.2.2**: `EvidenceViewer.jsx` 근거 카드 100개 이상 렌더링 시 Virtualized List 적용 (60fps 유지).

#### 🔹 Sprint 2.3: Vitest 단위 테스트 & Husky 커밋 훅 (2026-09-23 ~ 2026-09-25)
- [ ] **Task 2.3.1**: `Vitest` 및 `React Testing Library` 통합 환경 구축.
- [ ] **Task 2.3.2**: `src/services/aiEvaluator.test.js` 작성 (성과 파싱 & 가중치 점수 검증).
- [ ] **Task 2.3.3**: `Husky` + `lint-staged` 적용으로 Git 커밋 시 자동 ESLint & Prettier 검사.

---

### 📍 [Milestone 3] `v1.2.0 - Fuzzy Matching 엔진 & PII 마스킹`
- **기간**: 2026-09-26 ~ 2026-10-05 (약 10일간)
- **목표**: 하이라이팅 매칭 정확도 99% 달성 및 PII 보안 익명화 처리
- **연동 Issues**:
  - 🔴 [Issue #2] `[AI Grounding] Exact Substring Matching의 줄바꿈/오타 미스매치 한계` ([이슈 #2 바로가기](https://github.com/jcm0314/CapStone-SW-/issues/2))
  - 🟡 [Issue #3] `[Security] 채용 서류 내 개인식별정보(PII) AI API 전송 전 마스킹 처리` ([이슈 #3 바로가기](https://github.com/jcm0314/CapStone-SW-/issues/3))

#### 🔹 Sprint 3.1: Levenshtein Distance 기반 Fuzzy Matching Engine (2026-09-26 ~ 2026-09-30)
- [ ] **Task 3.1.1**: `src/utils/fuzzyMatcher.js` 작성 (Levenshtein & Jaccard 알고리즘).
- [ ] **Task 3.1.2**: 원문 줄바꿈(`\n`)이나 오타가 있어도 95% 이상 유사한 문장 완충 하이라이트.

#### 🔹 Sprint 3.2: Client-side PII Anonymizer Filter (2026-10-01 ~ 2026-10-05)
- [ ] **Task 3.2.1**: `src/utils/piiAnonymizer.js` 모듈 작성 (성명, 전화번호, 이메일 마스킹 정규식).
- [ ] **Task 3.2.2**: Gemini API 전송 전 자동 개인정보 익명화 선처리 파이프라인 구축.

---

### 📍 [Milestone 4] `v1.3.0 - PDF/TXT 일괄 업로드 & IndexedDB 캐싱`
- **기간**: 2026-10-06 ~ 2026-10-20 (약 15일간)
- **목표**: 대량 서류 파이프라인 처리 및 로컬 캐싱
- **연동 Issue**: 🟡 [Issue #4] `[Scalability] Gemini API Rate Limit (HTTP 429) 대처 및 Caching 레이어` ([이슈 #4 바로가기](https://github.com/jcm0314/CapStone-SW-/issues/4))

#### 🔹 Sprint 4.1: PDF / TXT / DOCX 파일 파서 & 일괄 업로드 (2026-10-06 ~ 2026-10-12)
- [ ] **Task 4.1.1**: `pdfjs-dist` 텍스트 추출 엔진 통합 (`src/utils/fileParser.js`).
- [ ] **Task 4.1.2**: 드래그 앤 드롭 파일 업로드 뷰어 (`FileUploadZone.jsx`) 구현.

#### 🔹 Sprint 4.2: IndexedDB 캐싱 & API Rate Limit Queue (2026-10-13 ~ 2026-10-20)
- [ ] **Task 4.2.1**: `IndexedDB` 로컬 분석 결과 캐싱 서비스 작성.
- [ ] **Task 4.2.2**: Exponential Backoff 기반 API Rate Limit (HTTP 429) 예방 큐 구축.
- [ ] **Task 4.2.3**: 지원자 전체 점수 엑셀/CSV 일괄 다운로드 유틸리티 작성.

---

### 📍 [Milestone 5] `v2.0.0 - Custom Prompt Studio & 표절 매트릭스`
- **기간**: 2026-10-21 ~ 2026-11-10 (약 21일간)
- **목표**: 엔터프라이즈 맞춤형 프롬프트 에디터 및 자소서 상호 표절 탐지

#### 🔹 Sprint 5.1: Custom HR Prompt Studio (2026-10-21 ~ 2026-10-31)
- [ ] **Task 5.1.1**: 기업별 인재상, 핵심 가치, 금기어 설정 에디터 UI 구축.

#### 🔹 Sprint 5.2: 지원자 간 상호 표절율 및 유사도 매트릭스 (2026-11-01 ~ 2026-11-10)
- [ ] **Task 5.2.1**: n-gram 기반 텍스트 상호 표절 탐지 알고리즘 개발.
- [ ] **Task 5.2.2**: 지원자 표절율 시각화 매트릭스 UI 구현 및 최종 v2.0 릴리즈.

---

© 2026 HR AX Smart Evaluator Granular Roadmap.
