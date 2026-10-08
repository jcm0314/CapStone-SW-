# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-10-08] v2.5.0: 4대 HR Multi-Agent 앙상블 파이프라인 구현 & XAI 감사 시스템 구축 🤖

### 🤖 1. 독립 4대 전문 에이전트 앙상블 파이프라인 구축 (`src/services/agents/`)
- **Grounding Agent (`groundingAgent.js`)**: 자소서 본문 1:1 인덱싱 및 정량 지표/과장/검증 필요 문장 객관적 발췌.
- **Critic Agent (`criticAgent.js`)**: 비판적 2차 감사(Red-Teaming), AI 생성 문체 판별 및 과장/허위 위험도(LOW/MED/HIGH) 판정.
- **Supervisor Agent (`supervisorAgent.js`)**: 직무 가중치 정산, 5대 역량 종합 점수화 및 최종 인사 결재(`STRONG_PASS` ~ `REJECT`).
- **Interviewer Agent (`interviewerAgent.js`)**: Critic 감사 소견 및 약점 문장 정밀 타깃팅 실전 면접 질문 & 체크리스트 생성.

### 🌐 2. 멀티 에이전트 오케스트레이터 & XAI 감사 UI 연동
- **오케스트레이터 (`multiAgentEvaluator.js`)**: 4개 에이전트 간 순차적 상태 전이(State Chaining) 및 상황 맥락 전달 총괄, 실시간 프로그레스 피드백(25%~100%).
- **XAI 감사 모달 (`MultiAgentAuditModal.jsx`)**: 인사담당자가 4대 에이전트의 타임라인, 비판 소견, 의사결정 사유를 투명하게 열람 가능한 Explainable AI UI 신설.
- **대시보드 UI 연동 (`ApplicantInput.jsx`, `DashboardSummary.jsx`)**: 실시간 에이전트 진행 게이지 및 앙상블 뱃지 연동.
- **단위 테스트 스위트 확장 (`multiAgentEvaluator.test.js`)**: 29개 단위 테스트 100% 통과 및 프로덕션 빌드 완료.

---

## 📌 [2026-10-04] Sprint 6: 엔터프라이즈 인프라 & DevOps 파이프라인 구축 (v2.1.0 완결) 🏆

### 🐳 1. 프로덕션 Nginx 웹서버 & 멀티스테이지 Dockerfile 세팅 (Sprint 6.1)
- **`Dockerfile` (Multi-Stage Build)**: Node:20-alpine 환경에서 SPA 빌드 후 경량 Nginx Alpine 웹서버로 아티팩트만 전송하는 2-Stage 컨테이너 빌드 적용 (컨테이너 이미지 90%+ 용량 절감).
- **`nginx.conf` 프로덕션 구성**: Security Headers (X-Frame-Options, CSP, XSS-Protection), Gzip 압축, SPA 라우팅 Fallback (`try_files $uri /index.html`) 및 `/health` 헬스체크 엔드포인트 세팅.
- **`.dockerignore` 적용**: 빌드 컨텍스트 크기 최적화.

### 🛡️ 2. Express API Proxy Gateway & Docker Compose 다중 컨테이너 연동 (Sprint 6.2)
- **Node.js Express API 게이트웨이 (`server/index.js`)**: API Key 노출 방지 역방향 프록시, DoS 방지 Rate Limiting (100 req/15min), CORS 제어 및 Liveness/Readiness `/health` 헬스체크 추가.
- **Docker Compose 다중 오케스트레이션 (`docker-compose.yml`)**: Frontend (Nginx), API Gateway (Node.js), In-Memory Cache (Redis 7) 3개 컨테이너 원클릭 연동 환경 구성.
- **`server/index.test.js` 단위 테스트 구축**: 테스트 환경 내 서포트 및 전체 **28개 단체 단위 테스트 100% 통과**.

### 🚀 3. GitHub Actions CI/CD & Kubernetes IaC 매니페스트 구축 (Sprint 6.3)
- **GitHub Actions 워크플로우 (`.github/workflows/ci-cd.yml`)**: Code Push 시 자동으로 Node.js 20 환경에서 28개 단체 테스트 실행, Vite 빌드 검증 및 Docker 이미지 무결성 빌드 검증 파이프라인 세팅.
- **Kubernetes (K8s) Production IaC (`infra/k8s/`)**:
  - `deployment.yaml`: Frontend 3개 Replicas & API Gateway 2개 Replicas 분산 배치 및 Liveness/Readiness Probes 세팅.
  - `service-ingress.yaml`: ClusterIP Service 연동 & Nginx Ingress Controller HTTPS SSL 라우팅 규칙 정의.
  - `configmap.yaml`: ConfigMap & Secret 템플릿 환경 변수 격리.

---

## 📌 [2026-10-04] Sprint 5.2: 지원자 간 자소서 상호 표절 탐지 엔진 구현 & v2.0 엔터프라이즈 최종 릴리스 🏆

### 🕵️ 1. N-Gram Jaccard 자소서 상호 표절 탐지 엔진 구현 (`src/utils/plagiarismEngine.js`)
- **N-Gram Jaccard 유사도 알고리즘**: 지원자 간 자소서 문장의 N-gram(tri-gram) 중복 비율을 계산하여 상호 표절율(0%~100%)을 정밀 산출.
- **지원자 간 상호 표절 히트맵 매트릭스 UI (`src/components/ApplicantComparison.jsx`)**: 비교 탭에서 전체 지원자 간의 표절율을 한눈에 파악하는 히트맵 매트릭스 테이블 제공 (40% 이상 유사 시 🔴 표절 의심 경고 뱃지 자동 부여).
- **`plagiarismEngine.test.js` 단위 테스트 4종 구축**: 동일 자소서(100%), 상이 자소서(<15%), 일부 복사-붙여넣기(>=40%), 대각선 대칭 매트릭스 테스트 100% 통과 (**전체 단위 테스트 27종 100% 완결**).
- **🏆 v2.0 Enterprise Release**: Milestone 1~5 (총 12개 스프린트) 전체 공정 100% 달성 및 프로덕션 릴리스 완료.

---

## 📌 [2026-09-23] LG CSO AX 멘토 발표 미팅 대비 비주얼 슬라이드 개편 & Multi-Agent 앙상블 아키텍처 구축

---

© 2026 HR AX Smart Evaluator Daily Work Log.
