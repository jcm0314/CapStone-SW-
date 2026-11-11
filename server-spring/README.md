# Check-Mate Spring Boot 3 Backend (`server-spring`)

Check-Mate B2B 공정채용 솔루션의 고신뢰성 메인 백엔드 서비스입니다.  
Java 21 LTS와 Spring Boot 3.3.5 기반으로 멀티테넌트 데이터 격리, 기업 평가 기준 매핑, REST API를 제공합니다.

---

## 🚀 빠른 시작 (Quick Start)

### 1. 요구 사항
- **Java**: OpenJDK 21 LTS (`temurin-21` 권장)
- 별도의 Gradle 설치 없이 포함된 `./gradlew` Wrapper로 바로 빌드 가능합니다.

### 2. 로컬 실행 (H2 In-Memory DB)
```bash
cd server-spring
./gradlew bootRun
```
- 서버 기본 포트: `http://localhost:8080`
- H2 웹 콘솔: `http://localhost:8080/h2-console` (JDBC URL: `jdbc:h2:mem:checkmatedb`, User: `sa`, PW: 없음)

### 3. 단위 테스트 실행
```bash
./gradlew test
```

### 4. 프로덕션 빌드 (Jar 생성)
```bash
./gradlew bootJar
# 생성 경로: build/libs/server-0.0.1-SNAPSHOT.jar
```

---

## 📡 헬스체크 API 명세

- **URL**: `GET /api/v1/health`
- **인증**: 필요 없음 (Public)
- **응답 예시**:
```json
{
  "success": true,
  "data": {
    "status": "UP",
    "service": "Check-Mate Core API Server",
    "version": "v1.0.0",
    "activeProfiles": ["local"],
    "timestamp": "2026-11-11T23:15:00.000Z"
  },
  "error": null
}
```

---

## 🗄️ B2B 멀티테넌트 도메인 모델 (Entities)

### 1. `CompanyTenant` (`company_tenants`)
- **역할**: B2B 고객사(토스, 당근 등) 엔터프라이즈 계정 정보
- **주요 필드**:
  - `id`: UUID (PK)
  - `slug`: VARCHAR(50) (UK, e.g. `toss`, `daangn`)
  - `name`: VARCHAR(100) (회사명)
  - `tier`: `FREE`, `STARTER`, `PRO`, `ENTERPRISE`
  - `active`: BOOLEAN (계정 활성 여부)
  - `created_at`, `updated_at`: JPA Auditing 자동 관리

### 2. `Applicant` (`applicants`)
- **역할**: 채용 지원자 및 자기소개서 평가 엔티티
- **주요 필드**:
  - `id`: UUID (PK)
  - `tenantId`: UUID (소속 테넌트 식별자, 복합 인덱스)
  - `name`: VARCHAR(100) (가상 마스킹 토큰/실명)
  - `email`: VARCHAR(150)
  - `targetRole`: VARCHAR(100) (지원 직무)
  - `coverLetterText`: TEXT (자소서 본문)
  - `status`: `PENDING`, `EVALUATING`, `COMPLETED`, `FAILED`
  - `finalScore`: INTEGER (0-100)
  - `passRecommendation`: BOOLEAN
  - `anonymized`: BOOLEAN (PII 블라인드 여부)
- **데이터 격리 보장**: 모든 지원자 쿼리는 `tenant_id` 조건을 필수로 적용하여 테넌트 간 데이터 침범(Cross-Tenant Leakage)을 원천 차단합니다.

