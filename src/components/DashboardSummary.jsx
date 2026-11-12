import React, { useState } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { ShieldCheck, CheckCircle, HelpCircle, XCircle, SlidersHorizontal, Sprout, UserCheck, Workflow, Share2 } from 'lucide-react';
import MultiAgentAuditModal from './MultiAgentAuditModal';
import SampleBadge from './SampleBadge';
import { isSampleResult } from '../utils/sampleResult';

export default function DashboardSummary({ result, currentJob, onOpenHITLEditor, onOpenShareModal, onOpenCandidateFeedback }) {
  const [showAuditModal, setShowAuditModal] = useState(false);

  if (!result || !result.analysis) return null;

  const summary = result.analysis?.summary || {};
  const rawCompScores = result.analysis?.competencyScores;
  
  // Normalize competencyScores from either object or competencies array
  const competencyScores = rawCompScores || (
    Array.isArray(result.analysis?.competencies)
      ? Object.fromEntries(result.analysis.competencies.map(c => [
          c.id === 'problemSolving' ? 'problem_solving' : c.id === 'techDepth' ? 'tech_skill' : c.id,
          c.score
        ]))
      : {}
  ) || {};

  const { totalScore = 75, decision = 'INTERVIEW', decisionReason = '', aiTextProbability = 0 } = summary;
  const isMultiAgent = result.mode === 'MULTI_AGENT_ENSEMBLE' || Boolean(result.agentMetadata);

  // Radar chart dataset
  const radarData = (currentJob?.competencies || []).map(c => ({
    subject: c.name?.split(' ')[0] || c.id, // Short name
    score: competencyScores?.[c.id] ?? 70,
    benchmark: 75,
    fullMark: 100
  }));

  // Decision badge styling
  const getDecisionBadge = () => {
    switch (decision) {
      case 'STRONG_PASS':
        return {
          label: '서류 통과 추천',
          bgColor: 'bg-ok-soft text-ok border-ok-line',
          icon: <CheckCircle className="w-4 h-4 text-ok" />
        };
      case 'INTERVIEW':
        return {
          label: '면접 진행 추천',
          bgColor: 'bg-brand-soft text-brand-fg border-brand-line',
          icon: <ShieldCheck className="w-4 h-4 text-brand-fg" />
        };
      case 'HOLD':
        return {
          label: '보류 · 추가 확인',
          bgColor: 'bg-warn-soft text-warn border-warn-line',
          icon: <HelpCircle className="w-4 h-4 text-warn" />
        };
      case 'REJECT':
      default:
        return {
          label: '탈락 권장',
          bgColor: 'bg-bad-soft text-bad border-bad-line',
          icon: <XCircle className="w-4 h-4 text-bad" />
        };
    }
  };

  const badge = getDecisionBadge();
  const isHumanVerified = Boolean(result.isHumanVerified);
  const originalScore = result.originalAnalysis?.summary?.totalScore;
  const isSample = isSampleResult(result);

  const scoreTone = totalScore >= 85 ? 'text-brand' : totalScore >= 70 ? 'text-warn' : 'text-bad';
  const aiTone = aiTextProbability > 60
    ? { text: 'text-bad', bar: 'bg-bad-solid' }
    : aiTextProbability > 30
      ? { text: 'text-warn', bar: 'bg-warn-solid' }
      : { text: 'text-ok', bar: 'bg-ok-solid' };

  return (
    <>
      <div className="card overflow-hidden">
        {isSample && (
          <div className="px-5 sm:px-6 pt-5">
            <SampleBadge variant="note" />
          </div>
        )}

        {/* Header */}
        <div className="px-5 sm:px-6 pt-5 pb-5 border-b border-line space-y-4">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[19px] font-bold tracking-[-0.02em] text-fg">{result.name} 지원자 서류 종합 평가</h3>
                {isSample && <SampleBadge />}
              </div>
              <div className="flex items-center gap-2 flex-wrap text-[13px] text-fg-muted">
                {result.applyJobTitle && <span>{result.applyJobTitle}</span>}
                {result.applyJobTitle && <span className="text-line-strong">·</span>}
                {isHumanVerified ? (
                  <span className="chip chip-warn">
                    <UserCheck className="w-3 h-3" /> 사람 검토 완료
                  </span>
                ) : (
                  <span className="chip chip-neutral">AI 초안 · 검토 전</span>
                )}
                {isHumanVerified && originalScore !== undefined && originalScore !== totalScore && (
                  <span className="chip chip-neutral tabular-nums">
                    AI {originalScore}점 → 보정 {totalScore}점
                  </span>
                )}
              </div>
            </div>
            <div className={`self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-semibold ${badge.bgColor}`}>
              {badge.icon}
              {badge.label}
            </div>
          </div>

          {decisionReason && <p className="text-[14px] text-fg leading-relaxed break-keep">{decisionReason}</p>}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {onOpenHITLEditor && (
              <button type="button" onClick={onOpenHITLEditor} className="btn btn-secondary btn-md">
                <SlidersHorizontal className="w-4 h-4 text-fg-subtle" />
                사람 검토(HITL) 보정
              </button>
            )}
            {onOpenShareModal && (
              <button type="button" onClick={onOpenShareModal} className="btn btn-secondary btn-md" title="면접관에게 결과 공유 링크 보내기">
                <Share2 className="w-4 h-4 text-fg-subtle" />
                면접관 공유
              </button>
            )}
            {onOpenCandidateFeedback && (
              <button type="button" onClick={onOpenCandidateFeedback} className="btn btn-secondary btn-md" title="지원자에게 보낼 성장 피드백 만들기">
                <Sprout className="w-4 h-4 text-fg-subtle" />
                지원자 피드백 리포트
              </button>
            )}
            {isMultiAgent && (
              <button type="button" onClick={() => setShowAuditModal(true)} className="btn btn-ghost btn-md" title="AI가 단계별로 어떻게 판단했는지 기록 보기">
                <Workflow className="w-4 h-4" />
                AI 판단 과정
              </button>
            )}
          </div>
        </div>

        {/* Body: score + radar */}
        <div className="grid grid-cols-1 md:grid-cols-12">
          <div className="md:col-span-5 p-5 sm:p-6 flex flex-col items-center justify-center gap-5 border-b md:border-b-0 md:border-r border-line">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                <path
                  className="text-muted"
                  strokeWidth="3"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={scoreTone}
                  strokeDasharray={`${totalScore}, 100`}
                  strokeWidth="3"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-[40px] leading-none font-bold tracking-[-0.04em] text-fg tabular-nums">{totalScore}</span>
                <span className="mt-1 text-[12px] text-fg-subtle">/ 100점</span>
              </div>
            </div>

            <div className="w-full max-w-[280px] space-y-1.5">
              <div className="flex justify-between items-center text-[13px]">
                <span className="text-fg-muted">AI 대필·과장 가능성</span>
                <span className={`font-semibold tabular-nums ${aiTone.text}`}>{aiTextProbability}%</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${aiTone.bar}`} style={{ width: `${aiTextProbability}%` }} />
              </div>
            </div>
          </div>

          <div className="md:col-span-7 p-5 sm:p-6">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-fg">역량별 점수</span>
              <span className="flex items-center gap-3 text-[12px] text-fg-subtle">
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-brand/60" /> 지원자</span>
                <span className="inline-flex items-center gap-1"><span className="w-2.5 h-0.5 bg-fg-subtle" /> 직무 기준</span>
              </span>
            </div>
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
                  <PolarGrid stroke="rgb(var(--line-strong))" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgb(var(--fg-muted))', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgb(var(--line))" tick={false} axisLine={false} />
                  <Radar name="지원자" dataKey="score" stroke="rgb(var(--brand))" fill="rgb(var(--brand))" fillOpacity={0.22} strokeWidth={2} />
                  <Radar name="직무 기준" dataKey="benchmark" stroke="rgb(var(--fg-subtle))" fill="transparent" strokeDasharray="4 4" />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgb(var(--surface))', borderColor: 'rgb(var(--line))', borderRadius: '8px', fontSize: '12px', color: 'rgb(var(--fg))' }}
                    itemStyle={{ color: 'rgb(var(--fg))' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Agent Collaboration Audit Modal */}
      <MultiAgentAuditModal
        result={result}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </>
  );
}
