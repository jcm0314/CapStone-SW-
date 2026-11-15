import React, { useMemo, useState } from 'react';
import { Plus, Search, ChevronRight, Printer, Trash2, UploadCloud, PenLine, Sparkles, FileSearch, MessagesSquare } from 'lucide-react';
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
export default function ApplicantList({ applicants, selectedId, onOpen, onNew, onUpload, onPaste, onOpenReport, onDelete, tenantName }) {
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
        <StartGuide onUpload={onUpload || onNew} onPaste={onPaste || onNew} />
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
              {onOpenReport && <col className="w-[84px]" />}
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
                {(onOpenReport || onDelete) && <th className="font-medium py-2 pr-4"><span className="sr-only">작업</span></th>}
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
                    {(onOpenReport || onDelete) && (
                      <td className="py-1.5 pr-4 text-right whitespace-nowrap space-x-1">
                        {onOpenReport && <ReportButton onClick={() => onOpenReport(app)} name={app.name} />}
                        {onDelete && <DeleteButton onClick={() => onDelete(app)} name={app.name} />}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* 모바일: 목록 */}
          <ul className="md:hidden divide-y divide-line">
            {rows.map(({ app, score, decision, verifyCount, riskCount, isSample }) => (
              <li key={app.id} className="flex items-stretch">
                <button
                  type="button"
                  onClick={() => onOpen(app)}
                  className={`flex-1 min-w-0 text-left px-3.5 py-3 flex items-center gap-3 relative ${app.id === selectedId ? 'bg-subtle' : ''}`}
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
                {(onOpenReport || onDelete) && (
                  <div className="flex items-center pr-2 gap-1">
                    {onOpenReport && <ReportButton onClick={() => onOpenReport(app)} name={app.name} compact />}
                    {onDelete && <DeleteButton onClick={() => onDelete(app)} name={app.name} />}
                  </div>
                )}
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="px-4 py-6 text-center text-xs text-fg-muted">검색 결과가 없습니다.</p>}
        </div>
      )}
    </section>
  );
}

function ReportButton({ onClick, name, compact = false }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="btn btn-ghost btn-sm text-fg-muted hover:text-fg"
      aria-label={`${name} 평가 보고서`}
      title="평가 보고서"
    >
      <Printer className="w-3.5 h-3.5" />
      {!compact && '보고서'}
    </button>
  );
}

function DeleteButton({ onClick, name }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => e.stopPropagation()}
      className="btn btn-ghost btn-sm text-fg-subtle hover:text-bad"
      aria-label={`${name} 지원자 삭제`}
      title="지원자 삭제"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

const STEPS = [
  { icon: UploadCloud, title: '자기소개서 올리기', desc: 'PDF·TXT 파일이나 본문 붙여넣기. 이름·학교·연락처는 AI로 보내기 전에 가려집니다.' },
  { icon: FileSearch, title: 'AI 평가 (1분 안팎)', desc: '점수마다 근거가 된 문장에 형광펜. 과장이 의심되는 문장도 표시합니다.' },
  { icon: MessagesSquare, title: '면접 질문 · 결과 메일', desc: '의심 문장을 확인하는 면접 질문과 합격·불합격 메일까지 바로.' }
];

/** 지원자가 0명일 때 첫 화면 */
function StartGuide({ onUpload, onPaste }) {
  return (
    <div className="card px-5 py-8 sm:px-8 sm:py-10">
      <div className="max-w-[560px] mx-auto text-center">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-brand-soft text-brand-fg">
          <Sparkles className="w-5 h-5" />
        </span>
        <h2 className="mt-3 text-lg font-semibold text-fg">자기소개서를 올리면, AI가 점수와 근거 문장을 보여줍니다</h2>
        <p className="mt-1.5 text-[13px] text-fg-muted">"82점"만 주는 대신, 왜 그 점수인지 원문에서 바로 확인할 수 있어요.</p>
        <div className="mt-5 flex flex-col sm:flex-row justify-center gap-2">
          <button type="button" onClick={onUpload} className="btn btn-primary btn-lg">
            <UploadCloud className="w-4 h-4" /> PDF · TXT 올리기
          </button>
          <button type="button" onClick={onPaste} className="btn btn-secondary btn-lg">
            <PenLine className="w-4 h-4" /> 직접 붙여넣기
          </button>
        </div>
      </div>
      <ol className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {STEPS.map((step, i) => (
          <li key={step.title} className="rounded-lg border border-line bg-subtle/60 p-3.5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-fg">
              <span className="tabular-nums text-fg-subtle">{i + 1}</span>
              <step.icon className="w-4 h-4 text-fg-muted" aria-hidden="true" />
              {step.title}
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-fg-muted">{step.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
