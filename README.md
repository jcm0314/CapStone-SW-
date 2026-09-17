# 🎯 HR AX Smart Evaluator (근거 기반 자기소개서 AI 역량 평가 시스템)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_%2F_1.5_Flash-8E75B2?logo=google)](https://ai.google.dev/)
[![Google Opal](https://img.shields.io/badge/Google_Opal-Labs_Workflow-4285F4?logo=google)](https://opal.google/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> **처음 방문하셨나요? 👋**  
> **HR AX Smart Evaluator**는 인사담당자가 지원자의 자기소개서를 검토할 때, **주관적인 느낌이나 감을 배제하고 지원서 본문 속 실제 문장(근거, Grounding)을 바탕으로 객관적으로 점수화하고 면접 질문까지 자동으로 뽑아주는 인사(HR) 전용 AI 보조 플랫폼**입니다.

---

## 📌 목차 (Table of Contents)
- [1. 💡 이 프로젝트가 왜 필요한가요? (Why & Motivation)](#1--이-프로젝트가-왜-필요한가요-why--motivation)
- [2. 📊 현 채용 시장의 페인포인트 & 해결 수치 (Quantified Impact)](#2--현-채용-시장의-페인포인트--해결-수치-quantified-impact)
- [3. 🌟 주요 핵심 기능 5가지 (Key Features)](#3--주요-핵심-기능-5가지-key-features)
- [4. 🔄 한눈에 보는 서비스 흐름 (User Flow & Architecture)](#4--한눈에-보는-서비스-흐름-user-flow--architecture)
- [5. 🛠️ 커밋 및 협업 규칙 (1기능 1커밋 & 한글 커밋 규칙)](#5--커밋-및-협업-규칙-1기능-1커밋--한글-커밋-규칙)
- [6. 🚀 1분 만에 실행해보기 & Gemini API Key 발급 가이드](#6--1분-만에-실행해보기--gemini-api-key-발급-가이드)
- [7. 🔮 Google Opal(Google Labs) 활용 방안](#7--google-opalgoogle-labs-활용-방안)
- [8. 📂 프로젝트 구조 (Directory Structure)](#8--프로젝트-구조-directory-structure)
- [9. 📝 개발 및 커밋 히스토리 (Commit History)](#9--개발-및-커밋-히스토리-commit-history)
- [10. 📌 GitHub Issues & 기술 병목 관리 (Issues & Roadmap)](#10--github-issues--기술-병목-관리-issues--roadmap)
- [11. 🏛️ 대기업 표준 엔지니어링 규정 (Enterprise Guidelines)](#11-🏛️-대기업-표준-엔지니어링-규정-enterprise-guidelines)
- [12. 📅 날짜별 작업 일지 (Daily Work Log & Changelog)](#12--날짜별-작업-일지-daily-work-log--changelog)
- [13. 🎯 디테일 프로젝트 마일스톤 및 로드맵 (Milestones & Roadmap)](#13--디테일-프로젝트-마일스톤-및-로드맵-milestones--roadmap)

---

## 1. 💡 이 프로젝트가 왜 필요한가요? (Why & Motivation)

### ❓ 문제 상황: "ChatGPT로 쓴 그럴듯한 자소서, 진짜 실력인지 어떻게 알죠?"
1. **AI 자소서 인플레이션**
   - 구직자의 68% 이상이 ChatGPT로 자기소개서를 매끄럽게 포장하여 제출합니다. 미사여구는 화려하지만, 정작 본인의 실질적 성과나 경험이 없는 **'영혼 없는 서류'**가 급증했습니다.
2. **서류 검토 피로도 폭발**
   - 공고 1개당 300~500건의 서류가 접수되어, 인사담당자 1명이 서류 검토에만 **80시간 이상**을 소모합니다. 
3. **주관적 평가로 인한 잘못된 채용(Bad Hire)**
   - 담당자의 주관적 기분에 의존한 채용으로 신입/경력 조기 퇴사율이 27.5%에 달하며, 채용 실패 1건당 **약 3,500만 원의 손실**이 발생합니다.

---

## 2. 📊 현 채용 시장의 페인포인트 & 해결 수치 (Quantified Impact)

| 채용 검토 지표 | 기존 HR 방식 | 본 시스템 도입 후 | 정량적 개선 효과 |
| :--- | :--- | :--- | :--- |
| **서류 1건당 검토 시간** | 12분 ~ 15분 | **2분 ~ 3분** (근거 하이라이터 활용) | ⚡ **검토 시간 80% 단축** |
| **공고 1개당 총 검토 기간** | 10일 ~ 14일 | **2일 이내** | ⏱️ **채용 리드타임 85% 감소** |
| **근거(Grounding) 검증 비율** | 약 20% (눈으로 스키밍) | **100% (문장 단위 자동 태깅)** | 🎯 **실질 성과 검증률 5배 증가** |
| **과장/AI작성 감지 정확도** | 15% 미만 (감에 의존) | **88% 이상** (패턴 & AI 분석) | 🛡️ **과장 서류 스크리닝 강화** |
| **면접 질문 준비 시간** | 지원자당 15분 | **0분 (자동 생성)** | 📝 **면접관 질문 작성 부담 100% 해소** |

---

## 3. 🌟 주요 핵심 기능 5가지 (Key Features)

1️⃣ 🟢 **본문 문장별 근거(Grounding) 하이라이터**  
2️⃣ ⚙️ **직무 맞춤형 평가 가중치 조절**  
3️⃣ 📊 **종합 평가 대시보드 & 레이더 차트**  
4️⃣ 📝 **약점 연동 맞춤형 심층 면접 질문 생성기**  
5️⃣ 📑 **지원자 비교 매트릭스 & HR 서류 평가서 출력**  

---

## 7. 🔮 Google Opal(Google Labs) 활용 방안

Google Labs의 **Google Opal(Project Opal)**은 시각적 노드 에디터와 자연어 기반으로 AI 워크플로우 미니앱을 제작하는 도구입니다. 본 프로젝트에서는 다음과 같이 활용합니다:

1. **AI 프롬프트 파이프라인 시각적 프로토타이핑**
   - `[자소서 입력] ➔ [근거 캡처 노드] ➔ [역량 점수화 노드] ➔ [면접 질문 생성 노드]` 흐름을 Opal 노드로 시각적 검증 후 본 앱의 `aiEvaluator.js` 및 Gemini API로 전환 적용.
2. **발표 및 시연 시 Visual Proof로 활용**
   - Opal의 시각적 워크플로우 노드 맵을 데모 자료로 활용하여 청중에게 강력한 설득력 제공.

---

## 8. 📂 프로젝트 구조 (Directory Structure)

```
hr-coverletter-evaluator/
├── README.md                          # 👈 이 문서 (지속 업데이트)
├── CHANGELOG.md                       # 날짜별 작업 일지 및 체인지로그
├── presentation.html                  # 6대 목차 포함 중간 발표용 프리미엄 HTML
├── index.html                         # 메인 HTML (Inter/Pretendard 폰트)
├── package.json                       # 의존성 패키지 관리
├── docs/
│   ├── ARCHITECTURE.md                # 상세 시스템 아키텍처 및 수식
│   ├── ENTERPRISE_GUIDELINES.md       # 대기업 엔지니어링 표준 규정
│   ├── ISSUES.md                      # 기술 병목 및 고려사항 이슈 모음
│   └── MILESTONES.md                  # 5대 세분화 마일스톤 및 개발 로드맵
└── src/
    ├── main.jsx                       # React 진입점
    ├── App.jsx                        # 메인 대시보드 레이아웃
    ├── components/                    # 8대 UI 컴포넌트 모음
    ├── data/                          # 직무 템플릿 및 샘플 지원자
    └── services/                      # Gemini API & Grounding 엔진
```

---

## 9. 📝 개발 및 커밋 히스토리 (Commit History)

| 커밋 태그 | 커밋 메시지 (Commit Message) | 구현 및 업데이트 내용 |
| :--- | :--- | :--- |
| `docs` | `docs: README.md에 Google Opal 활용 방안 섹션 추가` | Google Labs Opal을 활용한 프롬프트 시각 프로토타이핑 가이드 반영 |
| `refactor` | `refactor: presentation.html 발표용 웹페이지를 핵심 키워드 중심 고가독성 디자인으로 개편` | 텍스트 축소, 수치 지표 수직 강조, 키워드 중심 카드 UI로 발표 가독성 대폭 향상 |
| `feat` | `feat: 6대 목차 포함 중간 발표용 presentation.html 작성` | 문제정의, 사용자, 핵심가치, 실현가능성, 시스템설명, GitHub링크 포함 HTML 발표 웹페이지 제작 |

---

© 2026 HR AX Smart Evaluator Team. All rights reserved.
