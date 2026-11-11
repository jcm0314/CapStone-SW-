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


