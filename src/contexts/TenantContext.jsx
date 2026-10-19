import React, { createContext, useContext, useState, useEffect } from 'react';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';

const TenantContext = createContext(null);

export const TENANTS = [
  {
    id: 'toss-payments',
    name: '토스페이먼츠',
    englishName: 'Toss Payments',
    domain: 'tosspayments.com',
    plan: 'Enterprise Tier',
    badgeColor: 'from-blue-600 to-indigo-600',
    totalCredit: 500000,
    usedCredit: 80000,
    description: '핀테크 결제 인프라 & 데이터 파이프라인 채용 전형',
    industry: 'Fintech / Payment',
    defaultApplicants: SAMPLE_APPLICANTS.map(a => ({
      ...a,
      orgId: 'toss-payments',
      targetTeam: '결제코어플랫폼본부'
    }))
  },
  {
    id: 'daangn',
    name: '당근',
    englishName: 'Daangn Corp',
    domain: 'daangn.com',
    plan: 'Growth Pro',
    badgeColor: 'from-orange-500 to-amber-600',
    totalCredit: 300000,
    usedCredit: 115000,
    description: '로컬 커뮤니티 & 하이퍼로컬 AI 피드 추천 채용 전형',
    industry: 'Hyperlocal Commerce / AI Feed',
    defaultApplicants: [
      {
        id: 'daangn_app_01',
        name: '정지훈 (지원자)',
        orgId: 'daangn',
        targetTeam: '동네피드추천팀',
        applyJobId: 'dev',
        status: 'COMPLETED',
        appliedAt: '2026-10-18T10:30:00Z',
        rawText: `[동네 커뮤니티 추천 모델 개발 경험]
당근 피드 랭킹 알고리즘 최적화를 위해 실시간 유저 행동 데이터(클릭률, 체류시간)를 기반으로 하는 딥러닝 랭킹 모델 파이프라인을 구축했습니다.
Kafka 스트리밍 인프라를 통해 초당 12,000건의 사용자 인터랙션을 병렬 수집하고, Feature Store를 도입하여 피처 서빙 지연 시간을 18ms로 단축했습니다.
A/B 테스트 결과 기존 휴리스틱 피드 대비 동네 소식 조회 전환율을 14.8% 개선하는 성과를 거두었습니다.
협업 과정에서 데이터 파이프라인의 데이터 정합성 이슈가 발생했으나, CDC(Change Data Capture) 기반 재처리 파이프라인을 구축하여 장애 복구 시간을 85% 단축했습니다.`,
        analysis: {
          summary: {
            totalScore: 92,
            decision: 'STRONG_PASS',
            decisionReason: '실시간 스트리밍 인프라 및 정량적 비즈니스 임팩트(CTR 14.8% 상승)가 검증된 탁월한 엔지니어링 역량.',
            aiTextProbability: 5
          },
          competencies: [
            { id: 'problemSolving', name: '문제 해결력', score: 95, reason: 'CDC 도입을 통한 장애 복구 시간 85% 단축 등 실질적 문제 해결 증명.' },
            { id: 'techDepth', name: '기술적 깊이', score: 94, reason: 'Kafka 및 실시간 Feature Store 18ms 지연시간 최적화 역량 보유.' },
            { id: 'authenticity', name: '진실성', score: 90, reason: '수치 중심의 구체적 서술로 신뢰도가 매우 높음.' },
            { id: 'cultureFit', name: '협업 및 소통', score: 88, reason: '장애 대응 과정에서 팀 간 데이터 정합성 조율 경험 명시.' }
          ],
          groundingEvidences: [
            { quote: '피처 서빙 지연 시간을 18ms로 단축했습니다.', category: 'positive', rationale: '엔지니어링 레이턴시의 구체적 정량 지표 달성.' },
            { quote: '조회 전환율을 14.8% 개선하는 성과를 거두었습니다.', category: 'positive', rationale: '비즈니스 핵심 KPI 기여도 입증.' },
            { quote: '초당 12,000건의 사용자 인터랙션을 병렬 수집하고', category: 'verify', rationale: '면접 시 파티셔닝 전략 및 백프레셔 제어 방식 심층 검증 필요.' }
          ],
          interviewQuestions: [
            {
              question: '초당 12,000건의 고부하 스트리밍 환경에서 Kafka 파티션 불균형(Skew)이나 Consumer Lag이 발생했을 때 어떻게 대응하셨나요?',
              category: '기술 검증',
              intent: '대용량 트래픽 장애 대응 역량 확인'
            },
            {
              question: 'Feature Store 도입 시 온라인 서빙과 오프라인 학습 데이터 간의 일관성(Train-Serve Skew)은 어떻게 방지하셨습니까?',
              category: '시스템 설계',
              intent: 'MLOps 실무 아키텍처 이해도 확인'
            }
          ]
        }
      }
    ]
  },
  {
    id: 'woowa',
    name: '우아한형제들',
    englishName: 'Woowa Brothers (배민)',
    domain: 'woowahan.com',
    plan: 'Enterprise Ultimate',
    badgeColor: 'from-teal-500 to-emerald-600',
    totalCredit: 1000000,
    usedCredit: 250000,
    description: '배민라이더스 실시간 배차 라우팅 & 대규모 트래픽 채용 전형',
    industry: 'Food Delivery / Mobility Tech',
    defaultApplicants: [
      {
        id: 'woowa_app_01',
        name: '한태양 (지원자)',
        orgId: 'woowa',
        targetTeam: '라이더배차플랫폼팀',
        applyJobId: 'dev',
        status: 'COMPLETED',
        appliedAt: '2026-10-17T15:20:00Z',
        rawText: `[배차 라우팅 최적화 및 분산 캐시 아키텍처 개선]
피크 타임(점심/저녁)에 발생하는 초당 3만 건의 실시간 주문 및 배차 요청을 분산 처리하기 위해 Redis Cluster 기반의 지리공간 인덱싱(Geo-Hashing) 시스템을 설계했습니다.
단일 DB 락 경합으로 인한 지연을 해소하기 위해 CQRS 패턴을 적용하여 읽기 트래픽을 분산하고, p99 응답 속도를 240ms에서 35ms로 85.4% 개선했습니다.
또한 배차 취소율을 낮추기 위해 라이더 이동 경로 예측 알고리즘을 개선하여 배달 평균 완료 시간을 3.2분 단축시켰습니다.`,
        analysis: {
          summary: {
            totalScore: 94,
            decision: 'STRONG_PASS',
            decisionReason: 'Geo-Hashing과 CQRS를 활용한 대규모 피크 트래픽 튜닝 및 배달 시간 3.2분 단축 성과.',
            aiTextProbability: 3
          },
          competencies: [
            { id: 'problemSolving', name: '문제 해결력', score: 96, reason: 'DB 락 경합을 CQRS와 Geo-Hashing으로 해결.' },
            { id: 'techDepth', name: '기술적 깊이', score: 95, reason: 'p99 240ms -> 35ms(85.4% 향상)의 엔터프라이즈급 튜닝.' },
            { id: 'authenticity', name: '진실성', score: 93, reason: '아키텍처 패턴과 수치 근거가 정밀함.' },
            { id: 'cultureFit', name: '협업 및 소통', score: 90, reason: '물류/라이더 현장 요구사항에 맞춘 최적화 추진.' }
          ],
          groundingEvidences: [
            { quote: 'p99 응답 속도를 240ms에서 35ms로 85.4% 개선했습니다.', category: 'positive', rationale: '극적인 레이턴시 개선 지표 입증.' },
            { quote: '배달 평균 완료 시간을 3.2분 단축시켰습니다.', category: 'positive', rationale: '서비스 운영 비용 절감 및 고객 만족도 향상.' }
          ],
          interviewQuestions: [
            {
              question: 'Redis Geo-Hashing 기반 지리 공간 인덱스 사용 시 클러스터 노드 간 데이터 리밸런싱 과정에서 발생할 수 있는 데이터 정합성 이슈를 어떻게 다루셨나요?',
              category: '인프라/DB',
              intent: '분산 환경 정합성 검증'
            }
          ]
        }
      }
    ]
  }
];

