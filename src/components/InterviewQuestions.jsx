import React from 'react';
import { HelpCircle, CheckSquare, Target, MessageSquare, Quote } from 'lucide-react';

export default function InterviewQuestions({ result }) {
  if (!result || !result.analysis || !result.analysis.interviewQuestions) return null;

  const { interviewQuestions } = result.analysis;

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <div>
            <h2 className="text-sm font-bold text-white">서류 근거 기반 맞춤형 심층 면접 질문 제안 (Interview Kit)</h2>
            <p className="text-xs text-gray-400">서류상의 약점이나 검증 필요 문장에서 자동 추출된 구조화 면접 질문입니다.</p>
          </div>
        </div>
        <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30 text-xs font-bold">
          총 {interviewQuestions.length}개 핵심 질문
        </span>
      </div>

      {/* Question Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {interviewQuestions.map((iq, idx) => (
          <div key={iq.id || idx} className="bg-gray-900/70 border border-gray-800 rounded-xl p-4 space-y-3 hover:border-purple-500/40 transition-all">
            {/* Header: Category Badge & Quote */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  질문 {idx + 1} | {iq.category}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 italic bg-black/40 p-2 rounded-lg border border-gray-800 flex items-start gap-1.5 font-mono">
                <Quote className="w-3 h-3 text-purple-400 shrink-0 mt-0.5" />
                <span className="line-clamp-2 font-sans">"{iq.basedQuote}"</span>
              </div>
            </div>

            {/* Question Text */}
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white leading-snug flex items-start gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                {iq.question}
              </h4>
            </div>

            {/* Intent & Checklist Tabs */}
            <div className="space-y-2 pt-2 border-t border-gray-800/80">
              {/* Intent */}
              <div className="flex items-start gap-1.5 text-[11px]">
                <Target className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-blue-300">질문 의도: </span>
                  <span className="text-gray-300">{iq.intent}</span>
                </div>
              </div>

              {/* Checklist */}
              {iq.checklist && iq.checklist.length > 0 && (
                <div className="space-y-1 bg-black/20 p-2 rounded-lg border border-gray-800/50">
                  <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                    <CheckSquare className="w-3 h-3 text-emerald-400" /> 면접관 체크리스트:
                  </span>
                  <ul className="space-y-0.5 pl-4 list-disc text-[10px] text-gray-300">
                    {iq.checklist.map((item, cIdx) => (
                      <li key={cIdx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
