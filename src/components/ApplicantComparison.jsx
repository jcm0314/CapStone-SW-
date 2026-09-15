import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck, XCircle, FileText, Download } from 'lucide-react';

export default function ApplicantComparison({ applicants, onSelectApplicant, onOpenExport }) {
  if (!applicants || applicants.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-gray-800 text-center space-y-3">
        <Layers className="w-10 h-10 text-gray-600 mx-auto" />
        <h3 className="text-sm font-bold text-gray-300">비교할 지원자 분석 데이터가 없습니다.</h3>
        <p className="text-xs text-gray-500">서류 평가 탭에서 자기소개서를 분석하거나 샘플 데이터를 선택해 주세요.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-bold text-white">지원자 간 역량 및 리스크 매트릭스 비교</h2>
          </div>
          <p className="text-xs text-gray-400">분석된 지원자들의 서류 점수, 역량 분포 및 리스크 항목을 비교 평가합니다.</p>
        </div>

        <button
          onClick={() => onOpenExport(applicants[0])}
          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 transition-all"
        >
          <Download className="w-3.5 h-3.5" /> HR 종합 비교 보고서 출력
        </button>
      </div>

      {/* Comparison Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left text-gray-300 border-collapse">
          <thead>
            <tr className="bg-gray-900/80 border-b border-gray-800 text-gray-400 font-semibold uppercase text-[10px]">
              <th className="py-3 px-4">지원자 성명</th>
              <th className="py-3 px-4">지원 직무</th>
              <th className="py-3 px-4">서류 종합 점수</th>
              <th className="py-3 px-4">HR 서류 판정</th>
              <th className="py-3 px-4">AI 과장/리스크 확률</th>
              <th className="py-3 px-4">근거 포착 (긍정/리스크)</th>
              <th className="py-3 px-4 text-right">상세 보기</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {applicants.map((app) => {
              const { totalScore, decision, aiTextProbability } = app.analysis.summary;
              const positiveCount = app.analysis.groundingEvidences.filter(e => e.type === 'positive').length;
              const riskCount = app.analysis.groundingEvidences.filter(e => e.type === 'risk').length;

              return (
                <tr key={app.id} className="hover:bg-blue-600/5 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono flex items-center justify-center text-xs">
                      {app.name[0]}
                    </span>
                    {app.name}
                  </td>
                  <td className="py-3.5 px-4 text-gray-400 font-medium">{app.applyJobTitle}</td>
                  <td className="py-3.5 px-4 font-mono font-bold text-base">
                    <span className={totalScore >= 85 ? 'text-emerald-400' : totalScore >= 70 ? 'text-amber-400' : 'text-rose-400'}>
                      {totalScore}점
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                      decision === 'STRONG_PASS' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      decision === 'INTERVIEW' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                      decision === 'HOLD' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {decision === 'STRONG_PASS' ? '🟢 우수 추천' : decision === 'INTERVIEW' ? '🔵 면접 추천' : decision === 'HOLD' ? '🟡 보류' : '🔴 탈락 권장'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono">
                    <span className={`font-semibold ${aiTextProbability > 60 ? 'text-rose-400' : 'text-gray-400'}`}>
                      {aiTextProbability}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[11px] font-mono">
                    <span className="text-emerald-400 font-bold">🟢 {positiveCount}개</span>
                    <span className="text-gray-600 mx-1">|</span>
                    <span className="text-rose-400 font-bold">🔴 {riskCount}개</span>
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectApplicant(app)}
                      className="px-3 py-1 bg-gray-800 hover:bg-blue-600 hover:text-white text-gray-300 rounded-lg text-xs font-semibold border border-gray-700 transition-all"
                    >
                      서류 분석 검토
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
