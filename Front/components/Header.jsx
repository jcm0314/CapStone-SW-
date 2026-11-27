import React, { useState } from 'react';
import { Search, SlidersHorizontal, Building2, ChevronDown, Menu, Moon, Sun } from 'lucide-react';
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
  onOpenPalette,
  onOpenMenu,
  theme,
  onToggleTheme,
  showSSOModal,
  setShowSSOModal
}) {
  const { currentUser, hasPermission } = useAuth();
  const { currentTenant } = useTenant();

  const roleKey = currentUser?.role;

  return (
    <>
      <header className="sticky top-0 z-40 h-12 bg-surface border-b border-line">
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
            <span className="w-7 h-7 rounded-lg bg-accent text-accent-ink flex items-center justify-center font-black text-sm">
              C
            </span>
            <span className="text-base font-black tracking-tight text-fg">CHECK-MATE</span>
          </a>

          {/* Search (opens command palette) */}
          <div className="flex-1 flex justify-center min-w-0">
            <button
              type="button"
              onClick={onOpenPalette}
              className="hidden md:flex w-full max-w-sm items-center gap-2 h-8 px-2.5 rounded border border-line bg-subtle hover:border-line-strong text-[13px] text-fg-subtle transition-colors"
              aria-label={`기능 검색 (${SHORTCUT_LABEL})`}
            >
              <Search className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left truncate">검색</span>
              <kbd className="text-[11px] border border-line rounded-sm px-1 bg-surface">{SHORTCUT_LABEL}</kbd>
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

            {/* Prompt Studio (Admin & Recruiter Only) */}
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
                  {ROLE_LABEL[roleKey] || roleKey} · {currentUser?.isDemo === false ? currentTenant.plan : '데모'}
                </span>
              </span>
              <img
                src={currentUser?.avatar}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-full object-cover border border-line"
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
