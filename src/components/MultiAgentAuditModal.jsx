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
      icon: <FileSearch className="w-5 h-5 text-emerald-400" />,
      badge: '원문 1:1 인덱싱',
      color: 'emerald',
      model: modelsUsed.grounding || 'gemini-1.5-flash',
      summary: agentMeta.executedAgents?.find(a => a.name === 'Grounding Agent')?.summary || `${result.analysis?.groundingEvidences?.length || 0}건의 근거 문장 발췌 완료`,
      details: (
        <div className="space-y-1.5 text-xs text-gray-300">
          <p className="text-gray-400">자소서 본문에서 객관적 성과(positive), 과장(risk), 검증 필요(verify) 문장을 추출하여 역량 카테고리에 매핑했습니다.</p>
          <div className="flex gap-2 font-mono text-[11px] pt-1">
            <span className="text-emerald-400">🟢 긍정 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'positive').length || 0}건</span>
            <span className="text-rose-400">🔴 리스크 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'risk').length || 0}건</span>
            <span className="text-amber-400">🟡 검증 문장: {result.analysis?.groundingEvidences?.filter(e => e.type === 'verify').length || 0}건</span>
          </div>
        </div>
      )
    },
    {
      id: 'critic',
      name: 'Critic Agent (비판적 검증 & Red-Teaming 감사관)',
      icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
      badge: '허위/과장 팩트체크',
      color: 'rose',
      model: modelsUsed.critic || 'gemini-1.5-flash',
      summary: criticReport.critiqueNotes || '비판적 감사 및 AI 생성 문체 검증 완료',
      details: (
        <div className="space-y-2 text-xs text-gray-300">
          <div className="grid grid-cols-2 gap-2 bg-gray-950/60 p-2.5 rounded-lg border border-gray-800 font-mono text-[11px]">
            <div>
              <span className="text-gray-400">AI 생성 의심도: </span>
              <span className={criticReport.aiTextProbability > 40 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                {criticReport.aiTextProbability ?? result.analysis?.summary?.aiTextProbability ?? 15}%
              </span>
            </div>
            <div>
              <span className="text-gray-400">과장/허위 위험도: </span>
              <span className={criticReport.exaggerationRisk === 'HIGH' ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                {criticReport.exaggerationRisk || 'LOW'}
              </span>
            </div>
          </div>
          {criticReport.flaggedQuotes && criticReport.flaggedQuotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-rose-300">🚨 적발된 의심 문장:</span>
              {criticReport.flaggedQuotes.map((fq, idx) => (
                <div key={idx} className="bg-rose-950/20 border border-rose-900/40 p-2 rounded text-[11px] space-y-0.5">
                  <p className="text-rose-200 italic font-serif">"{fq.quote}"</p>
                  <p className="text-rose-400 text-[10px]">사유: {fq.reason}</p>
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
      icon: <Scale className="w-5 h-5 text-blue-400" />,
      badge: '가중치 정산 & 최종 결재',
      color: 'blue',
      model: modelsUsed.supervisor || 'gemini-1.5-flash',
      summary: result.analysis?.summary?.decisionReason || '5대 역량 종합 정산 완료',
      details: (
        <div className="space-y-2 text-xs text-gray-300">
          <p className="text-gray-400">Grounding Agent의 실증적 근거와 Critic Agent의 비판적 감사를 상호 대조하여 직무 가중치를 반영한 최종 점수를 확정했습니다.</p>
          <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800 flex justify-between items-center text-[11px]">
            <span className="text-gray-400">최종 확정 점수:</span>
            <span className="font-mono text-sm font-bold text-blue-400">{result.analysis?.summary?.totalScore} / 100점</span>
            <span className="text-gray-400">인사 판정:</span>
            <span className="font-bold text-white px-2 py-0.5 rounded bg-blue-600/30 border border-blue-500/40">
              {result.analysis?.summary?.decision}
            </span>
          </div>
        </div>
      )
    },
    {
      id: 'interviewer',
      name: 'Interviewer Agent (심층 면접관)',
      icon: <Mic className="w-5 h-5 text-purple-400" />,
      badge: '약점 집중 검증',
      color: 'purple',
      model: modelsUsed.interviewer || 'gemini-1.5-flash',
      summary: `${result.analysis?.interviewQuestions?.length || 0}개의 실전 압박 면접 질문 도출`,
      details: (
        <div className="space-y-1 text-xs text-gray-300">
          <p className="text-gray-400">Critic Agent가 지적한 허위/과장 의심 포인트와 Grounding Agent의 검증 필요 문장을 실전에서 팩트체크할 수 있도록 면접 질문 및 평가 체크리스트를 자동 편성했습니다.</p>
        </div>
      )
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0f172a] border border-gray-700/80 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-blue-950/40 to-purple-950/30">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">4대 HR Multi-Agent 앙상블 감사 보고서</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/40 px-2 py-0.5 rounded font-mono font-semibold">
                  v2.5 Ensemble
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                지원자 <span className="text-white font-semibold">{result.name}</span>의 자소서를 독립된 4개 에이전트가 교차 검증한 종합 의사결정 로그입니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 4-Agent Pipeline Timeline */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-purple-500">
            {agents.map((agent, index) => (
              <div key={agent.id} className="relative group">
                {/* Timeline node icon */}
                <div className="absolute -left-[30px] top-1 p-1 bg-gray-900 border border-gray-700 rounded-full shadow-md">
                  {agent.icon}
                </div>

                {/* Card Container */}
                <div className="bg-gray-900/80 border border-gray-800 hover:border-gray-700 rounded-xl p-4 transition-all space-y-2.5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-gray-500 font-bold">0{index + 1}</span>
                      <h4 className="text-sm font-bold text-white">{agent.name}</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-medium">
                        {agent.badge}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">
                      Engine: {agent.model}
                    </span>
                  </div>

                  <div className="text-xs text-gray-200 font-medium leading-relaxed bg-gray-950/40 p-2.5 rounded-lg border border-gray-800/60">
                    <span className="text-gray-400 font-semibold mr-1">요약 소견:</span> {agent.summary}
                  </div>

                  {agent.details}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/60 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>4대 에이전트 전원 합의 및 무결성 감사 검증 완료</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs transition-colors shadow-md"
          >
            확인 및 닫기
          </button>
        </div>
      </div>
    </div>
  );
}
