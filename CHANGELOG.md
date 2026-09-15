# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-09-16] 프로젝트 기획, 아키텍처 설계, 앱 구축 및 깃허브 원격 동기화

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

### 🛠️ 3. 기술 스택 및 코어 분석 엔진 구현 (`aiEvaluator.js`)
- **개발 환경 구축**: React 18 + Vite 6 + Tailwind CSS + Lucide React Icons + Recharts + Canvas Confetti.
- **Exact Substring Matching Grounding Engine**:
  - 지원서 본문 내 정확한 문장 인덱스 위치 탐색 및 동적 `<mark>` 태그 매칭.
  - 🟢 **Positive**: 정량적 수치 성과 (`Redis 86.8% 개선`, `15만 건 처리` 등)
  - 🔴 **Risk**: 주관적 과장 표현 (`어떠한 풍파도 손쉽게 극복` 등)
  - 🟡 **Verify**: 면접 시 정량 데이터 확인이 필요한 문구
- **Google Gemini API 실시간 연동**: Gemini 2.5/1.5 Flash 모델 실시간 JSON 바인딩 + 키 미입력 시 고성능 룰기반 fallback 작동.

---

### 🎨 4. 프리미엄 HR 다크 대시보드 8대 UI 컴포넌트 개발
- `Header.jsx`: 브랜드 헤더, Gemini API Key 모달, 탭 전환 컨트롤러.
- `EvaluationCriteria.jsx`: 5대 역량 슬라이더 (합계 100% 자동 체크).
- `ApplicantInput.jsx`: 서류 원문 입력 폼 & 4가지 사전 정의 테스트 샘플 원클릭 버튼.
- `DashboardSummary.jsx`: 100점 만점 SVG 스코어 게이지, 4단계 HR 판정 배지(`우수 추천`, `면접 추천`, `보류`, `탈락 권장`), AI 위험도 게이지 및 Recharts 다면 레이더 차트.
- `EvidenceViewer.jsx`: 인터랙티브 본문 문장 하이라이터 & 마우스 호버/클릭 동기화 근거 카드 Drawer.
- `InterviewQuestions.jsx`: 약점/검증필요 문장 기반 구조화 면접 질문, 질문 의도, 면접관 체크리스트 카드.
- `ApplicantComparison.jsx`: 다중 지원자 매트릭스 비교 테이블.
- `ReportExporter.jsx`: 1클릭 서류 평가서 인쇄 / PDF 저장 / 텍스트 복사 모달.

---

### 📚 5. 깃허브 레포지토리 문서화 & 1기능 1커밋 체계 수립
- **입문자 친화적 [README.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/README.md) 개편**: 프로젝트 왜 필요한가, 5대 기능, 수치 ROI, 시작하기 가이드.
- **[docs/ISSUES.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ISSUES.md) 작성**: 4대 주요 기술 병목(Web Worker, Fuzzy Matching, PII Masking, Rate Limit Queue) 수립 및 `.github/ISSUE_TEMPLATE/` 반영.
- **[docs/ENTERPRISE_GUIDELINES.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ENTERPRISE_GUIDELINES.md) 수립**: 탑티어 기업 7대 엔지니어링 표준 수립 및 `.github/PULL_REQUEST_TEMPLATE.md` 등록.
- **1기능 1커밋 준수 및 깃허브 푸시**: [https://github.com/jcm0314/CapStone-SW-.git](https://github.com/jcm0314/CapStone-SW-.git) 원격 저장소 동기화 완수.

---

### 📜 커밋 히스토리 (2026-09-16)

```bash
* 3630c1f docs: add ENTERPRISE_GUIDELINES.md & pull request template
* 3404d61 docs: add GitHub Issues documentation (docs/ISSUES.md) & issue template
* c93283b docs: update README.md for first-time readers & 1-feature 1-commit rule
* 710f137 feat: initialize HR AX Smart Evaluator project with docs, architecture, and React app
* abbfb52 Initial commit
```

---

© 2026 HR AX Smart Evaluator Daily Work Log.
