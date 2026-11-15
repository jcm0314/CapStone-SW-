# 📋 [Check-Mate] 핵심 기능 개발 및 모듈 명세서 (COLLABORATION_SPEC.md)

프로젝트의 전체 아키텍처와 주요 컴포넌트, 핵심 알고리즘 모듈의 구조를 한눈에 파악할 수 있도록 정리한 기술 명세서입니다.

---

## 1. 프로젝트 핵심 요약 & 구현 완료 현황

- **서비스 정의**: **4대 멀티에이전트 교차 검증 기반 AI 채용 서류 팩트체크 및 면접 질문·평가 코파일럿**
- **핵심 구현 완료 내역**:
  1. **이중 방어선 7종 PII 비식별화 (`Front/utils/piiAnonymizer.js`)**: 브라우저 로컬 파싱 직후 및 BFF 서버 게이트웨이에서 성명·출신학교·전화번호·이메일·주민번호·주소·학번을 정규식으로 즉시 익명화
  2. **4대 멀티에이전트 적대적 교차 검증 DAG (`Front/services/multiAgentEvaluator.js`)**:
     - `Stage 1 (순차)`: **1. Grounding Agent** — 원문 내 정량 성과·경험 문장 1:1 발췌 (`targetQuote`)
     - `Stage 2 (순차)`: **2. Critic Agent** — 기여도 부풀리기·수치 비약·논리 모순 적대적 반박 감사 (`riskFlags`)
     - `Stage 3 & 4 (Promise.all 병렬)`: **3. Supervisor Agent** (5대 역량 가중치 채점) + **4. Interviewer Agent** (맞춤형 압박 면접 질문 3종 도출)
  3. **3단계 퍼지(Fuzzy) 원문 오프셋 바인딩 (`Front/utils/fuzzyMatcher.js`)**:
     - `Stage 1`: Exact `indexOf` 완전 일치 탐색 (`O(N)`)
     - `Stage 2`: **Word Anchor (`firstWord` ~ `lastWord`) & Jaccard N-gram** 토큰 교집합 후보 구간 압축
     - `Stage 3`: **Dynamic Sliding Window ($\pm 20\%$) + Levenshtein DP** (`Sim ≥ 0.85`) 정밀 좌표 복원 및 Web Worker 비동기 처리
  4. **멀티테넌트 RBAC & Supabase PostgreSQL 7-Table RLS (`Infra/supabase_schema.sql`)**:
     - 기업별(토스페이먼츠·당근·우아한형제들) 데이터 분리 및 4단계 역할(`Admin`, `Recruiter`, `Interviewer`, `Candidate B2C`) 원클릭 전환
  5. **사람 검토(HITL) 점수 보정, 면접관 1-Click 보안 공유 링크 & 다차원 비교 대시보드**

---

## 2. 주요 프론트엔드 워크스페이스 모듈 (`Front/components/`)

### 🎯 1) 기업별 데이터 격리(Multi-Tenancy) & RBAC 스위처
- **대상 파일**: `Front/contexts/TenantContext.jsx`, `Front/contexts/AuthContext.jsx`
- **핵심 동작**:
  - 테넌트 전환 시 해당 기업의 지원서 DB와 크레딧 잔액(`total_credits`, `used_credits`)만 즉시 로드
  - 역할 전환(`Admin` / `Recruiter` / `Interviewer` / `Candidate B2C`)에 따른 세분화된 권한 제어

### 🎯 2) 원문 3색 형광펜 팩트체크 뷰어 & 압박 면접 질문 키트
- **대상 파일**: `Front/components/EvidenceViewer.jsx`, `Front/components/InterviewQuestionKit.jsx`
- **핵심 동작**:
  - 비식별화된 자기소개서 본문 위에 AI가 발췌한 긍정 근거(녹색), 확인 필요(황색), 과장 리스크(적색) 문장을 1:1 형광펜으로 하이라이팅
  - Critic 에이전트가 지적한 의심 구간을 검증할 맞춤형 압박 면접 질문 3종 제시 및 질문별 판정(`검증 통과 +3`, `보완 필요 0`, `과장 확인 -5`) 메모 기록

### 🎯 3) 사람 검토(HITL) 점수 보정 & 다차원 역량 비교 대시보드
- **대상 파일**: `Front/components/HITLEditorModal.jsx`, `Front/components/ApplicantComparison.jsx`
- **핵심 동작**:
  - 채용 담당자가 AI 초안 점수와 판정 사유를 직접 검토·보정하고 불변 감사 로그에 기록
  - 직무 역량 가중치 슬라이더 조절 시 AI 재호출 없이 즉시 순위 재계산 및 N-gram 자소서 표절 매트릭스 경고 표시

---

## 3. 로컬 검증 및 빌드 가이드

```bash
# 1. 의존성 설치 및 개발 서버 구동
npm install
npm run dev     # http://localhost:3000

# 2. 단위 테스트 실행 (Vitest)
npm test

# 3. 프로덕션 빌드 검증
npm run build
```
