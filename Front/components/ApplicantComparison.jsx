import React, { useState, useMemo } from 'react';
import { Mail, Layers, CheckCircle2, AlertTriangle, ShieldCheck, XCircle, FileText, Download, ShieldAlert, Sparkles, Sliders, RotateCcw } from 'lucide-react';
import { generatePlagiarismMatrix } from '../utils/plagiarismEngine';
import SampleBadge from './SampleBadge';
import { isSampleResult } from '../utils/sampleResult';

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

export default function ApplicantComparison({ applicants, onSelectApplicant, onOpenExport, onSendMail }) {
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
      <div className="glass-panel rounded-2xl p-8 border border-line text-center space-y-3">
        <Layers className="w-10 h-10 text-fg-subtle mx-auto" />
        <h3 className="text-sm font-semibold text-fg-muted">아직 평가 결과가 없습니다.</h3>
        <p className="text-xs text-fg-subtle">새 평가에서 자기소개서를 평가하면 이곳에서 순위를 보고 결과 메일을 보낼 수 있습니다.</p>
      </div>
    );
  }

  const plagiarismMatrix = generatePlagiarismMatrix(applicants);

  return (
    <div className="space-y-6">
      {/* 0. Dynamic Weight Simulator & Top-N Cutoff Panel */}
      <div className="card p-4 border border-brand-line bg-brand-soft space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-fg">가중치 · 컷오프</h2>
              <span className="text-xs text-fg-subtle">AI 재호출 없이 바로 재계산</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setWeights(DEFAULT_WEIGHTS);
              setMaxAiRiskFilter(100);
              setTopNCutoff(Math.max(1, Math.min(3, applicants.length)));
            }}
            className="px-3 py-1.5 bg-muted hover:bg-muted text-fg-muted rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-line-strong transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 가중치 초기화
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {COMPETENCY_LABELS.map((comp) => (
            <div key={comp.id} className="bg-subtle border border-line rounded-xl p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-fg-muted font-medium">{comp.label}</span>
                <span className=" font-semibold text-brand-fg">{weights[comp.id]}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={weights[comp.id]}
                onChange={(e) => setWeights(prev => ({ ...prev, [comp.id]: Number(e.target.value) }))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="bg-subtle border border-line rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-semibold text-ok">합격권 인원: </span>
              <span className=" text-fg font-semibold">상위 {topNCutoff}명 선발</span>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(1, applicants.length)}
              value={topNCutoff}
              onChange={(e) => setTopNCutoff(Number(e.target.value))}
              className="w-36 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-ok-solid"
            />
          </div>

          <div className="bg-subtle border border-line rounded-xl p-3 flex items-center justify-between gap-4">
            <div className="text-xs">
              <span className="font-semibold text-warn">AI 대필 의심 상한: </span>
              <span className=" text-fg font-semibold">{maxAiRiskFilter}% 이하만 표시</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={maxAiRiskFilter}
              onChange={(e) => setMaxAiRiskFilter(Number(e.target.value))}
              className="w-36 h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-warn-solid"
            />
          </div>
        </div>
      </div>

      {/* 1. Comparison Matrix Data Table */}
      <div className="card p-4 border border-line space-y-4">
        {/* Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-fg">지원자 순위</h2>
            </div>
          </div>

          <button
            onClick={() => onOpenExport(applicants[0])}
            className="px-3.5 py-1.5 bg-brand hover:bg-brand-strong text-on-brand rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" /> 비교 보고서 출력
          </button>
        </div>

        {/* Comparison Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-fg-muted border-collapse">
            <thead>
              <tr className="bg-subtle border-b border-line text-fg-muted font-semibold uppercase text-[10px]">
                <th className="py-3 px-4">순위</th>
                <th className="py-3 px-4">지원자</th>
                <th className="py-3 px-4">지원 직무</th>
                <th className="py-3 px-4">점수</th>
                <th className="py-3 px-4">판정</th>
                <th className="py-3 px-4">AI 대필 의심</th>
                <th className="py-3 px-4">근거 (긍정 / 리스크)</th>
                <th className="py-3 px-4 text-right"></th>
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
                  <tr key={app.id} className="hover:bg-subtle transition-colors">
                    <td className="py-2.5 px-3 ">
                      <span className="tabular-nums text-fg">{idx + 1}</span>
                      <span className={`ml-2 text-xs ${isTopN ? 'text-ok font-medium' : 'text-fg-subtle'}`}>{isTopN ? '합격권' : '대기'}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-fg flex items-center gap-2">
                      <span>{app.name}</span>
                      {isSampleResult(app) && <SampleBadge />}
                      {app.isHumanVerified && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-warn-soft text-warn border border-warn-line" title="인간 검토관 HITL 보정 완료">
                          HITL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-fg-muted font-medium">{app.applyJobTitle}</td>
                    <td className="py-2.5 px-3  font-semibold text-base">
                      <span className={totalScore >= 85 ? 'text-ok' : totalScore >= 70 ? 'text-warn' : 'text-bad'}>
                        {totalScore}점
                      </span>
                      {app.scoreDelta !== 0 && (
                        <span className={`ml-1.5 text-[10px] ${app.scoreDelta > 0 ? 'text-ok' : 'text-bad'}`}>
                          ({app.scoreDelta > 0 ? `+${app.scoreDelta}` : app.scoreDelta})
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                        decision === 'STRONG_PASS' ? 'bg-ok-soft text-ok border-ok-line' :
                        decision === 'INTERVIEW' ? 'bg-brand-soft text-brand-fg border-brand-line' :
                        decision === 'HOLD' ? 'bg-warn-soft text-warn border-warn-line' :
                        'bg-bad-soft text-bad border-bad-line'
                      }`}>
                        {decision === 'STRONG_PASS' ? '통과 추천' : decision === 'INTERVIEW' ? '면접 추천' : decision === 'HOLD' ? '보류' : '탈락 권장'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 ">
                      <span className={`font-semibold ${aiTextProbability > 60 ? 'text-bad' : 'text-fg-muted'}`}>
                        {aiTextProbability}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[11px] ">
                      <span className="text-ok font-semibold">{positiveCount}개</span>
                      <span className="text-fg-subtle mx-1">|</span>
                      <span className="text-bad font-semibold">{riskCount}개</span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {onSendMail && (
                        <button
                          type="button"
                          onClick={() => onSendMail(app, { isTopN })}
                          title={app.lastMail ? `${new Date(app.lastMail.sentAt).toLocaleString('ko-KR')} ${app.lastMail.to} 에 보냄` : '결과 메일 보내기'}
                          aria-label={`${app.name} 결과 메일`}
                          className="mr-1.5 px-2.5 py-1 inline-flex items-center gap-1 bg-surface hover:bg-subtle text-fg-muted rounded-lg text-xs font-semibold border border-line-strong transition-all"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          {app.lastMail ? '보냄' : '메일'}
                        </button>
                      )}
                      <button
                        onClick={() => onSelectApplicant(app)}
                        className="px-3 py-1 bg-muted hover:bg-brand-strong hover:text-white text-fg-muted rounded-lg text-xs font-semibold border border-line-strong transition-all"
                      >
                        결과 보기
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
      <div className="card p-4 border border-line space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-fg">자소서 표절 매트릭스</h3>
            <span className="text-xs text-fg-subtle">N-gram 유사도</span>
          </div>
          <span className="text-[11px] text-fg-muted">40% 이상이면 표절 의심</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-subtle text-fg-muted border-b border-line">
                <th className="p-3 text-left">지원자</th>
                {applicants.map((app) => (
                  <th key={`head_${app.id}`} className="p-3 ">{app.name}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {plagiarismMatrix.map((row, i) => (
                <tr key={`row_${applicants[i].id}`}>
                  <td className="p-3 font-semibold text-fg text-left ">
                    {applicants[i].name}
                  </td>
                  {row.map((cell, j) => {
                    if (cell.isSelf) {
                      return (
                        <td key={`cell_${i}_${j}`} className="p-3 text-fg-subtle bg-subtle ">
                          -
                        </td>
                      );
                    }

                    const rate = cell.plagiarismRate;
                    let bgClass = 'bg-subtle text-fg-muted';
                    if (rate >= 40) {
                      bgClass = 'bg-bad-soft text-bad font-semibold border border-bad-line';
                    } else if (rate >= 20) {
                      bgClass = 'bg-warn-soft text-warn font-semibold';
                    }

                    return (
                      <td key={`cell_${i}_${j}`} className={`p-3  rounded ${bgClass}`}>
                        {rate}% {cell.isHighRisk && ''}
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
