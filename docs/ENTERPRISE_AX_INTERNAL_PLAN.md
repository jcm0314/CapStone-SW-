# 🏛️ 대기업 사내 AX 추진단 - 전사 HR AX 내재화 구축 과제 수행계획서 (In-house Enterprise AX Project Plan)

본 문서는 **대기업 사내 AX(AI Transformation) 추진단**이 당사 **인사본부(HR)** 채용 프로세스의 디지털/AI 전환을 위해 자체 개발 및 내재화하는 **사내 핵심 AX 과제 수행계획서**입니다.

---

## 📌 1. 과제 개요 (Internal Project Overview)

- **과제명**: 사내 차세대 HR AX 프레임워크 내재화 구축 과제  
  *(GCP Vertex AI Enterprise 기반 자기소개서 Grounding 검증 및 사내 의사결정 파이프라인)*
- **주관 부서 (Project Team)**: 전사 AX 추진단 / AI 혁신 센터 (TF 리더: 유저)
- **수요 부서 (Internal Client)**: 당사 인사본부 (HR 채용팀 / 리더십 팀)
- **개발/아키텍처 담당**: 사내 AX 추진단 Lead AI Software Architect (Antigravity)
- **과제 목적**:
  1. 당사 신입/경력 수천 건 서류 검토 시 현업 HR 채용 담당자의 서류 파악 시간 90% 감축
  2. 면접관(팀장/임원)에게 지원서 약점 기반의 맞춤형 심층 면접 질문 및 검증 체크리스트 즉시 연동
  3. 인사본부장(CHO) 및 C-Level 서류/면접 승인용 1클릭 Executive Summary 및 BigQuery 감사 트레일 확보
  4. 사내 보안 가버넌스 (PII 마스킹, 사내 VPC Proxy Gateway, Zero Data Retention) 100% 충족

---

## 📊 2. 사내 개발 WBS (Work Breakdown Structure) & 내재화 현황

| WBS 코드 | 세부 개발 단계 | 주요 산출물 | 내재화 공정률 | 상태 |
| :--- | :--- | :--- | :---: | :---: |
| **1.0** | **사내 아키텍처 설계** | GCP Vertex AI 사내 게이트웨이 규격서 (`ENTERPRISE_VERTEX_ARCHITECTURE.md`) | **100%** | **[완료 ✓]** |
| **1.1** | **Core Grounding Engine** | 5대 역량 슬라이더 & Exact Matching 근거 하이라이터 UI (`EvidenceViewer.jsx`) | **100%** | **[완료 ✓]** |
| **1.2** | **사내 API Gateway** | Express REST Proxy Server & BigQuery Audit Trail (`server/proxyServer.js`) | **100%** | **[완료 ✓]** |
| **1.3** | **C-Level 보고용 Deck** | 사내 발표용 HTML 웹페이지 & 고화질 PDF (`presentation.html`, `presentation.pdf`) | **100%** | **[완료 ✓]** |
| **2.0** | **성능 최적화 (Milestone 2)**| **Sprint 2.1: Web Worker 백그라운드 파싱** (`evaluatorWorker.js`, `workerService.js`) | **100%** | **[완료 ✓]** |
| **2.2** | | **Sprint 2.2: 대량 서류 Virtual Scrolling 최적화** (`react-window` 적용 예정) | **0%** | [차기 착수] |
| **2.3** | | **Sprint 2.3: 사내 Vitest 단위 테스트 & Husky CI/CD 커밋 훅** | **0%** | [대기] |
| **3.0** | **보안 & Fuzzy Engine** | **Sprint 3.1: Fuzzy Matching 완충 하이라이터** / **Sprint 3.2: PII Anonymizer 필터** | **0%** | [대기] |
| **4.0** | **Batch & Caching** | **Sprint 4.1: PDF/DOCX 사내 파일 파서** / **Sprint 4.2: API Rate Limit Queue** | **0%** | [대기] |
| **5.0** | **Enterprise Studio** | **Sprint 5.1: 사내 인재상 Custom Rubric Editor & 상호 표절 탐지** | **0%** | [대기] |

---

## 🏛️ 3. 사내 AX 프로젝트 4대 핵심 운영 수칙 (In-house Governance)

1. **사내 보안성 심의 및 데이터 거버넌스 완수**
   - 사내 직원 및 지원자 PII(성명, 이메일, 전화번호) 자동 마스킹 선처리 및 사내 VPC 프록시 통신을 강제합니다.
2. **사내 HR 요구사항 100% 내재화 (Human-in-the-Loop)**
   - 단순 AI 자동화가 아닌, 현업 HR 채용 담당자 ➔ 면접관 ➔ 인사본부장의 종적 의사결정 흐름을 전사 파이프라인으로 연결합니다.
3. **Strict 1기능 1커밋 & 한글 커밋 표본 관리**
   - 사내 Git 저장소 품질 준수를 위해 `1기능 = 1커밋` 및 태그(`feat`, `fix`, `docs`, `refactor`, `test`) 한글 표준을 엄수합니다.
4. **C-Level 및 인사본부 보고 일원화**
   - 각 스프린트 완성 시 사내 보고용 **Walkthrough 보고서** 및 최신 **Presentation Deck**을 상시 동기화합니다.

---

© 2026 In-house Enterprise AX Project Office.
