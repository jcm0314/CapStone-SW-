import React, { useState, useEffect } from 'react';
import { Cpu, Layers, FileText, Sliders, Key, ShieldCheck, Building2, UserCheck, ChevronDown } from 'lucide-react';
import { useAuth, ROLES } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import SSOProfileModal from './SSOProfileModal';

export default function Header({
  activeTab,
  setActiveTab,
  applicantCount,
  onOpenPromptStudio,
  onOpenApiKeyModal
}) {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showSSOModal, setShowSSOModal] = useState(false);

  const { currentUser, hasPermission } = useAuth();
  const { currentTenant } = useTenant();

  useEffect(() => {
    const checkKey = () => {
      const k = (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') || '';
      setHasApiKey(Boolean(k && k.trim().length > 5));
    };
    checkKey();
    window.addEventListener('storage', checkKey);
    return () => window.removeEventListener('storage', checkKey);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 lg:px-8 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Brand & Multi-Tenancy Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-blue-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base lg:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-300">
                  Check-Mate
                </h1>
                
                {/* Active Tenant Badge (Clickable for quick switch) */}
                <button
                  type="button"
                  onClick={() => setShowSSOModal(true)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full flex items-center gap-1 transition-colors"
                  title="클릭하여 소속 기업 및 권한 변경"
                >
                  <Building2 className="w-3 h-3 text-blue-400" />
                  <span>{currentTenant.name}</span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                </button>

                {/* Role Badge */}
                <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${ROLES[currentUser?.role]?.badgeColor || 'bg-slate-800 text-slate-300'}`}>
                  {currentUser?.role === 'ADMIN' ? '👑 Admin' : currentUser?.role === 'RECRUITER' ? '📋 Recruiter' : '🎯 Interviewer'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 hidden sm:block">4대 멀티에이전트 AI 서류 심사관 & B2B 멀티테넌시 RLS 플랫폼</p>
            </div>
          </div>

          {/* Navigation Tabs & Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Gemini API Key Setting Button */}
            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                hasApiKey
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20 animate-pulse'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Gemini 3.8 Key</span>
              <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400' : 'bg-rose-500'}`} />
            </button>

            {/* Prompt Studio (Admin & Recruiter Only) */}
            {hasPermission('MANAGE_API_KEYS') && (
              <button
                type="button"
                onClick={onOpenPromptStudio}
                className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Sliders className="w-3.5 h-3.5 text-purple-400" /> Prompt Studio
              </button>
            )}

            {/* View Nav Tabs */}
            <nav className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab('evaluator')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'evaluator'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> 서류 평가 & 검증
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  activeTab === 'comparison'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> 지원자 비교
                {applicantCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-blue-400/20 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                    {applicantCount}
                  </span>
                )}
              </button>
              
              {/* FinOps Credit Dashboard Tab (Admin/Recruiter only) */}
              {hasPermission('MANAGE_CREDITS') && (
                <button
                  onClick={() => setActiveTab('credits')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'credits'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-indigo-400/80 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" /> 크레딧 거버넌스
                </button>
              )}
            </nav>

            {/* SSO Profile & Switcher Avatar Button */}
            <button
              type="button"
              onClick={() => setShowSSOModal(true)}
              className="flex items-center gap-2 p-1 pl-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl transition-all"
              title="기업 SSO 계정 및 테넌트 관리"
            >
              <span className="text-xs font-semibold text-slate-200 hidden lg:inline">
                {currentUser?.name?.split(' ')[0]}
              </span>
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-blue-500/40"
              />
            </button>
          </div>
        </div>
      </header>

      {/* SSO & Multi-Tenancy Management Modal */}
      <SSOProfileModal
        isOpen={showSSOModal}
        onClose={() => setShowSSOModal(false)}
      />
    </>
  );
}
