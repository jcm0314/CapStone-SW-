# ADR-AI-01. AI 연동 방식: API 직접 호출 vs MCP

- 상태: **채택 (Accepted)** — 2026-11-12 팀 결정: AI 제공자를 Claude API(Anthropic)로 전환, 서버에서만 호출
- 작성일: 2026-11-12 (개정: Gemini → Claude API)
- 관련: [트러블슈팅 리포트](../troubleshooting/2026-11-12_user-scenario-report.md), [tasks/28](../../tasks/28_ai-live-integration.md), tasks/25(BYOK 제거), Issue #51(BFF + AI Worker 결정), #19(gRPC vs REST), 구현 PR #75

> **결론 먼저**: Check-Mate의 자소서 분석에는 **서버에서 Claude API(Anthropic 공식 SDK `@anthropic-ai/sdk`)를 직접 호출하는 방식(API)** 을 씁니다. MCP는 지금 필요 없습니다. 다만 나중에 "인사담당자의 AI 비서(Claude 등)가 Check-Mate 평가 결과를 조회"하는 기능을 만들 때 MCP 서버를 **추가 옵션**으로 검토합니다.

---

## 1. 배경 (왜 지금 결정해야 하나)

- 2026-11-12 점검에서 **라이브 AI 분석이 모든 경로에서 실패**했습니다 (프론트 API 주소 미설정, GCP Gemini API 비활성 403, 존재하지 않는 모델 ID).
- 당시 코드에는 AI 호출 경로가 **세 갈래**로 섞여 있었습니다.
  1. 브라우저 → Google API 직접 호출 (사용자가 API 키 입력, BYOK)
  2. 브라우저 → Node 게이트웨이(`server/index.js`) → Gemini API (서버 키)
  3. Node `server/proxyServer.js` → Vertex AI (서비스 계정, 실제로는 미사용)
- 새 Spring 백엔드(`server-spring/`)에는 AI 호출 경로가 아직 없습니다.
- "API로 할지, MCP로 할지"라는 질문과 함께 **AI 제공자를 Claude로 바꾸자**는 결정이 나와서, 두 개념을 정리하고 경로를 하나로 정합니다.

## 2. API와 MCP, 쉽게 말하면

| | **API (직접 호출)** | **MCP (Model Context Protocol)** |
|---|---|---|
| 한 줄 정의 | **우리 서버가 AI에게 일을 시키는** 방법 | **AI가 우리 서비스(도구·데이터)를 꺼내 쓰는** 방법 |
| 방향 | Check-Mate → Claude API | Claude 같은 AI 앱 → Check-Mate |
| 비유 | 우리가 외주 전문가(AI)에게 "이 자소서 분석해 줘"라고 **의뢰서를 보냄** | AI 비서에게 "Check-Mate라는 **업무 도구를 쥐여 줌**" — 비서가 필요할 때 알아서 꺼내 씀 |
| 누가 흐름을 정하나 | **우리 코드** (Grounding → Critic → Supervisor → Interviewer 순서를 우리가 고정) | **AI 모델**이 대화 중에 어떤 도구를 언제 부를지 판단 |
| 결과 형태 | 우리가 정한 JSON 스키마 그대로 받아 화면에 표시 | AI가 도구 결과를 읽고 자연어로 사용자에게 답함 |
| 대표 예 | `POST https://api.anthropic.com/v1/messages` (SDK `client.messages.create`) | Claude Desktop에 "Check-Mate MCP 서버"를 연결해 "지난주 지원자 중 80점 이상 보여줘"라고 묻기 |

핵심 차이: **MCP는 "AI를 부르는 방법"이 아니라 "AI에게 도구를 주는 표준 규격"** 입니다. MCP를 써도 결국 어떤 AI 모델이 그 도구를 호출해야 하므로, "자소서를 AI로 분석한다"는 우리 핵심 기능을 MCP로 대체할 수는 없습니다. (MCP를 만든 곳이 Anthropic이라 Claude와 잘 맞지만, 그래도 분석 파이프라인은 API로 호출합니다.)

## 3. 대안 비교 (이 서비스 기준)

| 기준 | A. 서버에서 API 직접 호출 ✅ | B. 브라우저에서 API 직접 호출 (BYOK) | C. MCP 서버로 구성 |
|---|---|---|---|
| **핵심 기능 적합성** (정해진 4단계 파이프라인 → 고정 JSON → 형광펜 UI) | ✅ 우리가 순서·스키마를 통제 (구조화 출력으로 JSON 강제) | ✅ 동일 | ❌ 흐름을 AI가 정함. 매번 결과 구조·순서가 달라질 수 있어 형광펜/점수 UI와 안 맞음 |
| **API 키 보안** | ✅ 키는 서버(Secret)에만 | ❌ 키가 브라우저 localStorage·네트워크 요청에 노출 | – (서비스 쪽 인증 별도 필요) |
| **개인정보(PII) 통제** | ✅ 서버에서 마스킹 후 전송 강제 가능 | ⚠️ 브라우저 코드에 의존 (우회 가능) | ⚠️ 외부 AI 앱으로 지원자 데이터가 흘러갈 수 있음 |
| **비용 통제** (테넌트별 크레딧·호출량 제한) | ✅ 서버에서 카운트·차단 | ❌ 사용자 키라 통제 불가 | ⚠️ 외부 AI 앱 쪽 비용·호출 패턴 예측 어려움 |
| **기존 코드 재사용** | ✅ `src/services/agents/*` 프롬프트와 `server/index.js` 연결 재사용 | ✅ | ❌ 새로 설계 |
| **B2B 판매 스토리** ("설정 없이 바로 사용") | ✅ 고객은 키 발급 불필요 | ❌ 고객이 AI 키를 직접 발급해야 함 | ❌ 고객이 MCP 지원 AI 앱을 써야 함 |
| **캡스톤 일정 (12월 3주차)** | ✅ 키 설정 + 경로 정리면 가능 | ✅ | ❌ 새 설계라 일정 위험 |

