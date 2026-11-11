# 05. 당근/우아한형제들 샘플 지원자 데이터 스키마 정규화

- 우선순위: P1
- 상태: 완료

## 배경
- `src/contexts/TenantContext.jsx`의 `daangn`, `woowa` 테넌트 기본 지원자가 `docs/ARCHITECTURE.md` §3 `ApplicantAnalysis` 스키마와 다릅니다.
  - `applyJobId: 'dev'`: `JOB_TEMPLATES`에 없는 ID
  - `competencyScores` 키: `logic_structure`, `growth_potential`, `communication`. `teamwork`/`growth`/`ethics`가 없어서 대시보드에서 기본값 70으로 표시됩니다.
  - `groundingEvidences`: `type` 대신 `category`, `explanation` 대신 `rationale`을 쓰고 `id`, `title`, `scoreImpact`가 없습니다.
  - `interviewQuestions`: `id`, `basedQuote`, `checklist`가 없습니다.
- 그 결과 `src/components/ReportExporter.jsx` 46행의 `e.type.toUpperCase()`에서 **TypeError가 발생**합니다. 당근·배민 테넌트에서 보고서 복사/출력이 깨집니다.
- `EvidenceViewer`의 `<mark key={mark_${ev.id}}>`도 키가 중복됩니다.

## 목표
- 모든 테넌트 기본 지원자를 표준 스키마로 맞추고, 스키마 회귀 테스트를 추가합니다.

## 작업 내용
- [x] daangn/woowa 기본 지원자 데이터를 표준 스키마로 수정 (`applyJobId: 'tech_backend'`, 5대 역량 키, evidence/question 필드)
- [x] `ReportExporter`에 `type` 누락 방어 코드 추가
- [x] `src/data/tenantSchema.test.js` 추가: 모든 테넌트 기본 지원자가 표준 스키마를 만족하는지, quote가 본문에 실제로 있는지 검증

## 완료 기준
- 신규 스키마 테스트가 추가되고, 정적 검사에서 모든 테넌트 기본 지원자의 필드가 충족될 것

## 진행 기록
- 2026-11-10 변경 파일
  - `src/contexts/TenantContext.jsx`
    - daangn_app_01, woowa_app_01: `applyJobId` 'dev' → 'tech_backend', `applyJobTitle` 추가
    - `competencyScores` 키를 problem_solving/tech_skill/teamwork/growth/ethics로 교체했습니다. 비표준 `competencies` 배열은 제거했습니다.
    - groundingEvidences: `category`/`rationale` → `type`/`explanation`. `id`, `title`, `competencyId`, `scoreImpact`를 추가했습니다. 본문 문장에서 근거를 1건씩 보강했습니다(당근 CDC, 배민 Geo-Hashing).
    - interviewQuestions: `id`, `basedQuote`, `checklist` 추가
  - `src/components/ReportExporter.jsx`: `ev.type`/`title`/`id`가 누락되어도 TypeError가 나지 않도록 방어 코드를 넣었습니다(텍스트 보고서와 화면 렌더 2곳).
  - `src/data/tenantSchema.test.js` (신규): 3개 테넌트 × 표준 스키마 회귀 테스트. quote가 본문에 실제로 있는지, evidence id가 중복되지 않는지 확인합니다.
- 검증 (Python 정적 근사 검사, 신규 테스트와 같은 조건)
  ```
  src/data/sampleApplicants.js:app_101 ... -> OK
  src/data/sampleApplicants.js:app_102 ... -> OK
  src/data/sampleApplicants.js:app_103 ... -> OK
  src/data/sampleApplicants.js:app_104 ... -> OK
  src/contexts/TenantContext.jsx:daangn_app_01 job=tech_backend quotes=4 evIds=4 types=4 q=2 chk=2 iqIds=2 comp=True decision=STRONG_PASS missingQuotes=[] -> OK
  src/contexts/TenantContext.jsx:woowa_app_01 job=tech_backend quotes=3 evIds=3 types=3 q=1 chk=1 iqIds=1 comp=True decision=STRONG_PASS missingQuotes=[] -> OK
  problems 0
  ```
  - 정적 import 검사: `errors=0 warnings=4` (경고는 06번 대상)
  - 기존 `TenantAndAuth.test.jsx`의 기대값(`name`에 '정지훈' 포함, orgId)은 그대로 유지됩니다.
- 참고: 이미 localStorage에 옛 스키마 데이터를 저장한 브라우저는 저장값이 우선합니다. 브라우저 저장소를 초기화하면 새 데이터가 보입니다.
