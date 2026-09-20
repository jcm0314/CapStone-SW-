# 🛡️ 대기업 사내 AX 추진단 - 전사 HR AX 내재화 실무 보완 및 거버넌스 가이드 (Enterprise AX Compliance & Gap Analysis)

본 문서는 **대기업 사내 AX(AI Transformation) 추진단**이 당사 **인사본부(HR)**에 AI 평가 시스템을 성공적으로 실무 내재화하기 위해 **사내 보안성 심의, 법적 컴플라이언스, Legacy HRIS 연동, AI 편향성 검증 및 사내 변화 관리(Change Management)** 측면에서 보완한 공식 실무 가이드입니다.

---

## 📌 1. 대기업 실무 내재화 5대 핵심 보완 항목 (Key Gap Analysis)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        대기업 사내 AX 실무 내재화 5대 보완 영역                           │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬────────┴──────────┐
│ 🔒 1. PII/블라인드 │ 🔌 2. 사내 ATS    │ ⚖️ 3. AI 편향성   │ 🛡️ 4. 환각 방지   │ 🤝 5. 현업 변화    │
│    보안성 심의     │    Legacy 연동    │    및 ESG 검증    │    Threshold 검증 │    관리 (HitL)    │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴───────────────────┘
```

---

### 🔒 1. 사내 보안성 심의 & 블라인드 채용 가명화 강화 (PII & Compliance)
- **현상**: 단순 전화번호/이메일 정규식 마스킹 수준.
- **실무 보완**:
  - **블라인드 채용 규정 강제**: 출신 학교명(대학교/고교), 출생지/지역명, 가족관계, 성별/나이 연상 단어 자동 Masking 패턴 확장.
  - **데이터 파기 및 거버넌스 (Data Retention Policy)**: 채용 전형 종료 후 180일 도과 시 BigQuery 감사 로그 내 지원자 원문 텍스트 자동 스크러빙(Scrubbing) 및 암호화 파기 로직 추가.

---

### 🔌 2. 사내 Legacy HRIS / SAP / ATS 연동 규격 (System Integration)
- **현상**: 대화형 UI 상에서 개별 지원자 텍스트 수동 입력.
- **실무 보완**:
  - **사내 ATS (Applicant Tracking System) Batch Sync API**: 사내 채용 포털(SAP SuccessFactors, Workday, 사내 WebHR)과 REST Webhook 연동 (`/api/v1/enterprise/ats-sync`).
  - **사내 SSO 통합**: 사내 계정(Azure AD / Okta / SAML 2.0 / 사내 사번) 기반 IAM 권한 관리로 채용 권한이 있는 면접관/HR 담당자만 접근 허용.

---

### ⚖️ 3. AI 편향성(Bias) 검증 및 설명가능성 소명 (AI Fairness & XAI)
- **현상**: 점수 도출 및 100% 원문 Grounding 하이라이터.
- **실무 보완**:
  - **AI 평가 무편향성(Fairness Index) 모니터링**: 성별/연령/지원 경로에 따른 편향 점수 편차가 발생하지 않도록 BigQuery 쿼리 기반 실시간 편향 모니터링 대시보드 구축.
  - **이의제기 설명가능성(XAI) 소명 보고서**: 탈락 지원자의 이의제기 시, AI 점수가 아닌 원문 내 **"정량 성과 미달 근거 문장(🔴 리스크)"**을 객관적 소명 자료로 제출할 수 있는 PDF 리포트 연동.

---

### 🛡️ 4. Hallucination Threshold & RAG 검증 기준 (Accuracy Guarantee)
- **현상**: Gemini API의 JSON 텍스트 파싱.
- **실무 보완**:
  - **0% 환각 방지 프로토콜**: AI가 생성한 `quote` 문장과 지원자 자소서 원문 간의 **Exact Substring/Fuzzy Jaccard 유사도가 85% 미만인 경우** 해당 근거를 자동 무효화 처리하고 `🟡 면접 확인 필요(Verify)` 상태로 강제 전환.

---

### 🤝 5. 현업 변화 관리 & 최종 승인 서명 헌장 (Change Management & HitL)
- **현상**: AI 평가 결과 제공.
- **실무 보완**:
  - **Human-in-the-Loop 최종 책임 서명 UI**: AI는 100% 근거 보조 도구일 뿐, 합격/불합격 최종 결정은 현업 팀장/면접관이 **"AI 근거를 검토하였으며 최종 판단은 면접관 본인이 수행함"** 체크박스 클릭 및 전자서명 후 제출하도록 UI 강제.

---

## 🛠️ 2. 사내 내재화 보완 로드맵 (Actionable Plan)

| 보완 과제 | 적용 모듈 | 연동 스프린트 | 기대 효과 |
| :--- | :--- | :--- | :--- |
| **블라인드 PII 마스킹 확장** | `src/utils/piiAnonymizer.js` | Sprint 3.2 | 공정 채용 및 사내 보안성 심의 100% 통과 |
| **Fuzzy Matching 완충 매칭** | `src/utils/fuzzyMatcher.js` | Sprint 3.1 | 오타/줄바꿈으로 인한 환각 0% 달성 |
| **사내 ATS Batch Sync API** | `server/proxyServer.js` | Sprint 4.1 | 수천 건 자소서 1클릭 일괄 동기화 |
| **Human-in-the-Loop 전자서명** | `ReportExporter.jsx` | Sprint 1.3+ | AI 주도 채용 반발심 완전 해소 |

---

© 2026 In-house Enterprise AX Project Office.
