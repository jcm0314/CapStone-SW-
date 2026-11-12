# Check-Mate 배포 가이드 (GCP Cloud Run)

> 대상: 프론트(`hr-evaluator-frontend`, nginx) + API 게이트웨이(`hr-evaluator-api-gateway`, Express)
> 리전: `asia-northeast3` (서울). **CI에는 배포 단계가 없으므로**, GCP 프로젝트 권한이 있는 사람이 이 문서대로 직접 실행해야 합니다.

## 0. 왜 이 문서가 필요한가 (#24)

| 증상 | 원인 |
|---|---|
| 평가·공유 시 `Unexpected token '<'` | 운영 프론트가 `VITE_API_GATEWAY_URL` **없이** 빌드됨 → 자기 주소(nginx)의 `/api/v1/evaluate` 를 호출 → `index.html`(HTML)을 받아 JSON 파싱 실패 |
| 운영 화면이 오래된 버전 | 운영 이미지가 10/20 빌드에서 멈춰 있음 (CI는 배포 안 함) |
| 게이트웨이 AI 호출 403 | GCP 프로젝트의 모델 API 가 비활성 상태 → 팀은 Claude API(`ANTHROPIC_API_KEY`)로 전환 중 |

이번 수정으로 **`VITE_API_GATEWAY_URL` 없이 production 빌드하면 빌드가 실패**합니다 (`vite.config.js`, `Dockerfile`). 같은 사고가 다시 배포되지 않습니다.

---

## 1. 준비물

