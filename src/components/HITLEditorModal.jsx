import React, { useState } from 'react';
import {
  X, Check, AlertTriangle, ShieldCheck, Plus, Trash2, RotateCcw,
  Sliders, MessageSquare, FileText, CheckCircle2, HelpCircle, Save, Info
} from 'lucide-react';

// Guard wrapper: keeps hook call order stable in the content component (Rules of Hooks)
export default function HITLEditorModal(props) {
  const { isOpen, result } = props;
  if (!isOpen || !result || !result.analysis) return null;
  return <HITLEditorModalContent {...props} />;
}

function HITLEditorModalContent({
  isOpen,
  onClose,
  result,
  currentJob,
  onSave,
  onRevert
}) {
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'evidences' | 'questions'

  // Editable local state cloned from current analysis
  const [summary, setSummary] = useState({
    totalScore: result.analysis.summary.totalScore,
    decision: result.analysis.summary.decision,
    decisionReason: result.analysis.summary.decisionReason,
    aiTextProbability: result.analysis.summary.aiTextProbability
  });

  const [competencyScores, setCompetencyScores] = useState({
    ...(result.analysis?.competencyScores || {})
  });

  const [groundingEvidences, setGroundingEvidences] = useState(
    result.analysis.groundingEvidences.map(e => ({ ...e }))
  );

  const [interviewQuestions, setInterviewQuestions] = useState(
    result.analysis.interviewQuestions.map(q => ({
      ...q,
      checklist: Array.isArray(q.checklist) ? [...q.checklist] : []
    }))
  );

  const [reviewerNote, setReviewerNote] = useState(result.reviewerNote || '');

  // Handlers for Grounding Evidences (with automatic totalScore synchronization)
  const handleUpdateEvidence = (idx, field, value) => {
    setGroundingEvidences(prev => {
      const next = [...prev];
      const prevImpact = Number(next[idx]?.scoreImpact || 0);
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'scoreImpact') {
        const delta = Number(value || 0) - prevImpact;
        setSummary(s => ({
          ...s,
          totalScore: Math.min(100, Math.max(0, Number(s.totalScore || 0) + delta))
        }));
      }
      return next;
    });
  };

  const handleDeleteEvidence = (idx) => {
    setGroundingEvidences(prev => {
      const removed = prev[idx];
      const removedImpact = Number(removed?.scoreImpact || 0);
      if (removedImpact !== 0) {
        setSummary(s => ({
          ...s,
          totalScore: Math.min(100, Math.max(0, Number(s.totalScore || 0) - removedImpact))
        }));
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleAddEvidence = () => {
    const defaultImpact = 5;
    const newEv = {
      id: `ev_hitl_${Date.now()}`,
      quote: '',
      type: 'positive',
      competencyId: currentJob.competencies[0]?.id || 'problem_solving',
      scoreImpact: defaultImpact,
      title: '인사담당자 수동 보정 근거',
      explanation: '인간 검토관이 자기소개서 원문에서 직접 확인한 역량 근거'
    };
    setGroundingEvidences(prev => [newEv, ...prev]);
    setSummary(s => ({
      ...s,
      totalScore: Math.min(100, Math.max(0, Number(s.totalScore || 0) + defaultImpact))
    }));
  };

  // Handlers for Interview Questions
  const handleUpdateQuestion = (idx, field, value) => {
    setInterviewQuestions(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteQuestion = (idx) => {
    setInterviewQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddQuestion = () => {
    const newQ = {
      id: `iq_hitl_${Date.now()}`,
      basedQuote: '면접 검증 필요 항목',
      category: '인간 면접관 맞춤 검증',
      question: '지원서에 서술된 내용과 관련하여 실제 본인의 역할 비중과 직면했던 한계점은 무엇이었습니까?',
      intent: '실질적인 기여도 및 사실관계 확인',
      checklist: ['본인의 직접 수행 여부 확인', '정량적 성과의 객관성 확인']
    };
    setInterviewQuestions(prev => [...prev, newQ]);
  };

  const handleSave = () => {
    const updatedAnalysis = {
      ...result.analysis,
      summary: {
        ...summary,
        totalScore: Number(summary.totalScore),
        aiTextProbability: Number(summary.aiTextProbability)
      },
      competencyScores: { ...competencyScores },
      groundingEvidences,
      interviewQuestions
    };

    onSave({
      updatedAnalysis,
      reviewerNote
    });
    onClose();
  };

  const handleRevertToOriginal = () => {
    if (window.confirm('AI가 처음 생성했던 원본 평가 초안으로 복원하시겠습니까? (현재 수정 내용이 초기화됩니다)')) {
      onRevert();
      onClose();
    }
  };

  const hasOriginal = Boolean(result.originalAnalysis);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-surface border border-brand-line rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-pop overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Top Header */}
        <div className="p-4 bg-surface border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-warn-soft border border-warn-line flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-warn" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-fg">
                  사람 검토(HITL) 보정
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warn-soft text-warn border border-warn-line">
                  담당자 직접 수정
                </span>
              </div>
              <p className="text-[11px] text-fg-muted">
                AI가 잘못 인용한 문장, 어긋난 점수, 어색한 질문을 담당자가 직접 고쳐 확정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg hover:bg-subtle transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-surface border-b border-line text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'summary'
                ? 'border-brand text-brand-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 점수 · 역량
          </button>
          <button
            onClick={() => setActiveTab('evidences')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'evidences'
                ? 'border-brand text-brand-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 근거 문장 ({groundingEvidences.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'questions'
                ? 'border-brand text-brand-fg'
                : 'border-transparent text-fg-muted hover:text-fg'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> 면접 질문 ({interviewQuestions.length})
          </button>
        </div>

        {/* Tab Body Contents */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Summary & Competencies */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Decision Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-fg-muted">최종 판정</label>
                  <select
                    value={summary.decision}
                    onChange={(e) => setSummary({ ...summary, decision: e.target.value })}
                    className="w-full bg-surface border border-line-strong rounded-xl px-3 py-2 text-xs text-fg font-medium focus:outline-none focus:border-brand"
                  >
                    <option value="STRONG_PASS">서류 통과 (우수 추천 - STRONG_PASS)</option>
                    <option value="INTERVIEW">면접 진행 추천 (INTERVIEW)</option>
                    <option value="HOLD">추가 검증 보류 (HOLD)</option>
                    <option value="REJECT">서류 부적합 / 탈락 권장 (REJECT)</option>
                  </select>
                </div>

                {/* Total Score Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-fg-muted">종합 점수 (0~100)</span>
                    <span className="font-mono font-bold text-brand-fg">{summary.totalScore}점</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={summary.totalScore}
                      onChange={(e) => setSummary({ ...summary, totalScore: Number(e.target.value) })}
                      className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-brand"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={summary.totalScore}
                      onChange={(e) => setSummary({ ...summary, totalScore: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-16 bg-surface border border-line-strong rounded-lg px-2 py-1 text-xs text-fg font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* AI Text Probability Slider */}
              <div className="space-y-1.5 bg-subtle p-3.5 rounded-xl border border-line">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-fg-muted flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-warn" />
                    AI 대필·과장 가능성
                  </span>
                  <span className={`font-mono font-bold ${summary.aiTextProbability > 50 ? 'text-bad' : 'text-ok'}`}>
                    {summary.aiTextProbability}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={summary.aiTextProbability}
                  onChange={(e) => setSummary({ ...summary, aiTextProbability: Number(e.target.value) })}
                  className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-warn-solid"
                />
              </div>

              {/* Decision Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-fg-muted">판정 사유</label>
                <textarea
                  rows={3}
                  value={summary.decisionReason}
                  onChange={(e) => setSummary({ ...summary, decisionReason: e.target.value })}
                  placeholder="AI가 생성한 평가 사유를 수정하거나 인사담당자의 코멘트를 입력하세요..."
                  className="w-full bg-surface border border-line-strong rounded-xl p-3 text-xs text-fg leading-relaxed focus:outline-none focus:border-brand"
                />
              </div>

              {/* 5 Competencies Sliders */}
              <div className="space-y-3 pt-2 border-t border-line">
                <h4 className="text-xs font-bold text-fg flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-brand-fg" /> 역량별 점수
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentJob.competencies.map((comp) => {
                    const currentScore = competencyScores?.[comp.id] ?? 70;
                    return (
                      <div key={comp.id} className="bg-subtle p-3 rounded-xl border border-line space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-fg-muted font-medium">{comp.name}</span>
                          <span className="font-mono font-bold text-brand-fg">{currentScore}점</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={currentScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setCompetencyScores(prev => ({ ...prev, [comp.id]: val }));
                          }}
                          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-brand"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HR Note */}
              <div className="space-y-1.5 pt-2 border-t border-line">
                <label className="text-xs font-semibold text-fg-muted flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-brand-fg" /> 보정 사유 (기록으로 남습니다)
                </label>
                <input
                  type="text"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="예: AI가 3번째 문단의 기술 스택을 오인식하여 점수를 상향 조정함."
                  className="w-full bg-surface border border-line-strong rounded-xl px-3 py-2 text-xs text-fg focus:outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Grounding Evidences Correction */}
          {activeTab === 'evidences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs text-fg-muted">
                  AI가 실제 본문과 다르게 잘못 인용했거나 왜곡한 환각 문장을 삭제하고, 필요한 경우 새 근거를 추가하세요.
                </p>
                <button
                  type="button"
                  onClick={handleAddEvidence}
                  className="px-3 py-1.5 bg-brand-soft hover:bg-brand-soft text-brand-fg border border-brand-line rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 근거 추가
                </button>
              </div>

              {groundingEvidences.length === 0 ? (
                <div className="text-center py-10 bg-subtle rounded-xl border border-line text-xs text-fg-muted">
                  등록된 근거 문장이 없습니다. [새 근거 추가] 버튼을 눌러 추가하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {groundingEvidences.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="bg-subtle border border-line rounded-xl p-3.5 space-y-3 relative group hover:border-line-strong transition-all"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-fg-subtle">#{idx + 1}</span>
                          {/* Type Select */}
                          <select
                            value={ev.type}
                            onChange={(e) => handleUpdateEvidence(idx, 'type', e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                              ev.type === 'positive'
                                ? 'bg-ok-soft text-ok border-ok-line'
                                : ev.type === 'risk'
                                ? 'bg-bad-soft text-bad border-bad-line'
                                : 'bg-warn-soft text-warn border-warn-line'
                            }`}
                          >
                            <option value="positive">긍정 근거 (Positive)</option>
                            <option value="risk">리스크/과장 (Risk)</option>
                            <option value="verify">면접 검증 필요 (Verify)</option>
                          </select>

                          {/* Score Impact */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-fg-muted text-[11px]">반영점수:</span>
                            <input
                              type="number"
                              value={ev.scoreImpact}
                              onChange={(e) => handleUpdateEvidence(idx, 'scoreImpact', Number(e.target.value))}
                              className="w-14 bg-surface border border-line-strong rounded px-1.5 py-0.5 text-xs text-center font-mono text-fg"
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEvidence(idx)}
                          className="px-2 py-1 text-xs text-bad hover:text-bad hover:bg-bad-soft rounded-lg flex items-center gap-1 border border-transparent hover:border-bad-line transition-all"
                          title="환각 문장 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </div>

                      {/* Quote Text */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fg-muted">자소서 본문 인용문 (Quote)</label>
                        <input
                          type="text"
                          value={ev.quote}
                          onChange={(e) => handleUpdateEvidence(idx, 'quote', e.target.value)}
                          placeholder="본문 속 실제 문장을 입력하세요"
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg font-mono focus:outline-none focus:border-brand"
                        />
                      </div>

                      {/* Title & Explanation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-fg-muted">근거 제목 (Title)</label>
                          <input
                            type="text"
                            value={ev.title}
                            onChange={(e) => handleUpdateEvidence(idx, 'title', e.target.value)}
                            className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg focus:outline-none focus:border-brand"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-fg-muted">근거 상세 설명 (Explanation)</label>
                          <input
                            type="text"
                            value={ev.explanation}
                            onChange={(e) => handleUpdateEvidence(idx, 'explanation', e.target.value)}
                            className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg-muted focus:outline-none focus:border-brand"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Interview Questions Correction */}
          {activeTab === 'questions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs text-fg-muted">
                  AI가 작성한 부적절하거나 환각에 기반한 면접 질문을 수정/삭제하고, 면접관이 꼭 물어야 할 질문을 추가하세요.
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-brand-soft hover:bg-brand-soft text-brand-fg border border-brand-line rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 질문 추가
                </button>
              </div>

              {interviewQuestions.length === 0 ? (
                <div className="text-center py-10 bg-subtle rounded-xl border border-line text-xs text-fg-muted">
                  등록된 면접 질문이 없습니다. [새 질문 추가]를 눌러 추가하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {interviewQuestions.map((iq, idx) => (
                    <div
                      key={iq.id || idx}
                      className="bg-subtle border border-line rounded-xl p-3.5 space-y-3 hover:border-line-strong transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] font-mono font-bold text-fg-subtle">Q{idx + 1}</span>
                          <input
                            type="text"
                            value={iq.category}
                            onChange={(e) => handleUpdateQuestion(idx, 'category', e.target.value)}
                            placeholder="질문 분류 (예: 직무 기술 검증)"
                            className="bg-surface border border-line rounded px-2 py-1 text-xs text-brand-fg font-semibold w-40"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="px-2 py-1 text-xs text-bad hover:text-bad hover:bg-bad-soft rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fg-muted">면접 질문 문구</label>
                        <input
                          type="text"
                          value={iq.question}
                          onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg font-medium focus:outline-none focus:border-brand"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fg-muted">질문 의도 (Intent)</label>
                        <input
                          type="text"
                          value={iq.intent}
                          onChange={(e) => handleUpdateQuestion(idx, 'intent', e.target.value)}
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg-muted focus:outline-none focus:border-brand"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-fg-muted">면접관 체크리스트 (쉼표로 구분)</label>
                        <input
                          type="text"
                          value={Array.isArray(iq.checklist) ? iq.checklist.join(', ') : ''}
                          onChange={(e) => {
                            const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            handleUpdateQuestion(idx, 'checklist', items);
                          }}
                          placeholder="항목1, 항목2"
                          className="w-full bg-surface border border-line rounded-lg px-2.5 py-1.5 text-xs text-fg-muted focus:outline-none focus:border-brand"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-surface border-t border-line flex flex-wrap items-center justify-between gap-3">
          <div>
            {hasOriginal && (
              <button
                type="button"
                onClick={handleRevertToOriginal}
                className="px-3 py-1.5 text-xs text-warn hover:text-warn hover:bg-warn-soft rounded-xl border border-warn-line flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> AI 원본 초안으로 되돌리기
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-muted hover:bg-muted text-fg-muted rounded-xl text-xs font-semibold transition-all"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="bg-brand hover:bg-brand-strong px-4 py-2 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" /> 보정 저장
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
