import { anonymizePII } from '../utils/piiAnonymizer';
import { enrichEvidences } from '../utils/evidenceEnricher';

/**
 * 시연 영상 제작용 임시 Mock 지원자 데이터 (4인)
 * - 실제 7종 PII 마스킹 토큰 및 원문 근거 오프셋 매칭 포함
 */
export function getDemoApplicants(tenantId = 'toss-payments') {
  const candidates = [
    {
      id: 'demo-kim-minjun',
      name: '김민준',
      orgId: tenantId,
      applyJobId: 'tech_backend',
      rawText: `[지원 동기 및 직무 역량]
안녕하세요. [성명 익명화]입니다. ([학교명 익명화] 컴퓨터공학과 졸업, 연락처: [전화번호 익명화])
지난 3년간 E-커머스 플랫폼에서 결제 및 정산 백엔드 개발을 담당했습니다.
초기 주문 API의 평균 응답 속도가 3.2초로 느려 결제 이탈률이 높았던 문제를 발견했습니다. 이를 해결하기 위해 실행 계획을 분석하여 복합 인덱스를 재설계하고, Redis 인메모리 캐싱 계층을 도입해 평균 응답 속도를 0.42초로 86.8% 단축했습니다.

[트러블슈팅 및 협업 경험]
블랙프라이데이 트래픽 폭증 시 DB 커넥션 풀 고갈 장애가 발생했으나, 비동기 메시지 큐(Kafka) 기반 주문 파이프라인 분리 및 서킷 브레이커 적용으로 가용성 99.98%를 확보했습니다. 매주 백엔드·인프라 팀과 장애 회고 문서를 공유하며 재발 방지 체계를 구축했습니다.`,
      analysis: {
        summary: {
          totalScore: 92,
          decision: 'STRONG_PASS',
          decisionReason: '문제 상황(3.2초 지연) → 기술적 조치(인덱스·Redis) → 수치적 성과(0.42초, 86.8% 단축)의 인과관계가 원문에서 명확히 검증되었습니다.',
          aiTextProbability: 12
        },
        competencyScores: {
          problem_solving: 95,
          tech_skill: 94,
          teamwork: 88,
          growth: 90,
          ethics: 89
        },
        groundingEvidences: [
          {
            quote: 'Redis 인메모리 캐싱 계층을 도입해 평균 응답 속도를 0.42초로 86.8% 단축했습니다.',
            type: 'positive',
            rationale: '수치 기반의 정량적 성능 개선 근거가 명확하게 제시됨',
            competencyId: 'tech_skill'
          },
          {
            quote: '비동기 메시지 큐(Kafka) 기반 주문 파이프라인 분리 및 서킷 브레이커 적용으로 가용성 99.98%를 확보했습니다.',
            type: 'positive',
            rationale: '대규모 트래픽 장애 해결 아키텍처 역량이 구체적으로 확인됨',
            competencyId: 'problem_solving'
          },
          {
            quote: '매주 백엔드·인프라 팀과 장애 회고 문서를 공유하며 재발 방지 체계를 구축했습니다.',
            type: 'positive',
            rationale: '타 직군과의 체계적인 협업 및 문서화 습관 확인',
            competencyId: 'teamwork'
          }
        ],
        interviewQuestions: [
          {
            question: 'Redis 캐싱 도입 시 캐시 만료 시점에 트래픽이 몰리는 Cache Stampede 현상은 어떻게 방어하셨나요?',
            intent: '단순 캐시 적용을 넘어 동시성 및 장애 대응 깊이 검증',
            category: '기술 심층'
          },
          {
            question: 'Kafka 비동기 파이프라인으로 분리한 뒤 결제 정합성(Idempotency)과 분산 트랜잭션은 어떻게 보장하셨나요?',
            intent: '결제 도메인 핵심인 데이터 무결성 설계 역량 확인',
            category: '아키텍처'
          },
          {
            question: '장애 회고 이후 팀 내 재발 방지 액션 아이템 중 가장 실질적인 효과를 본 개선은 무엇이었나요?',
            intent: '실제 주도적 기여도 및 협업 과정 검증',
            category: '협업·주도성'
          }
        ],
        isHumanVerified: true,
        reviewerNote: '정량 성과 수치 명확. 1차 기술 면접 우선 배정 권장.'
      }
    },
    {
      id: 'demo-lee-seoyeon',
      name: '이서연',
      orgId: tenantId,
      applyJobId: 'tech_backend',
      rawText: `[프론트엔드 성능 최적화 경험]
안녕하세요. [성명 익명화]입니다. ([이메일 익명화])
B2B SaaS 대시보드 개발 과정에서 10,000건 이상의 지원자 데이터를 한 화면에 렌더링할 때 프레임 드랍(12fps)이 발생했습니다.
react-window 기반 가상 스크롤을 적용해 DOM 노드 수를 98% 줄이고 렌더링 속도를 16ms 이내(60fps)로 유지했습니다. 또한 Web Worker를 도입해 대용량 텍스트 정규식 처리를 백그라운드 스레드로 분리하여 UI 프리징을 제거했습니다.`,
      analysis: {
        summary: {
          totalScore: 88,
          decision: 'INTERVIEW',
          decisionReason: '브라우저 렌더링 병목 원인을 정확히 진단하고 가상 스크롤 및 Web Worker로 해결한 실무 역량이 우수합니다.',
          aiTextProbability: 15
        },
        competencyScores: {
          problem_solving: 90,
          tech_skill: 91,
          teamwork: 85,
          growth: 88,
          ethics: 86
        },
        groundingEvidences: [
          {
            quote: 'react-window 기반 가상 스크롤을 적용해 DOM 노드 수를 98% 줄이고 렌더링 속도를 16ms 이내(60fps)로 유지했습니다.',
            type: 'positive',
            rationale: '렌더링 최적화 수치(DOM 98% 감소, 16ms)가 구체적임',
            competencyId: 'tech_skill'
          },
          {
            quote: 'Web Worker를 도입해 대용량 텍스트 정규식 처리를 백그라운드 스레드로 분리하여 UI 프리징을 제거했습니다.',
            type: 'positive',
            rationale: '메인 스레드 블로킹 해소를 위한 멀티스레딩 적용 근거 확인',
            competencyId: 'problem_solving'
          }
        ],
        interviewQuestions: [
          {
            question: '가변 높이 Row가 포함된 가상 스크롤에서 스크롤 점프나 레이아웃 시프트는 어떻게 보정하셨나요?',
            intent: 'react-window 실제 구현 디테일 검증',
            category: '프론트엔드 심층'
          },
          {
            question: 'Web Worker와 메인 스레드 간 대용량 문자열 직렬화 비용(Structured Clone)을 줄이기 위해 어떤 최적화를 적용했나요?',
            intent: '브라우저 메모리 및 통신 비용 이해도 확인',
            category: '성능 최적화'
          }
        ],
        isHumanVerified: false,
        reviewerNote: ''
      }
    },
    {
      id: 'demo-park-dohyun',
      name: '박도현',
      orgId: tenantId,
      applyJobId: 'tech_backend',
      rawText: `[AI 에이전트 프로젝트 주도 경험]
저는 최신 LLM 모델을 단독으로 100% 바닥부터 사전 학습(Pre-training)시켜 모든 사내 문서 검색 정확도 99.9%를 달성했습니다.
팀원들의 도움 없이 기획부터 인프라 구축, 모델 학습까지 혼자서 일주일 만에 완벽하게 구축해 전사 서비스에 즉시 배포했습니다.`,
      analysis: {
        summary: {
          totalScore: 64,
          decision: 'HOLD',
          decisionReason: '단독 LLM 사전학습 및 정확도 99.9% 등 현실성이 낮은 과장 표현이 탐지되어 면접 시 사실 검증이 필수적입니다.',
          aiTextProbability: 78
        },
        competencyScores: {
          problem_solving: 62,
          tech_skill: 65,
          teamwork: 54,
          growth: 72,
          ethics: 68
        },
        groundingEvidences: [
          {
            quote: '최신 LLM 모델을 단독으로 100% 바닥부터 사전 학습(Pre-training)시켜 모든 사내 문서 검색 정확도 99.9%를 달성했습니다.',
            type: 'risk',
            rationale: '[Critic 감사] 일주일 내 단독 LLM Pre-training 및 99.9% 정확도는 자원·기술적으로 과장 의심이 매우 높음',
            competencyId: 'tech_skill'
          },
          {
            quote: '팀원들의 도움 없이 기획부터 인프라 구축, 모델 학습까지 혼자서 일주일 만에 완벽하게 구축해',
            type: 'verify',
            rationale: '[Critic 감사] 구체적 평가 데이터셋, RAG/파인튜닝 구분 및 협업 기여도 근거 누락',
            competencyId: 'teamwork'
          }
        ],
        interviewQuestions: [
          {
            question: 'LLM을 스크래치부터 Pre-training 하셨다고 했는데, 사용한 파라미터 규모, 토큰 수, GPU 클러스터 사양을 구체적으로 말씀해 주세요.',
            intent: 'Pre-training과 API/RAG 활용 간 과장 여부 팩트체크',
            category: '과장 검증 압박'
          },
          {
            question: '검색 정확도 99.9%는 어떤 벤치마크 데이터셋과 평가 지표(Recall@K, MRR 등)로 측정하신 수치인가요?',
            intent: '모호한 정량 지표의 산출 근거 검증',
            category: '지표 검증'
          }
        ],
        isHumanVerified: false,
        reviewerNote: ''
      }
    },
    {
      id: 'demo-choi-yujin',
      name: '최유진',
      orgId: tenantId,
      applyJobId: 'tech_backend',
      rawText: `[데이터 파이프라인 고도화]
실시간 로그 적재 파이프라인의 지연 시간이 45초 이상 발생해 실시간 이상 탐지가 어려웠습니다.
Kafka 파티션 키 재분배와 Flink 윈도우 집계를 도입해 End-to-End 데이터 처리 지연을 1.2초로 단축했고, 중복 적재율 0.01% 이하를 달성했습니다.`,
      analysis: {
        summary: {
          totalScore: 90,
          decision: 'STRONG_PASS',
          decisionReason: '스트리밍 파이프라인의 병목 지점을 정확히 파악하고 파티셔닝·윈도우 집계로 지연을 97% 이상 개선했습니다.',
          aiTextProbability: 14
        },
        competencyScores: {
          problem_solving: 92,
          tech_skill: 91,
          teamwork: 87,
          growth: 89,
          ethics: 90
        },
        groundingEvidences: [
          {
            quote: 'Kafka 파티션 키 재분배와 Flink 윈도우 집계를 도입해 End-to-End 데이터 처리 지연을 1.2초로 단축했고',
            type: 'positive',
            rationale: '스트리밍 아키텍처 개선을 통한 45초 → 1.2초 지연 단축 성과 명확',
            competencyId: 'tech_skill'
          }
        ],
        interviewQuestions: [
          {
            question: 'Kafka 파티션 키 재분배 과정에서 특정 키로 데이터가 쏠리는 Data Skew 현상은 어떻게 해결하셨나요?',
            intent: '대규모 스트리밍 처리 실전 경험 확인',
            category: '데이터 엔지니어링'
          }
        ],
        isHumanVerified: true,
        reviewerNote: '데이터 플랫폼 팀 1차 면접 추천.'
      }
    }
  ];

  return candidates.map((c) => ({
    ...c,
    piiMaskedText: c.rawText,
    analysis: {
      ...c.analysis,
      groundingEvidences: enrichEvidences(c.rawText, c.analysis.groundingEvidences)
    }
  }));
}

