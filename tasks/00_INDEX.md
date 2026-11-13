# 작업 단위 인덱스 (Check-Mate 문서 ↔ 실제 코드 격차 해소)

> 작성일: 2026-11-10
> 근거: `README.md`, `docs/*.md`와 `src/`, `server/`, `infra/`, `.github/`, `package.json`, `package-lock.json`을 직접 대조해서 정리했습니다.
> 진행 방식: 아래 순서대로 **한 번에 하나씩** 진행합니다. 각 작업을 시작할 때 상태를 `진행중`으로 바꾸고, 끝나면 `완료`(또는 `보류`)로 바꾼 뒤 이 표도 함께 갱신합니다.
> 상태 값: 대기 / 진행중 / 완료 / 보류

| ID | 제목 | 우선순위 | 상태 | 파일 |
| :-: | :--- | :-: | :-: | :--- |
| 01 | 실행 환경 점검 및 테스트/빌드 베이스라인 기록 | P0 | 완료 | [01_baseline-environment.md](01_baseline-environment.md) |
| 02 | Node 런타임 버전 정합성 (CI/Docker Node 20 → 22) | P0 | 완료 | [02_node-runtime-version.md](02_node-runtime-version.md) |
| 03 | PII 마스킹 유틸 결함 수정 (정규식 lastIndex, 성명 이스케이프) | P0 | 완료 | [03_pii-anonymizer-bugs.md](03_pii-anonymizer-bugs.md) |
| 04 | LLM 프롬프트에 지원자 성명 원문이 전송되는 문제 제거 | P0 | 완료 | [04_pii-name-in-prompts.md](04_pii-name-in-prompts.md) |
| 05 | 당근/우아한형제들 샘플 지원자 데이터 스키마 정규화 | P1 | 완료 | [05_tenant-sample-schema.md](05_tenant-sample-schema.md) |
| 06 | React Hooks 규칙 위반(조기 return) 컴포넌트 수정 | P1 | 완료 | [06_rules-of-hooks.md](06_rules-of-hooks.md) |
| 07 | react-window v2 API 반영 (가상 스크롤 실제 동작) | P1 | 완료 | [07_react-window-v2.md](07_react-window-v2.md) |
| 08 | 평가 캐시 키 충돌 및 캐시 히트 시 지원자명 불일치 수정 | P1 | 완료 | [08_cache-key-and-name.md](08_cache-key-and-name.md) |
| 09 | HITL 롤백 결과가 테넌트 저장소에 반영되지 않는 문제 수정 | P2 | 완료 | [09_hitl-revert-persist.md](09_hitl-revert-persist.md) |
| 10 | Docker/nginx 환경에서 프론트엔드 → 게이트웨이 API 라우팅 결함 수정 | P1 | 완료 | [10_nginx-api-routing.md](10_nginx-api-routing.md) |
| 11 | 테스트 격리 (네트워크 의존 제거, 서버 테스트 node 환경) | P2 | 완료 | [11_test-isolation.md](11_test-isolation.md) |
| 12 | Prompt Studio 설정을 실제 에이전트 프롬프트에 반영 | P2 | 완료 | [12_prompt-studio-wiring.md](12_prompt-studio-wiring.md) |
| 13 | 협업 메모 "Live Sync" 주기적 동기화(폴링) 구현 | P2 | 완료 | [13_collab-live-polling.md](13_collab-live-polling.md) |
| 14 | 문서 정합성 정리 (ARCHITECTURE/README/ISSUES/CI 표기) | P1 | 완료 | [14_docs-consistency.md](14_docs-consistency.md) |
| 15 | 실제 `npm test` / `npm run build` 실행 검증 | P0 | 완료 | [15_run-real-tests-build.md](15_run-real-tests-build.md) |
| 16 | Supabase RLS 멀티테넌시 실제 연동 | P1 | 완료(브릿지 연결 / 원격 DB는 환경변수 의존) | [16_supabase-integration.md](16_supabase-integration.md) |
| 17 | 게이트웨이 공유 저장소 영속화 · 인증 · 서버측 4-에이전트 | P1 | 완료 | [17_server-persistence-auth.md](17_server-persistence-auth.md) |
| 18 | 미사용(dead) 코드 정리 여부 결정 | P3 | 완료 | [18_dead-code-cleanup.md](18_dead-code-cleanup.md) |
| 19 | Gemini 모델명/엔드포인트 실사용 검증 | P1 | 완료 | [19_gemini-model-validation.md](19_gemini-model-validation.md) |

