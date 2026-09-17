# 🎯 HR AX Smart Evaluator (근거 기반 자기소개서 AI 역량 평가 시스템)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite)](https://vitejs.dev/)
[![Gemini AI](https://img.shields.io/badge/Google_Gemini-2.5_%2F_1.5_Flash-8E75B2?logo=google)](https://ai.google.dev/)
[![Vertex AI](https://img.shields.io/badge/Google_Cloud-Vertex_AI_Enterprise-4285F4?logo=google-cloud)](https://cloud.google.com/vertex-ai)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

> **처음 방문하셨나요? 👋**  
> **HR AX Smart Evaluator**는 인사담당자가 지원자의 자기소개서를 검토할 때, **주관적인 느낌이나 감을 배제하고 지원서 본문 속 실제 문장(근거, Grounding)을 바탕으로 객관적으로 점수화하고 면접 질문까지 자동으로 뽑아주는 인사(HR) 전용 AI 보조 플랫폼**입니다.

---

## 📌 목차 (Table of Contents)
- [1. 💡 이 프로젝트가 왜 필요한가요? (Why & Motivation)](#1--이-프로젝트가-왜-필요한가요-why--motivation)
- [2. 📊 현 채용 시장의 페인포인트 & 해결 수치 (Quantified Impact)](#2--현-채용-시장의-페인포인트--해결-수치-quantified-impact)
- [3. 🌟 주요 핵심 기능 5가지 (Key Features)](#3--주요-핵심-기능-5가지-key-features)
- [4. 🏛️ 대기업 Vertex AI 엔터프라이즈 아키텍처](#4-🏛️-대기업-vertex-ai-엔터프라이즈-아키텍처)
- [5. 🛠️ 커밋 및 협업 규칙 (1기능 1커밋 & 한글 커밋 규칙)](#5--커밋-및-협업-규칙-1기능-1커밋--한글-커밋-규칙)
- [6. 📂 프로젝트 구조 (Directory Structure)](#6--프로젝트-구조-directory-structure)
- [7. 📝 개발 및 커밋 히스토리 (Commit History)](#7--개발-및-커밋-히스토리-commit-history)
- [8. 📌 GitHub Issues & 기술 병목 관리 (Issues & Roadmap)](#8--github-issues--기술-병목-관리-issues--roadmap)
- [9. 🏛️ 대기업 표준 엔지니어링 규정 (Enterprise Guidelines)](#9-🏛️-대기업-표준-엔지니어링-규정-enterprise-guidelines)
- [10. 📅 날짜별 작업 일지 (Daily Work Log & Changelog)](#10--날짜별-작업-일지-daily-work-log--changelog)
- [11. 🎯 디테일 프로젝트 마일스톤 및 로드맵 (Milestones & Roadmap)](#11--디테일-프로젝트-마일스톤-및-로드맵-milestones--roadmap)

---

## 4. 🏛️ 대기업 Vertex AI 엔터프라이즈 아키텍처

대기업(Google, Samsung, Naver, Kakao 등)에서 HR AX 시스템을 도입할 때는 소비자용 API 키 대신 **Google Cloud Vertex AI Enterprise** 및 **Enterprise Service Proxy Gateway** 아키텍처([docs/ENTERPRISE_VERTEX_ARCHITECTURE.md](file:///C:/Users/jcm0314/.gemini/antigravity/scratch/hr-coverletter-evaluator/docs/ENTERPRISE_VERTEX_ARCHITECTURE.md))로 단일화하여 적용합니다:

1. **Google Cloud Vertex AI (`@google-cloud/vertexai`)**: IAM Service Account 및 OAuth 2.0 Bearer Token 기반 엔터프라이즈 인증.
2. **Enterprise Service Proxy Gateway (`server/proxyServer.js`)**: 브라우저 ➔ API Gateway ➔ Vertex AI 3-Tier 안전 프록시 통신 및 PII 마스킹.
3. **BigQuery Audit Trail & Cloud Storage (GCS)**: 채용 서류 평가 이력 및 원문 근거의 100% 감사 이력 보관.
4. **Enterprise Zero Data Retention**: 고객 데이터가 파운데이션 모델 재학습에 일절 사용되지 않는 데이터 거버넌스 준수.
5. **순수 엔터프라이즈 단일 파이프라인**: 소비자용 API 키 입력창 및 fallback 모드를 완전 제거하여 대기업 표준 보안 규정을 엄격하게 강제.

---

## 6. 📂 프로젝트 구조 (Directory Structure)

```
hr-coverletter-evaluator/
├── README.md                          # 👈 이 문서 (지속 업데이트)
├── CHANGELOG.md                       # 날짜별 작업 일지 및 체인지로그
├── presentation.html                  # 6대 목차 포함 중간 발표용 프리미엄 HTML
├── index.html                         # 메인 HTML (Inter/Pretendard 폰트)
├── server/
│   └── proxyServer.js                 # 👈 대기업 API Gateway & BigQuery Audit 게이트웨이
├── docs/
│   ├── ARCHITECTURE.md                # 시스템 기본 아키텍처
│   ├── ENTERPRISE_VERTEX_ARCHITECTURE.md # 👈 대기업 Vertex AI 아키텍처 규격서
│   ├── ENTERPRISE_GUIDELINES.md       # 대기업 엔지니어링 표준 규정
│   ├── ISSUES.md                      # 기술 병목 및 고려사항 이슈 모음
│   └── MILESTONES.md                  # 5대 세분화 마일스톤 및 개발 로드맵
└── src/
    ├── services/                      # 👈 enterpriseVertexService.js (순수 Vertex AI 프록시 서비스)
    └── components/                    # 8대 UI 컴포넌트 모음
```

---

## 7. 📝 개발 및 커밋 히스토리 (Commit History)

| 커밋 태그 | 커밋 메시지 (Commit Message) | 구현 및 업데이트 내용 |
| :--- | :--- | :--- |
| `feat` | `feat: 대기업 환경 구축을 위한 Google Cloud Vertex AI 아키텍처 규격 및 프록시 게이트웨이 추가` | Vertex AI 규격서(ENTERPRISE_VERTEX_ARCHITECTURE.md), Express API Gateway 및 게이트웨이 통신 수립 |
| `refactor` | `refactor: presentation.html 발표용 웹페이지를 핵심 키워드 중심 고가독성 디자인으로 개편` | 텍스트 축소, 수치 지표 수직 강조, 키워드 중심 카드 UI로 발표 가독성 대폭 향상 |
| `refactor` | `refactor: Google Opal 및 소비자용 API 모드 제거, 순수 엔터프라이즈 Vertex AI 파이프라인으로 일원화` | Opal 및 클라이언트 API Key 모드 완전 배제, 대기업 프록시 아키텍처로 일원화 |

---

© 2026 HR AX Smart Evaluator Team. All rights reserved.