/**
 * 시연 영상 녹화 중 [새 평가 실행] 클릭 시 게이트웨이 미연결/API키 미설정 상태에서도
 * 실시간 PII 마스킹 + 원문 오프셋 매칭 결과를 즉시 체험할 수 있는 임시 Mock 평가 생성기
 */
export function buildDemoEvaluation({ name, applyJobId, rawText, tenantId }) {
  const piiResult = anonymizePII(rawText, name);
  const cleanText = piiResult.anonymizedText || rawText;

  // 원문에서 가장 의미 있는 문장 2개를 추출해 실제 Fuzzy 오프셋 매칭 적용
  const sentences = cleanText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);

  const quote1 = sentences[0] || cleanText.slice(0, 80);
  const quote2 = sentences[1] || sentences[0] || cleanText.slice(0, 80);

  const rawEvidences = [
    {
      quote: quote1,
      type: 'positive',
      rationale: '원문에서 핵심 실행 경험 및 직무 연관 근거가 확인되었습니다.',
      competencyId: 'problem_solving'
    },
    {
      quote: quote2,
      type: 'verify',
      rationale: '[Critic 교차 감사] 정량적 검증 수치 및 본인의 구체적 기여 범위 추가 확인 권장',
      competencyId: 'tech_skill'
    }
  ];

  const enrichedEvidences = enrichEvidences(cleanText, rawEvidences);

  return {
    id: `demo_${Date.now()}`,
    name: name || '신규 지원자',
    orgId: tenantId || 'toss-payments',
    applyJobId: applyJobId || 'tech_backend',
    rawText: cleanText,
    piiMaskedText: cleanText,
    piiMeta: piiResult,
    mode: 'DEMO_MOCK_PREVIEW',
    analysis: {
      summary: {
        totalScore: 89,
        decision: 'INTERVIEW',
        decisionReason: '7종 PII 로컬 비식별화 및 4-Agent 교차 검증 결과, 실무 문제 해결 역량이 우수하여 면접 검증을 권장합니다.',
        aiTextProbability: 16
      },
      competencyScores: {
        problem_solving: 91,
        tech_skill: 90,
        teamwork: 87,
        growth: 88,
        ethics: 89
      },
      groundingEvidences: enrichedEvidences,
      interviewQuestions: [
        {
          question: '서류에 작성해주신 핵심 성과에서 본인이 직접 설계·구현한 영역과 팀원과의 역할 분담을 구체적으로 설명해주세요.',
          intent: '실제 개인 기여도 및 기술적 깊이 검증',
          category: '기여도 검증'
        },
        {
          question: '해당 문제를 해결할 때 고려했던 대안 기술과 최종 선택의 트레이드오프 근거는 무엇이었나요?',
          intent: '아키텍처 의사결정 논리 검증',
          category: '기술 심층'
        },
        {
          question: '배포 이후 예상치 못한 병목이나 장애가 발생했을 때 어떻게 모니터링하고 대응하셨나요?',
          intent: '운영 안정성 및 트러블슈팅 역량 확인',
          category: '운영 대응'
        }
      ],
      isHumanVerified: false,
      reviewerNote: ''
    }
  };
}
