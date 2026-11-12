# Check-Mate Spring 코어 API 명세 (실제 구현 기준)

> 기준 코드: `server-spring/` (Java 21 · Spring Boot 3.3.5).
> 이슈 #21의 **FastAPI 시절 명세(v0.1)** 를 대체합니다. 백엔드가 Spring으로 확정(#50)된 뒤 실제로 만들어진 엔드포인트만 적었습니다.
> 인증·테넌트 격리는 PR #74 (작업 #23) 기준입니다.

---

## 0. 공통 규칙

| 항목 | 규칙 |
|---|---|
| Base URL | `/api/v1` (로컬: `http://localhost:8080`, 프론트 연동 예시는 `8081`) |
| 포맷 | JSON, 필드명 camelCase |
| 인증 | `Authorization: Bearer <JWT>` (HS256, 기본 만료 3600초). 공개 API만 예외 |
| 테넌트 | 경로 `/tenants/{tenantId}/...` 를 쓰지만, **토큰의 tenantId 와 다르면 404**. 서버는 토큰 값만 신뢰 |
| ID | UUID |
| 시간 | `LocalDateTime` ISO 문자열 (예: `2026-11-12T15:22:53.06`, 타임존 표기 없음) |
| 페이지네이션 | 아직 없음 (목록은 전체 배열) |

### 응답 형식 (모든 엔드포인트 공통)
```json
// 성공
{ "success": true, "data": { ... } }
// 실패
{ "success": false, "error": { "code": "ENTITY_NOT_FOUND", "message": "요청한 리소스를 찾을 수 없습니다." } }
```

| HTTP | code | 상황 |
|---|---|---|
| 400 | `INVALID_INPUT_VALUE` | 필수값 누락·형식 오류 (Bean Validation) |
| 400 | 도메인별 (`INVALID_WEIGHT` 등) | 비즈니스 규칙 위반 |
| 401 | `UNAUTHORIZED` | 토큰 없음/만료/위조, 로그인 실패 |
| 403 | `FORBIDDEN` | 역할 권한 부족 |
| 404 | `ENTITY_NOT_FOUND` | 없음 **또는 다른 테넌트 경로/리소스** |
| 500 | `INTERNAL_SERVER_ERROR` | 그 밖의 서버 오류 |

### 역할 (RBAC)
| 기능 | ADMIN | RECRUITER | INTERVIEWER |
|---|:-:|:-:|:-:|
| 모든 조회(GET) | ✅ | ✅ | ✅ |
| 면접 스코어카드 제출 | ✅ | ✅ | ✅ |
| 지원자 등록/삭제/상태 변경 | ✅ | ✅ | ❌ |
| 평가 저장 / HITL 승인 | ✅ | ✅ | ❌ |
| 피드백 리포트·공유링크 생성/발송 | ✅ | ✅ | ❌ |
| 가중치 수정 / 보정 기록 | ✅ | ✅ | ❌ |
| 그 밖의 테넌트 쓰기 (기본 거부) | ✅ | ❌ | ❌ |

---

## 1. 엔드포인트 목록

`{t}` = tenantId, `{a}` = applicantId. 권한 열: 🌐 공개 / 🔑 로그인 / A·R·I = ADMIN·RECRUITER·INTERVIEWER

