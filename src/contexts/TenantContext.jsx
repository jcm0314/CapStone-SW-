import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  isSupabaseConfigured,
  fetchTenantApplicantsFromSupabase,
  syncTenantApplicantsToSupabase
} from '../services/supabaseClient';

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
  };

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
