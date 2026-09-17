# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-09-17] 대기업 환경 동기화를 위한 Google Cloud Vertex AI 아키텍처 및 Enterprise Proxy Gateway 구축

### 🏛️ 1. 대기업 (Enterprise) 환경 규격 적용
- **Google Cloud Vertex AI SDK 통합**: `generativelanguage.googleapis.com` (Consumer API) 대신 대기업 표준인 **Google Cloud Vertex AI (`@google-cloud/vertexai`)** API 아키텍처 지원.
- **Enterprise Service Proxy Gateway (`server/proxyServer.js`)**:
  - 클라이언트 브라우저가 API Key를 노출하지 않도록 Node.js / Express 기반 3-Tier API Gateway 통신 구축.
  - 전화번호(`010-****-****`), 이메일 자동 익명화 PII 마스킹 필터 추가.
  - Google BigQuery 감사 이력(Audit Trail Log) 연동 로깅 시스템 구현.
- **Enterprise Dual-Engine Mode (`src/services/enterpriseVertexService.js`)**:
  - `Enterprise Vertex AI Mode` (대기업 GCP Proxy + BigQuery Audit + IAM 인증).
  - `Standard Mode` (로컬 빠른 검증용 Gemini API / 룰기반 fallback).
- **[docs/ENTERPRISE_VERTEX_ARCHITECTURE.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ENTERPRISE_VERTEX_ARCHITECTURE.md) 규격서 수립**.

---

### 🔮 2. Google Opal (Vibe-coding AI Workflow Builder) 활용 정의
- **AI 파이프라인 시각적 프로토타이핑**: `[자소서 입력] ➔ [근거 캡처] ➔ [역량 점수화] ➔ [면접 질문]` 노드 체이닝 및 Visual Proof 데모 정의.

---

## 📌 [2026-09-16] 프로젝트 기획, 아키텍처 설계, 발표용 HTML 제작 및 깃허브 원격 동기화

### 🎤 1. 키워드 중심 고가독성 중간 발표용 HTML 개편 (`presentation.html`)
- **6대 목차 키워드화**: 문제 정의, 사용자, 핵심 가치, 실현 가능성 ROI 수치, 시스템 설명, GitHub 링크 포함 발표용 웹페이지 제작.

---

### 📜 커밋 히스토리 (Recent Commits)

```bash
* 5c5c8eb docs: README.md 및 CHANGELOG.md에 Google Opal 활용 방안 섹션 추가
* 374c95e refactor: presentation.html 발표용 웹페이지를 핵심 키워드 중심 고가독성 디자인으로 개편
```

---

© 2026 HR AX Smart Evaluator Daily Work Log.
