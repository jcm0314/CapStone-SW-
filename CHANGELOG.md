# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-09-23] LG CSO AX 멘토 발표 미팅 대비 비주얼 슬라이드 개편 및 EXAONE 3.0 연동 팩트 체크

### 🏆 1. LG EXAONE 3.0 연동 팩트 체크 및 Q&A 추가 (`docs/LG_CSO_AX_PRESENTATION_BRIEF.md`)
- **EXAONE 3.0 오픈소스 공개 팩트 준수**: LG AI연구원의 Hugging Face 공개 모델(`LG-AI-EXAONE/EXAONE-3.0-7.8B-Instruct`)을 활용한 로컬/외부 테스트 환경 연동.
- **사내망 이식 스위칭 프로토콜**: 백엔드 API Gateway (`server/proxyServer.js`)의 환경변수 스위칭(`AI_MODEL_PROVIDER=EXAONE_INHOUSE`)으로 사내 EXAONE 3.0 Enterprise 인프라 1초 전환 라우팅 명시.
- **정제 비주얼 슬라이드 2종 적용 (`presentation.html` & `presentation.pdf`)**:
  1. 핵심 UI 레이아웃 구조 (가중치 슬라이더, 본문, Grounding 캡처 🟢🔴🟡, 면접질문)
  2. 수평적 AX 한계 vs 종적(Vertical) 3단계 AX 의사결정 파이프라인 비교 다이어그램

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
