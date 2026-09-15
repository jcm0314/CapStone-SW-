# 📌 GitHub Issues: 시스템 기술 병목 및 건축적 고려사항 (Technical Bottlenecks & Roadmap)

본 문서는 **HR AX Smart Evaluator** 개발 및 운용 과정에서 **고민해야 할 성능 병목(Bottlenecks), 보안 및 알고리즘 한계점, 향후 개선 과제**를 GitHub Issue 형식으로 관리하는 문서입니다.

---

## 📋 이슈 목차 (Issues Index)

| Issue ID | 종류 | 제목 (Title) | 심각도 | 상태 |
| :--- | :--- | :--- | :--- | :--- |
| **#1** | `Performance` | 대용량 텍스트 & 대량 지원서 Batch 분석 시 메인 UI 쓰레드 렌더링 병목 | 🔴 High | Proposed |
| **#2** | `AI Grounding` | Exact Substring Matching의 줄바꿈/오타 미스매치 한계 및 퍼지 매칭 필요성 | 🔴 High | Proposed |
| **#3** | `Security/PII` | 채용 서류 내 개인식별정보(PII) AI API 전송 전 마스킹 처리 | 🟡 Medium | Proposed |
| **#4** | `Scalability` | Gemini API Rate Limit (HTTP 429) 대처 및 Queue/Caching 레이어 구축 | 🟡 Medium | Proposed |

---

### 🔴 [Issue #1] 대용량 텍스트 & 대량 지원서 Batch 분석 시 메인 UI 쓰레드 렌더링 병목
- **라벨**: `performance`, `bottleneck`, `frontend`
- **문제점 & 병목 요인**:
  - 공고당 500건 이상의 지원서를 동시 분석하거나 5,000자 이상의 대용량 서류를 처리할 때, 정규식 기반 문장 분할(Sentence Tokenization) 및 서브스트링 인덱스 탐색 작업이 프론트엔드의 **메인 UI 쓰레드(Main Thread)**에서 실행되어 브라우저 화면이 0.5초~1초간 멈추는(UI Freeze) 병목이 발생합니다.
- **해결 방안 & 향후 로드맵**:
  1. `Web Worker` 처리: 문장 파싱 및 Exact Matching 계산 로직을 백그라운드 Web Worker 쓰레드로 이관.
  2. `Virtual Scrolling` 도입: 지원서 본문 및 오른편 근거 카드가 100개 이상일 때 `react-window`를 통해 화면에 보이는 영역만 리액트 DOM에 렌더링.

---

### 🔴 [Issue #2] Exact Substring Matching의 줄바꿈/오타 미스매치 한계 및 퍼지 매칭 필요성
- **라벨**: `ai-grounding`, `algorithm`, `bug-risk`
- **문제점 & 병목 요인**:
  - 지원서 원문에 줄바꿈(`\n`), 연속 공백, 또는 특수문자가 포함되어 있을 때, Gemini API가 반환한 `quote` 문자열과 원문의 서브스트링 인덱스가 완벽히 일치하지 않아 하이라이트 태그가 원문에서 누락되는 현상이 발생할 수 있습니다.
- **해결 방안 & 향후 로드맵**:
  1. `Fuzzy Matching` 도입: Levenshtein Distance(편집 거리) 또는 Jaccard Similarity 알고리즘을 결합하여 95% 이상 유사한 문장도 정확히 하이라이트.
  2. `Whitespace Normalization Index Map`: 원문 텍스트의 줄바꿈과 공백을 정규화한 인덱스 맵(Index Mapping)을 별도로 관리하여 위치 추적 정확도 100% 달성.

---

### 🟡 [Issue #3] 채용 서류 내 개인식별정보(PII) AI API 전송 전 마스킹 처리
- **라벨**: `security`, `compliance`, `privacy`
- **문제점 & 병목 요인**:
  - 외부 LLM(Google Gemini API)으로 자기소개서 원문을 전송할 때, 지원자의 **이름, 전화번호, 이메일, 출신 학교, 주민등록번호** 등 개인식별정보(PII)가 포함될 경우 개인정보보호법 및 공정채용(블라인드 채용) 가이드라인 위반 위험이 존재합니다.
- **해결 방안 & 향후 로드맵**:
  1. `Client-side PII Anonymizer`: Gemini API 호출 직전, 프론트엔드 단에서 정규식으로 전화번호(`010-****-****`), 이메일(`***@***.com`), 지원자 성명을 `[익명_지원자]` 형태로 자동 마스킹하는 필터 레이어 추가.

---

### 🟡 [Issue #4] Gemini API Rate Limit (HTTP 429) 대처 및 Queue/Caching 레이어 구축
- **라벨**: `scalability`, `api-limit`, `resilience`
- **문제점 & 병목 요인**:
  - 무료/유료 Gemini API 이용 시 짧은 시간 동안 수십 건의 분석 요청이 연달아 발생하면 API 분당 요청 수 제한(RPM/TPM) 초과로 인한 `HTTP 429 Too Many Requests` 에러가 발생하여 분석이 중단될 수 있습니다.
- **해결 방안 & 향후 로드맵**:
  1. `Async Request Throttling Queue`: 동시에 실행되는 API 요청 수를 최대 3건으로 제한하고, 지연 재시도(Exponential Backoff) 큐 작성.
  2. `LocalStorage/IndexedDB Cache`: 동일한 자소서 원문과 역량 가중치 조합에 대한 분석 결과를 브라우저에 캐싱하여 중복 API 호출 방지.

---

© 2026 HR AX Smart Evaluator Issues Registry.
