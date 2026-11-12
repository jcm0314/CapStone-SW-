# 26. 첫 화면 샘플 결과에 "샘플" 표시

- 우선순위: P2
- 상태: 대기
- 근거: [트러블슈팅 리포트 2026-11-12](../docs/troubleshooting/2026-11-12_user-scenario-report.md)

## 문제
AI를 한 번도 돌리지 않았는데 92점 결과가 떠 있어, 사용자가 실제 AI 결과로 오해할 수 있습니다.

## 관련 파일
- `src/contexts/TenantContext.jsx`
- `src/data/sampleApplicants.js`
- 결과 헤더 컴포넌트

## 할 일
- [ ] 샘플 결과에 `🧪 샘플 데이터` 배지
- [ ] 또는 첫 화면을 빈 상태 + "샘플 불러오기" 버튼으로

## 완료 기준
- 첫 화면에서 샘플임이 한눈에 보임
