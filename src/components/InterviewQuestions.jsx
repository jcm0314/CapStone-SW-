import React from 'react';
import { CheckSquare, Target } from 'lucide-react';

export default function InterviewQuestions({ result }) {
  // 질문이 없으면(면접 질문 에이전트 실패 등) 빈 카드를 그리지 않음
  if (!result?.analysis?.interviewQuestions?.length) return null;

  const { interviewQuestions } = result.analysis;

  return (
    <section className="card" aria-labelledby="questions-title">
      <div className="flex items-baseline gap-2 px-4 pt-3 pb-2 border-b border-line">
        <h2 id="questions-title" className="section-title">면접 질문</h2>
        <span className="text-xs text-fg-subtle tabular-nums">{interviewQuestions.length}</span>
      </div>

      <div className="divide-y divide-line">
        {interviewQuestions.map((iq, idx) => (
          <article key={iq.id || idx} className="px-4 py-3 flex flex-col gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-xs font-semibold text-fg-subtle tabular-nums">Q{idx + 1}</span>
              <span className="text-xs text-fg-subtle">{iq.category}</span>
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
        ))}
      </div>
    </section>
  );
}
