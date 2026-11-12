import React, { createContext, useContext, useState, useEffect } from 'react';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import {
  isSupabaseConfigured,
  fetchTenantApplicantsFromSupabase,
  syncTenantApplicantsToSupabase
} from '../services/supabaseClient';
import {
  isSpringApiEnabled,
  fetchSpringApplicants,
  mergeSpringApplicants,
  syncApplicantsToSpring
} from '../services/springApplicantService';

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
        applyJobId: 'tech_backend',
        applyJobTitle: '백엔드 소프트웨어 엔지니어',
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
          competencyScores: {
            problem_solving: 95,
            tech_skill: 94,
            teamwork: 88,
            growth: 90,
            ethics: 91
          },
          groundingEvidences: [
            {
              id: 'ev_1',
              quote: '피처 서빙 지연 시간을 18ms로 단축했습니다.',
              type: 'positive',
              competencyId: 'tech_skill',
              scoreImpact: 14,
              title: '실시간 서빙 레이턴시 정량 개선',
              explanation: '엔지니어링 레이턴시의 구체적 정량 지표(18ms)를 달성함.'
            },
            {
              id: 'ev_2',
              quote: '조회 전환율을 14.8% 개선하는 성과를 거두었습니다.',
              type: 'positive',
              competencyId: 'problem_solving',
              scoreImpact: 13,
              title: '비즈니스 KPI 기여도 입증',
              explanation: 'A/B 테스트 기반으로 핵심 KPI(전환율 14.8%) 개선을 제시함.'
            },
            {
              id: 'ev_3',
              quote: 'CDC(Change Data Capture) 기반 재처리 파이프라인을 구축하여 장애 복구 시간을 85% 단축했습니다.',
              type: 'positive',
              competencyId: 'teamwork',
              scoreImpact: 10,
              title: '데이터 정합성 장애 대응',
              explanation: '협업 중 발생한 정합성 이슈를 재처리 파이프라인으로 해결한 경험이 명확함.'
            },
            {
              id: 'ev_4',
              quote: '초당 12,000건의 사용자 인터랙션을 병렬 수집하고',
              type: 'verify',
              competencyId: 'tech_skill',
              scoreImpact: 0,
              title: '고부하 스트리밍 처리 본인 기여도 확인 필요',
              explanation: '면접 시 파티셔닝 전략 및 백프레셔 제어 방식 심층 검증 필요.'
            }
          ],
          interviewQuestions: [
            {
              id: 'iq_1',
              basedQuote: '초당 12,000건의 사용자 인터랙션을 병렬 수집하고',
              question: '초당 12,000건의 고부하 스트리밍 환경에서 Kafka 파티션 불균형(Skew)이나 Consumer Lag이 발생했을 때 어떻게 대응하셨나요?',
              category: '기술 검증',
              intent: '대용량 트래픽 장애 대응 역량 확인',
              checklist: ['파티션 키 설계 근거 설명 여부', 'Consumer Lag 모니터링 지표 제시 여부']
            },
            {
              id: 'iq_2',
              basedQuote: '피처 서빙 지연 시간을 18ms로 단축했습니다.',
              question: 'Feature Store 도입 시 온라인 서빙과 오프라인 학습 데이터 간의 일관성(Train-Serve Skew)은 어떻게 방지하셨습니까?',
              category: '시스템 설계',
              intent: 'MLOps 실무 아키텍처 이해도 확인',
              checklist: ['온라인/오프라인 스토어 동기화 방식 설명', '18ms 측정 조건(p50/p99) 명시 여부']
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
        applyJobId: 'tech_backend',
        applyJobTitle: '백엔드 소프트웨어 엔지니어',
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
          competencyScores: {
            problem_solving: 96,
            tech_skill: 95,
            teamwork: 90,
            growth: 92,
            ethics: 93
          },
          groundingEvidences: [
            {
              id: 'ev_1',
              quote: 'p99 응답 속도를 240ms에서 35ms로 85.4% 개선했습니다.',
              type: 'positive',
              competencyId: 'tech_skill',
              scoreImpact: 15,
              title: '피크 트래픽 레이턴시 정량 개선',
              explanation: 'CQRS 적용으로 p99 240ms → 35ms(85.4%) 개선 지표를 입증함.'
            },
            {
              id: 'ev_2',
              quote: '배달 평균 완료 시간을 3.2분 단축시켰습니다.',
              type: 'positive',
              competencyId: 'problem_solving',
              scoreImpact: 12,
              title: '서비스 운영 지표 개선',
              explanation: '경로 예측 알고리즘 개선으로 운영 비용 절감 및 고객 만족도 향상에 기여함.'
            },
            {
              id: 'ev_3',
              quote: 'Redis Cluster 기반의 지리공간 인덱싱(Geo-Hashing) 시스템을 설계했습니다.',
              type: 'verify',
              competencyId: 'tech_skill',
              scoreImpact: 0,
              title: '설계 범위 및 본인 역할 확인 필요',
              explanation: '설계 주도 여부와 클러스터 운영 경험의 깊이를 면접에서 확인해야 함.'
            }
          ],
          interviewQuestions: [
            {
              id: 'iq_1',
              basedQuote: 'Redis Cluster 기반의 지리공간 인덱싱(Geo-Hashing) 시스템을 설계했습니다.',
              question: 'Redis Geo-Hashing 기반 지리 공간 인덱스 사용 시 클러스터 노드 간 데이터 리밸런싱 과정에서 발생할 수 있는 데이터 정합성 이슈를 어떻게 다루셨나요?',
              category: '인프라/DB',
              intent: '분산 환경 정합성 검증',
              checklist: ['리샤딩 중 읽기/쓰기 처리 전략 설명', '본인이 직접 설계한 범위 명확화']
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
  // Spring 서버 목록을 불러와 localStorage 가 갱신되면 증가 → App 이 목록을 다시 읽음
  const [applicantsVersion, setApplicantsVersion] = useState(0);

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

  // Save Tenant-specific applicants (localStorage + non-blocking Supabase RLS sync when configured)
  const saveTenantApplicants = (applicants) => {
    const securedApplicants = applicants.map(app => ({
      ...app,
      orgId: currentTenant.id
    }));
    if (typeof window !== 'undefined') {
      const storageKey = `checkmate_applicants_${currentTenant.id}`;
      localStorage.setItem(storageKey, JSON.stringify(securedApplicants));
    }
    if (isSupabaseConfigured) {
      syncTenantApplicantsToSupabase(currentTenant.id, securedApplicants);
    }
    if (isSpringApiEnabled()) {
      // non-blocking: 실패해도 localStorage 동작은 그대로. 데모 기본 지원자는 서버로 보내지 않음
      const demoIds = new Set((currentTenant.defaultApplicants || []).map((a) => a.id));
      const realApplicants = securedApplicants.filter((a) => !demoIds.has(a.id));
      syncApplicantsToSpring(currentTenant.id, realApplicants).catch((err) =>
        console.warn('[Spring 동기화] 지원자 등록 실패:', err.message)
      );
    }
  };

  // Spring 코어 API 에서 지원자 목록 불러오기 (VITE_SPRING_API_URL 설정 시에만)
  useEffect(() => {
    if (!isSpringApiEnabled() || typeof window === 'undefined') return;
    let active = true;
    const tenantId = currentTenant.id;
    fetchSpringApplicants(tenantId)
      .then((springList) => {
        if (!active || !springList) return;
        const localList = getTenantApplicants();
        const merged = mergeSpringApplicants(localList, springList, tenantId);
        if (merged !== localList) {
          localStorage.setItem(`checkmate_applicants_${tenantId}`, JSON.stringify(merged));
          setApplicantsVersion((v) => v + 1);
        }
      })
      .catch((err) => console.warn('[Spring 동기화] 지원자 목록 조회 실패:', err.message));
    return () => {
      active = false;
    };
  }, [currentTenant.id]);

  // Hydrate tenant applicants from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured || typeof window === 'undefined') return;
    let active = true;
    fetchTenantApplicantsFromSupabase(currentTenant.id).then((remoteList) => {
      if (active && Array.isArray(remoteList) && remoteList.length > 0) {
        const storageKey = `checkmate_applicants_${currentTenant.id}`;
        localStorage.setItem(storageKey, JSON.stringify(remoteList));
      }
    });
    return () => {
      active = false;
    };
  }, [currentTenant.id]);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        allTenants: TENANTS,
        switchTenant,
        getTenantApplicants,
        saveTenantApplicants,
        applicantsVersion
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
