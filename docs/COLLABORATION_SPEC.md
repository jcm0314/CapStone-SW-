# 📋 [Check-Mate] 팀 협업 및 기능 개발 기획서 (COLLABORATION_SPEC)

팀원(상윤 님)과 AI 어시스턴트(Claude)가 프로젝트의 맥락을 즉시 파악하고, 전체 구조 파악 후 상호 협업할 수 있도록 정리한 실전 기능 명세서입니다.

---

## 1. 프로젝트 핵심 요약 & 현재 상태

- **서비스 정의**: 50~300인 성장기 IT 스타트업을 위한 **1:1 형광펜 매칭 AI 서류 평가 & 면접 연계 플랫폼**
- **현재 구현 완료(Phase 1)**:
  - 7종 PII 실시간 마스킹 (블라인드 채용)
  - 1:1 형광펜 Evidence Grounding 및 Levenshtein 퓨지 매칭 (초록/빨강 시각화)
  - Gemini 3.8 Flash 4대 멀티에이전트 병렬 감사 파이프라인 (환각 0%)
  - Supabase Realtime WebSocket 기반 1-Click Share ID 다인 면접관 실시간 협업
  - Cloud Run 프로덕션 라이브 배포 및 Vitest 51개 단위 테스트 100% 통과 상태

---

## 2. 향후 협업 스프린트 과제 상세 스펙 (Sprint Backlog - 역할 분담: 논의 후 확정 예정)

> **관련 GitHub 이슈**: [Issue #15 (Feature Proposal & Scale-Up Roadmap)](https://github.com/jcm0314/CapStone-SW-/issues/15)  
> *※ 아래 과제들은 전체 코드베이스를 파악한 후, 상호 협의하여 역할을 구체적으로 나눈 뒤 순차적으로 진행합니다.*

### 🎯 Task 1. 대량 지원서 랭킹 Top-N 컷오프 슬라이더 (UI)
- **대상 컴포넌트**: `src/components/ApplicantComparison.jsx` 및 `src/components/DashboardSummary.jsx`
- **구현 내용**:
  1. 지원자 리스트 상단에 **'합격 커트라인(Cut-off) 슬라이더'** 제공 (예: `Top 10명`, `Top 30명`, `Top 50명`, `점수 80점 이상` 등).
  2. 슬라이더를 움직이면 테이블 내 지원자들의 상태가 실시간으로 **[합격권(PASS: 초록 뱃지)]**과 **[탈락권(CUT: 회색/빨간 뱃지)]**으로 즉각 분류됨.
  3. 테이블 상단에 통계 요약 표시:
     - 예: `"전체 지원자 120명 중 상위 30명 선발 (합격선: 82.5점 / 컷오프 탈락: 90명)"`

---

### 🎯 Task 2. 1-Click 일괄 합불 통보 모달 UI (Notification Workflow)
- **신규 컴포넌트**: `src/components/BatchNotificationModal.jsx` (신규 생성 추천)
- **구현 내용**:
  1. Task 1의 컷오프 테이블 상단에 `[1-Click 합불 결과 통보]` 버튼 배치.
  2. 버튼 클릭 시 모달 팝업 오픈:
     - **발송 대상 요약**: "합격 안내 대상: 30명 / 불합격(탈락) 안내 대상: 90명"
     - **발송 채널 선택 탭**: `이메일(Email)` / `문자메시지(SMS/알림톡)`
     - **메시지 템플릿 프리뷰**:
       - 합격자용: `"안녕하세요 {지원자명}님, Check-Mate 1차 서류 전형에 합격하셨습니다..."`
       - 불합격자용: `"귀하의 뛰어난 역량에도 불구하고 한정된 인원으로 인해..."`
     - **발송 시뮬레이션 및 발송 버튼**: 클릭 시 발송 프로그레스 바(0% ➔ 100%) 및 완료 토스트 알림 표시. (실제 백엔드 웹훅 연동 전 모의 시뮬레이션 인터랙션 완성)

---

### 🎯 Task 3. 서류 평가 ↔ 면접 현장 2-Track 뷰 분리 & 태그형 가중치
- **대상 컴포넌트**: `src/components/HITLEditorModal.jsx`, `src/components/EvaluationCriteria.jsx`, 메인 뷰
- **구현 내용**:
  1. **2-Track 토글 탭**:
     - `[📑 서류 정밀 검토 뷰]`: 자소서 원문 + 1:1 형광펜 + 4대 에이전트 상세 보고서 표시
     - `[🎙️ 면접관 라이브 뷰]`: 긴 자소서는 접고, **핵심 압박 질문 3종 + 답변 체크리스트 + 실시간 채점 슬라이더**만 집중 배치하여 면접관의 인지 과부하 제거
  2. **태그(Badge/Chip) 기반 직무 가중치 제어**:
     - 복잡한 숫자 입력 대신 직무별 핵심 역량 태그 클릭(On/Off)으로 가중치 반영

---

## 3. 상윤 님이 본인의 Claude에게 전달할 온보딩 프롬프트 템플릿

상윤 님께서 본인의 Claude에게 아래 프롬프트를 전달하시면, 프로젝트 구조 파악 및 논의를 바로 시작할 수 있습니다:

```text
안녕 Claude! 나는 캡스톤 디자인 프로젝트 'Check-Mate'의 협업 팀원이야.
우리 프로젝트는 50~300인 IT 스타트업을 위한 '1:1 형광펜 AI 서류 평가 및 면접 연계 플랫폼'이야.

저장소: https://github.com/jcm0314/CapStone-SW-
CONTRIBUTING.md와 docs/COLLABORATION_SPEC.md 문서를 참고해서 전체 프로젝트 구조를 먼저 파악하려고 해.

현재 상태:
1. React 18 + Vite + Tailwind CSS 프론트엔드
2. Gemini 3.8 Flash 4대 멀티에이전트 파이프라인 (src/services/agents/)
3. Supabase Realtime & RLS 실시간 협업 시스템
4. 51개 단위 테스트(npm test)가 100% 통과된 상태

먼저 프로젝트의 전체 아키텍처와 주요 컴포넌트(src/components/), 서비스 흐름을 분석하고 내가 어떤 영역부터 파악하면 좋을지 가이드해줘!
```

---

## 4. 로컬 테스트 및 커밋 가이드

```bash
# 1. 브랜치 생성
git checkout main
git pull origin main
git checkout -b feat/17-batch-cutoff

# 2. 코드 작업 및 로컬 테스트
npm run dev     # 화면 확인
npm test        # 51개 테스트 통과 확인 필수!

# 3. 커밋 및 푸시
git add .
git commit -m "feat: implement top-N cutoff slider and batch notification modal (#17)"
git push origin feat/17-batch-cutoff

# 4. GitHub 웹에서 main을 향해 PR 생성!
```
