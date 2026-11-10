# 10. Docker/nginx 환경에서 프론트엔드 → 게이트웨이 API 라우팅 결함 수정

- 우선순위: P1
- 상태: 완료

## 배경
- 프론트엔드(`src/services/aiEvaluator.js`, `shareService.js`)는 `VITE_API_GATEWAY_URL`이 없으면 `window.location.origin`으로 `/api/v1/*`를 호출합니다.
- `nginx.conf`에는 `/api` 프록시가 없습니다. 대신 `error_page 405 =200 $uri;`가 POST 405를 200으로 바꿉니다.
  - 그래서 `POST /api/v1/evaluate`가 **index.html을 200으로 반환**합니다. 그 결과 JSON 파싱 오류가 나고 원인을 알 수 없는 실패가 됩니다.
- `docker-compose.yml`도 프론트엔드 빌드에 게이트웨이 URL을 주입하지 않습니다.
- `Dockerfile`에는 `VITE_*` 빌드 인자가 없습니다.

## 목표
- docker-compose 로컬 환경에서 프론트엔드가 게이트웨이를 정상 호출하게 합니다.
- Cloud Run처럼 서비스가 분리된 환경에서는 빌드 인자로 URL을 주입할 수 있게 합니다.

## 작업 내용
- [x] `Dockerfile`에 `ARG VITE_API_GATEWAY_URL` → `ENV` 추가 (빌드 시 주입)
- [x] `docker-compose.yml` frontend 빌드 인자로 `VITE_API_GATEWAY_URL=http://localhost:3001` 전달
- [x] `nginx.conf`의 `error_page 405 =200 $uri;` 제거 (오류를 숨기는 핵)
- [x] `/api/`로 들어온 요청은 SPA 폴백 대신 JSON 404를 반환하게 해서, 원인 파악이 쉬운 오류로 만들기

## 완료 기준
- 설정 파일 정적 검토 완료
- 실제 컨테이너 기동 검증은 Docker가 없어서 보류하고 기록에 남길 것

## 진행 기록
- 2026-11-10 변경 파일
  - `Dockerfile` (builder 단계): `ARG VITE_API_GATEWAY_URL=""` + `ENV VITE_API_GATEWAY_URL=${VITE_API_GATEWAY_URL}`. `.dockerignore`가 `.env*`를 제외하므로, 빌드 인자 외에는 주입할 방법이 없습니다.
  - `docker-compose.yml`: frontend `build.args.VITE_API_GATEWAY_URL: http://localhost:3001`. 게이트웨이의 `CORS_ALLOWED_ORIGINS=http://localhost,...`와 맞습니다.
  - `nginx.conf`: `error_page 405 =200 $uri;`를 제거하고 `location /api/`에서 JSON 404(`API_GATEWAY_NOT_ROUTED`)를 반환합니다.
    - `aiEvaluator.analyzeWithBffGateway`는 `errJson.message`를 그대로 사용자에게 보여 주므로, 원인이 화면에 드러납니다.
    - `shareService`는 404일 때 기존대로 localStorage로 폴백합니다.
- 검증: Docker가 설치되어 있지 않아 `docker compose build/up`은 실행하지 못했습니다. 설정 문법은 정적으로 검토했습니다(nginx `return 404 '<json>'`과 `default_type`은 표준 문법).
- **확인 필요 (배포 영역, 보류 성격)**: `cloudbuild.yaml`은 frontend 이미지를 빌드할 때 `--build-arg VITE_API_GATEWAY_URL`을 넘기지 않습니다. 현재 Cloud Run 프론트엔드의 B2B 모드 요청은 같은 origin의 `/api`로 가는데, 이전 nginx는 이를 index.html(200)로 응답했을 가능성이 큽니다. 운영 게이트웨이 URL을 build-arg로 추가하는 일은 배포 설정 변경이라 사용자 결정에 맡깁니다. 예시: `'--build-arg', 'VITE_API_GATEWAY_URL=https://hr-evaluator-api-gateway-...run.app'`