- `gcloud` CLI ([설치](https://cloud.google.com/sdk/docs/install)) 와 로그인: `gcloud auth login`
- 프로젝트 권한: Cloud Run 관리자, Cloud Build 편집자, Secret Manager 관리자, 서비스 계정 사용자
- AI API 키: Anthropic Console 에서 발급한 Claude API 키 (`sk-ant-...`)

```bash
export PROJECT_ID=<GCP 프로젝트 ID>
export REGION=asia-northeast3
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com containerregistry.googleapis.com
```

이미 운영 중인 두 서비스 주소를 변수에 담습니다 (Cloud Run 주소는 서비스가 있는 한 바뀌지 않습니다).
```bash
export GW_URL=$(gcloud run services describe hr-evaluator-api-gateway --region $REGION --format='value(status.url)')
export FE_URL=$(gcloud run services describe hr-evaluator-frontend   --region $REGION --format='value(status.url)')
echo "gateway=$GW_URL  frontend=$FE_URL"
```
> 처음 만드는 경우: 게이트웨이를 먼저 배포(2-B의 1~2단계)해서 `GW_URL` 을 얻은 다음 프론트를 배포하고, 마지막에 게이트웨이 CORS 를 프론트 주소로 다시 설정하세요.

---

## 2. AI API 키를 Secret Manager 에 등록 (최초 1회)

키를 이미지·`.env`·저장소에 넣지 마세요. Secret Manager 에 두고 Cloud Run 이 환경변수로 주입합니다.

```bash
# 1) 시크릿 생성 (키는 셸 히스토리에 남지 않게 입력)
read -rs ANTHROPIC_KEY && printf '%s' "$ANTHROPIC_KEY" | \
  gcloud secrets create anthropic-api-key --replication-policy=automatic --data-file=-
unset ANTHROPIC_KEY

# 키 교체 시에는 새 버전 추가
#   read -rs ANTHROPIC_KEY && printf '%s' "$ANTHROPIC_KEY" | gcloud secrets versions add anthropic-api-key --data-file=-

# 2) Cloud Run 런타임 서비스 계정에 읽기 권한 부여 (기본: Compute 기본 서비스 계정)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding anthropic-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor
```

> ⚠️ 게이트웨이 코드가 `ANTHROPIC_API_KEY` 를 읽는 것은 **Claude API 전환 PR이 머지된 뒤**부터입니다.
> 그 전의 코드는 `GEMINI_API_KEY` 를 읽으며, 현재 GCP 모델 API 가 403 이므로 평가가 실패합니다. 전환 PR 머지 후 배포하세요.
> (권장) 공유 SSO 서명키도 시크릿으로: `sso-token-secret` 을 같은 방식으로 만들고 아래 `_GATEWAY_SECRETS` 에 `,SSO_TOKEN_SECRET=sso-token-secret:latest` 를 덧붙이세요. 미설정 시 코드의 기본 키가 쓰입니다.

---

## 3. 배포

### 3-A. Cloud Build 한 번에 (권장)

`cloudbuild.yaml` 이 **게이트웨이 → 프론트** 순서로 빌드·배포합니다. 프론트 빌드에 게이트웨이 주소가 들어갑니다.

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_VITE_API_GATEWAY_URL="$GW_URL",_CORS_ALLOWED_ORIGINS="$FE_URL"
```
- `_VITE_API_GATEWAY_URL` 을 빼먹으면 프론트 빌드 단계에서 `❌ VITE_API_GATEWAY_URL build-arg 가 필요합니다` 로 멈춥니다 (의도된 동작).
- 시크릿 이름이 다르면 `_GATEWAY_SECRETS='ANTHROPIC_API_KEY=<시크릿이름>:latest'` 를 추가로 넘기세요.

### 3-B. 단계별 수동 배포 (로컬 Docker 사용)

```bash
gcloud auth configure-docker

# 1) 게이트웨이 이미지
docker build -f server/Dockerfile -t gcr.io/$PROJECT_ID/hr-evaluator-api-gateway:latest .
docker push gcr.io/$PROJECT_ID/hr-evaluator-api-gateway:latest

# 2) 게이트웨이 배포 (AI 키는 시크릿, CORS 는 프론트 주소만)
gcloud run deploy hr-evaluator-api-gateway \
  --image=gcr.io/$PROJECT_ID/hr-evaluator-api-gateway:latest \
  --region=$REGION --platform=managed --allow-unauthenticated \
  --set-env-vars="^@^NODE_ENV=production@CORS_ALLOWED_ORIGINS=$FE_URL" \
  --set-secrets="ANTHROPIC_API_KEY=anthropic-api-key:latest"

# 3) 프론트 이미지 (게이트웨이 주소 필수)
docker build --build-arg VITE_API_GATEWAY_URL="$GW_URL" \
  -t gcr.io/$PROJECT_ID/hr-evaluator-frontend:latest .
docker push gcr.io/$PROJECT_ID/hr-evaluator-frontend:latest

# 4) 프론트 배포
gcloud run deploy hr-evaluator-frontend \
  --image=gcr.io/$PROJECT_ID/hr-evaluator-frontend:latest \
  --region=$REGION --platform=managed --allow-unauthenticated
```

---

## 4. 배포 후 스모크 체크

```bash
# 1) 게이트웨이 health → {"status":"UP",...}
curl -s "$GW_URL/health"; echo

# 2) 실제 평가 1건 (JSON 이 와야 정상, 30~60초 걸릴 수 있음)
curl -s -X POST "$GW_URL/api/v1/evaluate" \
  -H 'Content-Type: application/json' \
  -d '{"name":"스모크테스트","applyJobId":"tech_backend","rawText":"Redis 분산 락으로 결제 중복 처리를 막고 p99 지연을 40% 줄였습니다. 장애 회고를 주도해 재발을 막았습니다."}' \
  | head -c 400; echo

# 3) 운영 번들에 게이트웨이 주소가 들어갔는지 (1 이상이어야 정상)
BUNDLE=$(curl -s "$FE_URL/" | grep -o 'assets/index-[^"]*\.js' | head -1)
curl -s "$FE_URL/$BUNDLE" | grep -c "$GW_URL"

# 4) 게이트웨이 CORS 가 프론트 주소를 허용하는지
curl -si -X OPTIONS "$GW_URL/api/v1/evaluate" \
  -H "Origin: $FE_URL" -H 'Access-Control-Request-Method: POST' | grep -i '^access-control-allow-origin'

# 5) 프론트 자체는 /api 를 처리하지 않음 → 404 JSON 이 정상 (HTML 200 이면 nginx 설정 문제)
curl -s -o /dev/null -w '%{http_code}\n' -X POST "$FE_URL/api/v1/evaluate"
```
마지막으로 브라우저에서 `$FE_URL` 을 열어 지원자 1명을 평가해 보고, 개발자도구 Network 탭에서 요청이 `$GW_URL/api/v1/evaluate` 로 가는지 확인하세요.

### 실패 시 확인
| 결과 | 의미 / 조치 |
|---|---|
| 2)에서 `401 SERVER_API_KEY_NOT_CONFIGURED` | 시크릿이 연결되지 않았거나 코드가 아직 다른 키 이름을 읽음 → 2장 확인, Claude 전환 PR 머지 여부 확인 |
| 2)에서 `502 UPSTREAM_AI_FAILED` / 403 | AI 제공자 호출 실패 (키 오류·모델 API 비활성) → 게이트웨이 로그: `gcloud run services logs read hr-evaluator-api-gateway --region $REGION --limit 50` |
| 3)이 `0` | 프론트가 게이트웨이 주소 없이 빌드됨 → 3장 다시 (빌드 인자 확인) |
| 4)에 헤더 없음 | `CORS_ALLOWED_ORIGINS` 가 프론트 주소와 다름 (끝 `/` 없이 정확히) |
| 브라우저에서 `Unexpected token '<'` | 3)과 같은 원인. 캐시 문제면 강력 새로고침 |

### 롤백
```bash
gcloud run revisions list --service hr-evaluator-frontend --region $REGION
gcloud run services update-traffic hr-evaluator-frontend --region $REGION --to-revisions=<이전_리비전>=100
```

---

## 5. 로컬 / CI 참고
- 로컬 개발(`npm run dev`)은 `VITE_API_GATEWAY_URL` 이 없으면 `http://127.0.0.1:3001` 게이트웨이를 사용합니다.
- 로컬에서 production 빌드: `VITE_API_GATEWAY_URL=http://localhost:3001 npm run build`
- CI(`.github/workflows/ci-cd.yml`)는 저장소 변수 `VITE_API_GATEWAY_URL` 이 있으면 그 값, 없으면 placeholder(`https://api-gateway.ci-placeholder.invalid`)로 **빌드 확인만** 합니다. CI 산출물은 배포에 쓰지 마세요.
