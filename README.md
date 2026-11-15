# Check-Mate (체크메이트)
### 4대 멀티에이전트 교차 검증 기반 AI 채용 서류 팩트체크 및 면접 질문·평가 코파일럿

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React 18](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Claude Haiku 5.5](https://img.shields.io/badge/Anthropic-Claude_Haiku_5.5_4--Agent-D97757?logo=anthropic)](https://www.anthropic.com/)
[![Supabase PostgreSQL](https://img.shields.io/badge/Supabase-7--Table_PostgreSQL_RLS-3ECF8E?logo=supabase)](https://supabase.com/)
[![GCP Cloud Run](https://img.shields.io/badge/GCP_Cloud_Run-Production_Live-4285F4?logo=google-cloud)](https://hr-evaluator-frontend-pt3ki5ggua-du.a.run.app/)

> **단국대학교 2026학년도 CAPSTONE : DESIGN 경진대회 출품작**
> - **팀명**: Check-Mate (체크메이트)
> - **팀원 (1인 풀스택 AI 아키텍트)**: **장천명 (32203919)** — 기획 · AI 파이프라인 · 프론트엔드 · 백엔드 · DB · 클라우드 배포 단독 수행
> - **프로덕션 라이브 서비스**: **[https://hr-evaluator-frontend-pt3ki5ggua-du.a.run.app/](https://hr-evaluator-frontend-pt3ki5ggua-du.a.run.app/)**

---

## 📌 심사위원 및 교수님을 위한 핵심 산출물 바로가기 (Quick Access)

심사위원 및 교수님께서 본 저장소에서 **발표 자료, 시연 영상, 캡스톤 포스터, 최종 결과보고서, 라이브 서비스**를 즉시 확인하실 수 있도록 구성한 안내 표입니다.

| 구분 | 산출물 바로가기 링크 | 상세 설명 및 규격 |
| :--- | :--- | :--- |
| **1. 시연 영상 (YouTube)** | **[▶ YouTube 시연 영상 바로보기](https://www.youtube.com/watch?v=Hh7NHh3hfzE)** | **내레이션 음성 및 자막 포함 전체 작동 시연 영상** ([`Check-Mate_IR_시연영상.mp4`](Check-Mate_IR_시연영상.mp4) 저장소 내 수록) |
| **2. 발표 자료 (PDF / HTML)** | **[`presentation_slides.pdf`](presentation_slides.pdf)** · **[`presentation_slides.html`](presentation_slides.html)** | **16:9 와이드 총 14장 경진대회 발표 슬라이드** ([발표 대본 & Q&A 스크립트](docs/PRESENTATION_SCRIPT.md)) |
| **3. 캡스톤 포스터 (PDF / PNG)** | **[`poster_90x140.pdf`](poster_90x140.pdf)** · **[`poster_90x140.png`](poster_90x140.png)** | **90 × 140cm 규격 인쇄용 벡터 PDF 및 고해상도 이미지** (하단 본문에서 즉시 열람 가능) |
| **4. 최종 결과보고서 (PDF)** | **[`FINAL_GRADUATION_REPORT.pdf`](FINAL_GRADUATION_REPORT.pdf)** | **A4 총 7페이지 최종 결과보고서** (아키텍처 설계, 현업 인터뷰 및 KT AIVLE 우수상 증빙 수록) |
| **5. 프로덕션 웹 서비스** | **[GCP Cloud Run 라이브 워크스페이스 접속](https://hr-evaluator-frontend-pt3ki5ggua-du.a.run.app/)** | 서울 리전(`asia-northeast3`) 상시 배포 환경 |

---

## 🎬 1. 프로젝트 시연 영상 (Demo Video)

아래 이미지를 클릭하시면 **YouTube 전체 시연 영상([https://www.youtube.com/watch?v=Hh7NHh3hfzE](https://www.youtube.com/watch?v=Hh7NHh3hfzE))**으로 즉시 이동합니다. 저장소 내 원본 영상 파일은 [`Check-Mate_IR_시연영상.mp4`](Check-Mate_IR_시연영상.mp4)에서 바로 확인하실 수 있습니다.

<p align="center">
  <a href="https://www.youtube.com/watch?v=Hh7NHh3hfzE">
    <img src="./docs/assets/slides/slide_11.png" alt="Check-Mate 시연 영상 바로보기" width="100%" />
  </a>
</p>

| 시연 구간 | 핵심 시연 액션 | 검증 포인트 |
| :---: | :--- | :--- |
| **SCENE 01** | **문제 제기 & 기업별 RBAC 스위처 전환** | 스타트업 서류 심사 병목 소개 및 `토스페이먼츠` 테넌트 · `채용 담당자(Recruiter)` 권한 활성화 |
| **SCENE 02** | **신규 자소서 PDF 업로드 & 직무 가중치 설정** | `정하늘.pdf` 업로드 즉시 성명·본문 자동 추출 및 5대 직무 역량 가중치 슬라이더 설정 |
| **SCENE 03** | **7종 PII 익명화 & 원문 3색 형광펜 팩트체크** | `[성명·학교명·전화번호 익명화]` 본문 위 AI 발췌 근거(긍정 녹색·확인 황색·리스크 적색) 1:1 매칭 |
| **SCENE 04** | **맞춤형 압박 면접 질문 & 사람 검토(HITL) 보정** | 의심 구간 타깃 압박 질문 3종 판정(`+3` / `0` / `-5`) 기록 및 채용 담당자 점수·사유 직접 보정 |
| **SCENE 05** | **1-Click 보안 공유 링크 & 다차원 역량 비교** | 면접관 전용 만료 기한 보안 링크 발급, 가중치 슬라이더 순위 재계산 및 N-gram 표절 매트릭스 검증 |

---

## 🖼️ 2. 캡스톤 디자인 경진대회 포스터 (90 × 140cm)

> 📄 **인쇄용 고해상도 파일 열람**: **[`poster_90x140.pdf` (벡터 PDF)](poster_90x140.pdf)** | **[`poster_90x140.png` (원본 PNG)](poster_90x140.png)**

<p align="center">
  <a href="./poster_90x140.pdf">
    <img src="./poster_90x140.png" alt="Check-Mate 캡스톤 디자인 포스터" width="92%" />
  </a>
</p>

---

## 📊 3. 경진대회 발표 자료 전체 미리보기 (총 14슬라이드)

> 📑 **발표 자료 전체 파일**: **[`presentation_slides.pdf` (발표용 PDF)](presentation_slides.pdf)** | **[`presentation_slides.html` (웹 슬라이드 뷰어)](presentation_slides.html)** | **[`docs/PRESENTATION_SCRIPT.md` (슬라이드별 발표 대본 & 예상 Q&A)](docs/PRESENTATION_SCRIPT.md)**

### Part 1. 프로젝트 표지 · 문제 인식 · 차별성 (Slide 01 ~ 03)
| Slide 01 · 표지 및 시연 QR | Slide 02 · 채용 현장의 3대 병목 (4컷 만화) |
| :---: | :---: |
| <img src="./docs/assets/slides/slide_01.png" width="100%" /> | <img src="./docs/assets/slides/slide_02.png" width="100%" /> |
| **Slide 03 · 기존 도구 대비 차별성 & 5단계 파이프라인** | **Slide 04 · 4대 멀티에이전트 적대적 교차 검증(DAG)** |
| <img src="./docs/assets/slides/slide_03.png" width="100%" /> | <img src="./docs/assets/slides/slide_04.png" width="100%" /> |

### Part 2. 핵심 알고리즘 · 시스템 아키텍처 · 멀티테넌트 DB 설계 (Slide 05 ~ 08)
| Slide 05 · 이중 방어선 7종 개인정보(PII) 비식별화 | Slide 06 · 3단계 퍼지(Fuzzy) 원문 오프셋 바인딩 |
| :---: | :---: |
| <img src="./docs/assets/slides/slide_05.png" width="100%" /> | <img src="./docs/assets/slides/slide_06.png" width="100%" /> |
| **Slide 07 · 전체 시스템 아키텍처 및 핵심 기술 스택** | **Slide 08 · Supabase PostgreSQL 7-Table 스키마(ERD) & RLS** |
| <img src="./docs/assets/slides/slide_07.png" width="100%" /> | <img src="./docs/assets/slides/slide_08.png" width="100%" /> |

### Part 3. 프로덕션 구현 화면 · 시연 · 시장성 · 수익모델 · 로드맵 (Slide 09 ~ 14)
| Slide 09 · 구현 결과 ① (RBAC · PDF 업로드 · 3색 형광펜) | Slide 10 · 구현 결과 ② (압박 면접 질문 · HITL · 다차원 비교) |
| :---: | :---: |
| <img src="./docs/assets/slides/slide_09.png" width="100%" /> | <img src="./docs/assets/slides/slide_10.png" width="100%" /> |
| **Slide 11 · 전체 작동 시연 시나리오 및 시연 영상 QR** | **Slide 12 · 목표 시장 및 3대 타겟 고객군** |
| <img src="./docs/assets/slides/slide_11.png" width="100%" /> | <img src="./docs/assets/slides/slide_12.png" width="100%" /> |
| **Slide 13 · 3-Tier SaaS 구독 + AI 크레딧 수익모델** | **Slide 14 · 사업화 로드맵 · 1인 풀스택 역량 및 Q&A** |
| <img src="./docs/assets/slides/slide_13.png" width="100%" /> | <img src="./docs/assets/slides/slide_14.png" width="100%" /> |

---

## 🧠 4. 핵심 엔지니어링 및 알고리즘 설계

### ① 4대 멀티에이전트 적대적 교차 검증(DAG) 파이프라인 (`src/services/multiAgentEvaluator.js`)
단일 프롬프트 LLM의 '무비판적 긍정 요약'과 '원문 없는 점수 날조(할루시네이션)'를 방지하기 위해 **단일 책임 원칙(SRP)**에 따라 4개의 에이전트로 역할을 분리하고 **2-Stage 순차 감사 후 병렬 합성(DAG)**으로 오케스트레이션합니다.

| 에이전트 | 실행 단계 | 핵심 책임 | 핵심 구조화 출력 (`output_config.format`) |
| :--- | :---: | :--- | :--- |
| **1. Grounding Agent** | `Stage 1 (순차)` | 자기소개서 본문 내 정량 성과·경험 문장 1:1 그대로 발췌 | 원문 인용구 배열 (`targetQuote`) |
| **2. Critic Agent** | `Stage 2 (순차)` | 기여도 부풀리기·수치 비약·논리 모순 집중 적대적 반박 | 과장 의심 사유·리스크 태그 (`riskFlags`) |
| **3. Supervisor Agent** | `Stage 3 (병렬)` | 발췌 근거와 반박 의견을 종합해 5대 직무 역량 채점 | 5대 역량 점수 · 종합 판정 (`competencyScores`) |
| **4. Interviewer Agent** | `Stage 4 (병렬)` | Critic 지적 사항을 면접장에서 검증할 압박 질문 도출 | 맞춤형 압박 면접 질문 3종 (`interviewQuestions`) |

---

### ② 이중 방어선 7종 개인정보(PII) 비식별화 (`src/utils/piiAnonymizer.js`)
외부 LLM 서버로 지원자 개인정보가 유출되거나 출신 학교에 따른 학벌 편향이 발생하는 것을 원천 차단하기 위해 **클라이언트 브라우저(1차)**와 **Cloud Run BFF 게이트웨이(2차)**에서 7종 개인정보를 강제 치환합니다.

- **7종 마스킹 대상**: `1. 성명` (`[성명 익명화]`), `2. 출신 학교명` (`[학교명 익명화]`), `3. 전화번호` (`[전화번호 익명화]`), `4. 이메일` (`[이메일 익명화]`), `5. 주민등록번호` (`[주민번호 익명화]`), `6. 도로명·지번 주소` (`[주소 익명화]`), `7. 학번·사번 ID` (`[ID 익명화]`)
- **오탐 방지 정규식 설계**: 부정형 전방탐색 `/(?!원|생|교)/`를 적용하여 `'단국대학교'`는 `[학교명 익명화]`로 치환하되, `'대학교육'`, `'대학원'`, `'대학생'` 등 일반 명사는 손상 없이 보존합니다.

---

### ③ 3단계 퍼지(Fuzzy) 원문 오프셋 바인딩 알고리즘 (`src/utils/fuzzyMatcher.js`)
PDF 파싱 과정에서 발생한 줄바꿈(`\n`)·다중 공백이나 LLM 인용구의 미세한 조사 변형에도 원문 내 정확한 형광펜 좌표(`[start, end]`)를 복원하기 위해 **Web Worker 백그라운드 스레드**에서 3단계 매칭을 수행합니다.

1. **Stage 1 — Exact IndexOf 완전 일치 탐색 (`O(N)`)**
   - `rawText.indexOf(targetQuote)`로 완전 일치 시 DP 연산 없이 즉시 `[start, end]` 반환 (`similarity = 1.0`)
2. **Stage 2 — Word Anchor & Jaccard N-gram 후보 필터링**
   - 공백·개행 정규화 후 인용구의 **시작 어절(`firstWord`)과 끝 어절(`lastWord`) 경계를 앵커링(Word Anchor)**하여 원문 전체가 아닌 후보 슬라이스 구간만 추출하고, 어절 토큰 교집합 비율($J(A, B) = \frac{|A \cap B|}{|A \cup B|}$)로 무관한 문장 구간을 사전 배제하여 탐색 공간을 압축
3. **Stage 3 — Dynamic Sliding Window ($\pm 20\%$) + Levenshtein DP**
   - 원문 내 개행·조사 가감으로 길이가 달라진 구간을 찾기 위해 인용구 길이 $L$ 기준 **$\pm 20\%$ 가변 윈도우($[0.8L, 1.2L]$, `stride = 3`, `winStep = 5`)**를 동적 스캔
   - 2차원 편집거리 점화식 `dp[i][j] = min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost)`로 정규화 유사도 $\text{Sim} = 1 - \frac{D_{\text{lev}}(W, Q)}{\max(|W|, |Q|)} \ge 0.85$를 만족하는 최대 유사도 원문 좌표 `{start, end}` 확정

---

### ④ Supabase PostgreSQL 7-Table 멀티테넌트 DB 스키마 및 RLS 격리 (`infra/supabase_schema.sql`)

<p align="center">
  <img src="./docs/assets/poster_fresh/09_supabase_schema_clean.png" alt="Supabase PostgreSQL 7-Table ERD" width="88%" />
</p>

- **7대 핵심 테이블**: `1. tenants` (기업 도메인·구독 플랜·크레딧 잔액), `2. users` (4단계 RBAC 권한), `3. job_postings` (직무별 5대 역량 가중치 JSONB), `4. applicants` (7종 PII 비식별 원문), `5. evaluations` (4-Agent 평가 결과·근거·HITL 보정 내역), `6. share_links` (만료 기한 보안 공유 토큰), `7. interview_collaborations` (면접관 질문별 판정 및 평가 메모)
- **Row-Level Security (RLS)**: `USING (tenant_id = current_tenant_id())` 정책을 통해 `토스페이먼츠`, `당근`, `우아한형제들` 등 테넌트 간 데이터 접근을 DB 엔진 레벨에서 격리

---

## 💻 5. 프로덕션 6단계 핵심 기능 화면 (GCP Cloud Run Live)

| (1) 기업별 데이터 격리(Multi-Tenancy) & RBAC 스위처 | (2) 신규 자기소개서 PDF 업로드 & 이름 자동 추출 |
| :---: | :---: |
| <img src="./docs/assets/poster_fresh/08_rbac_switcher_wide.png" width="100%" /> | <img src="./docs/assets/poster_fresh/07_pdf_upload.png" width="100%" /> |
| **(3) 7종 PII 익명화 & 원문 3색 형광펜 팩트체크** | **(4) 맞춤형 압박 면접 질문 & 면접관 평가 메모** |
| <img src="./docs/assets/poster_fresh/02_report_highlight.png" width="100%" /> | <img src="./docs/assets/poster_fresh/03_interview_questions.png" width="100%" /> |
| **(5) 사람 검토(HITL) 점수 보정 & 1-Click 공유** | **(6) 지원자 다차원 역량 비교 & 컷오프 대시보드** |
| <img src="./docs/assets/poster_fresh/04_hitl_modal.png" width="100%" /> | <img src="./docs/assets/poster_fresh/06_comparison_dashboard.png" width="100%" /> |

---

## 📂 6. 저장소 디렉터리 구조 (Repository Structure)

```text
CapStone-SW-/
├── poster_90x140.pdf                # 캡스톤 디자인 경진대회 포스터 (90x140cm 인쇄용 PDF)
├── poster_90x140.png                # 캡스톤 디자인 경진대회 포스터 (고해상도 PNG)
├── poster_90x140.html               # 캡스톤 디자인 포스터 원본 HTML/CSS
├── presentation_slides.pdf          # 경진대회 발표 자료 (16:9 와이드 14장 PDF)
├── presentation_slides.html         # 경진대회 발표 자료 원본 HTML (방향키 네비게이션 지원)
├── Check-Mate_IR_시연영상.mp4        # 내레이션 및 자막 포함 전체 작동 시연 영상 (MP4)
├── FINAL_GRADUATION_REPORT.pdf      # 캡스톤 디자인 최종 결과보고서 (A4 7페이지 PDF)
├── src/                             # React 18 프론트엔드 및 핵심 알고리즘 모듈
│   ├── services/
│   │   ├── multiAgentEvaluator.js   # 4대 멀티에이전트 적대적 교차 검증(DAG) 오케스트레이터
│   │   └── agents/                  # Grounding, Critic, Supervisor, Interviewer 에이전트 프롬프트·스키마
│   ├── utils/
│   │   ├── piiAnonymizer.js         # 7종 개인정보(PII) 정규식 비식별화 및 오탐 방지 엔진
│   │   ├── fuzzyMatcher.js          # 3단계 퍼지 매칭 (Word Anchor, Jaccard N-gram, Sliding Window + DP)
│   │   └── plagiarismEngine.js      # 지원자 간 N-gram 자소서 표절 유사도 매트릭스 연산
│   ├── workers/
│   │   └── evaluatorWorker.js       # Web Worker 백그라운드 비동기 퍼지 매칭 스레드
│   ├── contexts/                    # Multi-Tenancy 테넌트 분리 및 4단계 RBAC 권한 컨텍스트
│   └── components/                  # 3색 형광펜 뷰어, 압박 질문 키트, HITL 보정 모달, 역량 비교 대시보드
├── server/                          # Express 5 보안 BFF 게이트웨이 (2차 PII 검증 및 Claude API 연동)
├── server-spring/                   # Spring Boot 3 엔터프라이즈 백엔드 모듈
├── infra/
│   └── supabase_schema.sql          # Supabase PostgreSQL 7-Table 멀티테넌트 DDL 및 RLS 정책
└── docs/
    ├── PRESENTATION_SCRIPT.md       # 14장 슬라이드별 상세 발표 대본 및 심사위원 Q&A 방어 스크립트
    ├── FINAL_GRADUATION_REPORT.html # 최종 결과보고서 원본 HTML
    └── assets/                      # 포스터·슬라이드·프로덕션 캡처 이미지 에셋
```

---

## 🛠️ 7. 로컬 실행 및 테스트 검증 방법

> **권장 환경**: Node.js `22.12+`

```bash
# 1. 의존성 패키지 설치
npm install

# 2. 로컬 개발 서버 실행 (http://localhost:3000)
npm run dev

# 3. 단위 테스트 스위트 실행 (Vitest — PII 마스킹, 3단계 Fuzzy 매칭, 4-Agent 스키마 검증)
npm test

# 4. 프로덕션 빌드 번들 무결성 검증
npm run build
```

---

© 2026 단국대학교 · **Check-Mate (체크메이트)** · **장천명 (32203919)**. All rights reserved.
