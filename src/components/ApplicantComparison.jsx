import React, { useState, useMemo } from 'react';
import { Layers, CheckCircle2, AlertTriangle, ShieldCheck, XCircle, FileText, Download, ShieldAlert, Sparkles, Sliders, RotateCcw } from 'lucide-react';
import { generatePlagiarismMatrix } from '../utils/plagiarismEngine';

const DEFAULT_WEIGHTS = {
  problem_solving: 30,
  tech_skill: 25,
  teamwork: 15,
  growth: 15,
  ethics: 15
};

const COMPETENCY_LABELS = [
  { id: 'problem_solving', label: '문제 해결력' },
  { id: 'tech_skill', label: '직무 전문성' },
  { id: 'teamwork', label: '소통 및 협업' },
  { id: 'growth', label: '성장 잠재력' },
  { id: 'ethics', label: '직업 윤리/진실성' }
];

export default function ApplicantComparison({ applicants, onSelectApplicant, onOpenExport }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [topNCutoff, setTopNCutoff] = useState(() => Math.max(1, Math.min(3, applicants?.length || 1)));
  const [maxAiRiskFilter, setMaxAiRiskFilter] = useState(100);

  const simulatedApplicants = useMemo(() => {
    if (!applicants || applicants.length === 0) return [];
    const totalWeight = Object.values(weights).reduce((acc, w) => acc + Number(w || 0), 0) || 1;
    const isDefaultWeights = Object.keys(DEFAULT_WEIGHTS).every(k => weights[k] === DEFAULT_WEIGHTS[k]);

    const mapped = applicants
      .filter((app) => {
        const aiProb = app.analysis?.summary?.aiTextProbability ?? 0;
        return aiProb <= maxAiRiskFilter;
      })
      .map((app) => {
        const baseScore = app.analysis?.summary?.totalScore ?? 0;
        const compScores = app.analysis?.competencyScores;
        let simulatedScore = baseScore;

        if (!isDefaultWeights && compScores && Object.keys(compScores).length > 0) {
          const weightedSum = COMPETENCY_LABELS.reduce((sum, item) => {
            const cScore = compScores[item.id] ?? baseScore;
            return sum + cScore * (weights[item.id] ?? 20);
          }, 0);
          simulatedScore = Math.round(weightedSum / totalWeight);
        }

        return {
          ...app,
          simulatedScore,
          scoreDelta: simulatedScore - baseScore
        };
      });

    return mapped.sort((a, b) => b.simulatedScore - a.simulatedScore);
  }, [applicants, weights, maxAiRiskFilter]);

  if (!applicants || applicants.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-gray-800 text-center space-y-3">
        <Layers className="w-10 h-10 text-gray-600 mx-auto" />
        <h3 className="text-sm font-bold text-gray-300">비교할 지원자 분석 데이터가 없습니다.</h3>
        <p className="text-xs text-gray-500">서류 평가 탭에서 자기소개서를 분석하거나 샘플 데이터를 선택해 주세요.</p>
      </div>
    );
  }

  const plagiarismMatrix = generatePlagiarismMatrix(applicants);

  return (
    <div className="space-y-6">
      {/* 0. Dynamic Weight Simulator & Top-N Cutoff Panel */}
      <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-gray-800">
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-white">실시간 역량 가중치 시뮬레이터 & Top-N 합격 컷오프</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                0.01초 즉시 재산출 (Zero-LLM Cost)
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              LLM 재호출 없이 직무 역량 가중치와 AI 의심률 필터를 조절하여 서류 합격권(Top-N) 순위 변동을 실시간 시뮬레이션합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setWeights(DEFAULT_WEIGHTS);
              setMaxAiRiskFilter(100);
              setTopNCutoff(Math.max(1, Math.min(3, applicants.length)));
            }}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-gray-700 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 가중치 초기화
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {COMPETENCY_LABELS.map((comp) => (
            <div key={comp.id} className="bg-gray-900/70 border border-gray-800 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300 font-medium">{comp.label}</span>
                <span className="font-mono font-bold text-indigo-400">{weights[comp.id]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[comp.id]}
                onChange={(e) => setWeights(prev => ({ ...prev, [comp.id]: Number(e.target.value) }))}
                className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-emerald-400">서류 합격 선발 배수 (Top-N 컷오프): </span>
              <span className="font-mono text-white font-bold">상위 {topNCutoff}명 선발</span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, applicants.length)}
              value={topNCutoff}
              onChange={(e) => setTopNCutoff(Number(e.target.value))}
              className="w-36 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-bold text-amber-400">AI 대필 위험도 상한 필터: </span>
              <span className="font-mono text-white font-bold">{maxAiRiskFilter}% 이하만 표시</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={maxAiRiskFilter}
              onChange={(e) => setMaxAiRiskFilter(Number(e.target.value))}
              className="w-36 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>
        </div>
      </div>

      {/* 1. Comparison Matrix Data Table */}
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
                <th className="py-3 px-4">순위 / 선발</th>
                <th className="py-3 px-4">지원자 성명</th>
                <th className="py-3 px-4">지원 직무</th>
                <th className="py-3 px-4">시뮬레이션 점수</th>
                <th className="py-3 px-4">HR 서류 판정</th>
                <th className="py-3 px-4">AI 과장/리스크 확률</th>
                <th className="py-3 px-4">근거 포착 (긍정/리스크)</th>
                <th className="py-3 px-4 text-right">상세 보기</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {simulatedApplicants.map((app, idx) => {
                const totalScore = app.simulatedScore ?? app.analysis?.summary?.totalScore ?? 0;
                const isTopN = idx < topNCutoff;
                const decision = app.analysis?.summary?.decision ?? 'HOLD';
                const aiTextProbability = app.analysis?.summary?.aiTextProbability ?? 0;
                const positiveCount = (app.analysis?.groundingEvidences || []).filter(e => e.type === 'positive').length;
                const riskCount = (app.analysis?.groundingEvidences || []).filter(e => e.type === 'risk').length;

                return (
                  <tr key={app.id} className={`hover:bg-blue-600/5 transition-colors ${isTopN ? 'bg-emerald-950/10' : ''}`}>
                    <td className="py-3.5 px-4 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isTopN
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-gray-800 text-gray-400 border-gray-700'
                      }`}>
                        #{idx + 1} {isTopN ? '합격권' : '대기'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-mono flex items-center justify-center text-xs">
                        {app.name[0]}
                      </span>
                      <span>{app.name}</span>
                      {app.isHumanVerified && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30" title="인간 검토관 HITL 보정 완료">
                          🧑‍💼 HITL
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-400 font-medium">{app.applyJobTitle}</td>
                    <td className="py-3.5 px-4 font-mono font-bold text-base">
                      <span className={totalScore >= 85 ? 'text-emerald-400' : totalScore >= 70 ? 'text-amber-400' : 'text-rose-400'}>
                        {totalScore}점
                      </span>
                      {app.scoreDelta !== 0 && (
                        <span className={`ml-1.5 text-[10px] ${app.scoreDelta > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ({app.scoreDelta > 0 ? `+${app.scoreDelta}` : app.scoreDelta})
                        </span>
                      )}
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

      {/* 2. Pairwise Plagiarism Detection Heatmap Matrix (Sprint 5.2 Finale) */}
      <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-bold text-white">지원자 간 자소서 상호 표절 탐지 매트릭스 (N-Gram Jaccard)</h3>
            <span className="px-2 py-0.5 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded text-[10px] font-bold">
              v2.0 표절 감지 엔진
            </span>
          </div>
          <span className="text-[11px] text-gray-400">40% 이상 유사 시 🔴 표절 의심 경고</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-gray-900/80 text-gray-400 border-b border-gray-800">
                <th className="p-3 text-left">지원자</th>
                {applicants.map((app) => (
                  <th key={`head_${app.id}`} className="p-3 font-mono">{app.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {plagiarismMatrix.map((row, i) => (
                <tr key={`row_${applicants[i].id}`}>
                  <td className="p-3 font-bold text-white text-left font-mono">
                    {applicants[i].name}
                  </td>
                  {row.map((cell, j) => {
                    if (cell.isSelf) {
                      return (
                        <td key={`cell_${i}_${j}`} className="p-3 text-gray-600 bg-gray-950/40 font-mono">
                          -
                        </td>
                      );
                    }

                    const rate = cell.plagiarismRate;
                    let bgClass = 'bg-gray-900/40 text-gray-300';
                    if (rate >= 40) {
                      bgClass = 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40';
                    } else if (rate >= 20) {
                      bgClass = 'bg-amber-500/15 text-amber-300 font-semibold';
                    }

                    return (
                      <td key={`cell_${i}_${j}`} className={`p-3 font-mono rounded ${bgClass}`}>
                        {rate}% {cell.isHighRisk && '🚨'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
