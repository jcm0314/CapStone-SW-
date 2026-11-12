import React, { useState, useEffect } from 'react';
import { Search, KeyRound, SlidersHorizontal, Building2, ChevronDown, Menu, Moon, Sun, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import SSOProfileModal from './SSOProfileModal';
import { SHORTCUT_LABEL } from './Sidebar';

const ROLE_LABEL = {
  ADMIN: '관리자',
  RECRUITER: '채용 담당자',
  INTERVIEWER: '면접관',
  CANDIDATE: '구직자'
};

export default function Header({
  onOpenPromptStudio,
  onOpenApiKeyModal,
  onOpenPalette,
  onOpenMenu,
  theme,
  onToggleTheme,
  showSSOModal,
  setShowSSOModal
}) {
  const [hasApiKey, setHasApiKey] = useState(false);
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

  const roleKey = currentUser?.role;

  return (
    <>
      <header className="sticky top-0 z-40 h-14 bg-surface/90 backdrop-blur border-b border-line">
        <div className="h-full px-3 sm:px-5 flex items-center gap-2 sm:gap-4">
          {/* Mobile menu */}
          <button
            type="button"
            onClick={onOpenMenu}
            className="lg:hidden btn btn-ghost p-2 -ml-1"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Brand */}
          <a href="/" className="flex items-center gap-2 shrink-0" aria-label="Check-Mate 홈">
            <span className="w-7 h-7 rounded-lg bg-brand text-white flex items-center justify-center">
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-fg">Check-Mate</span>
          </a>

          {/* Search (opens command palette) */}
          <div className="flex-1 flex justify-center min-w-0">
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden md:flex w-full max-w-md items-center gap-2 h-9 px-3 rounded-lg border border-line bg-subtle hover:border-line-strong text-[13px] text-fg-subtle transition-colors"
              aria-label={`기능 검색 (${SHORTCUT_LABEL})`}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">기능 검색 — 형광펜, 면접 질문, 보고서…</span>
              <kbd className="text-[11px] font-medium border border-line rounded px-1.5 py-0.5 bg-surface">{SHORTCUT_LABEL}</kbd>
            </button>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              type="button"
              onClick={onOpenPalette}
              className="md:hidden btn btn-ghost p-2"
              aria-label="기능 검색"
            >
              <Search className="w-[18px] h-[18px]" />
            </button>

            <button
              type="button"
              onClick={() => setShowSSOModal(true)}
              className="hidden sm:inline-flex btn btn-ghost btn-sm text-fg"
              title="회사(테넌트) · 계정 전환"
            >
              <Building2 className="w-4 h-4 text-fg-subtle" />
              <span className="max-w-[120px] truncate">{currentTenant.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-fg-subtle" />
            </button>

            <button
              type="button"
              onClick={onOpenApiKeyModal}
              className="hidden xl:inline-flex btn btn-ghost btn-sm"
              title={hasApiKey ? '개인 API 키 사용 중' : '회사 공용 키(B2B 일괄 결제) 사용 중'}
            >
              <KeyRound className="w-4 h-4" />
              <span>{hasApiKey ? '개인 API 키' : 'B2B 일괄 결제'}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${hasApiKey ? 'bg-brand' : 'bg-ok-solid'}`} />
            </button>

            {hasPermission('MANAGE_API_KEYS') && (
              <button
                type="button"
                onClick={onOpenPromptStudio}
                className="hidden lg:inline-flex btn btn-ghost p-2"
                title="평가 프롬프트 설정"
                aria-label="평가 프롬프트 설정"
              >
                <SlidersHorizontal className="w-[18px] h-[18px]" />
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              className="btn btn-ghost p-2"
              title={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
              aria-label="화면 테마 전환"
            >
              {theme === 'dark' ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
            </button>

            <button
              type="button"
              onClick={() => setShowSSOModal(true)}
              className="flex items-center gap-2 pl-1.5 pr-1 py-1 rounded-lg hover:bg-subtle transition-colors"
              title="계정 · 역할 · 회사 전환"
            >
              <span className="hidden lg:flex flex-col items-end leading-tight">
                <span className="text-[13px] font-semibold text-fg">{currentUser?.name?.split(' ')[0]}</span>
                <span className="text-[11px] text-fg-subtle">
                  {ROLE_LABEL[roleKey] || roleKey}
                </span>
              </span>
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-8 h-8 rounded-full object-cover border border-line"
              />
            </button>
          </div>
        </div>
      </header>

      {/* 회사 · 계정 · 역할 전환 */}
      <SSOProfileModal isOpen={showSSOModal} onClose={() => setShowSSOModal(false)} />
    </>
  );
}
