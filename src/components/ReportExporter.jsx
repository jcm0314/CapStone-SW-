import React, { useState } from 'react';
import { Printer, Copy, Check, X, FileText, Download, ShieldAlert, ShieldCheck } from 'lucide-react';
import { downloadApplicantsCSV } from '../utils/csvExporter';
import SampleBadge, { SAMPLE_NOTE } from './SampleBadge';
import { isSampleResult } from '../utils/sampleResult';

export default function ReportExporter({ result, currentJob, onClose }) {
  const [copied, setCopied] = useState(false);
  const [humanGateApproved, setHumanGateApproved] = useState(Boolean(result?.isHumanVerified));

  if (!result || !result.analysis) return null;

  const { name, applyJobTitle, analysis } = result;
  const summary = analysis?.summary || {};
  const rawCompScores = analysis?.competencyScores;
  const competencyScores = rawCompScores || (
    Array.isArray(analysis?.competencies)
      ? Object.fromEntries(analysis.competencies.map(c => [
          c.id === 'problemSolving' ? 'problem_solving' : c.id === 'techDepth' ? 'tech_skill' : c.id,
          c.score
        ]))
      : {}
  ) || {};
  const groundingEvidences = analysis?.groundingEvidences || [];
  const isSample = isSampleResult(result);
  const interviewQuestions = analysis?.interviewQuestions || [];

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadCSV = () => {
    downloadApplicantsCSV([result], `HR_AX_${name}_Evaluation_Report.csv`);
  };

  const handleCopyText = () => {
    const textReport = `
==================================================
[HR AX 서류 평가 보고서]${isSample ? `\n※ 샘플 데이터: ${SAMPLE_NOTE}` : ''}
지원자명: ${name}
지원직무: ${applyJobTitle}
평가점수: ${summary.totalScore}점 / 100점
판정결과: ${summary.decision} (${summary.decisionReason})
AI 생성/과장 위험도: ${summary.aiTextProbability}%
--------------------------------------------------
[역량 항목별 점수]
${currentJob.competencies.map(c => `- ${c.name}: ${competencyScores?.[c.id] ?? 70}점`).join('\n')}

[주요 본문 근거(Grounding Evidences)]
${groundingEvidences.map(e => `[${(e.type || 'verify').toUpperCase()}] ${e.title || '근거 항목'}\n - 원문: "${e.quote}"\n - 이유: ${e.explanation}`).join('\n\n')}

[맞춤형 면접 질문 제안]
${interviewQuestions.map((q, i) => `${i+1}. [${q.category}] ${q.question}\n - 의도: ${q.intent}`).join('\n\n')}
==================================================
`;
    navigator.clipboard.writeText(textReport);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-line rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-pop overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-surface border-b border-line flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-fg" />
            <h3 className="text-sm font-bold text-fg">평가 보고서</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2 [&>button]:whitespace-nowrap">
            <button
              onClick={handleCopyText}
              className="px-3 py-1.5 bg-muted hover:bg-muted text-fg rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-line-strong transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-ok" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? '복사됨!' : '텍스트 복사'}
            </button>
            <button
              onClick={handleDownloadCSV}
              disabled={!humanGateApproved}
              className="px-3 py-1.5 bg-ok-soft hover:bg-ok-soft disabled:opacity-40 disabled:cursor-not-allowed text-ok border border-ok-line rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
              title={!humanGateApproved ? '고위험 AI 채용 규제 준수를 위해 하단의 인간 검토관 최종 결재 서명을 먼저 체크해주세요.' : ''}
            >
              <Download className="w-3.5 h-3.5 text-ok" /> CSV 다운로드
            </button>
            <button
              onClick={handlePrint}
              disabled={!humanGateApproved}
              className="px-3 py-1.5 bg-brand hover:bg-brand-strong disabled:opacity-40 disabled:cursor-not-allowed text-on-brand rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title={!humanGateApproved ? '고위험 AI 채용 규제 준수를 위해 하단의 인간 검토관 최종 결재 서명을 먼저 체크해주세요.' : ''}
            >
              <Printer className="w-3.5 h-3.5" /> 인쇄 · PDF 저장
            </button>
            <button onClick={onClose} className="p-1.5 text-fg-muted hover:text-fg rounded-lg ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mandatory Human-Gate Compliance Banner (EU AI Act / Korean AI Basic Act) */}
        <div className={`px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs print:hidden ${
          humanGateApproved
            ? 'bg-ok-soft border-ok-line text-ok'
            : 'bg-warn-soft border-warn-line text-warn'
        }`}>
          <div className="flex items-center gap-2">
            {humanGateApproved ? (
              <ShieldCheck className="w-4 h-4 text-ok shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 text-warn shrink-0" />
            )}
            <span>
              <strong>사람 확인 필수</strong> AI 채용 규정에 따라, CSV·PDF로 내보내기 전에 담당자가 결과를 확인해야 합니다.
            </span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer font-bold shrink-0">
            <input
              type="checkbox"
              checked={humanGateApproved}
              onChange={(e) => setHumanGateApproved(e.target.checked)}
              className="rounded accent-emerald-500"
            />
            <span>내용을 확인했습니다</span>
          </label>
        </div>

        {/* Printable Report Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-fg font-sans print:p-0 print:text-black">
          {isSample && <SampleBadge variant="note" />}

          {/* Executive Header */}
          <div className="border-b border-line pb-4 space-y-1">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-fg print:text-black">{name} 지원자 서류 역량 평가서</h1>
                  {isSample && <SampleBadge />}
                  {result.isHumanVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-warn-soft text-warn border border-warn-line print:bg-amber-100 print:text-amber-800">
                      사람 검토 완료
                    </span>
                  )}
                </div>
                <p className="text-xs text-fg-muted print:text-gray-600">
                  직무: {applyJobTitle} | 검토 상태: {result.isHumanVerified ? '인간 검토관(HITL) 최종 확정' : 'AI 자동 분석 초안'}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-brand-fg tabular-nums whitespace-nowrap print:text-blue-800">{summary.totalScore}점</span>
                <p className="text-[10px] text-fg-muted uppercase font-bold">종합 평가 점수</p>
              </div>
            </div>
          </div>

          {/* Decision Box */}
          <div className="bg-subtle p-4 rounded-xl border border-line space-y-1.5 print:bg-gray-100 print:border-gray-300">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-fg-muted print:text-black">서류 종합 판정:</span>
              <span className="text-brand-fg print:text-blue-700">{summary.decision}</span>
            </div>
            <p className="text-xs text-fg-muted print:text-gray-800 leading-relaxed">{summary.decisionReason}</p>
            {result.reviewerNote && (
              <div className="mt-2 pt-2 border-t border-line text-[11px] text-warn print:text-amber-900">
                <span className="font-semibold">인사담당자 HITL 보정 사유:</span> {result.reviewerNote}
              </div>
            )}
          </div>

          {/* Competency Scores Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-fg print:text-black">역량별 점수</h4>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {currentJob.competencies.map(c => (
                <div key={c.id} className="bg-subtle p-2.5 rounded-lg border border-line text-center space-y-0.5 print:bg-gray-50 print:border-gray-300">
                  <span className="text-[10px] text-fg-muted block truncate print:text-gray-600">{c.name}</span>
                  <span className="font-mono font-bold text-brand-fg text-sm print:text-blue-800">{competencyScores?.[c.id] ?? 70}점</span>
                </div>
              ))}
            </div>
          </div>

          {/* Grounding Evidences */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-fg print:text-black">근거 문장</h4>
            <div className="space-y-2">
              {groundingEvidences.map((ev, idx) => (
                <div key={ev.id || `ev_${idx}`} className="bg-subtle p-3 rounded-lg border border-line space-y-1 text-xs print:bg-gray-50 print:border-gray-300">
                  <div className="flex justify-between font-bold">
                    <span className="text-fg print:text-black">[{(ev.type || 'verify').toUpperCase()}] {ev.title || '근거 항목'}</span>
                    <span className={ev.type === 'positive' ? 'text-ok' : 'text-bad'}>
                      {ev.scoreImpact > 0 ? `+${ev.scoreImpact}점` : `${ev.scoreImpact}점`}
                    </span>
                  </div>
                  <p className="text-fg-muted italic text-[11px] font-mono print:text-gray-700">"{ev.quote}"</p>
                  <p className="text-fg-muted text-[11px] print:text-gray-800">{ev.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Interview Questions */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-fg print:text-black">면접 질문</h4>
            <div className="space-y-2">
              {interviewQuestions.map((q, idx) => (
                <div key={q.id || idx} className="bg-subtle p-3 rounded-lg border border-line space-y-1 text-xs print:bg-gray-50 print:border-gray-300">
                  <span className="font-bold text-brand-fg print:text-purple-800">Q{idx+1}. [{q.category}] {q.question}</span>
                  <p className="text-fg-muted text-[11px] print:text-gray-700"><strong className="text-fg-muted">질문 의도:</strong> {q.intent}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
