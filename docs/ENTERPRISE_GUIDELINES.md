# 🏛️ Enterprise Engineering Standards & Guidelines (대기업 수준 개발 표준)

본 프로젝트는 **Google, Naver, Kakao, Coupang 등 국내외 탑티어 IT 기업/대기업의 엔지니어링 표준**에 준하여 개발 및 관리됩니다. 프로젝트 참여자는 아래 7가지 표준 규정을 준수합니다.

---

## 📌 7대 대기업 엔지니어링 규정 (7 Enterprise Rules)

```
        ┌─────────────────────────────────────────────────────────┐
        │          Enterprise Software Engineering Rules          │
        └─────────────────────────────────────────────────────────┘
          ① Git Branching (PR 기반 main 보호)
          ② Conventional Commits (1기능 1커밋)
          ③ Automated Testing & CI/CD (단위/UI 테스트)
          ④ Linting & Formatting (ESLint + Husky)
          ⑤ Security & PII Governance (보안 및 마스킹)
          ⑥ Living Docs & ADR (살아있는 README / 의사결정 문서)
          ⑦ Agile Task Board (이슈 & 진행상황 시각화)
```

---

### 1️⃣ Git 브랜치 전략 & PR (Pull Request) 중심 개발
- **`main` 브랜치 직접 푸시 금지**: `main` 브랜치는 상시 배포 가능한 프로덕션(Production) 상태를 유지합니다.
- **작업 브랜치 명명 규칙**:
  - `feat/기능명` (예: `feat/evidence-highlighter`)
  - `fix/버그명` (예: `fix/score-gauge-overflow`)
  - `refactor/모듈명` (예: `refactor/ai-evaluator-engine`)
  - `docs/문서명` (예: `docs/enterprise-guidelines`)
- **PR 템플릿 준수**: 작업 내용, 테스트 결과, 변경 화면 스크린샷을 포함하여 PR 제출 후 리뷰를 거쳐 `main`에 병합(Merge)합니다.

---

### 2️⃣ Conventional Commits & 1기능 1커밋 규정
- 모든 커밋 메시지는 Angular / Conventional Commits 규격을 준수합니다.
- **1기능 1커밋**: 커밋 1개에는 오직 1개의 논리적 기능 변경만 포함합니다.

| Prefix | 용도 | 예시 |
| :--- | :--- | :--- |
| `feat` | 새로운 기능 추가 | `feat: add tailored interview question generator` |
| `fix` | 버그 수정 | `fix: resolve exact substring index offset` |
| `docs` | 문서 추가 및 수정 | `docs: add ENTERPRISE_GUIDELINES.md` |
| `style` | 코드 서식/포맷팅 | `style: apply tailwind glassmorphism styles` |
| `refactor` | 비즈니스 로직 구조 개선 | `refactor: optimize grounding tokenizer engine` |
| `test` | 테스트 코드 추가 | `test: add unit test for aiEvaluator.js` |
| `chore` | 패키지 설정 및 빌드 업무 | `chore: update vite and tailwind configs` |

---

### 3️⃣ 자동화 테스트 & CI/CD (Automated Testing)
- **단위 테스트 (Unit Test)**: `aiEvaluator.js` 분석 엔진 및 정량 점수 계산 로직의 커버리지(Coverage) 80% 이상 유지.
- **CI 파이프라인**: PR 생성 시 자동 빌드(`npm run build`) 및 린트 검사가 통과해야만 병합 허용.

---

### 4️⃣ 코드 품질, Formatting 및 Commit-hook (Static Analysis)
- **ESLint & Prettier**: 코드 포맷팅 및 잠재적 구문 오류 자동 교정.
- **Husky & lint-staged**: Git 커밋 시점에 자동으로 서식 및 린트 검사를 실행하여 오류가 있는 코드가 레포지토리에 저장되는 것을 사전에 방지.

---

### 5️⃣ 보안, PII (개인식별정보) 마스킹 & 환경 변수 관리
- **민감 정보 격리**: API Key, DB 비밀번호 등은 절대 Git 저장소에 커밋하지 않으며 `.env.example` 표준 안내.
- **PII Anonymization**: 지원자 개인정보(성명, 전화번호, 이메일)는 AI API 전송 전 프론트엔드 단에서 익명화 필터링 처리.

---

### 6️⃣ 살아있는 문서화 (Living Documentation & ADR)
- **README.md 실시간 반영**: 새 기능 개발 시 [README.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/README.md)의 기능 및 커밋 히스토리를 즉시 업데이트.
- **Architecture Decision Records (ADR)**: 기술적 아키텍처 도입 결정 이유를 `docs/adr/`에 기록.

---

### 7️⃣ 아자일 태스크 및 이슈 보드 관리 (Agile Board)
- 프로젝트의 모든 고민 사항, 성능 병목, 추가 요구사항은 **GitHub Issues**로 등록하고 `Backlog` ➔ `In Progress` ➔ `In Review` ➔ `Done` 상태로 이관하여 진행 상태를 투명하게 추적합니다.

---

© 2026 HR AX Smart Evaluator Enterprise Guidelines.
