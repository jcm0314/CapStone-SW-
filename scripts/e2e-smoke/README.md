# e2e-smoke: 사용자 시나리오 스모크 테스트

실제 Chrome을 헤드리스로 띄워 버튼을 클릭하며 "사용자가 지금 무엇을 할 수 있는지"를 확인하는 스크립트입니다.
결과 리포트 예시: [`docs/troubleshooting/2026-11-12_user-scenario-report.md`](../../docs/troubleshooting/2026-11-12_user-scenario-report.md)

| 파일 | 하는 일 |
|---|---|
| `scenarios.mjs` | S01~S14 시나리오(첫 화면, AI 평가, 형광펜, HITL, 공유 링크, 메모, 비교, 테넌트 전환, 보고서, 업로드, BYOK)를 순서대로 실행. 네트워크·콘솔 에러·alert를 `events.txt`에 기록 |
| `mock_ai.mjs` | Gemini 응답만 가짜로 바꿔서 **API 키 없이** AI 파이프라인 전체를 검증. PII가 프롬프트/화면에 노출되는지, 원문에 없는 인용(환각)이 어떻게 표시되는지 확인 |

## 실행

```bash
npm i --no-save playwright-core@1.48.2      # package.json은 바뀌지 않음
# Chrome 경로가 다르면: export CHROME_PATH=/path/to/chrome
node scripts/e2e-smoke/scenarios.mjs <앱 URL> <결과 폴더>
node scripts/e2e-smoke/mock_ai.mjs   <앱 URL> <결과 폴더>
```

결과 폴더에 `report.txt`(시나리오별 ✅/❌), `events.txt`(네트워크·에러 로그), 스크린샷이 생깁니다.

## 알려진 한계

- 최신 코드는 AI 평가가 실패하면 API 키 설정 창을 자동으로 띄웁니다. 이 창이 열린 상태로 남으면 이후 일부 시나리오(S03, S11, S14)가 클릭 타임아웃으로 ❌가 될 수 있습니다. 앱 버그가 아니라 스크립트 한계입니다.
- `mock_ai.mjs`는 BYOK 모드(브라우저 → Google 직접 호출)를 가로채는 방식입니다. 서버(게이트웨이) 경유 경로는 검증하지 않습니다.
