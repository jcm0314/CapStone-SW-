# 22. 캐시 키에 테넌트·Prompt Studio 설정 포함 (#37-4)

- 우선순위: P1
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
현재 캐시 키는 `jobId + 본문 해시`뿐이라, 회사를 바꾸거나 Prompt Studio 설정을 바꿔도 **예전 결과가 0초 만에 반환**됩니다.

## 관련 파일
- `src/services/cacheService.js:14`

## 할 일
- [ ] 키에 `tenantId`, 가중치, Prompt Studio 설정 해시 추가
- [ ] 키 버전 prefix 변경(`v2_`)으로 기존 캐시 무효화
- [ ] 단위 테스트

## 완료 기준
- 설정 변경 후 재평가 시 캐시 미스