## 4. 결정

**A. 서버에서 Claude API 직접 호출**로 단일화합니다.

1. **호출 위치**: 지금은 Node 게이트웨이(`server/index.js`, `POST /api/v1/evaluate`)를 사용합니다. Spring 백엔드가 준비되면 #51 결정대로 **Spring(BFF) → AI Worker(Node 게이트웨이)** 구조로 연결합니다. 에이전트 코드를 Java로 다시 짜지 않습니다.
2. **제공자·SDK**: **Anthropic Claude API**, 공식 Node SDK **`@anthropic-ai/sdk`** 사용 (`src/services/agents/claudeClient.js`). 직접 `fetch`로 REST를 부르지 않습니다.
3. **모델**: 기본 **`claude-opus-5-5`** (Anthropic 권장 기본 모델 — 근거 문장 원문 발췌·교차 검증·점수 판정처럼 정확도가 중요한 작업). 지원자 1명당 4회 호출이라 `effort`는 `medium`으로 둡니다. 비용·속도 조정은 코드 수정 없이 환경변수로: `ANTHROPIC_MODEL`(예: `claude-sonnet-5-5`, `claude-haiku-5-5`), `ANTHROPIC_EFFORT`(`low`~`max`).
4. **응답 형식**: `output_config.format`(json_schema) **구조화 출력**으로 `docs/AI_AGENT_PROMPT_SPEC.md`의 JSON 스키마를 강제합니다 (마크다운 코드블록 파싱 제거).
5. **키 관리**: `ANTHROPIC_API_KEY`는 **서버 환경변수로만** 둡니다 (로컬 `.env`, 배포는 GCP Secret Manager → Cloud Run / K8s Secret). 브라우저 번들·localStorage·URL에는 절대 넣지 않습니다.
6. **오류 처리**: 400/401/403/404는 재시도하지 않고, 429·5xx·연결 오류만 SDK가 최대 2회 재시도. 호출당 타임아웃 120초. 실패 시 **가짜 점수나 단일 프롬프트 폴백 없이** 한국어 에러를 그대로 보여 줍니다 (키 미설정 시 503 "서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다").
7. **브라우저 직접 호출(BYOK)**: **제거**합니다 (tasks/25). API 키 입력 모달도 없앱니다.
8. **Gemini/Vertex 경로**: `geminiClient.js`, 미사용 `server/proxyServer.js`와 GCP Vertex/BigQuery 의존성을 정리합니다.
9. **MCP**: 지금은 도입하지 않습니다. 아래 "나중에 MCP가 어울리는 경우"에 해당하는 요구가 생기면 별도 ADR로 다룹니다.

## 5. 나중에 MCP가 어울리는 경우 (로드맵 후보)

| 시나리오 | MCP로 하면 좋은 이유 |
|---|---|
| 인사담당자가 쓰는 AI 비서(Claude 등)에서 "이번 공고 지원자 중 면접 추천만 정리해 줘" | Check-Mate를 **읽기 전용 MCP 서버**로 공개하면, 담당자가 익숙한 AI 앱 안에서 평가 결과를 조회 가능 |
| 사내 ATS·슬랙·노션 연동 (사업계획서 GTM 3단계) | 각 도구별 연동 코드를 따로 만드는 대신 표준 규격 하나로 노출 |

이때도 **평가(분석) 자체는 A 방식 서버 파이프라인**이 하고, MCP는 그 **결과를 꺼내 보는 창구**입니다. 지원자 원문·PII는 MCP로 노출하지 않고 마스킹된 요약만 제공해야 합니다.

## 6. 해야 할 일 (tasks/28과 연결)

- [x] 에이전트 4종을 Claude API(`@anthropic-ai/sdk`)로 전환, 구조화 출력(json_schema) 적용 — PR #75
- [x] 400/401/403 재시도 금지, 타임아웃, 가짜 점수·단일 프롬프트 폴백 제거 — PR #75
- [x] BYOK(브라우저 직접 호출)·API 키 모달 제거 (tasks/25) — PR #75
- [x] 로컬 실연동 1건 확인 (claude-opus-5-5, 4개 에이전트 성공, 인용문 원문 일치) — PR #75
- [ ] `ANTHROPIC_API_KEY`를 Secret Manager → Cloud Run 게이트웨이에 주입 (배포 환경)
- [ ] 프론트 빌드에 `VITE_API_GATEWAY_URL` 주입 강제 (tasks/24)
- [ ] 테넌트별 사용량(토큰) 로깅과 호출량 제한
- [ ] 환각(tasks/20)·화면 PII(tasks/21) 수정 후 실제 자소서 여러 건으로 정확도·비용 실측 → 모델/effort 최종 확정
- [ ] HITL 보정(calibration) few-shot을 서버 평가에도 전달

## 7. 결정의 결과 (예상 효과)

- 고객은 키 발급 없이 바로 사용 (B2B "설정 없이 바로" 스토리와 일치)
- API 키가 브라우저에 노출되지 않음, PII 마스킹을 서버에서 강제
- 호출 경로가 1개로 줄어 트러블슈팅이 쉬워짐 (기존 3갈래 → 1갈래)
- 구조화 출력으로 JSON 파싱 실패가 사라지고, 모델 교체는 환경변수 하나로 가능
