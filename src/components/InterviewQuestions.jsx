import React from 'react';
import { CheckSquare, Target, MessagesSquare } from 'lucide-react';

export default function InterviewQuestions({ result }) {
  if (!result || !result.analysis || !result.analysis.interviewQuestions) return null;

  const { interviewQuestions } = result.analysis;

  return (
    <div className="card card-pad space-y-4">
      {/* Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <MessagesSquare className="w-[18px] h-[18px] text-fg-subtle mt-0.5" />
          <div>
            <h3 className="section-title">면접 질문</h3>
            <p className="section-desc">확인이 필요한 문장에서 뽑은 질문입니다. 질문 의도와 체크리스트를 함께 보세요.</p>
          </div>
        </div>
        <span className="chip chip-neutral shrink-0 tabular-nums">{interviewQuestions.length}개</span>
      </div>

      {/* Question Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {interviewQuestions.map((iq, idx) => (
          <article key={iq.id || idx} className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-3 hover:border-line-strong transition-colors">
            <div className="flex items-center gap-2 text-[12px]">
              <span className="w-6 h-6 rounded-md bg-brand-soft text-brand-fg font-bold flex items-center justify-center tabular-nums">
                {idx + 1}
              </span>
              <span className="chip chip-neutral">{iq.category}</span>
            </div>

            <h4 className="text-[14px] font-semibold text-fg leading-relaxed break-keep">{iq.question}</h4>

            {iq.basedQuote && (
              <p className="text-[12px] text-fg-muted leading-snug border-l-2 border-[rgb(var(--hl-warn))] pl-2.5 line-clamp-2">
                근거 문장 · “{iq.basedQuote}”
              </p>
            )}

            <div className="mt-auto space-y-2 pt-3 border-t border-line">
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
        ))}
      </div>
    </div>
  );
}
