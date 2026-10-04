import React, { useState, useRef, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, HelpCircle, ArrowRight, Quote, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import * as ReactWindow from 'react-window';
import { findFuzzyMatch } from '../utils/fuzzyMatcher';

// Robust List resolver to prevent runtime unmounting on production bundles
const List = ReactWindow.FixedSizeList || (ReactWindow.default && ReactWindow.default.FixedSizeList);

const EvidenceCardRow = ({ index, style, data }) => {
  const { filteredEvidences, activeQuoteId, setActiveQuoteId } = data;
  const ev = filteredEvidences[index];
  if (!ev) return null;

  const isSelected = activeQuoteId === ev.id;
  let borderClass = 'border-gray-800';
  let badgeColor = '';
  let icon = null;

  if (ev.type === 'positive') {
    borderClass = isSelected ? 'border-emerald-400 ring-1 ring-emerald-400 bg-emerald-500/10' : 'hover:border-emerald-500/50 bg-gray-900/60';
    badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    icon = <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
  } else if (ev.type === 'risk') {
    borderClass = isSelected ? 'border-rose-400 ring-1 ring-rose-400 bg-rose-500/10' : 'hover:border-rose-500/50 bg-gray-900/60';
    badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
    icon = <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />;
  } else {
    borderClass = isSelected ? 'border-amber-400 ring-1 ring-amber-400 bg-amber-500/10' : 'hover:border-amber-500/50 bg-gray-900/60';
    badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
    icon = <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />;
  }

  return (
    <div style={{ ...style, paddingBottom: '10px' }}>
      <div
        onClick={() => setActiveQuoteId(activeQuoteId === ev.id ? null : ev.id)}
        onMouseEnter={() => setActiveQuoteId(ev.id)}
        className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 h-[135px] flex flex-col justify-between ${borderClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {icon}
            <h4 className="text-xs font-bold text-white truncate">{ev.title}</h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeColor}`}>
            {ev.type === 'positive' ? `+${ev.scoreImpact}점 (긍정)` : ev.type === 'risk' ? `${ev.scoreImpact}점 (리스크)` : '면접 검증'}
          </span>
        </div>

        <div className="bg-black/40 rounded-lg p-2 border border-gray-800 text-[11px] text-gray-300 italic font-mono flex gap-2 overflow-hidden">
          <Quote className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2">"{ev.quote}"</span>
        </div>

        <p className="text-[11px] text-gray-400 leading-snug line-clamp-1">{ev.explanation}</p>
      </div>
    </div>
  );
};

export default function EvidenceViewer({ result }) {
  if (!result || !result.analysis) return null;

  const { rawText } = result;
  const { groundingEvidences } = result.analysis;
  const [activeQuoteId, setActiveQuoteId] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const listRef = useRef(null);

  // Filtered evidences
  const filteredEvidences = groundingEvidences.filter(ev => {
    if (filterType === 'ALL') return true;
    return ev.type === filterType.toLowerCase();
  });

  // Auto scroll to active quote when selected
  useEffect(() => {
    if (activeQuoteId && listRef.current && typeof listRef.current.scrollToItem === 'function') {
      const idx = filteredEvidences.findIndex(ev => ev.id === activeQuoteId);
      if (idx !== -1) {
        listRef.current.scrollToItem(idx, 'smart');
      }
    }
  }, [activeQuoteId, filteredEvidences]);

  // Render text with interactive highlighted spans (Exact + Fuzzy Matcher)
  const renderHighlightedText = () => {
    let text = rawText;
    const matches = [];

    groundingEvidences.forEach(ev => {
      const match = findFuzzyMatch(text, ev.quote, 0.75);
      if (match) {
        matches.push({
          start: match.start,
          end: match.end,
          evidence: ev,
          isExact: match.isExact,
          similarity: match.similarity
        });
      }
    });

    matches.sort((a, b) => a.start - b.start);

    const elements = [];
    let lastIndex = 0;

    matches.forEach((m) => {
      // Text before match
      if (m.start > lastIndex) {
        elements.push(
          <span key={`text_${lastIndex}`}>
            {text.slice(lastIndex, m.start)}
          </span>
        );
      }

      // Highlighted match span
      const ev = m.evidence;
      const isSelected = activeQuoteId === ev.id;
      let badgeStyle = '';

      if (ev.type === 'positive') {
        badgeStyle = isSelected
          ? 'bg-emerald-500/40 text-emerald-200 border-emerald-400 font-semibold ring-2 ring-emerald-400'
          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30';
      } else if (ev.type === 'risk') {
        badgeStyle = isSelected
          ? 'bg-rose-500/40 text-rose-200 border-rose-400 font-semibold ring-2 ring-rose-400'
          : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30';
      } else {
        badgeStyle = isSelected
          ? 'bg-amber-500/40 text-amber-200 border-amber-400 font-semibold ring-2 ring-amber-400'
          : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30';
      }

      elements.push(
        <mark
          key={`mark_${ev.id}`}
          onClick={() => setActiveQuoteId(activeQuoteId === ev.id ? null : ev.id)}
          onMouseEnter={() => setActiveQuoteId(ev.id)}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all border ${badgeStyle} mx-0.5 inline-block`}
        >
          {ev.quote}
          <span className="ml-1 text-[10px] uppercase font-bold opacity-80">
            {ev.type === 'positive' ? '🟢 긍정근거' : ev.type === 'risk' ? '🔴 리스크' : '🟡 검증필요'}
          </span>
        </mark>
      );

      lastIndex = m.end;
    });

    if (lastIndex < text.length) {
      elements.push(<span key={`text_end`}>{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">서류 본문 문장별 근거(Grounding) 캡처 검증</h2>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold flex items-center gap-1">
              <Zap className="w-3 h-3 text-blue-400" /> Virtualized
            </span>
            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/30 rounded text-[10px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-purple-400" /> PII Masked (Blind Recruitment)
            </span>
          </div>
          <p className="text-xs text-gray-400">문장을 클릭하거나 마우스를 올리면 가상 스크롤 목록이 해당 위치로 자동 이동합니다.</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1 bg-gray-900/80 p-1 rounded-xl border border-gray-800 text-[11px]">
          {['ALL', 'POSITIVE', 'RISK', 'VERIFY'].map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                filterType === type
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {type === 'ALL' ? '전체 보기' : type === 'POSITIVE' ? '🟢 긍정근거' : type === 'RISK' ? '🔴 리스크' : '🟡 검증필요'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split View: Left Document View vs Right Evidence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Document View */}
        <div className="lg:col-span-7 bg-gray-900/70 rounded-xl p-4 border border-gray-800 space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-gray-400 border-b border-gray-800 pb-2">
            <span>지원서 본문 텍스트 (태그 캡처)</span>
            <span>총 {groundingEvidences.length}개 근거 포착</span>
          </div>
          <div className="text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-[460px] overflow-y-auto pr-2">
            {renderHighlightedText()}
          </div>
        </div>

        {/* Right: Virtualized Evidence Cards List */}
        <div className="lg:col-span-5 h-[460px]">
          {filteredEvidences.length === 0 ? (
            <div className="bg-gray-900/40 rounded-xl p-6 text-center text-xs text-gray-500 border border-gray-800">
              해당 유형의 근거 문장이 탐지되지 않았습니다.
            </div>
          ) : List ? (
            <List
              ref={listRef}
              height={460}
              itemCount={filteredEvidences.length}
              itemSize={145}
              width="100%"
              itemData={{ filteredEvidences, activeQuoteId, setActiveQuoteId }}
            >
              {EvidenceCardRow}
            </List>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[460px]">
              {filteredEvidences.map((ev, idx) => (
                <EvidenceCardRow key={ev.id || idx} index={idx} style={{}} data={{ filteredEvidences, activeQuoteId, setActiveQuoteId }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
