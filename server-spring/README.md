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