## 2차 큐 (2026-11-12 사용자 시나리오 트러블슈팅)

> 근거: [docs/troubleshooting/2026-11-12_user-scenario-report.md](../docs/troubleshooting/2026-11-12_user-scenario-report.md)
> 위에서부터 순서대로 진행합니다. AI 실연동(28)은 신뢰성 결함(20·21)을 먼저 고친 뒤 진행하는 후순위 작업입니다.

| ID | 제목 | 우선순위 | 상태 | 파일 |
| :-: | :--- | :-: | :-: | :--- |
| 20 | 환각 인용(원문 매칭 실패) → verify 강제 전환 | P0 | 대기 | [20_hallucinated-quote-verify.md](20_hallucinated-quote-verify.md) |
| 21 | 화면 본문 PII 원본 노출 수정 (#37-2) | P0 | 대기 | [21_pii-masked-view.md](21_pii-masked-view.md) |
| 22 | 캐시 키에 테넌트·Prompt Studio 설정 포함 (#37-4) | P1 | 대기 | [22_cache-key-scope.md](22_cache-key-scope.md) |
| 23 | Spring API 인증 + 테넌트 격리 | P0 | 대기 | [23_spring-auth-tenant-isolation.md](23_spring-auth-tenant-isolation.md) |
| 24 | 프론트 API 주소 빌드 설정 강제 + 라이브 재배포 | P0 | 대기 | [24_api-base-url-and-redeploy.md](24_api-base-url-and-redeploy.md) |
| 25 | BYOK(개인 키) 모드 개선 | P2 | 대기 | [25_byok-hardening.md](25_byok-hardening.md) |
| 26 | 첫 화면 샘플 결과에 "샘플" 표시 | P2 | 대기 | [26_sample-result-badge.md](26_sample-result-badge.md) |
| 27 | #21~#23 Spring 기준 갱신 + 프론트 ↔ Spring 연결 | P1 | 대기 | [27_spring-integration-docs.md](27_spring-integration-docs.md) |
| 28 | AI 실연동 (서버측 Gemini API) | 후순위 | 대기 | [28_ai-live-integration.md](28_ai-live-integration.md) |
| 29 | 메인 화면 디자인 개편 (밝은 테마 · 검색/메뉴로 기능 탐색) | 후순위 | 대기 | [29_ui-redesign-light-theme.md](29_ui-redesign-light-theme.md) |
| 30 | 카페 피드백(#47) 미구현 기능 백로그 | 후순위 | 대기 | [30_cafe-feedback-backlog.md](30_cafe-feedback-backlog.md) |

## 핵심 격차 요약

- **실행 검증 불가**: 이 PC에는 Node/npm이 설치되어 있지 않습니다. 그래서 "51 tests 100% passed"를 직접 재현하지 못했습니다(01, 15 참고).
- **런타임 불일치**: lock 파일 기준 `vitest@5.0.3`, `@supabase/*@2.118`, `@google-cloud/*`는 Node 22 이상이 필요합니다. 그런데 CI와 Dockerfile은 Node 20을 씁니다(02).
- **Supabase RLS 미연동**: `src/services/supabaseClient.js`를 import하는 곳이 없습니다. 멀티테넌시는 localStorage 키를 분리하는 수준입니다(16).
- **Web Worker / Vertex 서비스 / proxyServer 미사용**: `workerService.js`, `evaluatorWorker.js`, `enterpriseVertexService.js`, `server/proxyServer.js`는 어디에서도 호출되지 않습니다(18).
- **가상 스크롤 미동작**: react-window v2에는 `FixedSizeList`가 없습니다. 그래서 항상 일반 목록으로 폴백됩니다(07).
- **PII 누출**: 텍스트는 마스킹하지만 에이전트 프롬프트에 `성명: ${name}`이 그대로 들어갑니다(04).
- **공유/협업**: 게이트웨이의 공유 저장소는 프로세스 메모리 `Map`입니다. "실시간 동기화"는 마운트할 때 한 번 조회하는 것이 전부입니다(13, 17).
- **문서 불일치**: ARCHITECTURE.md는 "백엔드 서버 없이"라고 적혀 있지만 `server/`가 존재합니다. CI 주석은 "28 Tests", README는 "51 Tests"로 서로 다릅니다(14).
