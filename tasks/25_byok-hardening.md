# 25. BYOK(개인 키) 모드 개선

- 우선순위: P2
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
키가 틀려도(400) 모델 3종 × 2회 = 6번 호출합니다. 키가 URL 쿼리(`?key=`)와 localStorage에 노출되고, 키 저장 후에도 헤더가 "B2B 일괄 결제"로 표시됩니다.

## 관련 파일
- `src/services/agents/geminiClient.js`
- `src/services/aiEvaluator.js`
- `src/components/ApiKeyModal.jsx`

## 할 일
- [ ] 400/401/403은 재시도·모델 폴백하지 않음
- [ ] 키는 `x-goog-api-key` 헤더로 전송
- [ ] 헤더에 현재 모드 정확히 표시
- [ ] (장기) 서버 키 방식이 안정되면 BYOK 제거 검토

## 완료 기준
- 잘못된 키로 평가 시 호출 1회, 명확한 안내
