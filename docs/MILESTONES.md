# 🎯 HR AX Smart Evaluator Granular Milestones & Roadmap (디테일 마일스톤 일품 일정표)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 마일스톤을 **스프린트(Sprint) 및 개별 개발 태스크(Task) 단위로 세분화**하여 구체적인 작업 범위, 일정, 담당 모듈 및 검증 기준을 정의하는 세부 일정표입니다.

---

## 📌 깃허브 네이티브 마일스톤 현황 (GitHub Milestones Link)

- 🔗 **GitHub Milestones 페이지 바로가기**: [https://github.com/jcm0314/CapStone-SW-/milestones](https://github.com/jcm0314/CapStone-SW-/milestones)
- 📌 **GitHub Issues 페이지 바로가기**: [https://github.com/jcm0314/CapStone-SW-/issues](https://github.com/jcm0314/CapStone-SW-/issues)

---

## 📅 세분화 마일스톤 & 스프린트 상세 일정표

```
 [Milestone 1] (완료✓) ──► [Milestone 2] (완료✓) ──► [Milestone 3] (완료✓) ──► [Milestone 4] (완료✓) ──► [Milestone 5] (완료✓) ──► [Milestone 6] (완료✓)
  Core MVP (v1.0.0)       Web Worker & Test       Fuzzy & PII         Batch & Cache      Enterprise Studio & Plagiarism  Enterprise DevOps Pipeline
                          (100% Closed)           (100% Closed)       (100% Closed)      (v2.0 Final Release)          (v2.1 Infrastructure Complete 🏆)
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

### 📍 [Milestone 2] `v1.1.0 - Web Worker 성능 최적화 & 테스트 구축` [완료 ✓]
- **기간**: 2026-09-17 ~ 2026-09-25
- **상태**: Closed / Completed (100%)
- **목표**: 프론트엔드 비동기 성능 최적화 및 테스트 커버리지 구축

---

### 📍 [Milestone 3] `v1.2.0 - Fuzzy Matching 엔진 & PII 마스킹` [완료 ✓]
- **기간**: 2026-09-26 ~ 2026-10-05
- **상태**: Closed / Completed (100%)
- **목표**: 하이라이팅 매칭 정확도 99% 달성 및 PII 보안 익명화 처리

---

### 📍 [Milestone 4] `v1.3.0 - PDF/TXT 일괄 업로드 & IndexedDB 캐싱` [완료 ✓]
- **기간**: 2026-10-06 ~ 2026-10-20
- **상태**: Closed / Completed (100%)
- **목표**: 대량 서류 파이프라인 처리 및 로컬 캐싱

---

### 📍 [Milestone 5] `v2.0.0 - Custom Prompt Studio & 표절 매트릭스` [완료 ✓]
- **기간**: 2026-10-21 ~ 2026-11-10
- **상태**: Closed / Completed (100%)
- **목표**: 엔터프라이즈 맞춤형 프롬프트 에디터 및 자소서 상호 표절 탐지

---

### 📍 [Milestone 6] `v2.1.0 - Enterprise Infrastructure & DevOps Engine` [완료 ✓]
- **기간**: 2026-11-11 ~ 2026-11-20
- **상태**: Closed / Completed (100% - v2.1 Enterprise Infrastructure Release)
- **목표**: 대기업/현업 스펙의 Docker, Nginx, Express Gateway, GitHub Actions CI/CD 및 Kubernetes IaC 인프라 세팅

#### 🔹 Sprint 6.1: Docker & Nginx 프로덕션 웹서버 세팅 (완료 ✓)
- [x] **Task 6.1.1**: 멀티 스테이지 `Dockerfile` 및 `.dockerignore` 세팅.
- [x] **Task 6.1.2**: Security Headers, Gzip, SPA Routing 포함 `nginx.conf` 세팅.

#### 🔹 Sprint 6.2: Express API Proxy Gateway & Docker Compose (완료 ✓)
- [x] **Task 6.2.1**: `server/index.js` 보안 역방향 프록시 및 API Rate Limiter 구축.
- [x] **Task 6.2.2**: `docker-compose.yml` 프론트엔드 + 게이트웨이 + Redis 캐시 오케스트레이션 세팅.
- [x] **Task 6.2.3**: `server/index.test.js` 단위 테스트 작성 및 28개 단체 테스트 100% 통과.

#### 🔹 Sprint 6.3: GitHub Actions CI/CD & Kubernetes IaC (완료 ✓)
- [x] **Task 6.3.1**: `.github/workflows/ci-cd.yml` 자동 테스트 및 Docker 이미지 빌드 검증 파이프라인 구축.
- [x] **Task 6.3.2**: `infra/k8s/` Deployment, Service, Ingress, ConfigMap, Secret 매니페스트 작성.

---

© 2026 HR AX Smart Evaluator Granular Roadmap.
