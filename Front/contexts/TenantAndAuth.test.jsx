import { describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth, ROLES } from './AuthContext';
import { TenantProvider, useTenant, TENANTS } from './TenantContext';

describe('AuthContext & RBAC System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;

  it('기본 사용자는 RECRUITER 역할로 초기화되어야 한다', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.currentUser.role).toBe('RECRUITER');
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('ADMIN으로 역할 전환 시 MANAGE_CREDITS 권한을 획득해야 한다', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    
    // Recruiter는 크레딧 관리 권한 없음
    expect(result.current.hasPermission('MANAGE_CREDITS')).toBe(false);

    // Admin으로 역할 전환
    act(() => {
      result.current.switchRole('ADMIN');
    });

    expect(result.current.currentUser.role).toBe('ADMIN');
    expect(result.current.hasPermission('MANAGE_CREDITS')).toBe(true);
  });

  it('INTERVIEWER는 서류 업로드 권한이 없고 조회 권한만 가져야 한다', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.switchRole('INTERVIEWER');
    });

    expect(result.current.currentUser.role).toBe('INTERVIEWER');
    expect(result.current.hasPermission('UPLOAD_RESUME')).toBe(false);
    expect(result.current.hasPermission('RUN_EVALUATION')).toBe(false);
    expect(result.current.hasPermission('VIEW_APPLICANTS')).toBe(true);
    expect(result.current.hasPermission('VIEW_EVIDENCE')).toBe(true);
  });
});

describe('TenantContext & Multi-Tenancy Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const wrapper = ({ children }) => <TenantProvider>{children}</TenantProvider>;

  it('기본 테넌트는 토스페이먼츠(toss-payments)로 설정되어야 한다', () => {
    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current.currentTenant.id).toBe('toss-payments');
    expect(result.current.currentTenant.name).toBe('토스페이먼츠');
  });

  it('당근(daangn)으로 테넌트 전환 시 기본 지원자 목록은 비어 있어야 한다', () => {
    const { result } = renderHook(() => useTenant(), { wrapper });

    act(() => {
      result.current.switchTenant('daangn');
    });

    expect(result.current.currentTenant.id).toBe('daangn');
    expect(result.current.getTenantApplicants()).toEqual([]);
  });

  it('지원자 저장 시 현재 테넌트의 orgId가 강제 바인딩(RLS)되어야 한다', () => {
    const { result } = renderHook(() => useTenant(), { wrapper });

    act(() => {
      result.current.switchTenant('woowa');
    });

    const newApplicant = { id: 'temp_01', name: '테스트 지원자' };
    act(() => {
      result.current.saveTenantApplicants([newApplicant]);
    });

    const saved = result.current.getTenantApplicants();
    expect(saved[0].orgId).toBe('woowa');
  });

  it('실제 기업 워크스페이스 생성 시 allTenants에 추가되고 해당 기업으로 즉시 전환되어야 한다', async () => {
    const { result } = renderHook(() => useTenant(), { wrapper });

    await act(async () => {
      await result.current.createWorkspace({
        name: '(주)성운이엔지',
        industry: '엔지니어링 · 제조',
        plan: 'Starter',
        adminName: '한상혁 과장',
        adminEmail: 'hr@sungwoon.co.kr'
      });
    });

    expect(result.current.currentTenant.name).toBe('(주)성운이엔지');
    expect(result.current.currentTenant.plan).toBe('Starter');
    expect(result.current.currentTenant.totalCredit).toBe(50);
    expect(result.current.allTenants.some((t) => t.name === '(주)성운이엔지')).toBe(true);
    expect(result.current.getTenantApplicants()).toEqual([]);

    act(() => {
      result.current.saveTenantApplicants([{ id: 'sw_01', name: '김지원' }]);
    });

    const saved = result.current.getTenantApplicants();
    expect(saved).toHaveLength(1);
    expect(saved[0].orgId).toBe(result.current.currentTenant.id);
  });
});
