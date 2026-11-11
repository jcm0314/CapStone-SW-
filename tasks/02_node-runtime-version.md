# 02. Node 런타임 버전 정합성 (CI/Docker Node 20 → 22)

- 우선순위: P0
- 상태: 완료

## 배경
- `package-lock.json` 기준 필수 Node 버전(engines)은 다음과 같습니다.
  - `vitest@5.0.3`: `^22.12.0 || ^24.0.0 || >=26.0.0`
  - `@supabase/auth-js`, `postgrest-js` 등 `2.118.0`: `>=22.0.0`
  - `@google-cloud/bigquery` 계열(common, paginator 등): `>=22`
- 그런데 실행 환경은 모두 Node 20입니다.
  - `.github/workflows/ci-cd.yml`: `node-version: '20'`
  - `Dockerfile`, `server/Dockerfile`, `Dockerfile.server`: `node:20-alpine`
- 이 상태로는 CI에서 `npm test`(vitest 5)가 실행되지 않거나 EBADENGINE 경고가 날 가능성이 높습니다.
- CI 스텝 이름은 "Execute Vitest Automated Test Suite (28 Tests)"로, README의 51개와도 맞지 않습니다.

## 목표
- 저장소 전체의 Node 기준 버전을 22 LTS로 통일하고, 그 기준을 명시합니다.

## 작업 내용
- [x] `package.json`에 `"engines": { "node": ">=22.12.0" }` 추가
- [x] `.nvmrc` 추가 (`22`)
- [x] CI `node-version`을 `'22'`로 변경하고 스텝 이름에서 고정 테스트 수 제거
- [x] `Dockerfile`, `server/Dockerfile`, `Dockerfile.server` 베이스 이미지를 `node:22-alpine`으로 변경
- [x] `server/Dockerfile`의 deprecated 옵션 `--only=production`을 `--omit=dev`로 교체

## 완료 기준
- 저장소 안에서 `node:20` / `node-version: '20'` 참조가 0건일 것
- engines 필드와 `.nvmrc`가 존재할 것

## 진행 기록
- 2026-11-10 변경 파일
  - `package.json`: `engines.node >=22.12.0` 추가 (vitest 5의 최소 요구 버전 `^22.12.0`에 맞춤)
  - `.nvmrc`: 신규 생성 (`22`)
  - `.github/workflows/ci-cd.yml`: Node 20 → 22, 스텝 이름의 "(28 Tests)" 제거
  - `Dockerfile`, `Dockerfile.server`, `server/Dockerfile`: `node:20-alpine` → `node:22-alpine`
  - `server/Dockerfile`: `npm ci --only=production` → `npm ci --omit=dev`
- 검증: `node:20|node-version: '20'|--only=production`을 저장소 전체(tasks 제외)에서 검색한 결과 **0건**입니다.
- 참고: `package-lock.json`은 수정하지 않았습니다. engines 필드는 `npm ci`의 lock 일치 검사 대상이 아니므로 영향이 없습니다. 실제 CI 통과 여부는 push가 필요해서 확인하지 못했습니다.
