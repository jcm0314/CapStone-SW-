import React, { useState } from 'react';
import { X, Building2, UserCheck, ShieldCheck, CheckCircle2, Info, Pencil, Check } from 'lucide-react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

// Guard wrapper: keeps hook call order stable in the content component (Rules of Hooks)
export default function SSOProfileModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <SSOProfileModalContent onClose={onClose} />;
}

function SSOProfileModalContent({ onClose }) {
  const { currentUser, switchRole, updateProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: '', roleTitle: '', email: '' });

  const startEdit = () => {
    setDraft({ name: currentUser.name || '', roleTitle: currentUser.roleTitle || '', email: currentUser.email || '' });
    setEditing(true);
  };

  const saveEdit = (e) => {
    e.preventDefault();
    if (!draft.name.trim()) return;
    updateProfile(draft);
    setEditing(false);
  };
  const { currentTenant, allTenants, switchTenant } = useTenant();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-2xl bg-surface border border-line rounded-2xl shadow-pop overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-line bg-subtle">
          <div className="flex items-center gap-2.5">
            <div className="bg-brand-soft w-9 h-9 rounded-xl flex items-center justify-center shadow-sm">
              <Building2 className="w-5 h-5 text-fg" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-fg">계정 · 회사 전환</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-ok-soft text-ok border border-ok-line rounded-full flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> 회사별 데이터 분리
                </span>
              </div>
              <p className="text-xs text-fg-muted">기업별 데이터 격리 및 역할 기반 접근 제어(RBAC) 원클릭 스위처</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fg-muted hover:text-fg rounded-lg hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          {/* Section 1: Current SSO Account Status */}
          {editing ? (
            <form onSubmit={saveEdit} className="p-4 rounded-xl bg-subtle border border-line-strong space-y-3" aria-label="프로필 수정">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <label className="space-y-1">
                  <span className="label">이름</span>
                  <input className="field" value={draft.name} maxLength={30} required onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                </label>
                <label className="space-y-1">
                  <span className="label">직함</span>
                  <input className="field" value={draft.roleTitle} maxLength={40} onChange={(e) => setDraft({ ...draft, roleTitle: e.target.value })} />
                </label>
                <label className="space-y-1">
                  <span className="label">이메일</span>
                  <input className="field" type="email" value={draft.email} maxLength={254} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                </label>
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditing(false)} className="btn btn-secondary btn-md">취소</button>
                <button type="submit" className="btn btn-primary btn-md"><Check className="w-3.5 h-3.5" /> 저장</button>
              </div>
            </form>
          ) : (
          <div className="p-4 rounded-xl bg-subtle border border-line-strong flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-12 h-12 rounded-xl object-cover ring-2 ring-brand/30"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-fg">{currentUser.name}</span>
                  <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${ROLES[currentUser.role]?.badgeColor}`}>
                    {ROLES[currentUser.role]?.label.split(' ')[0]}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-muted text-fg-muted rounded-full">
                    {currentUser.provider}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">{currentUser.roleTitle} • {currentUser.email}</p>
                <p className="text-[11px] text-fg-subtle mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> 데모 계정입니다. 실제 로그인 없이 이 브라우저에만 저장됩니다.
                </p>
              </div>
            </div>
            <button type="button" onClick={startEdit} className="btn btn-secondary btn-md shrink-0">
              <Pencil className="w-3.5 h-3.5" /> 프로필 수정
            </button>
          </div>
          )}

          {/* Section 2: Multi-Tenancy Enterprise Switcher */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-fg" /> 소속 기업 선택 (Multi-Tenancy 격리)
              </label>
              <span className="text-[11px] text-fg-muted">클릭 시 해당 기업의 지원서 DB만 즉시 로드됩니다</span>
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
                        ? 'bg-brand-soft border-brand-line shadow-sm ring-1 ring-brand/30'
                        : 'bg-subtle border-line-strong hover:border-line-strong hover:bg-subtle'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-fg">{tenant.name}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-brand-fg" />
                        )}
                      </div>
                      <p className="text-[11px] text-fg-muted">{tenant.industry}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-line-strong flex items-center justify-between text-[11px]">
                      <span className="text-fg-muted">{tenant.plan}</span>
                      <span className="font-semibold text-ok">
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
              <label className="text-xs font-bold text-fg-muted uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-brand-fg" /> 사용자 역할 선택 (RBAC 권한 체계)
              </label>
              <span className="text-[11px] text-fg-muted">심사 시연용 원클릭 권한 변경</span>
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
                        ? 'bg-brand-soft border-brand-line shadow-sm'
                        : 'bg-subtle border-line-strong hover:bg-subtle'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${role.badgeColor}`}>
                        {role.key === 'ADMIN' ? '' : role.key === 'RECRUITER' ? '' : ''}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-fg">{role.label}</span>
                          {isSelected && (
                            <span className="px-1.5 py-0.2 text-[9px] bg-brand-soft text-brand-fg rounded font-semibold">
                              현재 활성
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-fg-muted mt-0.5">{role.description}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-brand-fg shrink-0 ml-2" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Security Notice Footer */}
          <div className="p-3.5 rounded-xl bg-brand-soft border border-brand-line flex items-start gap-3 text-xs text-brand-fg">
            <ShieldCheck className="w-4 h-4 text-brand-fg shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-brand-fg">PostgreSQL Row-Level Security(RLS) 원칙 준수</p>
              <p className="text-[11px] text-brand-fg mt-0.5">
                각 기업(Tenant)별 지원자 자기소개서, 평가 스코어, 1:1 형광펜 원문은 <code className="text-brand-fg bg-brand-soft px-1 py-0.5 rounded">org_id</code>를 기준으로 완벽하게 논리 격리되며, 타사 계정에서의 데이터 조회 및 오염이 원천 차단됩니다.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-subtle border-t border-line flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand hover:bg-brand-strong text-on-brand rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
