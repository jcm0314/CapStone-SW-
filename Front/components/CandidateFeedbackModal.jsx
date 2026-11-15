import React, { useState } from 'react';
import { X, Sparkles, ShieldCheck, CheckCircle2, Lightbulb, Copy, Check, Mail } from 'lucide-react';

export default function CandidateFeedbackModal({ isOpen, onClose, result, currentJob, tenantName = '기업' }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !result || !result.analysis) return null;

  const { name, applyJobTitle, analysis } = result;
  const evidences = analysis.groundingEvidences || [];
  const strengths = evidences.filter(e => e.type === 'positive');
  const growthPoints = evidences.filter(e => e.type === 'verify' || e.type === 'risk');
  const questions = analysis.interviewQuestions || [];

  const feedbackText = `안녕하세요, ${name} 지원자님.
${tenantName} [${applyJobTitle || currentJob?.title}] 채용 전형에 지원해 주셔서 진심으로 감사드립니다.

본 전형은 채용절차의 공정화에 관한 법률에 의거하여 학력·출신지·연령·성별 등 7대 편향 요소를 100% 블라인드 마스킹한 후, 오직 직무 역량 근거만을 바탕으로 공정하게 심사되었습니다.

[1. 서류에서 확인된 ${name}님의 핵심 강점]
${strengths.length > 0
  ? strengths.map((s, i) => `  ${i + 1}) ${s.title}: "${s.quote}"\n     → ${s.explanation || s.rationale}`).join('\n')
  : '  - 직무 관련 프로젝트 수행 경험 및 문제 해결 의지가 확인되었습니다.'}

[2. 향후 커리어 성장을 위한 보완 코칭 가이드]
${growthPoints.length > 0
  ? growthPoints.map((g, i) => `  ${i + 1}) "${g.quote}"\n     → 코칭 팁: ${g.explanation || g.rationale} (구체적인 본인의 기여도 %와 정량적 전후 비교 지표를 함께 제시하시면 설득력이 크게 높아집니다.)`).join('\n')
  : '  - 전반적인 서술 구조가 안정적이나, 본인이 주도한 아키텍처 의사결정 근거를 추가하시면 더욱 좋습니다.'}

[3. 실전 면접 대비 셀프 체크 질문]
${questions.slice(0, 2).map((q, i) => `  Q${i + 1}. ${q.question}`).join('\n')}

지원자님의 빛나는 커리어 여정을 진심으로 응원합니다.
${tenantName} 인재영입팀 드림`;

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(feedbackText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-ok-line rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-pop overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-ok-soft border border-ok-line flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-ok" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-fg flex items-center gap-2">
                지원자 피드백 리포트
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-ok-soft text-ok border border-ok-line">
                  지원자 발송용
                </span>
              </h3>
              <p className="text-[11px] text-fg-muted">
                깜깜이 불합격 통보 대신, 지원자의 강점과 보완점을 따뜻한 코칭 리포트로 구성하여 기업 브랜딩과 구직자 성장을 돕습니다.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-fg-muted hover:text-fg rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-fg">
          {/* Blind Fairness Certification */}
          <div className="p-3.5 rounded-xl bg-brand-soft border border-brand-line flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-fg shrink-0" />
            <div>
              <p className="font-bold text-brand-fg">블라인드 평가</p>
              <p className="text-[11px] text-brand-fg mt-0.5">
                지원서 내 학력·연령·성별·연락처 등 개인식별정보(PII)를 100% 비식별화한 상태에서 직무 역량 근거만으로 공정하게 평가되었습니다.
              </p>
            </div>
          </div>

          {/* Strengths */}
          <div className="space-y-2">
            <h4 className="font-bold text-ok flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> 발견된 직무 핵심 강점 ({strengths.length}건)
            </h4>
            <div className="space-y-2">
              {strengths.map((s, idx) => (
                <div key={s.id || idx} className="p-3 rounded-xl bg-subtle border border-line space-y-1">
                  <p className="font-bold text-fg">{s.title}</p>
                  <p className="font-mono text-[11px] text-ok italic">"{s.quote}"</p>
                  <p className="text-fg-muted text-[11px]">{s.explanation || s.rationale}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Growth Points */}
          <div className="space-y-2">
            <h4 className="font-bold text-warn flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4" /> 자소서 설득력을 높이는 보완 코칭 ({growthPoints.length}건)
            </h4>
            <div className="space-y-2">
              {growthPoints.map((g, idx) => (
                <div key={g.id || idx} className="p-3 rounded-xl bg-subtle border border-line space-y-1">
                  <p className="font-mono text-[11px] text-warn italic">"{g.quote}"</p>
                  <p className="text-fg-muted text-[11px]">
                    <strong className="text-warn">코칭 포인트:</strong> {g.explanation || g.rationale} 본인의 실질적 기여 비중(%)과 개선 전/후 수치 지표를 구체화해 보세요.
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Copyable Email Preview */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-fg-muted flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-brand-fg" /> 지원자 발송용 피드백 전문 미리보기
            </label>
            <textarea
              readOnly
              rows={7}
              value={feedbackText}
              className="w-full bg-surface border border-line rounded-xl p-3 text-[11px] text-fg-muted font-mono leading-relaxed focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-surface border-t border-line flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 bg-muted hover:bg-muted text-fg-muted rounded-xl text-xs font-semibold"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="px-4 py-2 bg-ok-solid hover:bg-ok-solid text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? '피드백 리포트 복사 완료!' : '피드백 복사'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
