# 21. 화면 본문 PII 원본 노출 수정 (#37-2)

- 우선순위: P0
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
프롬프트에는 마스킹본이 가지만, 평가 결과의 `rawText`가 **원본**(`originalRawText`)이라 "PII Masked" 배지 아래에 학교·전화·이메일이 그대로 보입니다. 마스킹본에서 뽑은 인용을 원본에서 찾으므로 매칭도 어긋날 수 있습니다.

## 관련 파일
- `src/services/aiEvaluator.js:91,104`
- `src/services/multiAgentEvaluator.js:36,161`
- `src/components/EvidenceViewer.jsx:65`

## 할 일
- [ ] 결과 객체에 `maskedText`(기본 표시)와 원본을 분리 저장
- [ ] EvidenceViewer 기본 렌더링 = 마스킹본, 원본 보기는 ADMIN 전용 토글
- [ ] 형광펜 매칭 기준 텍스트를 마스킹본으로 통일

## 완료 기준
- `mock_ai.mjs` 결과에서 화면 본문 PII가 `가려짐`
