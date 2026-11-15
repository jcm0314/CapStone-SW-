import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { List } from 'react-window';
import { findFuzzyMatch } from '../utils/fuzzyMatcher';

// react-window v2 rowComponent signature: ({ index, style, ariaAttributes, ...rowProps })
const EvidenceCardRow = ({ index, style, filteredEvidences, activeQuoteId, setActiveQuoteId }) => {
  const ev = filteredEvidences[index];
  if (!ev) return null;

  const isSelected = activeQuoteId === ev.id;
  let borderClass = 'border-line';
  let badgeColor = '';
  let icon = null;

  if (ev.type === 'positive') {
    borderClass = isSelected ? 'border-ok ring-2 ring-ok/20 bg-surface' : 'border-line bg-surface hover:border-ok-line';
    badgeColor = 'bg-ok-soft text-ok border-ok-line';
    icon = <CheckCircle2 className="w-4 h-4 text-ok shrink-0" />;
  } else if (ev.type === 'risk') {
    borderClass = isSelected ? 'border-bad ring-2 ring-bad/20 bg-surface' : 'border-line bg-surface hover:border-bad-line';
    badgeColor = 'bg-bad-soft text-bad border-bad-line';
    icon = <AlertTriangle className="w-4 h-4 text-bad shrink-0" />;
  } else {
    borderClass = isSelected ? 'border-warn ring-2 ring-warn/20 bg-surface' : 'border-line bg-surface hover:border-warn-line';
    badgeColor = 'bg-warn-soft text-warn border-warn-line';
    icon = <HelpCircle className="w-4 h-4 text-warn shrink-0" />;
  }

  return (
    <div style={{ ...style, paddingBottom: '10px' }}>
      <div
        onClick={() => setActiveQuoteId(activeQuoteId === ev.id ? null : ev.id)}
        onMouseEnter={() => setActiveQuoteId(ev.id)}
        className={`p-3 rounded-md border transition-colors cursor-pointer h-[128px] flex flex-col justify-between gap-1.5 ${borderClass}`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-hidden">
            {icon}
            <h4 className="text-[13px] font-semibold text-fg truncate">{ev.title}</h4>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${badgeColor}`}>
            {ev.matched === false
              ? '원문 미확인 · 점수 미반영'
              : ev.type === 'positive' ? `+${ev.scoreImpact}점 (긍정)` : ev.type === 'risk' ? `${ev.scoreImpact}점 (리스크)` : '면접 검증'}
          </span>
        </div>

        <p className="text-[12px] leading-snug text-fg border-l-2 border-line-strong pl-2.5 line-clamp-2">“{ev.quote}”</p>

        <p className="text-[12px] text-fg-muted leading-snug line-clamp-1">{ev.explanation}</p>
      </div>
    </div>
  );
};

// Guard wrapper: keeps hook call order stable in the content component (Rules of Hooks)
export default function EvidenceViewer({ result }) {
  if (!result || !result.analysis) return null;
  return <EvidenceViewerContent result={result} />;
}

function EvidenceViewerContent({ result }) {
  const rawText = result.rawText || '';
  const groundingEvidences = result.analysis.groundingEvidences || [];
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
    if (activeQuoteId && listRef.current && typeof listRef.current.scrollToRow === 'function') {
      const idx = filteredEvidences.findIndex(ev => ev.id === activeQuoteId);
      if (idx !== -1) {
        listRef.current.scrollToRow({ index: idx, align: 'smart' });
      }
    }
  }, [activeQuoteId, filteredEvidences]);

  // Precompute and memoize matched intervals so hover (activeQuoteId) changes never re-run O(N*M) Levenshtein
  const resolvedMatches = useMemo(() => {
    const text = rawText || '';
    const rawMatches = [];

    (groundingEvidences || []).forEach(ev => {
      if (!ev || !ev.quote) return;
      // Quotes the enricher could not find in the text (possible hallucinations) are never highlighted
      if (ev.matched === false) return;

      // 1) Reuse pre-computed valid indices if available
      if (
        typeof ev.startIndex === 'number' &&
        typeof ev.endIndex === 'number' &&
        ev.startIndex >= 0 &&
        ev.endIndex > ev.startIndex &&
        ev.endIndex <= text.length
      ) {
        rawMatches.push({
          start: ev.startIndex,
          end: ev.endIndex,
          evidence: ev,
          isExact: true,
          similarity: 1
        });
        return;
      }

      // 2) Fallback to fuzzy matcher only once when evidence list or text changes
      const match = findFuzzyMatch(text, ev.quote, 0.75);
      if (match) {
        rawMatches.push({
          start: match.start,
          end: match.end,
          evidence: ev,
          isExact: match.isExact,
          similarity: match.similarity
        });
      }
    });

    rawMatches.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));

    // Filter out overlapping intervals to prevent duplicate/corrupted DOM slices
    const nonOverlapping = [];
    let cursor = 0;
    for (const m of rawMatches) {
      if (m.start < cursor) {
        continue;
      }
      nonOverlapping.push(m);
      cursor = Math.max(cursor, m.end);
    }

    return nonOverlapping;
  }, [rawText, groundingEvidences]);

  // Render text with interactive highlighted spans (Exact + Fuzzy Matcher)
  const renderHighlightedText = () => {
    const text = rawText || '';
    const elements = [];
    let lastIndex = 0;

    resolvedMatches.forEach((m) => {
      if (m.start < lastIndex) return;

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
      const hlTone = ev.type === 'positive' ? 'hl-ok' : ev.type === 'risk' ? 'hl-bad' : 'hl-warn';
      const typeLabel = ev.type === 'positive' ? '긍정 근거' : ev.type === 'risk' ? '리스크' : '면접 확인';

      elements.push(
        <mark
          key={`mark_${ev.id}_${m.start}`}
          onClick={() => setActiveQuoteId(activeQuoteId === ev.id ? null : ev.id)}
          onMouseEnter={() => setActiveQuoteId(ev.id)}
          title={`${typeLabel} · ${ev.title || ''}`}
          className={`hl ${hlTone} ${isSelected ? 'hl-active' : ''}`}
        >
          {text.slice(m.start, m.end)}
        </mark>
      );

      lastIndex = Math.max(lastIndex, m.end);
    });

    if (lastIndex < text.length) {
      elements.push(<span key={`text_end`}>{text.slice(lastIndex)}</span>);
    }

    return elements;
  };

  const FILTERS = [
    { id: 'ALL', label: '전체' },
    { id: 'POSITIVE', label: '긍정 근거', hl: 'hl-ok' },
    { id: 'VERIFY', label: '면접 확인', hl: 'hl-warn' },
    { id: 'RISK', label: '리스크', hl: 'hl-bad' }
  ];

  return (
    <section className="card" aria-labelledby="evidence-title">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 px-4 pt-3 pb-2 border-b border-line">
        <h2 id="evidence-title" className="section-title">근거 문장</h2>

        <div className="flex items-center gap-0.5 text-[12px] max-w-full overflow-x-auto -mx-1" role="tablist" aria-label="근거 유형">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filterType === f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-2 h-7 rounded inline-flex items-center whitespace-nowrap transition-colors ${
                filterType === f.id ? 'bg-muted text-fg font-medium' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {f.hl ? <span className={`hl ${f.hl} cursor-pointer`}>{f.label}</span> : f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split View: Left Document View vs Right Evidence Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 p-3">
        {/* Left: Document View */}
        <div className="lg:col-span-7">
          <div className="flex justify-between items-center text-xs text-fg-subtle px-1 pb-1.5">
            <span>자기소개서 원문 · 개인정보 가림</span>
            <span className="tabular-nums">근거 {groundingEvidences.length}</span>
          </div>
          <div className="px-1 text-[14px] text-fg leading-[1.95] whitespace-pre-wrap break-keep max-h-[430px] overflow-y-auto">
            {renderHighlightedText()}
          </div>
        </div>

        {/* Right: Virtualized Evidence Cards List */}
        <div className="lg:col-span-5 h-[460px]">
          {filteredEvidences.length === 0 ? (
            <div className="h-full rounded-md border border-dashed border-line-strong flex items-center justify-center p-6 text-center text-[13px] text-fg-subtle">
              이 유형의 근거 문장이 없습니다.
            </div>
          ) : List ? (
            <List
              listRef={listRef}
              rowComponent={EvidenceCardRow}
              rowCount={filteredEvidences.length}
              rowHeight={138}
              rowProps={{ filteredEvidences, activeQuoteId, setActiveQuoteId }}
              style={{ height: 460, width: '100%' }}
            />
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[460px]">
              {filteredEvidences.map((ev, idx) => (
                <EvidenceCardRow key={ev.id || idx} index={idx} style={{}} filteredEvidences={filteredEvidences} activeQuoteId={activeQuoteId} setActiveQuoteId={setActiveQuoteId} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
