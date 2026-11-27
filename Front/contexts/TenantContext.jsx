import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  isSupabaseConfigured,
  fetchTenantApplicantsFromSupabase,
  syncTenantApplicantsToSupabase,
  deleteTenantApplicantFromSupabase,
  fetchTenantsFromSupabase,
  upsertTenantToSupabase
} from '../services/supabaseClient';
import { getApiBaseUrl } from '../services/shareService';
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
    defaultApplicants: []
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
    defaultApplicants: []

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
    defaultApplicants: []

  }
];

const CUSTOM_TENANTS_KEY = 'checkmate_custom_tenants';

const PLAN_CREDIT_MAP = {
  Starter: 50,
  Pro: 150,
  'Season Credit': 20
};

function loadCustomTenants() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CUSTOM_TENANTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.map((t) => ({ ...t, isCustom: true, defaultApplicants: t.defaultApplicants || [] }))
      : [];
  } catch {
    return [];
  }
}

function buildLocalTenantSlug(name) {
  const ascii = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
  const rand = Math.random().toString(36).slice(2, 7);
  return ascii ? `${ascii}-${rand}` : `org-${rand}`;
}

export function TenantProvider({ children }) {
  const [customTenants, setCustomTenants] = useState(loadCustomTenants);

  const allTenants = React.useMemo(() => {
    const seen = new Set(TENANTS.map((t) => t.id));
    const dedupedCustom = customTenants.filter((t) => t?.id && !seen.has(t.id));
    return [...TENANTS, ...dedupedCustom];
  }, [customTenants]);

  const [currentTenant, setCurrentTenant] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedTenantId = localStorage.getItem('checkmate_current_tenant_id');
      const initialList = [...TENANTS, ...loadCustomTenants()];
      const found = initialList.find((t) => t.id === savedTenantId);
      if (found) return found;
    }
    return TENANTS[0]; // Default: Toss Payments
  });
  // Spring 서버 목록을 불러와 localStorage 가 갱신되면 증가 → App 이 목록을 다시 읽음
  const [applicantsVersion, setApplicantsVersion] = useState(0);

  // Switch Active Tenant
  const switchTenant = (tenantId) => {
    const target = allTenants.find((t) => t.id === tenantId);
    if (target) {
      setCurrentTenant(target);
      if (typeof window !== 'undefined') {
        localStorage.setItem('checkmate_current_tenant_id', target.id);
      }
    }
  };

  // Register & switch to a real enterprise workspace (Gateway + Supabase + localStorage)
  const createWorkspace = async ({
    name,
    industry = '중소 · 벤처기업',
    plan = 'Starter',
    adminName = '채용 담당자',
    adminEmail = '',
    roleTitle = '대표 / 채용 총괄'
  }) => {
    const cleanName = String(name || '').trim();
    if (!cleanName) {
      throw new Error('회사명을 입력해 주세요.');
    }

    let registered = null;
    let syncedToServer = false;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/v1/tenants/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, industry, plan, adminName, adminEmail, roleTitle })
      });
      if (res.ok) {
        registered = await res.json();
        syncedToServer = true;
      } else if (res.status === 400 || res.status === 409 || res.status === 422) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || '워크스페이스 생성 요청이 올바르지 않습니다.');
      }
    } catch (err) {
      if (err?.message && !err.message.includes('fetch') && !err.message.includes('VITE_API_GATEWAY_URL')) {
        throw err;
      }
      // 오프라인/게이트웨이 미연결 시 로컬 워크스페이스 생성으로 폴백
    }

    const newTenant = registered?.tenant
      ? { ...registered.tenant, isCustom: true, defaultApplicants: [] }
      : {
          id: buildLocalTenantSlug(cleanName),
          name: cleanName,
          domain: adminEmail.includes('@') ? adminEmail.split('@')[1].trim() : 'company.local',
          plan,
          totalCredit: PLAN_CREDIT_MAP[plan] ?? 50,
          usedCredit: 0,
          industry: String(industry || '중소 · 벤처기업').trim(),
          isCustom: true,
          createdAt: new Date().toISOString(),
          defaultApplicants: []
        };

    if (isSupabaseConfigured) {
      await upsertTenantToSupabase(newTenant);
    }

    setCustomTenants((prev) => {
      const next = [newTenant, ...prev.filter((t) => t.id !== newTenant.id)];
      if (typeof window !== 'undefined') {
        localStorage.setItem(CUSTOM_TENANTS_KEY, JSON.stringify(next));
      }
      return next;
    });

    setCurrentTenant(newTenant);
    if (typeof window !== 'undefined') {
      localStorage.setItem('checkmate_current_tenant_id', newTenant.id);
    }

    return {
      tenant: newTenant,
      user: registered?.user || null,
      token: registered?.token || null,
      syncedToServer
    };
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

  const deleteTenantApplicant = (applicantId, remainingApplicants = null) => {
    if (!applicantId) return;
    const nextList = Array.isArray(remainingApplicants)
      ? remainingApplicants
      : getTenantApplicants().filter((a) => a.id !== applicantId);

    if (typeof window !== 'undefined') {
      const storageKey = `checkmate_applicants_${currentTenant.id}`;
      localStorage.setItem(storageKey, JSON.stringify(nextList));
    }
    if (isSupabaseConfigured) {
      deleteTenantApplicantFromSupabase(currentTenant.id, applicantId);
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

  // Hydrate custom tenants from Supabase when configured
  useEffect(() => {
    if (!isSupabaseConfigured || typeof window === 'undefined') return;
    let active = true;
    fetchTenantsFromSupabase().then((remoteTenants) => {
      if (!active || remoteTenants.length === 0) return;
      const presetIds = new Set(TENANTS.map((t) => t.id));
      const onlyCustom = remoteTenants.filter((t) => !presetIds.has(t.id));
      if (onlyCustom.length === 0) return;
      setCustomTenants((prev) => {
        const mergedMap = new Map(prev.map((t) => [t.id, t]));
        for (const rt of onlyCustom) {
          mergedMap.set(rt.id, { ...mergedMap.get(rt.id), ...rt });
        }
        const next = Array.from(mergedMap.values());
        localStorage.setItem(CUSTOM_TENANTS_KEY, JSON.stringify(next));
        return next;
      });
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <TenantContext.Provider
      value={{
        currentTenant,
        allTenants,
        switchTenant,
        createWorkspace,
        getTenantApplicants,
        saveTenantApplicants,
        deleteTenantApplicant,
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
