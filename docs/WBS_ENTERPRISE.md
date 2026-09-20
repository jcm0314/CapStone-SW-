# 🏛️ 대기업 차세대 HR AX 프레임워크 구축 사업 - WBS & 외주 수행 관리서 (Enterprise WBS & Governance)

본 문서는 **대기업 HR AX 추진단(발주사)**과 **IT 시스템 수행사(Vendor)** 간의 프로젝트 계약 및 검수를 위한 **공식 WBS (Work Breakdown Structure) 및 외주 사업 관리 규정**입니다.

---

## 📌 1. 사업 개요 (Project Overview)

- **사업명**: 대기업 차세대 HR AX 프레임워크 구축 사업  
  *(GCP Vertex AI 기반 자기소개서 Grounding 검증 및 종적 의사결정 파이프라인)*
- **발주기관 (Client)**: 대기업 HR AX 추진단 / C-Level 의사결정 기구 (유저)
- **수행기관 (Vendor Lead)**: Antigravity Enterprise Solution Architecture Team
- **사업 기간**: 총 12주 (Sprint 단위 단계별 검수 및 릴리즈)
- **핵심 목표**:
  1. 현업 채용 담당자 서류 검토 시간 90% 절감 (문장 단위 100% Grounding 캡처)
  2. 실무 면접관용 서류 약점 기반 맞춤형 심층 면접 질문 및 검증 체크리스트 자동화
  3. C-Level 제출용 1클릭 Executive Summary 서류 평가서 & BigQuery 감사 트레일 구축
  4. 대기업 보안 규정(PII 익명화, Zero Data Retention, VPC Proxy Gateway) 100% 충족

---

## 📊 2. 세부 WBS (Work Breakdown Structure) & 공정률 현황

| WBS 코드 | 공정 단계 (Stage) | 세부 과제 (Tasks) | 산출물 (Deliverables) | 계획 | 실적 | 상태 |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **1.0** | **기획 & 아키텍처** | 대기업 엔터프라이즈 아키텍처 설계 & 게이트웨이 수립 | `ENTERPRISE_VERTEX_ARCHITECTURE.md` | 100% | 100% | **[완료 ✓]** |
| **1.1** | **Core Grounding Engine** | 5대 역량 슬라이더 & Exact Matching 근거 캡처 UI | `EvidenceViewer.jsx`, `aiEvaluator.js` | 100% | 100% | **[완료 ✓]** |
| **1.2** | **Enterprise Gateway** | Express REST Proxy Server & BigQuery Audit Trail | `server/proxyServer.js` | 100% | 100% | **[완료 ✓]** |
| **1.3** | **발표 & C-Level Deck** | 6대 목차 키워드 발표 웹페이지 & 고화질 PDF 생성 | `presentation.html`, `presentation.pdf` | 100% | 100% | **[완료 ✓]** |
| **2.0** | **성능 최적화 (Milestone 2)**| **Sprint 2.1: Web Worker 백그라운드 파싱 모듈화** | `evaluatorWorker.js`, `workerService.js` | 100% | 100% | **[완료 ✓]** |
| **2.1** | | **Sprint 2.2: 대량 근거 Virtual Scrolling 최적화** | `react-window` 적용 예정 | 0% | 0% | [진행예정] |
| **2.2** | | **Sprint 2.3: Vitest 단위 테스트 & Husky 커밋 훅** | Test Suites, Husky setup | 0% | 0% | [진행예정] |
| **3.0** | **보안 & Fuzzy Engine** | Sprint 3.1: Fuzzy Matching (오타/줄바꿈 완충 엔진) | `fuzzyMatcher.js` | 0% | 0% | [진행예정] |
| **3.1** | | Sprint 3.2: Client-side PII Filter 고도화 | `piiAnonymizer.js` | 0% | 0% | [진행예정] |
| **4.0** | **Batch & Caching** | Sprint 4.1: PDF/DOCX 파서 & 일괄 업로드 | `fileParser.js`, `FileUploadZone.jsx` | 0% | 0% | [진행예정] |
| **4.2** | | Sprint 4.2: Rate Limit Queue & IndexedDB | Caching Queue & Export | 0% | 0% | [진행예정] |
| **5.0** | **Enterprise Studio** | Sprint 5.1: Custom Prompt Studio & 표절 탐지 | Custom Rubric Editor & Matrix | 0% | 0% | [진행예정] |

---

## 🏛️ 3. 대기업 외주 프로젝트 수행 5대 표준 규정 (Vendor Execution Rules)

1. **엄격한 형상 관리 (1기능 1커밋 & 한글 규격)**
   - 모든 기능 단위는 `1기능 = 1커밋`으로 원자화하며, 명확한 한글 커밋 메시지와 태그(`feat`, `fix`, `docs`, `refactor`, `test`)를 명시합니다.
2. **품질 검수 및 0-Defect 빌드 강제**
   - 소스코드 제출 전 반드시 `npm run build`를 수행하여 웹 패키징 및 웹 워커 청크 오류가 0건임을 확인합니다.
3. **보안 및 감사 로그 (Audit Governance)**
   - PII(성명, 이메일, 전화번호) 익명화 선처리 및 BigQuery 감사 로그 연동을 기본 탑재합니다.
4. **산출물 동기화 (Documentation Integrity)**
   - 코드 변경 시 `README.md`, `CHANGELOG.md`, `MILESTONES.md`, `WBS_ENTERPRISE.md`, `walkthrough.md`를 즉각 동기화합니다.
5. **발주사 승인 기반 Stage-Gate 검수**
   - 각 스프린트 완료 시 **"검수 보고서(Walkthrough Report)"**를 제출하고 발주사(유저)의 공식 승인을 득한 후 다음 단계로 진입합니다.

---

© 2026 Enterprise HR AX Project Outsourcing PMO Governance.
