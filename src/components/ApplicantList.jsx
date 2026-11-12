import React, { useMemo, useState } from 'react';
import { Plus, Search, ChevronRight } from 'lucide-react';
import { isSampleResult } from '../utils/sampleResult';

export const DECISION = {
  STRONG_PASS: { label: '통과 추천', dot: 'bg-ok-solid', text: 'text-ok' },
  INTERVIEW: { label: '면접 추천', dot: 'bg-fg', text: 'text-fg' },
  HOLD: { label: '보류', dot: 'bg-warn-solid', text: 'text-warn' },
  REJECT: { label: '탈락 권장', dot: 'bg-bad-solid', text: 'text-bad' }
};

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
};

function rowData(app) {
  const summary = app.analysis?.summary || {};
  const evidences = app.analysis?.groundingEvidences || [];
  return {
    score: summary.totalScore,
    decision: DECISION[summary.decision] || DECISION.HOLD,
    verifyCount: evidences.filter((e) => e.type === 'verify').length,
    riskCount: evidences.filter((e) => e.type === 'risk').length,
    date: formatDate(app.lastEditedAt || app.analyzedAt || app.appliedAt),
    isSample: isSampleResult(app)
  };
}

/** 첫 화면: 지원자 목록 (행을 누르면 평가 결과로 이동) */
export default function ApplicantList({ applicants, selectedId, onOpen, onNew, tenantName }) {
  const [query, setQuery] = useState('');
  const [decisionFilter, setDecisionFilter] = useState('ALL');

  const counts = useMemo(() => {
    const c = { ALL: applicants.length };
    Object.keys(DECISION).forEach((k) => {
      c[k] = applicants.filter((a) => (a.analysis?.summary?.decision || 'HOLD') === k).length;
    });
    return c;
  }, [applicants]);

  const rows = useMemo(() => {
    const q = query.trim();
    let list = q ? applicants.filter((a) => `${a.name} ${a.applyJobTitle || ''}`.includes(q)) : applicants;
    if (decisionFilter !== 'ALL') list = list.filter((a) => (a.analysis?.summary?.decision || 'HOLD') === decisionFilter);
    return list.map((app) => ({ app, ...rowData(app) }));
  }, [applicants, query, decisionFilter]);

  const FILTERS = [{ id: 'ALL', label: '전체' }, ...Object.entries(DECISION).map(([id, d]) => ({ id, label: d.label }))];

  return (
    <section aria-labelledby="list-title" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2 min-w-0">
          <h1 id="list-title" className="text-lg font-semibold text-fg">지원자</h1>
          <span className="text-sm text-fg-subtle tabular-nums">{applicants.length}</span>
          {tenantName && <span className="hidden sm:inline text-xs text-fg-subtle truncate">{tenantName}</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="relative hidden sm:block">
            <span className="sr-only">이름 검색</span>
            <Search className="w-3.5 h-3.5 text-fg-subtle absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 직무"
              className="field !py-1 h-8 pl-7 w-44"
            />
          </label>
          <button type="button" onClick={onNew} className="btn btn-primary btn-md">
            <Plus className="w-4 h-4" /> 새 평가
          </button>
        </div>
      </div>

      {applicants.length > 0 && (
        <div className="flex items-center gap-0.5 text-[13px] border-b border-line overflow-x-auto" role="tablist" aria-label="판정별 보기">
          {FILTERS.map((f) => {
            const active = decisionFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setDecisionFilter(f.id)}
                className={`relative px-2.5 h-8 whitespace-nowrap ${active ? 'text-fg font-medium' : 'text-fg-muted hover:text-fg'}`}
              >
                {f.label} <span className="tabular-nums text-fg-subtle">{counts[f.id] ?? 0}</span>
                {active && <span className="absolute left-2 right-2 -bottom-px h-[2px] bg-fg" />}
              </button>
            );
          })}
        </div>
      )}

      {applicants.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-sm text-fg">아직 평가한 지원자가 없습니다.</p>
          <p className="mt-1 text-xs text-fg-muted">자기소개서를 붙여 넣거나 PDF·TXT 파일을 올려 첫 평가를 시작하세요.</p>
          <button type="button" onClick={onNew} className="btn btn-primary btn-md mt-4">
            <Plus className="w-4 h-4" /> 새 평가
          </button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* 데스크톱: 표 */}
          <table className="hidden md:table w-full table-fixed text-[13px]">
            <colgroup>
              <col className="w-[18%]" />
              <col />
              <col className="w-[64px]" />
              <col className="w-[108px]" />
              <col className="w-[76px]" />
              <col className="w-[64px]" />
              <col className="w-[88px]" />
              <col className="w-[96px]" />
            </colgroup>
            <thead>
              <tr className="text-left text-xs text-fg-subtle border-b border-line bg-subtle/60">
                <th className="font-medium py-2 pl-4 pr-2">이름</th>
                <th className="font-medium py-2 px-2">지원 직무</th>
                <th className="font-medium py-2 px-2 text-right">점수</th>
                <th className="font-medium py-2 px-2">판정</th>
                <th className="font-medium py-2 px-2 text-right">면접 확인</th>
                <th className="font-medium py-2 px-2 text-right">리스크</th>
                <th className="font-medium py-2 px-2">상태</th>
                <th className="font-medium py-2 pl-2 pr-4 text-right">평가일</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ app, score, decision, verifyCount, riskCount, date, isSample }) => {
                const selected = app.id === selectedId;
                return (
                  <tr
                    key={app.id}
                    onClick={() => onOpen(app)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onOpen(app);
                    }}
                    tabIndex={0}
                    aria-label={`${app.name} 평가 결과 열기`}
                    className={`group cursor-pointer border-b border-line last:border-b-0 hover:bg-subtle focus:bg-subtle focus:outline-none ${
                      selected ? 'bg-subtle' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-4 pr-2 relative">
                      {selected && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent" aria-hidden="true" />}
                      <span className="font-medium text-fg">{app.name}</span>
                      {isSample && <span className="ml-2 text-[11px] text-fg-subtle border border-line rounded-sm px-1">샘플</span>}
                    </td>
                    <td className="py-2.5 px-2 text-fg-muted truncate">{app.applyJobTitle || '-'}</td>
                    <td className="py-2.5 px-2 text-right font-semibold tabular-nums text-fg">{score ?? '-'}</td>
                    <td className="py-2.5 px-2">
                      <span className={`inline-flex items-center gap-1.5 ${decision.text}`}>
                        <span className={`dot ${decision.dot}`} />
                        {decision.label}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right tabular-nums text-fg-muted">{verifyCount || '-'}</td>
                    <td className={`py-2.5 px-2 text-right tabular-nums ${riskCount ? 'text-bad' : 'text-fg-muted'}`}>{riskCount || '-'}</td>
                    <td className="py-2.5 px-2 text-fg-muted">{app.isHumanVerified ? '검토 완료' : 'AI 초안'}</td>
                    <td className="py-2.5 pl-2 pr-4 text-right text-fg-subtle tabular-nums">
                      <span className="group-hover:hidden">{date || '-'}</span>
                      <ChevronRight className="w-4 h-4 hidden group-hover:inline text-fg-muted" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 모바일: 목록 */}
          <ul className="md:hidden divide-y divide-line">
            {rows.map(({ app, score, decision, verifyCount, riskCount, isSample }) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => onOpen(app)}
                  className={`w-full text-left px-3.5 py-3 flex items-center gap-3 relative ${app.id === selectedId ? 'bg-subtle' : ''}`}
                >
                  {app.id === selectedId && <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-accent" aria-hidden="true" />}
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="font-medium text-sm text-fg">{app.name}</span>
                      {isSample && <span className="text-[11px] text-fg-subtle border border-line rounded-sm px-1">샘플</span>}
                    </span>
                    <span className="block text-xs text-fg-muted truncate mt-0.5">{app.applyJobTitle}</span>
                    <span className="flex items-center gap-3 mt-1 text-xs">
                      <span className={`inline-flex items-center gap-1 ${decision.text}`}>
                        <span className={`dot ${decision.dot}`} />
                        {decision.label}
                      </span>
                      {verifyCount > 0 && <span className="text-fg-muted">면접 확인 {verifyCount}</span>}
                      {riskCount > 0 && <span className="text-bad">리스크 {riskCount}</span>}
                    </span>
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-fg">{score ?? '-'}</span>
                  <ChevronRight className="w-4 h-4 text-fg-subtle" />
                </button>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="px-4 py-6 text-center text-xs text-fg-muted">검색 결과가 없습니다.</p>}
        </div>
      )}
    </section>
  );
}
