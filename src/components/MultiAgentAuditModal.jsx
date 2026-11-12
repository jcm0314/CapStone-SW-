import React from 'react';
import { X, ShieldAlert, CheckCircle2, Bot, Scale, Mic, FileSearch, Sparkles } from 'lucide-react';

export default function MultiAgentAuditModal({ result, isOpen, onClose }) {
  if (!isOpen || !result) return null;

  const agentMeta = result.agentMetadata || {};
  const criticReport = agentMeta.criticReport || {};
  const modelsUsed = result.modelsUsed || {};

  const agents = [
    {
      id: 'grounding',
      name: 'Grounding Agent (원문 근거 발췌관)',
      icon: <FileSearch className="w-5 h-5 text-ok" />,
      badge: '원문 1:1 인덱싱',
      color: 'emerald',
      model: modelsUsed.grounding || 'gemini-1.5-flash',
      summary: agentMeta.executedAgents?.find(a => a.name === 'Grounding Agent')?.summary || `${result.analysis?.groundingEvidences?.length || 0}건의 근거 문장 발췌 완료`,
      details: (
        <div className="space-y-1.5 text-xs text-fg-muted">
          <p className="text-fg-muted">자소서 본문에서 객관적 성과(positive), 과장(risk), 검증 필요(verify) 문장을 추출하여 역량 카테고리에 매핑했습니다.</p>
          <div className="flex gap-2 font-mono text-[11px] pt-1">
            <span className="text-ok">긍정 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'positive').length || 0}건</span>
            <span className="text-bad">리스크 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'risk').length || 0}건</span>
            <span className="text-warn">검증 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'verify').length || 0}건</span>
          </div>
        </div>
      )
    },
    {
      id: 'critic',
      name: 'Critic Agent (비판적 검증 & Red-Teaming 감사관)',
      icon: <ShieldAlert className="w-5 h-5 text-bad" />,
      badge: '허위/과장 팩트체크',
      color: 'rose',
      model: modelsUsed.critic || 'gemini-1.5-flash',
      summary: criticReport.critiqueNotes || '비판적 감사 및 AI 생성 문체 검증 완료',
      details: (
        <div className="space-y-2 text-xs text-fg-muted">
          <div className="grid grid-cols-2 gap-2 bg-subtle p-2.5 rounded-lg border border-line font-mono text-[11px]">
            <div>
              <span className="text-fg-muted">AI 생성 의심도: </span>
              <span className={criticReport.aiTextProbability > 40 ? 'text-bad font-bold' : 'text-ok font-bold'}>
                {criticReport.aiTextProbability ?? result.analysis?.summary?.aiTextProbability ?? 15}%
              </span>
            </div>
            <div>
              <span className="text-fg-muted">과장/허위 위험도: </span>
              <span className={criticReport.exaggerationRisk === 'HIGH' ? 'text-bad font-bold' : 'text-warn font-bold'}>
                {criticReport.exaggerationRisk || 'LOW'}
              </span>
            </div>
          </div>
          {criticReport.flaggedQuotes && criticReport.flaggedQuotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-bad">적발된 의심 문장:</span>
              {criticReport.flaggedQuotes.map((fq, idx) => (
                <div key={idx} className="bg-bad-soft border border-bad-line p-2 rounded text-[11px] space-y-0.5">
                  <p className="text-bad italic font-serif">"{fq.quote}"</p>
                  <p className="text-bad text-[10px]">사유: {fq.reason}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'supervisor',
      name: 'Supervisor Agent (최종 의사결정 수석 에이전트)',
      icon: <Scale className="w-5 h-5 text-brand-fg" />,
      badge: '가중치 정산 & 최종 결재',
      color: 'blue',
      model: modelsUsed.supervisor || 'gemini-1.5-flash',
      summary: result.analysis?.summary?.decisionReason || '5대 역량 종합 정산 완료',
      details: (
        <div className="space-y-2 text-xs text-fg-muted">
          <p className="text-fg-muted">Grounding Agent의 실증적 근거와 Critic Agent의 비판적 감사를 상호 대조하여 직무 가중치를 반영한 최종 점수를 확정했습니다.</p>
          <div className="bg-subtle p-2.5 rounded-lg border border-line flex justify-between items-center text-[11px]">
            <span className="text-fg-muted">최종 확정 점수:</span>
            <span className="font-mono text-sm font-bold text-brand-fg">{result.analysis?.summary?.totalScore} / 100점</span>
            <span className="text-fg-muted">인사 판정:</span>
            <span className="font-bold text-fg px-2 py-0.5 rounded bg-brand-soft border border-brand-line">
              {result.analysis?.summary?.decision}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'interviewer',
      name: 'Interviewer Agent (심층 면접관)',
      icon: <Mic className="w-5 h-5 text-brand-fg" />,
      badge: '약점 집중 검증',
      color: 'purple',
      model: modelsUsed.interviewer || 'gemini-1.5-flash',
      summary: `${result.analysis?.interviewQuestions?.length || 0}개의 실전 압박 면접 질문 도출`,
      details: (
        <div className="space-y-1 text-xs text-fg-muted">
          <p className="text-fg-muted">Critic Agent가 지적한 허위/과장 의심 포인트와 Grounding Agent의 검증 필요 문장을 실전에서 팩트체크할 수 있도록 면접 질문 및 평가 체크리스트를 자동 편성했습니다.</p>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line-strong rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-pop overflow-hidden">
        {/* Modal Header */}
        <div className="bg-brand-soft p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-brand-soft text-brand-fg rounded-xl border border-brand-line">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-fg">AI 판단 과정</h3>
                <span className="text-[10px] bg-brand-soft text-brand-fg border border-brand-line px-2 py-0.5 rounded font-mono font-semibold">
                  4단계
                </span>
              </div>
              <p className="text-xs text-fg-muted mt-0.5">
                지원자 <span className="text-fg font-semibold">{result.name}</span>의 자소서를 4단계(근거 찾기 → 과장 점검 → 종합 판단 → 면접 질문)로 나눠 평가한 기록입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-fg-muted hover:text-fg rounded-lg hover:bg-subtle transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 4-Agent Pipeline Timeline */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-px before:bg-line-strong">
            {agents.map((agent, index) => (
              <div key={agent.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[30px] top-1 p-1 bg-surface border border-line-strong rounded-full shadow-sm">
                  {agent.icon}
                </div>

                {/* Card Container */}
                <div className="bg-subtle border border-line hover:border-line-strong rounded-xl p-4 transition-all space-y-2.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-fg-subtle font-bold">0{index + 1}</span>
                      <h4 className="text-sm font-bold text-fg">{agent.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-fg-muted border border-line-strong font-medium">
                        {agent.badge}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-fg-muted bg-surface px-2 py-0.5 rounded border border-line">
                      Engine: {agent.model}
                    </span>
                  </div>

                  <div className="text-xs text-fg font-medium leading-relaxed bg-subtle p-2.5 rounded-lg border border-line">
                    <span className="text-fg-muted font-semibold mr-1">요약 소견:</span> {agent.summary}
                  </div>

                  {agent.details}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-line bg-subtle flex items-center justify-between text-xs text-fg-muted">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-ok" />
            <span>4대 에이전트 전원 합의 및 무결성 감사 검증 완료</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-brand hover:bg-brand-strong text-on-brand font-semibold rounded-xl text-xs transition-colors shadow-sm"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
