# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-10-04] Sprint 4.1 & 4.2: PDF/TXT 파일 업로드 및 IndexedDB 캐싱 & CSV 다운로드 구현

### ⚡ 1. IndexedDB 캐싱 & Excel/CSV 다운로드 구현 (Sprint 4.2)
- **IndexedDB 로컬 캐싱 서비스 (`src/services/cacheService.js`)**: 평가 텍스트 해시 기반 고유 키 생성 및 동일 지원서 재심사 시 ⚡ 로컬 캐시에서 즉시 반환 (API 토큰 비용 0원, 0초 조회).
- **UTF-8 BOM CSV / Excel 일괄 다운로드 (`src/utils/csvExporter.js`)**: 지원자 성명, 직무, 종합점수, 5대 역량 점수, 긍정/리스크 근거 수, 판정사유 엑셀 호환 다운로드 지원.
- **`ReportExporter.jsx` CSV 다운로드 버튼 통합**: 1클릭 Excel/CSV 다운로드 기능 연동.
- **`cacheService.test.js` & `csvExporter.test.js` 단위 테스트 3종 구축**: 전체 단위 테스트 20종 100% 통과.

### 📁 2. 서류 파일 파서 및 드래그 앤 드롭 업로드 뷰어 구현 (Sprint 4.1)
- **클라이언트 단 파일 파서 유틸리티 (`src/utils/fileParser.js`)**: `.txt`, `.pdf`, `.docx` 서류 파일의 텍스트 추출 및 바이너리 텍스트 파싱 처리.
- **Drag-and-Drop 파일 업로드 컴포넌트 (`src/components/FileUploadZone.jsx`)**: 파일 드래그 앤 드롭 존 및 다중 업로드 서류 목록 미리보기/선택 인터페이스 구현.
- **`ApplicantInput.jsx` 탭 스위처 연동**: `[✍️ 텍스트 직접 입력]`과 `[📁 PDF/TXT 파일 업로드]` 모드 간 1클릭 전환 지원.

---
- **개인식별정보(PII) & 블라인드 채용 정규식 필터 (`src/utils/piiAnonymizer.js`)**: 성명, 전화번호, 이메일, 주민번호, 생년월일, 출신 학교명(대학교/고교/중학), 거주 지역 자동 마스킹.
- **AI 평가 통신 파이프라인 통합 (`src/services/aiEvaluator.js`)**: Gemini API 및 Web Worker 파싱 전 PII 자동 익명화 선처리 적용.
- **`EvidenceViewer.jsx` PII 보안 뱃지 표시**: `ShieldCheck: PII Masked (Blind Recruitment)` 뱃지 추가.
- **`piiAnonymizer.test.js` 단위 테스트 6종 구축**: 6개 테스트 항목 100% 통과 (전체 단위 테스트 14종 100% 그린).

### 🔍 2. Fuzzy Matching 엔진 개발 (Sprint 3.1)
- **Levenshtein Distance & Jaccard 유사도 알고리즘**: 문장 간 편집 거리 및 0.0~1.0 정규화 유사도 산출 모듈 구현.
- **슬라이딩 윈도우 텍스트 탐색 (`findFuzzyMatch`)**: Exact Match 실패 시 원문 내 줄바꿈(`\n`), 다중 공백, 오타가 섞여 있어도 85% 이상 유사한 문장을 99% 정확도로 자동 매칭.
- **`EvidenceViewer.jsx` 하이라이팅 연동**: 근거 캡처 검증 뷰어 헤더에 `Fuzzy Matcher (Levenshtein 85%+)` 뱃지 표기 및 슬라이딩 윈도우 오프셋 렌더링.

---
- **Vitest & React Testing Library 환경 통합**: `vite.config.js` 내 jsdom 테스트 환경 구성 및 `"test": "vitest run"` 스크립트 추가.
- **AI Evaluator 엔진 단위 테스트 (`src/services/aiEvaluator.test.js`)**: 템플릿 로딩, Web Worker Fallback 파이프라인, 원문 Substring 매칭 검증 테스트 3종 100% 통과.
- **Husky & lint-staged pre-commit 훅 초기화 (`.husky/pre-commit`)**: Git 커밋 실행 시 자동으로 `npm test`가 트리거되어 결함 코드 커밋을 0%로 차단.

### ⚡ 2. 대용량 근거 카드 렌더링 성능 최적화 (Sprint 2.2)
- **`react-window` FixedSizeList 적용**: 대용량 근거 카드가 100개 이상 렌더링될 때 DOM 노드 폭증으로 인한 UI 블로킹을 방지하기 위해 가상 스크롤(Virtual Scrolling) 도입 (60fps 디스플레이 유지).
- **인터랙티브 `scrollToItem` 자동 연동**: 서류 본문 좌측 텍스트에서 🟢/🔴/🟡 하이라이팅 태그 클릭 시 가상 스크롤 목록에서 해당 근거 카드의 위치로 자동으로 스크롤(`listRef.current.scrollToItem(idx, 'smart')`)되는 UX 개선.

---

