# 08. 평가 캐시 키 충돌 및 캐시 히트 시 지원자명 불일치 수정

- 우선순위: P1
- 상태: 완료

## 배경
- README는 "SHA-256 In-Memory / Redis Cache"라고 설명합니다.
- 실제 `src/services/cacheService.js`의 `generateCacheKey`는 **앞 100자 + 전체 길이**의 32bit 해시만 씁니다.
  - 앞부분과 길이가 같고 뒷부분만 다른 두 자소서가 같은 키를 갖게 됩니다(충돌).
- `src/services/aiEvaluator.js`는 캐시가 히트하면 저장된 결과를 그대로 반환합니다.
  - 같은 본문을 다른 이름으로 평가하면 **이전 지원자의 `name`과 `id`가 그대로 반환**됩니다.

## 목표
- 본문 전체를 반영하는 캐시 키를 만들고, 캐시 히트 시에도 요청한 지원자명을 유지합니다.

## 작업 내용
- [x] `generateCacheKey`가 전체 본문(공백 정규화 후)을 해시하도록 변경 (동기 FNV-1a 64bit 상당, 기존 `cache_${jobId}_` 접두사 유지)
- [x] 캐시 히트 시 `name`을 요청값으로 덮어쓰기
- [x] 테스트 추가: 앞 100자가 같고 뒷부분만 다른 텍스트는 서로 다른 키를 가질 것

## 완료 기준
- 기존 `cacheService.test.js`의 2개 기대값이 유지되고, 신규 테스트가 추가될 것

## 진행 기록
- 2026-11-10 변경 파일
  - `src/services/cacheService.js`
    - `hashCode`(앞 100자만 해시)를 제거했습니다.
    - 공백을 정규화한 전체 본문에 FNV-1a 32bit를 서로 다른 seed로 2회 적용해 16자리 hex 키를 만듭니다.
    - 키 형식은 `cache_${jobId}_${len}_${hash}`이며, 기존 접두사를 유지합니다.
  - `src/services/aiEvaluator.js`: 캐시가 히트하면 `{ ...cachedResult, name }`으로 요청한 지원자명을 유지합니다.
  - `src/services/cacheService.test.js`: 테스트 2건 추가 (prefix 충돌 방지, 공백 차이 동일 키)
- 검증: 같은 알고리즘을 Python으로 재현해 실행했습니다.
  ```
  cache_tech_backend_123_61de88d391fa69bd   (prefix + '성과A')
  cache_tech_backend_123_62de8a668efa6504   (prefix + '성과B')  → 서로 다름
  True                                       (공백/줄바꿈 차이 → 동일 키)
  ```
  - 기존 테스트 2건(`toContain('cache_tech_backend')`, 서로 다른 키)의 기대값은 그대로 충족됩니다.
- 영향: 키 형식이 바뀌어서 기존 IndexedDB 캐시 항목은 더 이상 조회되지 않습니다. 재평가 시 1회 API 호출이 발생합니다.
- README의 "SHA-256" 표기는 14번에서 실제 구현(FNV-1a)에 맞게 정리합니다.