| Method | Path | 권한 | 요청 본문 | 성공 응답 `data` |
|---|---|---|---|---|
| GET | `/api/v1/health` | 🌐 | - | `{ status, service, version, activeProfiles[], timestamp }` |
| POST | `/api/v1/auth/login` | 🌐 | `{ email, password }` | `{ accessToken, tokenType:"Bearer", expiresIn, user }` |
| GET | `/api/v1/auth/me` | 🔑 | - | `user` = `{ id, name, email, role, tenantId, tenantName }` |
| POST | `/api/v1/tenants/{t}/applicants` | A·R | `{ name*, email, targetRole*, coverLetterText*, anonymized }` | 201 `Applicant` |
| GET | `/api/v1/tenants/{t}/applicants?status=` | A·R·I | - | `Applicant[]` (`status`: `PENDING\|EVALUATING\|COMPLETED\|FAILED`) |
| GET | `/api/v1/tenants/{t}/applicants/{a}` | A·R·I | - | `Applicant` |
| PATCH | `/api/v1/tenants/{t}/applicants/{a}/status` | A·R | `{ status*, finalScore, passRecommendation }` | `Applicant` |
| DELETE | `/api/v1/tenants/{t}/applicants/{a}` | A·R | - | `null` (200) |
| POST | `/api/v1/tenants/{t}/applicants/{a}/evaluation` | A·R | `{ summary*, totalScore*, passRecommendation*, fitScore, competencyScore, plagiarismScore, evidenceSentences[] }` | 201 `Evaluation` (기존 결과는 교체) |
| GET | `/api/v1/tenants/{t}/applicants/{a}/evaluation` | A·R·I | - | `Evaluation` |
| PATCH | `/api/v1/tenants/{t}/applicants/{a}/evaluation/approve` | A·R | `{ reviewerNotes* }` | `Evaluation` (`reviewedByHuman=true`) |
| POST | `/api/v1/tenants/{t}/applicants/{a}/interviews` | A·R·I | `{ interviewerName*, recommendation*(PASS\|FAIL\|HOLD), totalScore*, overallComment, questionEvaluations[] }` | 201 `Scorecard` (같은 면접관 이름이면 갱신) |
| GET | `/api/v1/tenants/{t}/applicants/{a}/interviews` | A·R·I | - | `{ applicantId, totalInterviewers, averageScore, passCount, failCount, holdCount, consensusRecommendation, scorecards[] }` |
| POST | `/api/v1/tenants/{t}/applicants/{a}/feedback` | A·R | `{ evaluationResultId, strengthsSummary*, improvementPoints*, recommendedActions*, overallCoachingComment }` | 201 `FeedbackReport` (`feedbackToken`, `shareUrl` 포함) |
| GET | `/api/v1/tenants/{t}/applicants/{a}/feedback` | A·R·I | - | `FeedbackReport` |
| POST | `/api/v1/tenants/{t}/applicants/{a}/feedback/send` | A·R | - | `FeedbackReport` (`isSent=true`) |
| GET | `/api/v1/public/feedback/{feedbackToken}` | 🌐 | - | `{ feedbackToken, strengthsSummary, improvementPoints, recommendedActions, overallCoachingComment, generatedAt }` |
| PUT | `/api/v1/tenants/{t}/weights` | A·R | `{ jobRole*, cultureFitWeight*, jobCompetencyWeight*, problemSolvingWeight*, collaborationWeight*, description }` (각 0~100) | `WeightProfile` |
| GET | `/api/v1/tenants/{t}/weights?jobRole=` | A·R·I | - | `WeightProfile[]` |
| POST | `/api/v1/tenants/{t}/calibrations` | A·R | `{ applicantId*, evaluationResultId, correctorEmail*, originalScore*, correctedScore*, originalDecision, correctedDecision, correctionReason*, fewShotContextText }` | 201 `Calibration` (`scoreDelta` 계산) |
| GET | `/api/v1/tenants/{t}/calibrations?applicantId=` | A·R·I | - | `Calibration[]` (최신순) |
| GET | `/actuator/health`, `/actuator/info` | 🌐 | - | Spring Actuator |
| GET | `/actuator/metrics` | ADMIN | - | Spring Actuator |

`*` = 필수

### 주요 응답 객체
- **Applicant**: `{ id, tenantId, name, email, targetRole, coverLetterText, status, finalScore, passRecommendation, anonymized, createdAt, updatedAt }`
- **Evaluation**: `{ id, tenantId, applicantId, summary, totalScore, passRecommendation, fitScore, competencyScore, plagiarismScore, reviewedByHuman, reviewerNotes, evidenceSentences[{ id, category, sentence, quoteOffsetStart, quoteOffsetEnd, confidenceScore, rationale, interviewQuestion }], createdAt, updatedAt }`
- **Scorecard**: `{ id, tenantId, applicantId, interviewerName, recommendation, totalScore, overallComment, questionEvaluations[{ id, questionText, category, checked, score, interviewerNote }], createdAt, updatedAt }`
- **FeedbackReport**: `{ id, tenantId, applicantId, evaluationResultId, feedbackToken, shareUrl, strengthsSummary, improvementPoints, recommendedActions, overallCoachingComment, isSent, sentAt, viewCount, createdAt }`
- **WeightProfile**: `{ id, tenantId, jobRole, cultureFitWeight, jobCompetencyWeight, problemSolvingWeight, collaborationWeight, totalWeight, description, updatedAt }`
- **Calibration**: `{ id, tenantId, applicantId, evaluationResultId, correctorEmail, originalScore, correctedScore, scoreDelta, originalDecision, correctedDecision, correctionReason, fewShotContextText, createdAt }`

---

## 2. 이슈 #21 (FastAPI v0.1) 과의 차이

