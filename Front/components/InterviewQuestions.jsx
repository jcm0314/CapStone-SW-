import React, { useState, useMemo } from 'react';
import { CheckSquare, Target, Hash, Layers } from 'lucide-react';
import { extractQuestionKeywords, groupQuestionsByKeyword } from '../utils/questionTagging';

export default function InterviewQuestions({ result }) {
  const [selectedTag, setSelectedTag] = useState('ALL');
  const [groupMode, setGroupMode] = useState(false);

  const interviewQuestions = result?.analysis?.interviewQuestions || [];

  const enrichedQuestions = useMemo(
    () =>
      interviewQuestions.map((iq, idx) => ({
        ...iq,
        _tags: extractQuestionKeywords(iq),
        _origIndex: idx
      })),
    [interviewQuestions]
  );

  const tagGroups = useMemo(
    () => groupQuestionsByKeyword(interviewQuestions),
    [interviewQuestions]
  );

  // 질문이 없으면(면접 질문 에이전트 실패 등) 빈 카드를 그리지 않음
  if (interviewQuestions.length === 0) return null;

  const visibleQuestions =
    selectedTag === 'ALL'
      ? enrichedQuestions
      : enrichedQuestions.filter((q) => q._tags.includes(selectedTag));

  const renderQuestionCard = (iq) => (
    <article key={`${iq.id || iq._origIndex}-${selectedTag}`} className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-semibold text-fg-subtle tabular-nums">Q{iq._origIndex + 1}</span>
          <span className="text-xs text-fg-subtle">{iq.category}</span>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {iq._tags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setSelectedTag(tag === selectedTag ? 'ALL' : tag)}
              className={`px-1.5 py-0.5 rounded text-[11px] border transition-colors ${
                selectedTag === tag
                  ? 'bg-fg text-canvas border-fg font-medium'
                  : 'bg-subtle text-fg-muted border-line hover:text-fg'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      <h3 className="text-[14px] font-medium text-fg leading-relaxed break-keep">{iq.question}</h3>

      {iq.basedQuote && (
        <p className="text-[12px] text-fg-muted leading-snug border-l-2 border-[rgb(var(--hl-warn))] pl-2.5 line-clamp-2">
          근거 문장 · “{iq.basedQuote}”
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex items-start gap-1.5 text-[12px]">
          <Target className="w-3.5 h-3.5 text-fg-subtle shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-fg">질문 의도 </span>
            <span className="text-fg-muted">{iq.intent}</span>
          </p>
        </div>

        {iq.checklist && iq.checklist.length > 0 && (
          <div className="space-y-1">
            <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5 text-fg-subtle" /> 면접관 체크리스트
            </span>
            <ul className="space-y-0.5 pl-5 list-disc text-[12px] text-fg-muted marker:text-fg-subtle">
              {iq.checklist.map((item, cIdx) => (
                <li key={cIdx}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  );

  return (
    <section className="card" aria-labelledby="questions-title">
      <div className="px-4 pt-3 pb-2 border-b border-line space-y-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-baseline gap-2">
            <h2 id="questions-title" className="section-title">면접 질문</h2>
            <span className="text-xs text-fg-subtle tabular-nums">{interviewQuestions.length}</span>
          </div>
          <button
            type="button"
            onClick={() => setGroupMode((v) => !v)}
            aria-pressed={groupMode}
            className={`btn btn-sm ${groupMode ? 'btn-primary' : 'btn-ghost'}`}
          >
            <Layers className="w-3.5 h-3.5" />
            {groupMode ? '키워드 묶음 해제' : '키워드별 묶어보기'}
          </button>
        </div>

        {/* 키워드 필터 바 */}
        <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="면접 질문 키워드 필터">
          <Hash className="w-3.5 h-3.5 text-fg-subtle shrink-0" />
          <button
            type="button"
            onClick={() => setSelectedTag('ALL')}
            className={`px-2 py-0.5 rounded-full text-[11.5px] border transition-colors ${
              selectedTag === 'ALL'
                ? 'bg-fg text-canvas border-fg font-medium'
                : 'bg-surface text-fg-muted border-line hover:text-fg'
            }`}
          >
            전체 ({interviewQuestions.length})
          </button>
          {tagGroups.map((g) => (
            <button
              key={g.tag}
              type="button"
              onClick={() => setSelectedTag(g.tag === selectedTag ? 'ALL' : g.tag)}
              className={`px-2 py-0.5 rounded-full text-[11.5px] border transition-colors ${
                selectedTag === g.tag
                  ? 'bg-fg text-canvas border-fg font-medium'
                  : 'bg-surface text-fg-muted border-line hover:text-fg'
              }`}
            >
              #{g.tag} ({g.count})
            </button>
          ))}
        </div>
      </div>

      {groupMode && selectedTag === 'ALL' ? (
        <div className="divide-y divide-line">
          {tagGroups.map((group) => (
            <div key={group.tag}>
              <div className="px-4 py-2 bg-subtle/70 text-[12px] font-semibold text-fg flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-fg-muted" />
                {group.tag}
                <span className="text-fg-subtle tabular-nums">({group.count})</span>
              </div>
              <div className="divide-y divide-line">
                {group.questions.map((iq) => renderQuestionCard(iq))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-line">
          {visibleQuestions.map((iq) => renderQuestionCard(iq))}
        </div>
      )}
    </section>
  );
}
