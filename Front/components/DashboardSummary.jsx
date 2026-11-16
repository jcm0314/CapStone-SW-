import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, HelpCircle, XCircle, SlidersHorizontal, Sprout, Workflow, Share2, Printer, Mail, UserCheck } from 'lucide-react';
import MultiAgentAuditModal from './MultiAgentAuditModal';
import SampleBadge from './SampleBadge';
import { isSampleResult } from '../utils/sampleResult';

export default function DashboardSummary({ result, currentJob, onOpenHITLEditor, onOpenShareModal, onOpenCandidateFeedback, onOpenReport, onOpenMail }) {
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
          label: '통과 추천',
          bgColor: 'bg-ok-soft text-ok border-ok-line',
          icon: <CheckCircle className="w-4 h-4 text-ok" />
        };
      case 'INTERVIEW':
        return {
          label: '면접 추천',
          bgColor: 'bg-brand-soft text-brand-fg border-brand-line',
          icon: <ShieldCheck className="w-4 h-4 text-brand-fg" />
        };
      case 'HOLD':
        return {
          label: '보류',
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

  const aiTone = aiTextProbability > 60 ? 'text-bad' : aiTextProbability > 30 ? 'text-warn' : 'text-fg';
  const decisionDot = { STRONG_PASS: 'bg-ok-solid', INTERVIEW: 'bg-fg', HOLD: 'bg-warn-solid', REJECT: 'bg-bad-solid' }[decision] || 'bg-bad-solid';
  const decisionText = { STRONG_PASS: 'text-ok', INTERVIEW: 'text-fg', HOLD: 'text-warn', REJECT: 'text-bad' }[decision] || 'text-bad';

  return (
    <>
      <section className="card" aria-labelledby="result-title">
        {isSample && (
          <div className="px-4 pt-3">
            <SampleBadge variant="note" />
          </div>
        )}

        {/* 이름 + 작업 버튼 */}
        <div className="px-4 pt-3 pb-3 flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-line">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 id="result-title" className="text-lg font-semibold text-fg">{result.name}</h1>
              <span className="text-[13px] text-fg-muted">{result.applyJobTitle}</span>
              {isSample && <SampleBadge />}
              {isHumanVerified ? (
                <span className="badge badge-warn">
                  <UserCheck className="w-3 h-3" /> 사람 검토 완료
                </span>
              ) : (
                <span className="badge badge-subtle">검토 대기</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {onOpenHITLEditor && (
              <button type="button" onClick={onOpenHITLEditor} className="btn btn-secondary btn-md">
                <SlidersHorizontal className="w-3.5 h-3.5" /> 사람 검토(HITL) 보정
              </button>
            )}
            {onOpenShareModal && (
              <button type="button" onClick={onOpenShareModal} className="btn btn-secondary btn-md">
                <Share2 className="w-3.5 h-3.5" /> 면접관 공유
              </button>
            )}
            {onOpenCandidateFeedback && (
              <button type="button" onClick={onOpenCandidateFeedback} className="btn btn-secondary btn-md">
                <Sprout className="w-3.5 h-3.5" /> 지원자 피드백
              </button>
            )}
            {onOpenMail && (
              <button type="button" onClick={onOpenMail} className="btn btn-secondary btn-md">
                <Mail className="w-3.5 h-3.5" /> 결과 메일
              </button>
            )}
            {onOpenReport && (
              <button type="button" onClick={onOpenReport} className="btn btn-primary btn-md">
                <Printer className="w-3.5 h-3.5" /> 보고서
              </button>
            )}
          </div>
        </div>

        {/* 핵심 수치 */}
        <dl className="grid grid-cols-2 md:grid-cols-4 border-b border-line text-[13px]">
          <div className="px-4 py-3 border-r border-line">
            <dt className="text-xs text-fg-subtle">점수</dt>
            <dd className="mt-0.5 flex items-baseline gap-1">
              <span className="text-2xl font-semibold tabular-nums text-fg">{totalScore}</span>
              <span className="text-xs text-fg-subtle">/ 100점</span>
            </dd>
            {isHumanVerified && originalScore !== undefined && originalScore !== totalScore && (
              <dd className="text-xs text-fg-subtle tabular-nums">AI {originalScore}점에서 보정</dd>
            )}
          </div>
          <div className="px-4 py-3 md:border-r border-line">
            <dt className="text-xs text-fg-subtle">판정</dt>
            <dd className={`mt-1.5 inline-flex items-center gap-1.5 font-medium ${decisionText}`}>
              <span className={`dot ${decisionDot}`} />
              {badge.label}
            </dd>
          </div>
          <div className="px-4 py-3 border-r border-t md:border-t-0 border-line">
            <dt className="text-xs text-fg-subtle">AI 대필·과장 가능성</dt>
            <dd className="mt-1.5 flex items-center gap-2">
              <span className={`font-medium tabular-nums ${aiTone}`}>{aiTextProbability}%</span>
              <span className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[120px]">
                <span className="block h-full bg-fg-subtle" style={{ width: `${aiTextProbability}%` }} />
              </span>
            </dd>
          </div>
          <div className="px-4 py-3 border-t md:border-t-0 border-line">
            <dt className="text-xs text-fg-subtle">상태</dt>
            <dd className="mt-1.5 text-fg">{isHumanVerified ? '사람 검토 완료' : 'AI 초안'}</dd>
          </div>
        </dl>

        {/* 판정 사유 + 역량별 점수 */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]">
          <div className="px-4 py-3 md:border-r border-line">
            <p className="text-xs text-fg-subtle">판정 사유</p>
            <p className="mt-1 text-[13px] leading-relaxed text-fg">{decisionReason || '-'}</p>
            <PenaltyBreakdown criticReport={result.agentMetadata?.criticReport} />
            {isMultiAgent && (
              <button type="button" onClick={() => setShowAuditModal(true)} className="mt-2 inline-flex items-center gap-1 text-xs text-fg-muted hover:text-fg underline-offset-2 hover:underline">
                <Workflow className="w-3.5 h-3.5" /> AI 판단 과정
              </button>
            )}
          </div>
          <div className="px-4 py-3 border-t md:border-t-0 border-line">
            <p className="text-xs text-fg-subtle mb-2">역량별 점수</p>
            <ul className="space-y-1.5">
              {radarData.map((d) => (
                <li key={d.subject} className="grid grid-cols-[64px_1fr_28px] items-center gap-2 text-xs">
                  <span className="text-fg-muted truncate">{d.subject}</span>
                  <span className="relative h-1.5 bg-muted rounded-full overflow-hidden">
                    <span className="absolute inset-y-0 left-0 bg-fg rounded-full" style={{ width: `${d.score}%` }} />
                    <span className="absolute inset-y-[-2px] w-px bg-fg-subtle" style={{ left: `${d.benchmark}%` }} title="직무 기준 75점" />
                  </span>
                  <span className="text-right tabular-nums text-fg">{d.score}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Multi-Agent Collaboration Audit Modal */}
      <MultiAgentAuditModal
        result={result}
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />
    </>
  );
}

const SEVERITY = { HIGH: { label: '높음', cls: 'text-bad' }, MEDIUM: { label: '보통', cls: 'text-warn' }, LOW: { label: '낮음', cls: 'text-fg-muted' } };

/**
 * 감점 사유: Critic 에이전트가 찾은 추상적·과장 표현과 감점 권고.
 * 최종 점수는 Supervisor 에이전트가 이 권고를 반영해 정하므로 단순 합산이 아님을 함께 안내합니다.
 */
export function PenaltyBreakdown({ criticReport }) {
  if (!criticReport) return null;
  const penalty = Number(criticReport.recommendedPenalty) || 0;
  const flagged = Array.isArray(criticReport.flaggedQuotes) ? criticReport.flaggedQuotes.filter((f) => f?.quote) : [];
  if (penalty === 0 && flagged.length === 0) return null;

  return (
    <details className="mt-3 rounded-md border border-line bg-subtle/60 group" aria-label="감점 사유">
      <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer text-[13px] list-none">
        <span className="font-medium text-fg">
          감점 사유 <span className="text-fg-subtle font-normal">· 추상적·과장 표현 {flagged.length}건</span>
        </span>
        <span className="tabular-nums text-bad font-medium">감점 권고 -{penalty}점</span>
      </summary>
      <div className="px-3 pb-3 space-y-2">
        {flagged.length > 0 && (
          <ul className="space-y-1.5">
            {flagged.map((f, i) => {
              const sev = SEVERITY[f.severity] || SEVERITY.MEDIUM;
              return (
                <li key={i} className="text-[12px] leading-snug">
                  <p className="text-fg border-l-2 border-[rgb(var(--hl-bad))] pl-2">“{f.quote}”</p>
                  <p className="mt-0.5 pl-2.5 text-fg-muted">
                    {f.reason || '근거 부족'} <span className={sev.cls}>· 심각도 {sev.label}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-fg-subtle leading-relaxed">
          과장·추상 표현을 찾는 AI(Critic)가 감점을 권고하고, 최종 점수는 종합 판정 AI가 이 권고를 반영해 정합니다.
          근거 카드의 점수를 더한 값과는 다를 수 있습니다.
        </p>
      </div>
    </details>
  );
}
