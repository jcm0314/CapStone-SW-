import React, { useState } from 'react';
import {
  X, Check, AlertTriangle, ShieldCheck, Plus, Trash2, RotateCcw,
  Sliders, MessageSquare, FileText, CheckCircle2, HelpCircle, Save, Info
} from 'lucide-react';

export default function HITLEditorModal({
  isOpen,
  onClose,
  result,
  currentJob,
  onSave,
  onRevert
}) {
  if (!isOpen || !result || !result.analysis) return null;

  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'evidences' | 'questions'

  // Editable local state cloned from current analysis
  const [summary, setSummary] = useState({
    totalScore: result.analysis.summary.totalScore,
    decision: result.analysis.summary.decision,
    decisionReason: result.analysis.summary.decisionReason,
    aiTextProbability: result.analysis.summary.aiTextProbability
  });

  const [competencyScores, setCompetencyScores] = useState({
    ...result.analysis.competencyScores
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

  // Handlers for Grounding Evidences
  const handleUpdateEvidence = (idx, field, value) => {
    setGroundingEvidences(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const handleDeleteEvidence = (idx) => {
    setGroundingEvidences(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddEvidence = () => {
    const newEv = {
      id: `ev_hitl_${Date.now()}`,
      quote: '',
      type: 'positive',
      competencyId: currentJob.competencies[0]?.id || 'problem_solving',
      scoreImpact: 10,
      title: '인사담당자 수동 보정 근거',
      explanation: '인간 검토관이 자기소개서 원문에서 직접 확인한 역량 근거'
    };
    setGroundingEvidences(prev => [newEv, ...prev]);
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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-[#111827] border border-blue-500/30 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl shadow-blue-950/50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        {/* Top Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  Human-in-the-Loop (HITL) AI 환각 교정 & 평가 보정기
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  인사담당자 직접 수정 모드
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                AI의 환각(없는 문장 인용, 점수 오류, 비논리적 질문)을 인사담당자가 직접 수정하여 확정합니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-3 bg-gray-950 border-b border-gray-800 text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'summary'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> 총점 & 5대 역량 보정
          </button>
          <button
            onClick={() => setActiveTab('evidences')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'evidences'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" /> 근거 문장 환각 교정 ({groundingEvidences.length})
          </button>
          <button
            onClick={() => setActiveTab('questions')}
            className={`py-2 px-3 border-b-2 font-semibold flex items-center gap-1.5 transition-all ${
              activeTab === 'questions'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> 면접 질문 수정 ({interviewQuestions.length})
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
                  <label className="text-xs font-semibold text-gray-300">최종 서류 판정 (HR 확정)</label>
                  <select
                    value={summary.decision}
                    onChange={(e) => setSummary({ ...summary, decision: e.target.value })}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none focus:border-blue-500"
                  >
                    <option value="STRONG_PASS">🟢 서류 통과 (우수 추천 - STRONG_PASS)</option>
                    <option value="INTERVIEW">🔵 면접 진행 추천 (INTERVIEW)</option>
                    <option value="HOLD">🟡 추가 검증 보류 (HOLD)</option>
                    <option value="REJECT">🔴 서류 부적합 / 탈락 권장 (REJECT)</option>
                  </select>
                </div>

                {/* Total Score Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-300">종합 평가 점수 (0~100)</span>
                    <span className="font-mono font-bold text-blue-400">{summary.totalScore}점</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={summary.totalScore}
                      onChange={(e) => setSummary({ ...summary, totalScore: Number(e.target.value) })}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={summary.totalScore}
                      onChange={(e) => setSummary({ ...summary, totalScore: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-16 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* AI Text Probability Slider */}
              <div className="space-y-1.5 bg-gray-900/50 p-3.5 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-gray-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    AI 생성 / 과장 위험도 확률 조정
                  </span>
                  <span className={`font-mono font-bold ${summary.aiTextProbability > 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {summary.aiTextProbability}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={summary.aiTextProbability}
                  onChange={(e) => setSummary({ ...summary, aiTextProbability: Number(e.target.value) })}
                  className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              {/* Decision Reason Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300">종합 판정 사유 (HR 평가 의견)</label>
                <textarea
                  rows={3}
                  value={summary.decisionReason}
                  onChange={(e) => setSummary({ ...summary, decisionReason: e.target.value })}
                  placeholder="AI가 생성한 평가 사유를 수정하거나 인사담당자의 코멘트를 입력하세요..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 5 Competencies Sliders */}
              <div className="space-y-3 pt-2 border-t border-gray-800">
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-blue-400" /> 5대 핵심 역량 세부 점수 직접 보정 (레이더 차트 연동)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentJob.competencies.map((comp) => {
                    const currentScore = competencyScores[comp.id] ?? 70;
                    return (
                      <div key={comp.id} className="bg-gray-900/60 p-3 rounded-xl border border-gray-800 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-300 font-medium">{comp.name}</span>
                          <span className="font-mono font-bold text-blue-400">{currentScore}점</span>
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
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HR Note */}
              <div className="space-y-1.5 pt-2 border-t border-gray-800">
                <label className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" /> 인사담당자 HITL 보정 사유 기록 (Audit Memo)
                </label>
                <input
                  type="text"
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="예: AI가 3번째 문단의 기술 스택을 오인식하여 점수를 상향 조정함."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* TAB 2: Grounding Evidences Correction */}
          {activeTab === 'evidences' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-xs text-gray-400">
                  AI가 실제 본문과 다르게 잘못 인용했거나 왜곡한 환각 문장을 삭제하고, 필요한 경우 새 근거를 추가하세요.
                </p>
                <button
                  type="button"
                  onClick={handleAddEvidence}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 근거 추가
                </button>
              </div>

              {groundingEvidences.length === 0 ? (
                <div className="text-center py-10 bg-gray-900/40 rounded-xl border border-gray-800 text-xs text-gray-400">
                  등록된 근거 문장이 없습니다. [새 근거 추가] 버튼을 눌러 추가하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {groundingEvidences.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-3 relative group hover:border-gray-700 transition-all"
                    >
                      {/* Top Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-gray-500">#{idx + 1}</span>
                          {/* Type Select */}
                          <select
                            value={ev.type}
                            onChange={(e) => handleUpdateEvidence(idx, 'type', e.target.value)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                              ev.type === 'positive'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : ev.type === 'risk'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            }`}
                          >
                            <option value="positive">🟢 긍정 근거 (Positive)</option>
                            <option value="risk">🔴 리스크/과장 (Risk)</option>
                            <option value="verify">🟡 면접 검증 필요 (Verify)</option>
                          </select>

                          {/* Score Impact */}
                          <div className="flex items-center gap-1 text-xs">
                            <span className="text-gray-400 text-[11px]">반영점수:</span>
                            <input
                              type="number"
                              value={ev.scoreImpact}
                              onChange={(e) => handleUpdateEvidence(idx, 'scoreImpact', Number(e.target.value))}
                              className="w-14 bg-gray-950 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-center font-mono text-white"
                            />
                          </div>
                        </div>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteEvidence(idx)}
                          className="px-2 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 border border-transparent hover:border-rose-500/30 transition-all"
                          title="환각 문장 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </div>

                      {/* Quote Text */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400">자소서 본문 인용문 (Quote)</label>
                        <input
                          type="text"
                          value={ev.quote}
                          onChange={(e) => handleUpdateEvidence(idx, 'quote', e.target.value)}
                          placeholder="본문 속 실제 문장을 입력하세요"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Title & Explanation */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-400">근거 제목 (Title)</label>
                          <input
                            type="text"
                            value={ev.title}
                            onChange={(e) => handleUpdateEvidence(idx, 'title', e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-medium text-gray-400">근거 상세 설명 (Explanation)</label>
                          <input
                            type="text"
                            value={ev.explanation}
                            onChange={(e) => handleUpdateEvidence(idx, 'explanation', e.target.value)}
                            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
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
                <p className="text-xs text-gray-400">
                  AI가 작성한 부적절하거나 환각에 기반한 면접 질문을 수정/삭제하고, 면접관이 꼭 물어야 할 질문을 추가하세요.
                </p>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" /> 새 질문 추가
                </button>
              </div>

              {interviewQuestions.length === 0 ? (
                <div className="text-center py-10 bg-gray-900/40 rounded-xl border border-gray-800 text-xs text-gray-400">
                  등록된 면접 질문이 없습니다. [새 질문 추가]를 눌러 추가하세요.
                </div>
              ) : (
                <div className="space-y-3">
                  {interviewQuestions.map((iq, idx) => (
                    <div
                      key={iq.id || idx}
                      className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-3 hover:border-gray-700 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[11px] font-mono font-bold text-gray-500">Q{idx + 1}</span>
                          <input
                            type="text"
                            value={iq.category}
                            onChange={(e) => handleUpdateQuestion(idx, 'category', e.target.value)}
                            placeholder="질문 분류 (예: 직무 기술 검증)"
                            className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-purple-300 font-semibold w-40"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteQuestion(idx)}
                          className="px-2 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 삭제
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400">면접 질문 문구</label>
                        <input
                          type="text"
                          value={iq.question}
                          onChange={(e) => handleUpdateQuestion(idx, 'question', e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-medium focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400">질문 의도 (Intent)</label>
                        <input
                          type="text"
                          value={iq.intent}
                          onChange={(e) => handleUpdateQuestion(idx, 'intent', e.target.value)}
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-gray-400">면접관 체크리스트 (쉼표로 구분)</label>
                        <input
                          type="text"
                          value={Array.isArray(iq.checklist) ? iq.checklist.join(', ') : ''}
                          onChange={(e) => {
                            const items = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                            handleUpdateQuestion(idx, 'checklist', items);
                          }}
                          placeholder="항목1, 항목2"
                          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 focus:outline-none focus:border-purple-500"
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
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            {hasOriginal && (
              <button
                type="button"
                onClick={handleRevertToOriginal}
                className="px-3 py-1.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" /> AI 원본 초안으로 되돌리기
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              <Save className="w-3.5 h-3.5" /> HITL 보정 저장 & 확정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
