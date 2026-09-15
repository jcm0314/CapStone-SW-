# 🏗️ HR AX Smart Evaluator Architecture & System Specification

이 문서는 **HR AX Smart Evaluator (근거 기반 자기소개서 AI 역량 평가 시스템)**의 시스템 아키텍처, 데이터 흐름, Grounding 추출 알고리즘, 및 ROI 분석 지표를 상세히 다룹니다.

---

## 1. 아키텍처 개요 (Architecture Overview)

본 시스템은 **프리미엄 싱글 페이지 앱(SPA)**으로 구성되어 있으며, 클라이언트 단에서 구동되는 **Grounding Evidence Parser**와 **Google Gemini API Client**를 통해 백엔드 서버 구축 없이도 안전하고 빠른 서류 분석 경험을 제공합니다.

### 🏛️ 레이어드 아키텍처 (Layered Architecture)

```mermaid
graph TB
    subgraph UI_Presentation_Layer [1. Presentation Layer (React + Tailwind)]
        View_Main[App Layout & Theme Provider]
        View_Criteria[Evaluation Criteria Form]
        View_Input[Applicant Text & Sample Switcher]
        View_Dashboard[Executive Summary & Score Gauge]
        View_Evidence[Interactive Sentence Highlighter]
        View_Interview[Interview Question Generator]
        View_Matrix[Applicant Matrix Comparison]
        View_Report[Export Modal & Report Print]
    end

    subgraph Service_Logic_Layer [2. Service & Engine Layer]
        Orchestrator[aiEvaluator Coordinator]
        GeminiService[Gemini API Prompt Engine]
        RuleEngine[Smart Heuristic Fallback Engine]
        SubstringMatcher[Exact Sentence Matcher & Tokenizer]
        ScoreCalculator[Weighted Score Aggregator]
    end

    subgraph Data_State_Layer [3. Data & State Layer]
        JobTemplates[Job Competency Templates]
        SampleApplicants[Preset Candidate Scenarios]
        AppState[Applicant Analysis State]
    end

    View_Criteria --> Orchestrator
    View_Input --> Orchestrator
    Orchestrator --> GeminiService & RuleEngine
    GeminiService & RuleEngine --> SubstringMatcher
    SubstringMatcher --> ScoreCalculator
    ScoreCalculator --> AppState
    AppState --> View_Dashboard & View_Evidence & View_Interview & View_Matrix & View_Report
```

---

## 2. Grounding Evidence Extraction 알고리즘

### 🔬 근거 캡처 및 문장 태깅 메커니즘
AI가 단순히 점수만 도출하는 문제를 해결하기 위해, 지원서 본문의 정확한 서브스트링(Exact Substring)을 캡처하여 화면상에 위치를 동적으로 매칭합니다.

```
[입력 본문 텍스트] 
  │
  ├─ 1. 문장 분할 (Sentence Tokenization)
  │
  ├─ 2. 근거 유형 판단 (Grounding Classification)
  │    ├─ 🟢 Positive: 정량적 수치 + 문제해결 행동 + 구체적 도구/방법론
  │    ├─ 🔴 Risk: 주관적 주장 + 상투적 미사여구 + AI 과장 패턴
  │    └─ 🟡 Verify: 성과 언급이 있으나 구체적 과업 내용 미비 (면접 검증 필요)
  │
  ├─ 3. 원문 서브스트링 매칭 (Exact Substring Matching)
  │    └─ 본문 내 quote 인덱스 탐색 ➔ <mark class="bg-emerald-500/20"> 태그 동적 삽입
  │
  └─ 4. 면접 질문 자동 맵핑 (Interview Question Mapping)
       └─ 🔴 / 🟡 태그 문장을 입력으로 수용 ➔ 질문 의도 및 체크리스트 생성
```

---

## 3. 데이터 스키마 상세 (Data Schemas)

### `JobProfile` (직무 및 가중치 템플릿)
```json
{
  "id": "tech_backend",
  "title": "백엔드 소프트웨어 엔지니어",
  "description": "대용량 트래픽 처리 및 데이터베이스 설계 역량이 중요한 직무",
  "competencies": [
    { "id": "problem_solving", "name": "문제 해결력 & 논리성", "weight": 30 },
    { "id": "tech_skill", "name": "직무 전문성 & 기술력", "weight": 30 },
    { "id": "teamwork", "name": "협업 & 커뮤니케이션", "weight": 20 },
    { "id": "growth", "name": "성장 가능성 & 주도성", "weight": 10 },
    { "id": "ethics", "name": "책임감 & 조직 적합성", "weight": 10 }
  ]
}
```

### `ApplicantAnalysis` (분석 결과 데이터)
```json
{
  "id": "app_101",
  "name": "김민준",
  "applyJob": "백엔드 소프트웨어 엔지니어",
  "summary": {
    "totalScore": 88,
    "decision": "STRONG_PASS",
    "decisionReason": "수치화된 성과와 구체적 아키텍처 개선 경험이 명확함.",
    "aiTextProbability": 12
  },
  "competencyScores": {
    "problem_solving": 92,
    "tech_skill": 90,
    "teamwork": 85,
    "growth": 80,
    "ethics": 85
  },
  "groundingEvidences": [
    {
      "id": "ev_1",
      "quote": "응답 속도가 3초로 느린 문제를 발견하고, Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.",
      "type": "positive",
      "competencyId": "problem_solving",
      "scoreImpact": 15,
      "title": "수치 기반 문제 해결 성과 명확",
      "explanation": "문제 상황(3초), 해결책(Redis 캐싱), 정량적 성과(86.6% 단축)가 완벽하게 서술됨."
    }
  ],
  "interviewQuestions": [
    {
      "id": "iq_1",
      "basedQuote": "Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.",
      "category": "직무 기술 검증",
      "question": "Redis 캐시 도입 시 데이터 정합성(Cache Invalidation) 문제는 어떻게 해결하셨습니까?",
      "intent": "캐시 적용 시 흔히 발생하는 데이터 불일치 대처 능력 검증",
      "checklist": ["캐시 만료 정책 설정 경험 유무", "DB 동기화 전략 설명 가능 여부"]
    }
  ]
}
```

---

## 4. 정량적 효과 및 ROI 산출식 (ROI Formulation)

### ⏱️ 서류 검토 절감 시간 산출식
$$\text{절감 시간} = N \times (T_{\text{manual}} - T_{\text{AX}}) = N \times (14\text{분} - 2.5\text{분}) = 11.5N\text{ (분)}$$
* (단, $N$ = 총 서류 제출 건수, 500건 기준 약 **95.8시간 절감**)

### 💰 채용 실패 손실 예방액 산출식
$$\text{예방 손실액} = N_{\text{hire}} \times \Delta R_{\text{turnover}} \times C_{\text{bad\_hire}}$$
* (단, $N_{\text{hire}} = 10\text{명}$, $\Delta R = 17.5\%\text{p}$, $C = 3,500\text{만 원}$ 기준 ➔ **연간 약 6,125만 원 절감 효과**)

---

© 2026 HR AX Smart Evaluator Documentation.
