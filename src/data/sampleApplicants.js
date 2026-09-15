export const SAMPLE_APPLICANTS = [
  {
    id: "app_101",
    name: "김민준",
    applyJobId: "tech_backend",
    applyJobTitle: "백엔드 소프트웨어 엔지니어",
    rawText: `[지원 동기 및 직무 역량]
지난 3년간 e-커머스 플랫폼에서 결제 시스템 백엔드 개발을 담당했습니다. 입사 초기 기존 시스템의 응답 속도가 3.2초로 느려 고객 탈락률이 높았던 문제를 발견하였습니다. 이를 해결하기 위해 데이터베이스 쿼리를 리팩토링하고 Redis 인메모리 캐싱 기법을 도입하여 평균 응답 속도를 0.42초로 86.8% 단축시켰습니다.

[문제 해결 및 협업 경험]
블랙 프라이데이 프로모션 기간 동안 분당 15만 건의 결제 요청이 몰려 서버가 마비될 위기에 직면했었습니다. 프론트엔드 팀 및 DevOps 팀과 긴급 TF를 구성하여 서킷 브레이커(Circuit Breaker) 패턴을 적용하고 분산 락(Distributed Lock)을 구현하여 단 한 건의 데이터 불일치 없이 이벤트를 무사히 처리했습니다.

[성장 및 도전]
기술적 성장에 안주하지 않고 매주 팀 내부에서 아키텍처 스터디를 주도하였으며, 신규 동료 2명의 온보딩을 위한 기술 가이드를 작성하여 팀 생산성 향상에 기여했습니다.`,
    analysis: {
      summary: {
        totalScore: 92,
        decision: "STRONG_PASS",
        decisionReason: "문제 상황(3.2초), 도구(Redis), 수치적 성과(86.8% 단축, 15만건 처리) 등 명확한 본문 근거가 존재함.",
        aiTextProbability: 12
      },
      competencyScores: {
        problem_solving: 95,
        tech_skill: 94,
        teamwork: 88,
        growth: 90,
        ethics: 86
      },
      groundingEvidences: [
        {
          id: "ev_1",
          quote: "Redis 인메모리 캐싱 기법을 도입하여 평균 응답 속도를 0.42초로 86.8% 단축시켰습니다.",
          type: "positive",
          competencyId: "problem_solving",
          scoreImpact: 15,
          title: "수치 기반 명확한 성능 개선 근거",
          explanation: "문제 원인 분석 후 정량적 성능 지표(86.8% 개선)를 명확히 제시함."
        },
        {
          id: "ev_2",
          quote: "서킷 브레이커(Circuit Breaker) 패턴을 적용하고 분산 락(Distributed Lock)을 구현하여 단 한 건의 데이터 불일치 없이 이벤트를 무사히 처리했습니다.",
          type: "positive",
          competencyId: "tech_skill",
          scoreImpact: 15,
          title: "고난도 분산 시스템 해결 능력",
          explanation: "대용량 트래픽 상황에서의 실제 장애 대처 및 기술적 솔루션 서술."
        },
        {
          id: "ev_3",
          quote: "매주 팀 내부에서 아키텍처 스터디를 주도하였으며, 신규 동료 2명의 온보딩을 위한 기술 가이드를 작성",
          type: "positive",
          competencyId: "growth",
          scoreImpact: 10,
          title: "팀 성장 및 지식 공유 주도",
          explanation: "개인 역량 개발에 그치지 않고 조직 전체의 성장 생태계 구축 노력 서술."
        },
        {
          id: "ev_4",
          quote: "프론트엔드 팀 및 DevOps 팀과 긴급 TF를 구성하여",
          type: "positive",
          competencyId: "teamwork",
          scoreImpact: 10,
          title: "타 직군과의 원활한 협업 경험",
          explanation: "위기 상황에서 부서 간 장벽을 허물고 협력한 구체적 진술."
        },
        {
          id: "ev_5",
          quote: "고객 탈락률이 높았던 문제를 발견하였습니다.",
          type: "verify",
          competencyId: "problem_solving",
          scoreImpact: 0,
          title: "고객 탈락률 정량 데이터 확인 필요",
          explanation: "성능 지표 외에 실제로 수반된 비즈니스 탈락률 수치 데이터 면접 시 확인 권장."
        }
      ],
      interviewQuestions: [
        {
          id: "iq_1",
          basedQuote: "Redis 인메모리 캐싱 기법을 도입하여 평균 응답 속도를 0.42초로 86.8% 단축시켰습니다.",
          category: "직무 기술 검증",
          question: "Redis 적용 시 캐시 데이터 정합성(Cache Invalidation) 및 Cache Stampede 현상은 어떻게 예방하셨습니까?",
          intent: "캐시 기술 도입 시 발생하는 고질적 데이터 불일치 및 서버 부하 상황 대처 능력 파악",
          checklist: ["캐시 만료(TTL) 전략 설명 가능 여부", "DB 동기화 패턴 구현 경험 확인"]
        },
        {
          id: "iq_2",
          basedQuote: "분산 락(Distributed Lock)을 구현하여 단 한 건의 데이터 불일치 없이 이벤트를 처리했습니다.",
          category: "아키텍처 구조 검증",
          question: "Redisson 또는 Redis Sentinel/Cluster 환경에서 분산 락 구현 시 락 획득 실패 시의 재시도(Backoff) 로직은 어떻게 작성하셨습니까?",
          intent: "실제 생산 환경에서의 분산 트랜잭션 구현 깊이 측정",
          checklist: ["스핀 락(Spin Lock) 과부하 예방 대책 제시", "락 타임아웃 처리 로직 서술"]
        }
      ]
    }
  },
  {
    id: "app_102",
    name: "이서연",
    applyJobId: "tech_backend",
    applyJobTitle: "백엔드 소프트웨어 엔지니어",
    rawText: `[자기소개 및 포부]
저는 어떠한 거친 풍파가 밀려와도 손쉽게 극복할 수 있는 최고의 열정을 가진 인재입니다. 수많은 프로젝트를 맡아 모든 직무에서 완벽한 성과를 거두었으며, 어떠한 어려운 기술적 역경도 저의 뛰어난 리더십과 논리적 사고력으로 성공리에 마무리지었습니다.

[직무 경험 및 성과]
개발자로서 항상 최신 기술을 빠르게 학습하여 최적의 코드를 작성했습니다. 백엔드 시스템 개선 작업에 참여하여 큰 폭의 성능 향상을 이루어냈으며, 동료들과 상시 소통하여 유연하게 프로젝트를 리드했습니다. 주어진 모든 업무를 완벽하게 해내는 최고의 실력자라고 자부합니다.

[지원 동기]
귀사에서 제 무한한 잠재력을 펼쳐 세계적인 탑클래스 엔지니어로 도약하고 싶습니다.`,
    analysis: {
      summary: {
        totalScore: 58,
        decision: "REJECT",
        decisionReason: "정량적 수치나 구체적 경험(Grounding)이 전혀 없으며, 과장 표현 및 AI 생성형 텍스트 위험도가 매우 높음.",
        aiTextProbability: 84
      },
      competencyScores: {
        problem_solving: 55,
        tech_skill: 52,
        teamwork: 60,
        growth: 65,
        ethics: 58
      },
      groundingEvidences: [
        {
          id: "ev_1",
          quote: "어떠한 거친 풍파가 밀려와도 손쉽게 극복할 수 있는 최고의 열정을 가진 인재입니다.",
          type: "risk",
          competencyId: "growth",
          scoreImpact: -10,
          title: "근거 없는 상투적 감성 표현",
          explanation: "구체적 문제 상황이나 행동 없이 추상적인 감성 수식어 나열."
        },
        {
          id: "ev_2",
          quote: "수많은 프로젝트를 맡아 모든 직무에서 완벽한 성과를 거두었으며",
          type: "risk",
          competencyId: "problem_solving",
          scoreImpact: -15,
          title: "객관적 성과 수치 결여 및 근거 미비 주장",
          explanation: "'완벽한 성과'라는 주장에 대한 정량적 수치나 구체적 과제명이 존재하지 않음."
        },
        {
          id: "ev_3",
          quote: "어떠한 어려운 기술적 역경도 저의 뛰어난 리더십과 논리적 사고력으로 성공리에 마무리지었습니다.",
          type: "risk",
          competencyId: "tech_skill",
          scoreImpact: -15,
          title: "기술적 근거 부재 및 과장 표현 (AI 의심)",
          explanation: "어떤 기술적 역경이었는지, 어떤 논리로 해결했는지 근거가 생략됨."
        },
        {
          id: "ev_4",
          quote: "큰 폭의 성능 향상을 이루어냈으며",
          type: "verify",
          competencyId: "tech_skill",
          scoreImpact: 0,
          title: "성능 향상 수치 미기재 (면접 필수 확인)",
          explanation: "몇 %의 성능이 개선되었는지 지표 데이터 검증 필요."
        }
      ],
      interviewQuestions: [
        {
          id: "iq_1",
          basedQuote: "큰 폭의 성능 향상을 이루어냈으며",
          category: "성과 정량 검증",
          question: "서류에 서술하신 '큰 폭의 성능 향상'이 구체적으로 몇 % 개선되었으며, 이를 측정한 APM 도구는 무엇이었습니까?",
          intent: "추상적인 서류 주장의 사실 여부 및 데이터 측정 역량 검증",
          checklist: ["정확한 수치 지표 제시 가능 여부", "성능 측정 방법론(부하 테스트 도구 등) 답변 여부"]
        },
        {
          id: "iq_2",
          basedQuote: "어떠한 어려운 기술적 역경도 저의 뛰어난 리더십으로 성공리에 마무리지었습니다.",
          category: "실제 경험 검증",
          question: "가장 어려웠던 기술적 문제와 본인이 발휘한 리더십의 구체적 사례 1가지를 스타(STAR) 기법으로 설명해 주세요.",
          intent: "과장된 표현 속에 숨려진 실제 경험 수위 측정",
          checklist: ["Situation, Task, Action, Result 구조화 설명 여부"]
        }
      ]
    }
  },
  {
    id: "app_103",
    name: "박지훈",
    applyJobId: "tech_backend",
    applyJobTitle: "백엔드 소프트웨어 엔지니어",
    rawText: `[직무 전환 계기]
지난 2년간 B2B 영업 담당자로 근무하며 고객의 요구사항을 수집하던 중, 시스템의 비효율을 직접 코드로 해결하고 싶다는 열망으로 개발자로 전직을 결심했습니다. 6개월간의 부트캠프를 수료하며 Node.js와 PostgreSQL 기반의 동네 소모임 커뮤니티 서비스를 팀 프로젝트로 구축했습니다.

[주요 프로젝트 및 기술 구현]
동시 접속자 소모임 신청 시 발생하는 데이터 경합 문제를 해결하기 위해 PostgreSQL의 트랜잭션 격리 수준(Isolation Level)을 조정하고 시퀀셜 락을 도입해보았습니다. 비록 대규모 트래픽 경험은 부족하지만 기초 CS 지식과 끈기 있는 탐구력을 갖추었습니다.

[향후 목표]
영업으로 다져진 탁월한 소통 능력과 개발 지식을 결합하여 현업 부서와 개발팀을 이어주는 가교 역할을 완수하겠습니다.`,
    analysis: {
      summary: {
        totalScore: 78,
        decision: "INTERVIEW",
        decisionReason: "경력 전환자로서 직무 전환 의지와 기술 탐구력(PostgreSQL 격리수준) 근거가 명확하나, 실무 대용량 트래픽 검증 필요.",
        aiTextProbability: 18
      },
      competencyScores: {
        problem_solving: 80,
        tech_skill: 72,
        teamwork: 88,
        growth: 85,
        ethics: 82
      },
      groundingEvidences: [
        {
          id: "ev_1",
          quote: "B2B 영업 담당자로 근무하며 고객의 요구사항을 수집하던 중",
          type: "positive",
          competencyId: "teamwork",
          scoreImpact: 10,
          title: "비즈니스 이해도 및 커뮤니케이션 강점",
          explanation: "영업 경력을 바탕으로 한 고객 및 타 부서 소통 역량 진술."
        },
        {
          id: "ev_2",
          quote: "PostgreSQL의 트랜잭션 격리 수준(Isolation Level)을 조정하고 시퀀셜 락을 도입해보았습니다.",
          type: "positive",
          competencyId: "tech_skill",
          scoreImpact: 12,
          title: "DB 트랜잭션 관련 기술적 탐구 시도",
          explanation: "동시성 이슈를 인지하고 DB 격리 수준을 직접 다뤄본 근거 서술."
        },
        {
          id: "ev_3",
          quote: "비록 대규모 트래픽 경험은 부족하지만",
          type: "verify",
          competencyId: "tech_skill",
          scoreImpact: 0,
          title: "실전 대용량 환경 경험 미비 (확인 요망)",
          explanation: "프로덕션 레벨 트래픽 처리 경험 유무 면접 시 확인 권장."
        }
      ],
      interviewQuestions: [
        {
          id: "iq_1",
          basedQuote: "PostgreSQL의 트랜잭션 격리 수준(Isolation Level)을 조정하고 시퀀셜 락을 도입해보았습니다.",
          category: "DB 동시성 제어 검증",
          question: "PostgreSQL에서 Read Committed와 Repeatable Read 격리 수준의 차이점 및 팬텀 리드(Phantom Read) 현상을 설명해 주실 수 있나요?",
          intent: "부트캠프 프로젝트에서 다룬 DB 기술 개념의 정확한 수용도 확인",
          checklist: ["격리 수준별 이상 현상 설명 여부", "실제 락 적용 이유 정당성"]
        }
      ]
    }
  },
  {
    id: "app_104",
    name: "최유진",
    applyJobId: "marketing_growth",
    applyJobTitle: "그로스 마케팅 스페셜리스트",
    rawText: `[데이터 기반 성과]
지난 2년간 패션 커머스 스타트업에서 퍼포먼스 마케팅을 담당했습니다. 기존 신규 고객 획득 비용(CAC)이 45,000원으로 높아 수익성이 악화되던 상황에서, 메타 및 구글 애즈 캠페인의 소재 소재별 A/B 테스트를 40회 이상 집행하였습니다.

[캠페인 최적화 경험]
구매 전환율(CVR)이 높은 2030 여성 타겟층에 맞춘 숏폼 영상 광고를 자체 제작하여 클릭률(CTR)을 1.8%에서 4.5%로 상승시켰습니다. 결과적으로 CAC를 26,000원으로 42.2% 절감하고, 월 매출 ROAS 340%를 달성했습니다.

[협업 및 조직 기여]
데이터 분석 결과를 브랜드 마케팅 팀 및 디자이너들과 매주 월요일 공유하는 '그로스 쉐어링' 세션을 운영하여 마케팅 소재 제작 주기(Lead Time)를 5일에서 2일로 단축했습니다.`,
    analysis: {
      summary: {
        totalScore: 91,
        decision: "STRONG_PASS",
        decisionReason: "CAC 42.2% 절감, CTR 4.5% 상승, ROAS 340% 등 매우 정교한 수치적 성과 근거가 명확히 서술됨.",
        aiTextProbability: 10
      },
      competencyScores: {
        problem_solving: 94,
        tech_skill: 92,
        teamwork: 86,
        growth: 90,
        ethics: 85
      },
      groundingEvidences: [
        {
          id: "ev_1",
          quote: "CAC를 26,000원으로 42.2% 절감하고, 월 매출 ROAS 340%를 달성했습니다.",
          type: "positive",
          competencyId: "problem_solving",
          scoreImpact: 15,
          title: "압도적인 정량적 마케팅 성과 근거",
          explanation: "CAC 절감율(42.2%) 및 핵심 KPI인 ROAS(340%)를 수치로 증명함."
        },
        {
          id: "ev_2",
          quote: "클릭률(CTR)을 1.8%에서 4.5%로 상승시켰습니다.",
          type: "positive",
          competencyId: "tech_skill",
          scoreImpact: 12,
          title: "광고 소재 A/B 테스트 지표 개선",
          explanation: "CTR 상승 결과를 비교 지표(1.8% ➔ 4.5%)로 명확히 제시."
        },
        {
          id: "ev_3",
          quote: "마케팅 소재 제작 주기(Lead Time)를 5일에서 2일로 단축했습니다.",
          type: "positive",
          competencyId: "teamwork",
          scoreImpact: 10,
          title: "부서 간 워크플로우 효율화 성과",
          explanation: "협업 세션 운용을 통해 실제 리드타임 60% 단축 달성."
        }
      ],
      interviewQuestions: [
        {
          id: "iq_1",
          basedQuote: "월 매출 ROAS 340%를 달성했습니다.",
          category: "마케팅 기여도 검증",
          question: "ROAS 계산 시 기여 기간(Attribution Window)과 어트리뷰션 툴(GA4, Airbridge 등) 설정 기준은 어떠했습니까?",
          intent: "ROAS 수치의 객관적 산출 근거 및 어트리뷰션 툴 이해도 검증",
          checklist: ["First-click / Last-click 모델 설명", "트래킹 픽셀 오류 대처 경험"]
        }
      ]
    }
  }
];
