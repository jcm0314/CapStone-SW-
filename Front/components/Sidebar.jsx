import React from 'react';
import { Users, Plus, Columns3, Gauge, Search, Moon, Sun, X } from 'lucide-react';
import FeatureIcon from './FeatureIcon';
import { FEATURES } from '../data/featureCatalog';

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const SHORTCUT_LABEL = isMac ? '⌘K' : 'Ctrl K';

function NavItem({ active, icon: Icon, label, count, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`relative w-full flex items-center gap-2.5 pl-3 pr-2 h-8 rounded text-[13px] transition-colors ${
        active ? 'bg-muted text-fg font-medium' : 'text-fg-muted hover:text-fg hover:bg-subtle'
      }`}
    >
      {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-accent" aria-hidden="true" />}
      <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 text-left">{label}</span>
      {typeof count === 'number' && count > 0 && <span className="text-xs tabular-nums text-fg-subtle">{count}</span>}
    </button>
  );
}

function GroupLabel({ children }) {
  return <p className="px-3 pt-1 pb-1 text-[11px] font-medium text-fg-subtle">{children}</p>;
}

/**
 * 왼쪽 메뉴: 화면 이동, 기능 바로가기, 로드맵(아직 없는 기능).
 * variant="sidebar" (데스크톱 고정) | "drawer" (모바일)
 */
export default function Sidebar({
  variant = 'sidebar',
  activeView,
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
    <nav aria-label="메뉴" className="flex flex-col h-full">
      {variant === 'drawer' && (
        <div className="flex items-center justify-between px-3 h-12 border-b border-line">
          <span className="text-sm font-semibold text-fg">메뉴</span>
          <button type="button" onClick={onClose} className="btn btn-ghost p-1.5" aria-label="메뉴 닫기">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {variant === 'drawer' && (
          <button
            type="button"
            onClick={onOpenPalette}
            className="w-full flex items-center gap-2 px-2.5 h-8 rounded border border-line-strong bg-surface text-[13px] text-fg-subtle"
          >
            <Search className="w-4 h-4" /> 검색
          </button>
        )}

        <div className="space-y-px">
          <NavItem active={activeView === 'list'} icon={Users} label="지원자" count={applicantCount} onClick={() => onNavigate('list')} />
          <NavItem active={activeView === 'new'} icon={Plus} label="새 평가" onClick={() => onNavigate('new')} />
          <NavItem active={activeView === 'comparison'} icon={Columns3} label="평가 결과" onClick={() => onNavigate('comparison')} />
          {canSeeCredits && <NavItem active={activeView === 'credits'} icon={Gauge} label="크레딧" onClick={() => onNavigate('credits')} />}
        </div>

        <div className="space-y-px">
          <GroupLabel>기능</GroupLabel>
          {ready.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFeature(f)}
              title={f.desc}
              className="w-full flex items-center gap-2.5 pl-3 pr-2 h-8 rounded text-left text-[13px] text-fg-muted hover:text-fg hover:bg-subtle transition-colors"
            >
              <FeatureIcon name={f.icon} className="w-4 h-4 shrink-0" />
              <span className="truncate">{f.title}</span>
            </button>
          ))}
        </div>

        <div className="space-y-px pt-2 border-t border-line">
          <GroupLabel>로드맵</GroupLabel>
          {planned.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFeature(f)}
              title={`${f.desc} (준비 중)`}
              className="w-full flex items-center pl-3 pr-2 h-7 rounded text-left text-[12px] text-fg-subtle hover:bg-subtle transition-colors"
            >
              <span className="truncate">{f.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="px-2 py-2 border-t border-line flex items-center justify-between gap-2">
        <button type="button" onClick={onToggleTheme} className="btn btn-ghost btn-sm" aria-label="화면 테마 전환">
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          {theme === 'dark' ? '라이트' : '다크'}
        </button>
        <span className="text-[11px] text-fg-subtle hidden lg:inline">
          <kbd className="font-sans border border-line rounded-sm px-1">{SHORTCUT_LABEL}</kbd> 검색
        </span>
      </div>
    </nav>
  );

  if (variant === 'drawer') {
    return (
      <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="메뉴">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <div className="absolute inset-y-0 left-0 w-[80vw] max-w-[280px] bg-surface border-r border-line">{content}</div>
      </div>
    );
  }

  return (
    <aside className="hidden lg:block w-[220px] shrink-0 border-r border-line bg-surface sticky top-12 h-[calc(100vh-3rem)]">
      {content}
    </aside>
  );
}
