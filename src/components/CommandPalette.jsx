import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import FeatureIcon from './FeatureIcon';
import { FEATURE_STATUS } from '../data/featureCatalog';

const normalize = (s) => (s || '').toLowerCase().replace(/\s+/g, '');

/**
 * ⌘K / Ctrl+K 기능 검색.
 * items: [{ id, title, desc, icon, status?, group, keywords }]
 * onSelect(item) 은 부모(App)가 처리합니다.
 */
export default function CommandPalette({ isOpen, onClose, items, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      // 모달이 그려진 다음 포커스
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return items;
    return items.filter((it) => normalize(`${it.title} ${it.desc} ${it.keywords}`).includes(q));
  }, [items, query]);

  const groups = useMemo(() => {
    const order = [];
    const map = new Map();
    filtered.forEach((it) => {
      if (!map.has(it.group)) {
        map.set(it.group, []);
        order.push(it.group);
      }
      map.get(it.group).push(it);
    });
    return order.map((g) => ({ name: g, items: map.get(g) }));
  }, [filtered]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!isOpen) return null;

  const choose = (item) => {
    if (!item) return;
    onSelect(item);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(filtered[activeIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let runningIndex = -1;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-900/30 flex items-start justify-center px-3 pt-[12vh]"
      onMouseDown={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="기능 검색"
        className="w-full max-w-xl bg-surface border border-line rounded-2xl shadow-pop overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-line">
          <Search className="w-4 h-4 text-fg-subtle shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="기능이나 화면을 검색하세요 (예: 형광펜, 보고서, 비교)"
            className="flex-1 h-12 bg-transparent text-[15px] text-fg placeholder:text-fg-subtle focus:outline-none"
            aria-label="기능 검색어"
          />
          <kbd className="hidden sm:inline-flex text-[11px] font-medium text-fg-subtle border border-line rounded px-1.5 py-0.5">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-center text-sm text-fg-muted">‘{query}’에 맞는 기능이 없습니다.</p>
          )}
          {groups.map((group) => (
            <div key={group.name} className="pb-1">
              <p className="px-4 pt-2 pb-1 text-[11px] font-semibold text-fg-subtle">{group.name}</p>
              {group.items.map((item) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isActive = idx === activeIndex;
                const status = item.status ? FEATURE_STATUS[item.status] : null;
                return (
                  <button
                    key={item.id}
                    type="button"
                    data-index={idx}
                    onMouseMove={() => setActiveIndex(idx)}
                    onClick={() => choose(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      isActive ? 'bg-brand-soft' : ''
                    }`}
                  >
                    <span
                      className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                        item.status === 'planned' ? 'border-line text-fg-subtle bg-subtle' : 'border-line text-brand-fg bg-surface'
                      }`}
                    >
                      <FeatureIcon name={item.icon} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-sm font-medium truncate ${item.status === 'planned' ? 'text-fg-muted' : 'text-fg'}`}>
                        {item.title}
                      </span>
                      {item.desc && <span className="block text-xs text-fg-subtle truncate">{item.desc}</span>}
                    </span>
                    {status && <span className={`chip ${status.chip}`}>{status.label}</span>}
                    {isActive && <CornerDownLeft className="hidden sm:block w-3.5 h-3.5 text-fg-subtle shrink-0" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-4 py-2 border-t border-line bg-subtle text-[11px] text-fg-subtle">
          <span><kbd className="font-sans">↑↓</kbd> 이동</span>
          <span><kbd className="font-sans">Enter</kbd> 열기</span>
          <span><kbd className="font-sans">Esc</kbd> 닫기</span>
        </div>
      </div>
    </div>
  );
}
