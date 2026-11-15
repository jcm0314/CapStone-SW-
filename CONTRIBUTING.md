# 🛠️ Check-Mate 엔지니어링 및 기여 가이드 (CONTRIBUTING.md)

본 문서는 **Check-Mate (4대 멀티에이전트 교차 검증 기반 AI 채용 서류 팩트체크 및 면접 질문·평가 코파일럿)** 프로젝트의 코드 품질, 아키텍처 무결성, 테스트 및 배포 표준을 정의합니다.

---

## 1. 아키텍트 및 엔지니어링 책임 (Lead Architect)

- **장천명 (32203919)** — **1인 풀스택 AI 아키텍트 (기획 · AI 파이프라인 · 프론트엔드 · 백엔드 · 클라우드 인프라 단독 수행)**
  - **AI 오케스트레이션**: Anthropic Claude Haiku 5.5 (`claude-haiku-5-5`) 기반 4-Agent 적대적 교차 검증 DAG 설계
  - **핵심 알고리즘**: 7종 개인정보(PII) 이중 비식별화(`piiAnonymizer.js`), 3단계 퍼지 원문 오프셋 바인딩(`fuzzyMatcher.js` — Exact IndexOf → Word Anchor & Jaccard N-gram → Dynamic Sliding Window + Levenshtein DP), N-gram 자소서 표절 매트릭스(`plagiarismEngine.js`)
  - **풀스택 & DB**: React 18 + Vite + Tailwind CSS, Web Worker 비동기 스레드, Express 5 BFF 게이트웨이, Spring Boot 3 엔터프라이즈 백엔드, Supabase PostgreSQL 7-Table RLS 스키마
  - **CI/CD & 배포**: Docker 멀티스테이지 빌드 및 Google Cloud Run 서버리스 프로덕션 무중단 배포

---

## 2. 브랜치 전략 (GitHub-Flow)

`main` 브랜치는 항상 Google Cloud Run 프로덕션 배포가 가능한 안정적인 상태를 유지합니다.

### 브랜치 명명 규칙
- **신규 기능**: `feat/<이슈번호>-<기능명>` (예: `feat/17-top50-cutoff`)
- **버그 수정**: `fix/<이슈번호>-<버그명>` (예: `fix/18-modal-overflow`)
- **문서 및 발표자료**: `docs/<작업명>` (예: `docs/capstone-poster-slides`)
- **리팩토링**: `refactor/<대상명>` (예: `refactor/fuzzy-matcher-worker`)

---

## 3. 커밋 메시지 규칙

누가 보더라도 변경 의도를 즉시 파악할 수 있도록 직관적인 커밋 메시지를 작성합니다.

- `feat:` 새로운 기능 및 에이전트 파이프라인 추가
- `fix:` 버그 및 예외 처리 수정
- `refactor:` 코드 구조 개선 및 알고리즘 최적화
- `docs:` 포스터, 발표 자료, 결과보고서 및 아키텍처 문서 갱신
- `test:` Vitest 단위 테스트 및 Playwright E2E 검증 추가

---

## 4. 핵심 엔지니어링 원칙 (Definition of Done)

1. **가짜 점수 폴백(Fake Fallback) 전면 금지**
   - API 키 누락이나 추론 오류 발생 시 임의의 난수·가짜 점수로 화면을 채우는 코드는 엄격히 금지하며, `output_config.format` JSON Schema 검증과 정직한 에러 핸들링을 수행합니다.
2. **이중 방어선 7종 PII 비식별화 보장**
   - 자기소개서 원문이 외부 LLM으로 전송되기 전 클라이언트 브라우저(1차)와 BFF 보안 게이트웨이(2차)에서 7종 개인정보(성명·학교명·연락처·이메일·주민번호·주소·학번)가 반드시 마스킹되어야 합니다.
3. **테스트 무결성 필수**
   - 커밋 전 반드시 `npm test` (Vitest) 및 `npm run build`를 실행하여 테스트 통과와 프로덕션 번들 무결성을 검증합니다.

---

## 5. 개발 및 검증 명령어

```bash
# 의존성 설치
npm install

# 로컬 개발 서버 실행 (http://localhost:3000)
npm run dev

# 전체 단위 테스트 실행 (Vitest, Node 22.12 이상 권장)
npm test

# 프로덕션 빌드 번들 검증
npm run build
```
