# 🏛️ Enterprise Engineering Standards & Guidelines (대기업 수준 개발 표준)

본 프로젝트는 **Google, Naver, Kakao, Coupang 등 국내외 탑티어 IT 기업/대기업의 엔지니어링 표준**에 준하여 개발 및 관리됩니다. 프로젝트 참여자는 아래 7가지 표준 규정을 준수합니다.

---

## 📌 7대 대기업 엔지니어링 규정 (7 Enterprise Rules)

```
        ┌─────────────────────────────────────────────────────────┐
        │          Enterprise Software Engineering Rules          │
        └─────────────────────────────────────────────────────────┘
          ① Git Branching (PR 기반 main 보호)
          ② Conventional Commits (1기능 1커밋 & 한글 작성)
          ③ Automated Testing & CI/CD (단위/UI 테스트)
          ④ Linting & Formatting (ESLint + Husky)
          ⑤ Security & PII Governance (보안 및 마스킹)
          ⑥ Living Docs & ADR (살아있는 README / 의사결정 문서)
          ⑦ Agile Task Board (이슈 & 진행상황 시각화)
```

---

### 1️⃣ Git 브랜치 전략 & PR (Pull Request) 중심 개발
- **`main` 브랜치 직접 푸시 금지**: `main` 브랜치는 상시 배포 가능한 프로덕션(Production) 상태를 유지합니다.
- **작업 브랜치 명명 규칙**: `feat/기능명`, `fix/버그명`, `refactor/모듈명`, `docs/문서명`

---

### 2️⃣ Conventional Commits & 1기능 1커밋 & 한글 커밋 규정
- 모든 커밋 메시지는 **"1기능 1커밋"**을 준수하며, **모든 커밋 메시지는 한글로 작성**합니다.
- Prefix 예시:
  - `feat: 사용자 면접 질문 생성기 기능 추가`
  - `fix: 레이더 차트 수치 계산 오류 수정`
  - `docs: 한글 커밋 메시지 규정 및 마일스톤 업데이트`
  - `refactor: aiEvaluator 파싱 로직 성능 개선`
  - `style: 대시보드 글래스모피즘 테마 스타일 조정`

---

### 3️⃣ 자동화 테스트 & CI/CD (Automated Testing)
- **단위 테스트 (Unit Test)**: `aiEvaluator.js` 분석 엔진 및 정량 점수 계산 로직의 커버리지 80% 이상 유지.
- **CI 파이프라인**: PR 생성 시 자동 빌드(`npm run build`) 필수 통과.

---

### 4️⃣ 코드 품질, Formatting 및 Commit-hook (Static Analysis)
- **ESLint & Prettier**: 코드 포맷팅 및 구문 오류 자동 교정.

---

### 5️⃣ 보안, PII (개인식별정보) 마스킹 & 환경 변수 관리
- **PII Anonymization**: 지원자 개인정보(성명, 전화번호, 이메일)는 AI API 전송 전 익명화 선처리.

---

### 6️⃣ 살아있는 문서화 (Living Documentation & CHANGELOG)
- 새 기능 개발 시 [README.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/README.md) 및 [CHANGELOG.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/CHANGELOG.md)에 한글로 즉시 업데이트.

---

### 7️⃣ 아자일 태스크 및 이슈 보드 관리 (Agile Board)
- 모든 고려사항 및 병목은 **GitHub Issues**로 등록하여 투명하게 상태를 관리합니다.

---

© 2026 HR AX Smart Evaluator Enterprise Guidelines.
