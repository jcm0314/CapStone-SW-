import React, { useState } from 'react';
import { Printer, Copy, Check, X, FileText, Award } from 'lucide-react';

export default function ReportExporter({ result, currentJob, onClose }) {
  const [copied, setCopied] = useState(false);

  if (!result || !result.analysis) return null;

  const { name, applyJobTitle, analysis } = result;
  const { summary, competencyScores, groundingEvidences, interviewQuestions } = analysis;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = () => {
    const textReport = `
==================================================
[HR AX 서류 평가 보고서]
지원자명: ${name}
지원직무: ${applyJobTitle}
평가점수: ${summary.totalScore}점 / 100점
판정결과: ${summary.decision} (${summary.decisionReason})
AI 생성/과장 위험도: ${summary.aiTextProbability}%
--------------------------------------------------
[역량 항목별 점수]
${currentJob.competencies.map(c => `- ${c.name}: ${competencyScores[c.id] || 70}점`).join('\n')}

[주요 본문 근거(Grounding Evidences)]
${groundingEvidences.map(e => `[${e.type.toUpperCase()}] ${e.title}\n - 원문: "${e.quote}"\n - 이유: ${e.explanation}`).join('\n\n')}

[맞춤형 면접 질문 제안]
${interviewQuestions.map((q, i) => `${i+1}. [${q.category}] ${q.question}\n - 의도: ${q.intent}`).join('\n\n')}
==================================================
`;
    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white">HR 서류 평가 및 근거 검증 보고서</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨!' : '텍스트 복사'}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all"
            >
              <Printer className="w-3.5 h-3.5" /> 보고서 인쇄 / PDF 저장
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white rounded-lg ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-100 font-sans print:p-0 print:text-black">
          {/* Executive Header */}
          <div className="border-b border-gray-800 pb-4 space-y-1">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold text-white print:text-black">{name} 지원자 서류 역량 평가서</h1>
                <p className="text-xs text-gray-400 print:text-gray-600">직무: {applyJobTitle} | 평가 시스템: HR AX Smart Evaluator 2.5</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-blue-400 font-mono print:text-blue-800">{summary.totalScore}점</span>
                <p className="text-[10px] text-gray-400 uppercase font-bold">종합 평가 점수</p>
              </div>
            </div>
          </div>

          {/* Decision Box */}
          <div className="bg-gray-900/80 p-4 rounded-xl border border-gray-800 space-y-1 print:bg-gray-100 print:border-gray-300">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-300 print:text-black">서류 종합 판정:</span>
              <span className="text-blue-400 print:text-blue-700">{summary.decision}</span>
            </div>
            <p className="text-xs text-gray-300 print:text-gray-800">{summary.decisionReason}</p>
          </div>

          {/* Competency Scores Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white print:text-black">5대 직무 역량 평가 결과</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {currentJob.competencies.map(c => (
                <div key={c.id} className="bg-gray-900/60 p-2.5 rounded-lg border border-gray-800 text-center space-y-0.5 print:bg-gray-50 print:border-gray-300">
                  <span className="text-[10px] text-gray-400 block truncate print:text-gray-600">{c.name}</span>
                  <span className="font-mono font-bold text-blue-400 text-sm print:text-blue-800">{competencyScores[c.id] || 70}점</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grounding Evidences */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white print:text-black">포착된 본문 근거 (Grounding Evidence)</h4>
            <div className="space-y-2">
              {groundingEvidences.map(ev => (
                <div key={ev.id} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-1 text-xs print:bg-gray-50 print:border-gray-300">
                  <div className="flex justify-between font-bold">
                    <span className="text-white print:text-black">[{ev.type.toUpperCase()}] {ev.title}</span>
                    <span className={ev.type === 'positive' ? 'text-emerald-400' : 'text-rose-400'}>
                      {ev.scoreImpact > 0 ? `+${ev.scoreImpact}점` : `${ev.scoreImpact}점`}
                    </span>
                  </div>
                  <p className="text-gray-400 italic text-[11px] font-mono print:text-gray-700">"{ev.quote}"</p>
                  <p className="text-gray-300 text-[11px] print:text-gray-800">{ev.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white print:text-black">면접관 맞춤 질문 가이드</h4>
            <div className="space-y-2">
              {interviewQuestions.map((q, idx) => (
                <div key={q.id || idx} className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 space-y-1 text-xs print:bg-gray-50 print:border-gray-300">
                  <span className="font-bold text-purple-300 print:text-purple-800">Q{idx+1}. [{q.category}] {q.question}</span>
                  <p className="text-gray-400 text-[11px] print:text-gray-700"><strong className="text-gray-300">질문 의도:</strong> {q.intent}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
