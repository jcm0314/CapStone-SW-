import React, { useState } from 'react';
import { ListOrdered, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import { buildQuestionEvaluations } from '../utils/questionParser';

export default function PerQuestionEvaluation({ applicant }) {
  const evaluations = buildQuestionEvaluations(applicant);
  const [expandedIndex, setExpandedIndex] = useState(1);

  if (!applicant || !applicant.analysis || evaluations.length === 0) return null;

  const avgScore = Math.round(
    evaluations.reduce((sum, item) => sum + item.score, 0) / evaluations.length
  );
  const totalChars = evaluations.reduce((sum, item) => sum + (item.charCount || 0), 0);

  return (
    <section className="card" aria-labelledby="per-question-heading">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-fg-muted" />
          <h2 id="per-question-heading" className="text-[14px] font-semibold text-fg">
            문항별 평가
          </h2>
          <span className="chip">{evaluations.length}개 문항</span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-fg-muted tabular-nums">
          <span>평균 {avgScore}점</span>
          <span>총 {totalChars.toLocaleString()}자</span>
        </div>
      </div>

      <div className="divide-y divide-line">
        {evaluations.map((item) => {
          const isOpen = expandedIndex === item.index;
          const scoreTone =
            item.score >= 85
              ? 'bg-ok-soft text-ok border-ok-line'
              : item.score >= 70
                ? 'bg-brand-soft text-brand-fg border-brand-line'
                : 'bg-warn-soft text-warn border-warn-line';

          return (
            <div key={item.index} className="px-4 py-3">
              <button
                type="button"
                onClick={() => setExpandedIndex(isOpen ? null : item.index)}
                aria-expanded={isOpen}
                className="w-full flex items-center justify-between gap-3 text-left"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <span className="text-[12px] font-semibold text-fg-subtle tabular-nums shrink-0">
                    Q{item.index}
                  </span>
                  <span className="text-[13px] font-medium text-fg truncate">{item.question}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded-full text-[11.5px] font-semibold border tabular-nums ${scoreTone}`}>
                    {item.score}점
                  </span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-fg-subtle" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-fg-subtle" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 space-y-2.5 pl-6">
                  <p className="text-[12.5px] text-fg-muted leading-relaxed bg-subtle rounded p-2.5 border border-line">
                    <span className="font-semibold text-fg">평가 근거: </span>
                    {item.rationale}
                  </p>

                  {item.matchedHighlights?.length > 0 && (
                    <div className="space-y-1">
                      {item.matchedHighlights.map((hl, idx) => (
                        <div
                          key={idx}
                          className="flex items-start gap-1.5 text-[12px] text-fg-muted bg-surface border border-line rounded px-2.5 py-1.5"
                        >
                          <Quote className="w-3.5 h-3.5 text-fg-subtle shrink-0 mt-0.5" />
                          <span>“{hl.quote || hl.text}”</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {item.answer && (
                    <div className="text-[12px] text-fg-subtle whitespace-pre-line leading-relaxed border-l-2 border-line pl-3">
                      {item.answer}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
