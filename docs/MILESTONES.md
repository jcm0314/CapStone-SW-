# 🎯 HR AX Smart Evaluator Milestones & Roadmap (프로젝트 마일스톤)

본 프로젝트의 마일스톤은 **GitHub 레포지토리 내 깃허브 네이티브 마일스톤 기능 ([https://github.com/jcm0314/CapStone-SW-/milestones](https://github.com/jcm0314/CapStone-SW-/milestones))**을 활용하여 관리되며, 각 마일스톤별 연동 이슈(GitHub Issues)의 진행 상황이 실시간으로 동기화됩니다.

---

## 📌 깃허브 네이티브 마일스톤 현황 (GitHub Milestones Link)

- 🔗 **GitHub Milestones 페이지 바로가기**: [https://github.com/jcm0314/CapStone-SW-/milestones](https://github.com/jcm0314/CapStone-SW-/milestones)

---

## 🗺️ 5단계 마일스톤 및 이슈 연동 목록

### 📍 [Milestone 1] `v1.0.0 - Core Grounding Engine & HR Dashboard` ([마일스톤 #1](https://github.com/jcm0314/CapStone-SW-/milestone/1)) - [완료 ✓]
- **상태**: Closed / Completed (100%)
- **설명**: HR AX 1차 보조 시스템 기초 구축 및 MVP 검증.
- **달성 주요 기능**:
  - Exact Substring Matching 근거 하이라이터 (🟢/🔴/🟡)
  - 5대 역량 항목 및 가중치 슬라이더 정산 알고리즘
  - 100점 만점 게이지 & Recharts 다면 레이더 차트
  - 약점/검증필요 문장 기반 맞춤형 심층 면접 질문 생성기 (Interview Kit)
  - 지원자 매트릭스 비교 & 1클릭 HR 서류 평가서 PDF/인쇄 모달
  - Gemini 2.5/1.5 Flash API 실시간 연동 & 스마트 룰기반 fallback 서비스

---

### 📍 [Milestone 2] `v1.1.0 - Web Worker 성능 최적화 & 테스트 구축` ([마일스톤 #2](https://github.com/jcm0314/CapStone-SW-/milestone/2)) - [차기 과제]
- **마감 예정일**: 2026-09-25
- **연동 GitHub Issues**:
  - 🔴 [Issue #1] `[Performance] 대용량 텍스트 & 대량 지원서 Batch 분석 시 메인 UI 쓰레드 렌더링 병목` ([이슈 #1](https://github.com/jcm0314/CapStone-SW-/issues/1))
- **주요 과제**:
  - `Web Worker` 백그라운드 파싱 분리 (UI Freeze 현상 해소)
  - `Virtual Scrolling(react-window)` 대량 근거 카드 렌더링 최적화
  - `Vitest` 분석 엔진 단위 테스트 커버리지 80% 확보
  - `Husky` Git 커밋전 자동 검사 훅 구성

---

### 📍 [Milestone 3] `v1.2.0 - Fuzzy Matching 엔진 & PII 마스킹` ([마일스톤 #3](https://github.com/jcm0314/CapStone-SW-/milestone/3))
- **마감 예정일**: 2026-10-05
- **연동 GitHub Issues**:
  - 🔴 [Issue #2] `[AI Grounding] Exact Substring Matching의 줄바꿈/오타 미스매치 한계` ([이슈 #2](https://github.com/jcm0314/CapStone-SW-/issues/2))
  - 🟡 [Issue #3] `[Security] 채용 서류 내 개인식별정보(PII) AI API 전송 전 마스킹 처리` ([이슈 #3](https://github.com/jcm0314/CapStone-SW-/issues/3))
- **주요 과제**:
  - `Fuzzy Matching(Levenshtein)` 알고리즘 도입으로 원문 오타/줄바꿈 완충 하이라이트
  - `Client-side PII Anonymizer Filter` 지원자 개인정보(성명, 전화번호, 이메일) 익명화 필터

---

### 📍 [Milestone 4] `v1.3.0 - PDF/TXT 일괄 업로드 & IndexedDB 캐싱` ([마일스톤 #4](https://github.com/jcm0314/CapStone-SW-/milestone/4))
- **마감 예정일**: 2026-10-20
- **연동 GitHub Issues**:
  - 🟡 [Issue #4] `[Scalability] Gemini API Rate Limit (HTTP 429) 대처 및 Caching 레이어` ([이슈 #4](https://github.com/jcm0314/CapStone-SW-/issues/4))
- **주요 과제**:
  - `PDF/TXT` 서류 일괄 업로드 파이프라인 구축 (`pdfjs-dist`)
  - `IndexedDB / LocalStorage` 분석 결과 브라우저 캐싱
  - `Async Throttling Queue` API Rate Limit 초과 예방 큐

---

### 📍 [Milestone 5] `v2.0.0 - Custom Prompt Studio & 표절 매트릭스` ([마일스톤 #5](https://github.com/jcm0314/CapStone-SW-/milestone/5))
- **마감 예정일**: 2026-11-10
- **주요 과제**:
  - `Custom HR Prompt Studio`: 기업별 커스텀 인재상 프롬프트 에디터
  - `Plagiarism Matrix`: 지원자 간 답변 상호 표절율 및 유사도 매트릭스

---

© 2026 HR AX Smart Evaluator GitHub Native Milestones.
