# 13. 협업 메모 "Live Sync" 주기적 동기화(폴링) 구현

- 우선순위: P2
- 상태: 완료

## 배경
- README ④와 COLLABORATION_SPEC은 "Supabase Realtime WebSocket 기반 실시간 양방향 Live 동기화"를 주장합니다.
- 실제 `src/components/InterviewerCollaborationPanel.jsx`는 `shareId`가 바뀔 때 **한 번만** 조회합니다. 다른 면접관이 남긴 메모는 새로고침해야 보입니다.
- shareId가 없을 때는 모든 지원자에게 같은 하드코딩 안내 메모("대규모 트래픽 튜닝 경험…")를 보여 줍니다.
- Supabase Realtime 연동은 외부 계정이 필요해서 16번에서 보류합니다. 여기서는 기존 게이트웨이 API를 이용한 폴링으로 최소한의 동기화를 구현합니다.

## 목표
- shareId가 있으면 일정 주기(10초)로 메모를 다시 조회해서 다른 면접관의 메모를 반영합니다.

## 작업 내용
- [x] `useEffect`에 `setInterval` 폴링 추가, 언마운트 시 정리
- [x] 탭이 숨겨져 있으면(`document.hidden`) 폴링 건너뛰기
- [x] shareId가 없을 때의 기본 메모를 지원자와 무관한 중립 안내 문구로 변경

## 완료 기준
- 정적 검사 통과, 폴링 정리(clearInterval) 코드 존재

## 진행 기록
- 2026-11-10 변경 파일: `src/components/InterviewerCollaborationPanel.jsx`
  - `NOTES_POLL_INTERVAL_MS = 10000`. shareId가 있을 때만 `setInterval(fetchNotes)`를 돌리고, 탭이 숨겨져 있으면 건너뜁니다.
  - cleanup에서 `clearInterval`을 호출하고 `isMounted = false`로 바꿉니다. shareId나 지원자가 바뀔 때, 언마운트될 때 정리됩니다.
  - shareId가 없을 때 보여 주던, 특정 지원자 내용("대규모 트래픽 튜닝…")이 하드코딩된 가짜 메모를 중립 안내 메모(작성자 Check-Mate, role SYSTEM)로 바꿨습니다.
- 검증: 정적 import 검사 `errors=0 warnings=0`
- 남은 한계
  - 폴링 간격은 10초로 "실시간"이 아닙니다. 진짜 push 방식은 16번(Supabase Realtime)에서 다룹니다.
  - `App.jsx`의 `activeShareId`는 `?share=` 링크로 들어왔을 때만 설정됩니다. 그래서 링크를 **생성한** 담당자의 화면은 여전히 로컬 모드입니다. ShareModal 생성 결과를 App 상태로 올리는 작업은 UX 결정이 필요해서 남겨 두었습니다.
  - 게이트웨이 메모 저장소는 메모리 `Map`이어서 인스턴스가 여러 개면 일관성이 없습니다(17번).
