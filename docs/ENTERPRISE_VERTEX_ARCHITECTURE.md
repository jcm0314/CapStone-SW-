# 🏛️ Enterprise Vertex AI & HR AX System Architecture Spec (대기업 환경 아키텍처 규격)

본 문서는 대기업(Enterprise) 환경에서 Google Cloud **Vertex AI** 및 **Enterprise Service Proxy**를 활용하여 HR AX 시스템을 구축할 때 적용하는 엔지니어링 아키텍처 규격서입니다.

---

## 🏗️ 1. 대기업 HR AX 시스템과 일반 프로젝트의 차이점

| 구분 | 일반 소규모 프로젝트 | 대기업 엔터프라이즈 환경 (Enterprise Spec) |
| :--- | :--- | :--- |
| **AI 엔드포인트** | Consumer Gemini API (`generativelanguage`) | **Google Cloud Vertex AI (`@google-cloud/vertexai`)** |
| **인증 방식** | 클라이언트 API Key 직접 입력 | **IAM Service Account + OAuth 2.0 Bearer Token** |
| **통신 구조** | Browser ➔ Google Direct API | **Browser ➔ Enterprise Proxy Gateway ➔ Vertex AI** |
| **보안 및 PII** | 클라이언트단 단선 처리 | **API Gateway 단 PII 마스킹 + Zero Data Retention** |
| **감사 이력 (Audit)** | 브라우저 세션 저장소 | **Google BigQuery & Cloud Storage (GCS) Audit Logs** |
| **SLA & Rate Limit** | Free Tier / Basic Quota | **Provisioned Throughput (SLA 99.9%) + Throttling Queue** |

---

## 📐 2. 대기업 엔터프라이즈 통합 아키텍처 다이어그램

```mermaid
graph TB
    subgraph Client_Layer [1. Enterprise Client Layer (React SPA)]
        UI[HR Dashboard & Evidence Viewer]
        UI_Criteria[Job Competency Configurator]
    end

    subgraph Security_Gateway_Layer [2. Enterprise API Gateway (Node.js Proxy)]
        Auth[OAuth2 / IAM Token Validator]
        PII_Filter[Enterprise PII Anonymizer Filter]
        RateLimiter[Exponential Backoff Throttling Queue]
    end

    subgraph GCP_Vertex_Layer [3. Google Cloud Enterprise Platform]
        VertexAI[Google Cloud Vertex AI (Gemini 2.5 / 1.5 Flash)]
        BigQuery[(Google BigQuery Audit Log Storage)]
        GCS[(Cloud Storage Document Vault)]
    end

    UI & UI_Criteria --> Auth
    Auth --> PII_Filter
    PII_Filter --> RateLimiter
    RateLimiter --> VertexAI
    RateLimiter --> BigQuery
    VertexAI --> GCS
```

---

## ⚙️ 3. 대기업 엔터프라이즈 5대 구축 규정

### ① Google Cloud Vertex AI SDK 바인딩
- `generativelanguage.googleapis.com` 대신 `Google Cloud Vertex AI SDK` (`@google-cloud/vertexai`) 지원 엔드포인트 구성.
- GCP Project ID, Location (`asia-northeast3` 서울 리전), Service Account 인증 구조 수립.

### ② Enterprise Service Proxy Gateway (`server/proxyServer.js`)
- 브라우저에 API Key나 Service Account 비밀키가 노출되지 않도록 서버사이드 프록시 레이어 구축.
- Express API Gateway를 통해 CORS, Rate Limiting, IAM 토큰 갱신 자동화.

### ③ Zero Data Retention & Enterprise Data Governance
- "Google Cloud Vertex AI Enterprise 약관: 고객 데이터는 파운데이션 모델 학습에 일절 사용되지 않음" 규정 준수.

### ④ BigQuery 감사 로그 (Audit Trail) 스키마 수립
- 인사 서류 평가 결과, 본문 캡처 근거, 평가자 IP 및 직무 가중치를 BigQuery 이력 테이블에 저장하여 설명 가능성(Explainability) 100% 확보.

### ⑤ 순수 엔터프라이즈 Vertex AI 파이프라인 일원화
- 소비자용 Gemini API Key 직접 입력 방식 및 로컬 fallback 룰기반 모드를 완전 제거.
- Express API Gateway (`server/proxyServer.js`) ➔ `@google-cloud/vertexai` IAM Bearer Token 전용 통신 파이프라인으로 단일화하여 대기업 데이터 거버넌스 및 보안 스펙 강제.

---

© 2026 HR AX Smart Evaluator Enterprise Architecture Document.