### 3. `EvaluationResult` (`evaluation_results`)
- **역할**: 지원자 자기소개서 종합 AI 평가 결과 및 검토관 승인
- **주요 필드**:
  - `id`: UUID (PK)
  - `tenantId`: UUID (소속 테넌트 식별자, 복합 인덱스)
  - `applicantId`: UUID (대상 지원자 ID, 복합 인덱스)
  - `summary`: TEXT (종합 역량 평가 요약)
  - `totalScore`: INTEGER (0-100)
  - `passRecommendation`: BOOLEAN
  - `fitScore`: INTEGER (인재상 부합도)
  - `competencyScore`: INTEGER (직무 전문성)
  - `plagiarismScore`: INTEGER (표절 의심도)
  - `reviewedByHuman`: BOOLEAN (인간 검토관 승인 게이트)
  - `reviewerNotes`: TEXT (검토관 메모)
  - `evidenceSentences`: List<EvidenceSentence> (Cascade 1:N)

### 4. `EvidenceSentence` (`evidence_sentences`)
- **역할**: 설명 가능한 AI(XAI) 1:1 형광펜 원문 근거 문장 및 추천 면접 질문
- **주요 필드**:
  - `id`: UUID (PK)
  - `evaluationResult`: EvaluationResult (@ManyToOne)
  - `category`: VARCHAR(100) (역량 항목, e.g. 문제해결력, 협업)
  - `sentence`: TEXT (매칭된 자소서 원문 문장)
  - `quoteOffsetStart`: INTEGER (원문 시작 오프셋)
  - `quoteOffsetEnd`: INTEGER (원문 종료 오프셋)
  - `confidenceScore`: DOUBLE (신뢰도 0.0 ~ 1.0)
  - `rationale`: TEXT (AI 채점 근거 사유)
  - `interviewQuestion`: TEXT (해당 근거 기반 심층 면접 질문)


---

## 📡 지원자 관리 REST API 명세

| Method | Endpoint | 설명 | 요청 본문 | 응답 |
|---|---|---|---|---|
| `POST` | `/api/v1/tenants/{tenantId}/applicants` | 신규 지원자 자소서 등록 | `ApplicantCreateRequest` | `201 Created` |
| `GET` | `/api/v1/tenants/{tenantId}/applicants` | 테넌트 지원자 목록 (`?status=` 필터) | 없음 | `200 OK` |
| `GET` | `/api/v1/tenants/{tenantId}/applicants/{id}` | 지원자 상세 및 자소서 본문 조회 | 없음 | `200 OK` (404 Not Found) |
| `PATCH` | `/api/v1/tenants/{tenantId}/applicants/{id}/status` | 평가 상태 및 점수 갱신 | `ApplicantStatusUpdateRequest` | `200 OK` |
| `DELETE` | `/api/v1/tenants/{tenantId}/applicants/{id}` | 지원자 데이터 삭제 | 없음 | `200 OK` |

---

## 📡 평가 결과 및 Human-Gate 승인 REST API 명세

| Method | Endpoint | 설명 | 요청 본문 | 응답 |
|---|---|---|---|---|
| `POST` | `/api/v1/tenants/{tenantId}/applicants/{id}/evaluation` | AI 평가 결과 및 근거 문장 일괄 저장 | `EvaluationSaveRequest` | `201 Created` |
| `GET` | `/api/v1/tenants/{tenantId}/applicants/{id}/evaluation` | 지원자 평가 결과 및 근거 문장 조회 | 없음 | `200 OK` (404 Not Found) |
| `PATCH` | `/api/v1/tenants/{tenantId}/applicants/{id}/evaluation/approve` | 인간 검토관 최종 서명 승인 (Human-Gate 잠금 해제) | `EvaluationApprovalRequest` | `200 OK` |

---

## 📡 면접관 채점표 및 실시간 집계 REST API 명세

| Method | Endpoint | 설명 | 요청 본문 | 응답 |
|---|---|---|---|---|
| `POST` | `/api/v1/tenants/{tenantId}/applicants/{id}/interviews` | 면접관 개별 1-Click 채점표 및 질문 평가 제출 (Upsert) | `InterviewScorecardSubmitRequest` | `201 Created` |
| `GET` | `/api/v1/tenants/{tenantId}/applicants/{id}/interviews` | 다중 면접관 채점표 및 종합 집계(평균점수, 합격합의) 조회 | 없음 | `200 OK` |





