import React from 'react';
import { FileText, Users, Gauge, Search, Moon, Sun, X } from 'lucide-react';
import FeatureIcon from './FeatureIcon';
import { FEATURES, FEATURE_STATUS } from '../data/featureCatalog';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

function NavItem({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors ${
        active ? 'bg-brand-soft text-brand-fg' : 'text-fg-muted hover:text-fg hover:bg-subtle'
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className={`text-[11px] font-semibold tabular-nums ${active ? 'text-brand-fg' : 'text-fg-subtle'}`}>{count}</span>
      )}
    </button>
  );
}

/**
 * 왼쪽 메뉴: 화면 이동 + 기능 목록(구현됨 / 준비 중).
 * variant="sidebar" (데스크톱 고정) | "drawer" (모바일 슬라이드)
 */
export default function Sidebar({
  variant = 'sidebar',
  activeTab,
  onNavigate,
  applicantCount,
  canSeeCredits,
  onSelectFeature,
  onOpenPalette,
  theme,
  onToggleTheme,
  onClose
}) {
  const ready = FEATURES.filter((f) => f.status === 'ready');
  const planned = FEATURES.filter((f) => f.status === 'planned');

  const content = (
    <nav aria-label="기능 메뉴" className="flex flex-col h-full">
      {variant === 'drawer' && (
        <div className="flex items-center justify-between px-4 h-14 border-b border-line">
          <span className="text-sm font-semibold text-fg">메뉴</span>
          <button type="button" onClick={onClose} className="btn btn-ghost p-2" aria-label="메뉴 닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {variant === 'drawer' && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full flex items-center gap-2 px-3 h-10 rounded-lg border border-line-strong bg-surface text-[13px] text-fg-subtle"
          >
            <Search className="w-4 h-4" /> 기능 검색
          </button>
        )}

        <div className="space-y-0.5">
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-fg-subtle">화면</p>
          <NavItem active={activeTab === 'evaluator'} icon={FileText} label="서류 평가" onClick={() => onNavigate('evaluator')} />
          <NavItem
            active={activeTab === 'comparison'}
            icon={Users}
            label="지원자 비교"
            count={applicantCount}
            onClick={() => onNavigate('comparison')}
          />
          {canSeeCredits && (
            <NavItem active={activeTab === 'credits'} icon={Gauge} label="크레딧 관리" onClick={() => onNavigate('credits')} />
          )}
        </div>

        <div className="space-y-0.5">
          <div className="flex items-center justify-between px-2.5 pb-1.5">
            <p className="text-[11px] font-semibold text-fg-subtle">기능</p>
            <span className="text-[11px] text-fg-subtle">{ready.length}개 사용 가능</span>
          </div>
          {ready.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFeature(f)}
              title={`${f.title} — ${f.desc}`}
              className="group w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-subtle transition-colors"
            >
              <span className="mt-0.5 text-fg-subtle group-hover:text-brand-fg transition-colors">
                <FeatureIcon name={f.icon} />
              </span>
              <span className="flex-1 min-w-0 text-[13px] leading-snug text-fg">{f.short || f.title}</span>
              <span className={`chip ${FEATURE_STATUS.ready.chip} !px-1.5 !py-0 !text-[10px] mt-0.5`}>{FEATURE_STATUS.ready.label}</span>
            </button>
          ))}
        </div>

        <div className="space-y-0.5">
          <p className="px-2.5 pb-1.5 text-[11px] font-semibold text-fg-subtle">준비 중</p>
          {planned.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFeature(f)}
              title={`${f.title} — ${f.desc}`}
              className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-lg text-left hover:bg-subtle transition-colors"
            >
              <span className="mt-0.5 text-fg-subtle/70">
                <FeatureIcon name={f.icon} />
              </span>
              <span className="flex-1 min-w-0 text-[13px] leading-snug text-fg-subtle">{f.short || f.title}</span>
              <span className={`chip ${FEATURE_STATUS.planned.chip} !px-1.5 !py-0 !text-[10px] mt-0.5`}>{FEATURE_STATUS.planned.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-3 py-3 border-t border-line flex items-center justify-between gap-2">
        <button type="button" onClick={onToggleTheme} className="btn btn-ghost btn-sm" aria-label="화면 테마 전환">
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === 'dark' ? '라이트 모드' : '다크 모드'}
        </button>
        <span className="text-[11px] text-fg-subtle hidden lg:inline">
          <kbd className="font-sans border border-line rounded px-1 py-0.5">{SHORTCUT_LABEL}</kbd> 검색
        </span>
      </div>
    </nav>
  );

  if (variant === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="메뉴">
        <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <div className="absolute inset-y-0 left-0 w-[86vw] max-w-[320px] bg-surface border-r border-line shadow-pop">
          {content}
        </div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block w-[264px] shrink-0 border-r border-line bg-surface sticky top-14 h-[calc(100vh-3.5rem)]">
      {content}
    </aside>
  );
}
