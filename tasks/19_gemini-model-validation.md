# 19. Gemini 모델명/엔드포인트 실사용 검증

- 우선순위: P1
- 상태: 보류

## 배경
- 코드는 다음 모델 ID를 하드코딩합니다.
  - `src/services/agents/geminiClient.js`: `gemini-3.8-flash`, `gemini-3.5-flash-lite`
  - `server/index.js`: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-flash-latest`
  - `server/proxyServer.js`: `gemini-1.5-flash`
- 주석과 문서도 서로 다른 모델을 언급합니다. `geminiClient.js` 주석은 "gemini-1.5-flash", MILESTONES는 "Gemini 2.5/1.5", README는 "Gemini 3.8 Flash"입니다.
- `server/index.js`는 같은 API 키를 Vertex AI(`aiplatform.googleapis.com`) URL에 `?key=` 쿼리로도 시도합니다. 이 방식은 일반적인 Vertex 인증 방식(OAuth/서비스 계정)과 다릅니다.
- 실제로 사용할 수 있는지는 유효한 API 키로 `models.list`를 호출해야만 확인할 수 있습니다(유료 또는 외부 API 호출).

## 목표
- 실제로 사용 가능한 모델 ID를 확정하고, 코드·주석·문서를 하나로 맞춥니다.

## 작업 내용
- [ ] 사용자 API 키로 `GET /v1beta/models` 조회 (사용자 수행)
- [ ] 모델 ID 상수를 한 곳으로 모으고 환경변수로 재정의할 수 있게 하기
- [ ] Vertex 경로는 서비스 계정 인증으로 교체하거나 제거

## 완료 기준
- 확정 모델로 실제 평가 1건 성공 기록

## 진행 기록
- 2026-11-10 **보류** — 사유: 모델이 실제로 존재하는지 확인하려면 유효한 API 키로 외부(유료 가능) Google API를 호출해야 합니다. 키도 없고 호출 승인도 없습니다.
- 사용자 실행 예시 (키는 셸 환경변수로만 사용하고, 파일에 저장하지 마세요):
  ```bash
  curl -s -H "x-goog-api-key: $GEMINI_API_KEY" https://generativelanguage.googleapis.com/v1beta/models | grep '"name"'
  ```
- 확인 후 할 일: 모델 ID를 `geminiClient.js` 한 곳에 상수로 두고(`VITE_GEMINI_MODEL`, 서버는 `GEMINI_MODEL`로 재정의), `server/index.js`의 Vertex `?key=` 엔드포인트 시도는 제거하는 것을 권장합니다.
