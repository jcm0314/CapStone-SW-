# 20. 환각 인용(원문 매칭 실패) → verify 강제 전환

- 우선순위: P0
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
AI가 원문에 없는 문장을 근거로 내면 `startIndex = -1`이 되지만, 유형(positive 등)은 그대로 유지되어 **가짜 근거가 `+20점 (긍정)` 카드로 표시**됩니다. 설계 문서(AI_AGENT_PROMPT_SPEC, ENTERPRISE_AX_COMPLIANCE_GAP)의 "매칭 실패 시 verify 강제"가 구현되어 있지 않습니다.

## 관련 파일
- `src/services/workerService.js:36`
- `src/workers/evaluatorWorker.js:32`

## 할 일
- [ ] 매칭 실패(`startIndex === -1`) 시 `type = 'verify'`, `scoreImpact`는 0 이하로 고정
- [ ] 점수 계산에서 매칭 실패 근거의 가산점 제외
- [ ] `EvidenceViewer`에 "원문에서 찾지 못함" 표시
- [ ] 단위 테스트: 원문에 없는 quote → verify

## 완료 기준
- `scripts/e2e-smoke/mock_ai.mjs` 실행 시 환각 인용 카드가 🟡 검증필요로 표시