| 영역 | #21 명세 | Spring 실제 구현 | 비고 / 후속 |
|---|---|---|---|
| 서버 | Python FastAPI | Java 21 Spring Boot 3 | #50 결정 |
| 응답 감싸기 | 객체 그대로, 에러 `{ error }` | 항상 `{ success, data \| error }` | 프론트는 `apiClient.js`가 `data`만 꺼냄 |
| 에러 코드 | `VALIDATION_ERROR`, `NOT_FOUND` | `INVALID_INPUT_VALUE`, `ENTITY_NOT_FOUND` | 402/409/410/429/502 코드는 아직 없음 |
| 테넌트 지정 | JWT만, 경로에 없음 (`/applicants`) | 경로 `/tenants/{tenantId}/...` + **토큰과 다르면 404** | 의미는 동일(토큰만 신뢰). 경로 단순화는 후속 검토 |
| Health | `{ status:"ok", db, version }` | `{ status:"UP", service, version, activeProfiles, timestamp }` | db 상태 없음 |
| Auth login | `{ accessToken, expiresIn, user }` | 같음 + `tokenType` | ✅ 구현 |
| Auth me | `user` | 같음 | ✅ 구현 |
| Users 관리 (`/users`) | ADMIN CRUD | **없음** | 계정은 local 시드만. 운영 계정 생성 API 필요 |
| Tenant 정보·크레딧 (`/tenant`) | 있음 | **없음** | |
| 프롬프트 설정 (`/tenant/prompt-settings`) | 있음 | **없음** | 프론트 localStorage 유지 |
| Jobs (`/jobs`, 역량 가중치) | 직무 + competencies 배열, 합계 100 검증 | `/weights` (jobRole별 4개 고정 가중치, 합계 > 0) | 구조 다름. 프론트 `jobTemplates.js` 와 매핑 필요 |
| 지원자 등록 | `{ jobId, name, rawText }` | `{ name, email, targetRole, coverLetterText, anonymized }` | jobId 대신 직무명 문자열 |
| 지원자 일괄 등록 (`/applicants/batch`) | 있음 | **없음** | 프론트가 1건씩 호출 |
| 지원자 목록 | 필터·정렬·페이지네이션, `latestEvaluation` 포함 | `?status=` 만, 배열, 평가 미포함 | |
| 상태 값 | `NONE\|QUEUED\|RUNNING\|DONE\|FAILED` | `PENDING\|EVALUATING\|COMPLETED\|FAILED` | |
| 평가 실행 | `POST .../evaluations` → 202 + polling, 서버가 AI 호출 | **서버는 AI를 호출하지 않음**. 프론트/게이트웨이가 평가한 결과를 `POST .../evaluation` 으로 저장 | 비동기 평가 파이프라인은 후속 |
| HITL 검토 | `PUT/DELETE /evaluations/{id}/review` | `PATCH .../evaluation/approve` (승인 메모) + `/calibrations` (점수 교정 기록) | 되돌리기 API 없음 |
| 면접관 공유링크·메모 (`/shares`) | 토큰 공유 + 메모 polling | **없음** (Express 게이트웨이 `/api/v1/shares` 가 담당) | 대신 면접 스코어카드 API 있음 |
| 지원자 피드백 리포트 | 없음 | `/feedback` + 공개 `/public/feedback/{token}` | 신규 |
| 면접 스코어카드 | 없음 | `/interviews` (다중 면접관 집계) | 신규 |
| 표절 (`/jobs/{id}/plagiarism`) | P2 | **없음** | 프론트 `plagiarismEngine.js` 유지 |

---

## 3. 프론트 연동 (작업 #27)

`VITE_SPRING_API_URL` 을 설정한 경우에만 동작하고, 없으면 기존 localStorage 동작 그대로입니다.

| 파일 | 역할 |
|---|---|
| `src/services/apiClient.js` | Base URL, `Authorization: Bearer`, `{success,data,error}` 해석 → `ApiError{status, code}` |
| `src/services/springApplicantService.js` | 지원자 등록(평가 완료 후 POST + PATCH status) / 목록(GET → 화면 목록에 병합) |
| `src/contexts/TenantContext.jsx` | 저장 시 Spring 등록, 테넌트 진입 시 Spring 목록 병합 |

### 로컬 실행 (개발용 자동 로그인)
로그인 화면은 아직 없어서, **개발 모드에서만** 프론트 데모 테넌트에 맞는 Spring 시드 계정으로 자동 로그인합니다.

| 프론트 테넌트 | Spring 계정 (local 시드) |
|---|---|
| `toss-payments` (토스페이먼츠) | `recruiter@toss.test` |
| `daangn` (당근) | `recruiter@daangn.test` |
| `woowa` | 대응 계정 없음 → 동기화 안 함 |

```bash
# 1) Spring (local 프로필, H2 메모리 DB, 시드 계정 생성)
cd server-spring && ./gradlew bootRun --args='--server.port=8081'

# 2) 프론트 (.env.local 또는 셸 환경변수)
VITE_SPRING_API_URL=http://localhost:8081 \
VITE_SPRING_DEV_PASSWORD='checkmate1234!' \
npm run dev -- --port 3300
```

- `VITE_SPRING_DEV_PASSWORD` 는 `npm run dev`(MODE≠production)에서만 쓰입니다. **운영 빌드에 넣지 마세요** (VITE_ 변수는 번들에 그대로 포함됩니다).
- 데모 기본 지원자(정지훈 등)는 서버로 보내지 않고, 새로 평가한 지원자만 등록합니다.
- 서버에서 불러온 지원자는 점수·원문만 있고 AI 근거/면접질문은 비어 있습니다 (평가 결과 저장 연동은 후속).
- 운영 배포 전 남은 일: 로그인 화면, 평가 결과(`/evaluation`) 저장 연동, Spring CORS 에 운영 도메인 추가.

### curl 예시
```bash
TOKEN=$(curl -s -X POST localhost:8081/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"recruiter@toss.test","password":"checkmate1234!"}' | jq -r .data.accessToken)
TENANT=$(curl -s localhost:8081/api/v1/auth/me -H "Authorization: Bearer $TOKEN" | jq -r .data.tenantId)
curl -s localhost:8081/api/v1/tenants/$TENANT/applicants -H "Authorization: Bearer $TOKEN"
```