export function TenantProvider({ children }) {
  const [currentTenant, setCurrentTenant] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTenantId = localStorage.getItem('checkmate_current_tenant_id');
      const found = TENANTS.find(t => t.id === savedTenantId);
      if (found) return found;
    }
    return TENANTS[0]; // Default: Toss Payments
  });

  // Switch Active Tenant
  const switchTenant = (tenantId) => {
    const target = TENANTS.find(t => t.id === tenantId);
    if (target) {
      setCurrentTenant(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkmate_current_tenant_id', target.id);
      }
    }
  };

  // Get Tenant-specific applicants from localStorage with fallback
  const getTenantApplicants = () => {
    if (typeof window === 'undefined') return currentTenant.defaultApplicants;
    const storageKey = `checkmate_applicants_${currentTenant.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // ignore
      }
    }
    return currentTenant.defaultApplicants;
  };

  // Save Tenant-specific applicants
  const saveTenantApplicants = (applicants) => {
    if (typeof window !== 'undefined') {
      const storageKey = `checkmate_applicants_${currentTenant.id}`;
      // Enforce RLS (Row Level Security): Attach current tenant orgId to all records
      const securedApplicants = applicants.map(app => ({
        ...app,
        orgId: currentTenant.id
      }));
      localStorage.setItem(storageKey, JSON.stringify(securedApplicants));
    }
  };

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        allTenants: TENANTS,
        switchTenant,
        getTenantApplicants,
        saveTenantApplicants
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return ctx;
}
