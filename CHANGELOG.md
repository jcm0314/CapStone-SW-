# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-09-16] 프로젝트 기획, 아키텍처 설계, 마일스톤 로드맵 수립 및 깃허브 푸시

### 💡 1. 기획 및 필요성 수치화 (Business Rationale & ROI Analysis)
- **HR 페인포인트 정량 분석**: 공고 1개당 380~500건 접수 ➔ 인사담당자 1명이 검토에 **80~100시간 소요** 문제 정의.
- **Generative AI 자소서 인플레이션 대책**: 구직자의 68.4%가 ChatGPT 사용 ➔ 겉치레 문구 속 **🟢 수치적 성과 근거(Grounding)** 캡처 필요성 도출.
- **ROI 목표 수립**: 서류 검토 시간 12분 ➔ **2~3분으로 80% 단축**, 채용 리드타임 85% 감소, 면접 질문 작성 시간 **0분(자동화)** 달성.

---

### 🏛️ 2. 유저 시나리오, 플로우 및 시스템 아키텍처 설계
- **유저 페인포인트 페르소나 정의**:
  - `박현우 팀장` (IT/기획 채용 담당자): 상투적 AI 글 스크리닝 및 수재 빠르게 발굴.
  - `김서연 리크루터` (채용 대행 에이전시): 고객사별 가중치 적용 및 원문 근거가 담긴 표준 HR 서류 평가서 발급.
- **End-to-End 유저 플로우 작성**: 5단계 인터랙티브 흐름(가중치 설정 ➔ 자소서 투입 ➔ AI 근거 분석 ➔ 하이라이트 & 면접 질문 검토 ➔ 비교 매트릭스 및 PDF 출력) Mermaid 다이어그램 화.
- **시스템 아키텍처 및 데이터 스키마 수립**: `JobProfile`, `ApplicantAnalysis`, `GroundingEvidence`, `InterviewQuestion` JSON 스키마 표준화.

---

### 🎯 3. 5단계 프로젝트 마일스톤 및 개발 로드맵 작성 ([docs/MILESTONES.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/MILESTONES.md))
- **Milestone 1 (`v1.0.0`) [완료]**: Core Grounding Engine & HR Dashboard (8대 UI 컴포넌트, Gemini API 연동).
- **Milestone 2 (`v1.1.0`)**: Web Worker 파싱 분리 (Issue #1 해소) & Vitest 단위 테스트 추가.
- **Milestone 3 (`v1.2.0`)**: Fuzzy Matching 매칭 엔진 (Issue #2 해소) & Client-side PII 익명화 필터 (Issue #3 해소).
- **Milestone 4 (`v1.3.0`)**: PDF/TXT 일괄 업로드 파이프라인 & IndexedDB 캐싱 (Issue #4 해소).
- **Milestone 5 (`v2.0.0`)**: Enterprise Custom Prompt Studio & 자소서 간 표절 매트릭스.

---

### 🛠️ 4. 기술 스택 및 코어 분석 엔진 구현 (`aiEvaluator.js`)
- **개발 환경 구축**: React 18 + Vite 6 + Tailwind CSS + Lucide React Icons + Recharts + Canvas Confetti.
- **Exact Substring Matching Grounding Engine**: 본문 내 정확한 문장 인덱스 위치 탐색 및 동적 `<mark>` 태그 매칭 (🟢/🔴/🟡).
- **Google Gemini API 실시간 연동**: Gemini 2.5/1.5 Flash 모델 실시간 JSON 바인딩 + 룰기반 fallback 작동.

---

### 🎨 5. 프리미엄 HR 다크 대시보드 8대 UI 컴포넌트 개발
- `Header.jsx`, `EvaluationCriteria.jsx`, `ApplicantInput.jsx`, `DashboardSummary.jsx`, `EvidenceViewer.jsx`, `InterviewQuestions.jsx`, `ApplicantComparison.jsx`, `ReportExporter.jsx` 구현 완료.

---

### 📚 6. 깃허브 레포지토리 문서화 & 1기능 1커밋 체계 수립
- **입문자 친화적 [README.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/README.md) 개편**: 프로젝트 필요성, 5대 기능, 수치 ROI, 마일스톤 로드맵 반영.
- **[docs/ISSUES.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ISSUES.md) 작성**: 4대 주요 기술 병목 이슈화 및 `.github/ISSUE_TEMPLATE/` 반영.
- **[docs/ENTERPRISE_GUIDELINES.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ENTERPRISE_GUIDELINES.md) 수립**: 탑티어 기업 7대 엔지니어링 표준 수립 및 `.github/PULL_REQUEST_TEMPLATE.md` 등록.
- **1기능 1커밋 준수 및 깃허브 푸시**: [https://github.com/jcm0314/CapStone-SW-.git](https://github.com/jcm0314/CapStone-SW-.git) 원격 저장소 동기화 완수.

---

### 📜 커밋 히스토리 (2026-09-16)

```bash
* 7329935 docs: add CHANGELOG.md for daily work log tracking
* 3630c1f docs: add ENTERPRISE_GUIDELINES.md & pull request template
* 3404d61 docs: add GitHub Issues documentation (docs/ISSUES.md) & issue template
* c93283b docs: update README.md for first-time readers & 1-feature 1-commit rule
* 710f137 feat: initialize HR AX Smart Evaluator project with docs, architecture, and React app
* abbfb52 Initial commit
```

---

© 2026 HR AX Smart Evaluator Daily Work Log.
