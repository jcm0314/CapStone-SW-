# 📅 날짜별 작업 일지 (Daily Work Log & Changelog)

본 문서는 **HR AX Smart Evaluator** 프로젝트의 날짜별 진행 작업, 구현된 기능, 기술적 결정 및 커밋 내역을 기록하는 공식 작업 일지입니다.

---

## 📌 [2026-09-17] Google Opal(Google Labs) AI 워크플로우 도구 연동 계획 수립

### 🔮 1. Google Opal (Vibe-coding AI Workflow Builder) 활용 정의
- **개념**: Google Labs에서 제공하는 노코드/로코드 비주얼 AI 워크플로우 빌더로, Gemini LLM 노드를 시각적으로 연결하여 AI 미니앱 파이프라인 구축.
- **프로젝트 활용 영역**:
  1. `[자소서 입력] ➔ [근거 캡처 노드] ➔ [역량 점수화 노드] ➔ [면접 질문 생성 노드]` AI 파이프라인의 **시각적 노드 프로토타이핑**.
  2. Opal 노드 에디터에서 검증된 프롬프트 체인을 본 시스템의 `aiEvaluator.js` 및 Gemini API 연동 코드에 실시간 이식.
  3. 발표 데모 시 Visual Proof 노드 맵으로 활용하여 시각적 설득력 극대화.

---

## 📌 [2026-09-16] 프로젝트 기획, 아키텍처 설계, 발표용 HTML 제작 및 깃허브 원격 동기화

### 🎤 1. 키워드 중심 고가독성 중간 발표용 HTML 개편 (`presentation.html`)
- **6대 목차 키워드화**: 문제 정의, 사용자, 핵심 가치, 실현 가능성 ROI 수치, 시스템 설명, GitHub 링크 포함 발표용 웹페이지 제작.

---

### 📜 커밋 히스토리 (Recent Commits)

```bash
* 374c95e refactor: presentation.html 발표용 웹페이지를 핵심 키워드 중심 고가독성 디자인으로 개편
* e91ead3 feat: 6대 목차 포함 중간 발표용 presentation.html 작성
```

---

© 2026 HR AX Smart Evaluator Daily Work Log.