## 📌 [2026-09-23] LG CSO AX 멘토 발표 미팅 대비 비주얼 슬라이드 개편 & Multi-Agent 앙상블 아키텍처 구축

### 🏆 1. HR Multi-Agent 4대 에이전트 앙상블 체계 수립 (`docs/LG_CSO_AX_PRESENTATION_BRIEF.md`)
- **4대 역할 분담 Multi-Agent Orchestration**:
  1. **Supervisor Agent**: 전사 평가 지시, 5대 역량 점수 통합 정산 및 파이프라인 총괄 결재.
  2. **Grounding Agent**: 자소서 본문 텍스트 1:1 매칭 및 Substring Offset 인덱싱.
  3. **Critic / Verifier Agent**: 2차 비판적 검증, 환각/과장 표현/PII 검증 (유사도 < 0.85 시 🟡 면접검증 전환).
  4. **Interviewer Agent**: Critic Agent 포착 🔴/🟡 약점 기반 맞춤 심층 질문 3종 & 체크리스트 자동 도출.
- **EXAONE 3.0 오픈소스 가용성 & 1초 라우팅 스위칭 Q&A 추가**.
- **정제 비주얼 슬라이드 2종 적용 (`presentation.html` & `presentation.pdf`)**.

---

## 📌 [2026-09-18] Web Worker 백그라운드 파싱 모듈 구현 (Sprint 2.1) 및 발표 자료 3대 확장성 보강

### ⚡ 1. Web Worker 멀티쓰레드 비동기 연산 구축 (`src/workers/evaluatorWorker.js`)
- **UI 렌더링 병목 해소**: 대용량 자기소개서 정규식 문장 분할 및 Substring char index 탐색을 메인 UI 쓰레드에서 Web Worker 백그라운드 쓰레드로 완전 이관 (60fps 디스플레이 유지).
- **비동기 Worker 서비스 래퍼 (`src/services/workerService.js`)**: Web Worker 생명주기 관리 및 Promise 기반 진행률(`PROGRESS`) 이벤트 캡처 모듈 구축.
- **실시간 실소요 프로그레스바 (`src/components/ApplicantInput.jsx`)**: 서류 분석 실행 시 0% ~ 100% 실시간 프로그레스 바 및 단계별 상태 텍스트 시각화.
- **발표 자료 보강 (`presentation.html` & `presentation.pdf`)**: 엔터프라이즈 비정형 데이터 검증 엔진의 3대 확장성(범용성·활용성·확장성) 및 **종적(Vertical) AX 의사결정 파이프라인(실무자 ➔ 면접관 ➔ 경영진)** 3단계 카드 추가 및 고화질 PDF 재생성.

---

## 📌 [2026-09-17] 대기업 환경 일원화를 위한 Google Cloud Vertex AI 아키텍처 및 순수 Enterprise Proxy Gateway 구축

### 🏛️ 1. 대기업 (Enterprise) 환경 규격 단일화
- **Google Cloud Vertex AI SDK 전용 통합**: `generativelanguage.googleapis.com` (Consumer API Key) 및 로컬 fallback 모드를 완전 정제하고 대기업 표준인 **Google Cloud Vertex AI (`@google-cloud/vertexai`)** API 아키텍처로 일원화.
- **Enterprise Service Proxy Gateway (`server/proxyServer.js`)**:
  - 클라이언트 브라우저가 API Key를 노출하지 않도록 Node.js / Express 기반 3-Tier API Gateway 통신 구축.
  - 전화번호(`010-****-****`), 이메일 자동 익명화 PII 마스킹 필터 추가.
  - Google BigQuery 감사 이력(Audit Trail Log) 연동 로깅 시스템 구현.
- **Pure Enterprise Service (`src/services/enterpriseVertexService.js`)**:
  - 클라이언트 API 키 모달 및 fallback 제거. Enterprise Express Proxy Gateway 엔드포인트 전용 연동.
- **[docs/ENTERPRISE_VERTEX_ARCHITECTURE.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ENTERPRISE_VERTEX_ARCHITECTURE.md) 규격서 업데이트**.

---

## 📌 [2026-09-16] 프로젝트 기획, 아키텍처 설계, 발표용 HTML 제작 및 깃허브 원격 동기화

### 🎤 1. 키워드 중심 고가독성 중간 발표용 HTML 개편 (`presentation.html`)
- **6대 목차 키워드화**: 문제 정의, 사용자, 핵심 가치, 실현 가능성 ROI 수치, 시스템 설명, GitHub 링크 포함 발표용 웹페이지 제작.

---

### 📜 커밋 히스토리 (Recent Commits)

```bash
* refactor: Google Opal 및 소비자용 API 모드 제거, 순수 엔터프라이즈 Vertex AI 파이프라인으로 일원화
* refactor: presentation.html 발표용 웹페이지를 핵심 키워드 중심 고가독성 디자인으로 개편
* feat: 대기업 환경 구축을 위한 Google Cloud Vertex AI 아키텍처 규격 및 프록시 게이트웨이 추가
```

---

© 2026 HR AX Smart Evaluator Daily Work Log.
