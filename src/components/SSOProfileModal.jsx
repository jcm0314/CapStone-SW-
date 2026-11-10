import React from 'react';
import { X, Building2, UserCheck, ShieldCheck, CheckCircle2, RefreshCw, KeyRound, Lock, ExternalLink } from 'lucide-react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// Guard wrapper: keeps hook call order stable in the content component (Rules of Hooks)
export default function SSOProfileModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <SSOProfileModalContent onClose={onClose} />;
}

function SSOProfileModalContent({ onClose }) {
  const { currentUser, switchRole } = useAuth();
  const { currentTenant, allTenants, switchTenant } = useTenant();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">B2B 기업용 SSO & 멀티테넌시 관리</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> RLS Data Isolation
                </span>
              </div>
              <p className="text-xs text-slate-400">기업별 데이터 격리 및 역할 기반 접근 제어(RBAC) 원클릭 스위처</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Section 1: Current SSO Account Status */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-500/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{currentUser.name}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${ROLES[currentUser.role]?.badgeColor}`}>
                    {ROLES[currentUser.role]?.label.split(' ')[0]}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-700 text-slate-300 rounded-full">
                    {currentUser.provider}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{currentUser.roleTitle} • {currentUser.email}</p>
                <p className="text-[11px] text-blue-400/90 mt-1 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> SAML 2.0 / OIDC 인증 세션 활성화됨
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Multi-Tenancy Enterprise Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-blue-400" /> 소속 기업 선택 (Multi-Tenancy 격리)
              </label>
              <span className="text-[11px] text-slate-400">클릭 시 해당 기업의 지원서 DB만 즉시 로드됩니다</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {allTenants.map((tenant) => {
                const isSelected = tenant.id === currentTenant.id;
                return (
                  <button
                    key={tenant.id}
                    onClick={() => switchTenant(tenant.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-600/10 border-blue-500/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                        : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 hover:bg-slate-800/70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-white">{tenant.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-blue-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">{tenant.industry}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">{tenant.plan}</span>
                      <span className="font-semibold text-emerald-400">
                        {((tenant.totalCredit - tenant.usedCredit) / 1000).toFixed(0)}k P
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: RBAC Role Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" /> 사용자 역할 선택 (RBAC 권한 체계)
              </label>
              <span className="text-[11px] text-slate-400">심사 시연용 원클릭 권한 변경</span>
            </div>

            <div className="space-y-2">
              {Object.values(ROLES).map((role) => {
                const isSelected = currentUser.role === role.key;
                return (
                  <button
                    key={role.key}
                    onClick={() => switchRole(role.key)}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-indigo-600/10 border-indigo-500/60 shadow-sm'
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${role.badgeColor}`}>
                        {role.key === 'ADMIN' ? '👑' : role.key === 'RECRUITER' ? '📋' : '🎯'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{role.label}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-blue-500/20 text-blue-300 rounded font-semibold">
                              현재 활성
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">{role.description}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Notice Footer */}
          <div className="p-3.5 rounded-xl bg-blue-950/30 border border-blue-900/50 flex items-start gap-3 text-xs text-blue-300/90">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-200">PostgreSQL Row-Level Security(RLS) 원칙 준수</p>
              <p className="text-[11px] text-blue-300/70 mt-0.5">
                각 기업(Tenant)별 지원자 자기소개서, 평가 스코어, 1:1 형광펜 원문은 <code className="text-blue-200 bg-blue-900/40 px-1 py-0.5 rounded">org_id</code>를 기준으로 완벽하게 논리 격리되며, 타사 계정에서의 데이터 조회 및 오염이 원천 차단됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
