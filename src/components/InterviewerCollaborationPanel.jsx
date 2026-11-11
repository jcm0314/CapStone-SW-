import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, PlusCircle, ShieldCheck, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { addCollaborativeNote, getSharedEvaluation } from '../services/shareService';
import { isSupabaseConfigured, subscribeCollaborationNotes } from '../services/supabaseClient';

// Polling interval for multi-interviewer note sync via the API gateway
// (Supabase Realtime push is tracked separately in tasks/16)
const NOTES_POLL_INTERVAL_MS = 10000;

export default function InterviewerCollaborationPanel({ applicant, shareId }) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [scoreAdj, setScoreAdj] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionRatings, setQuestionRatings] = useState({});

  const handleQuickScorecardClick = async (qIdx, questionText, verdictLabel, deltaScore) => {
    setQuestionRatings(prev => ({ ...prev, [qIdx]: verdictLabel }));
    const noteData = {
      author: currentUser?.name || '면접관',
      role: currentUser?.role || 'INTERVIEWER',
      content: `[1-Click 면접 채점 - Q${qIdx + 1} ${verdictLabel}] "${questionText.slice(0, 48)}..."`,
      scoreAdjustment: deltaScore
    };

    try {
      if (shareId) {
        const updatedPayload = await addCollaborativeNote(shareId, noteData);
        if (updatedPayload?.collaborativeNotes) {
          setNotes(updatedPayload.collaborativeNotes);
        }
      } else {
        setNotes(prev => [
          ...prev,
          {
            id: `note_quick_${Date.now()}_${qIdx}`,
            ...noteData,
            timestamp: new Date().toISOString()
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to add quick scorecard note:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const fetchNotes = async () => {
      if (!shareId) {
        // Neutral local-only guide note (not tied to any specific applicant's content)
        setNotes([
          {
            id: 'init_local_guide',
            author: 'Check-Mate',
            role: 'SYSTEM',
            timestamp: new Date().toISOString(),
            content: '아직 공유 링크가 생성되지 않아 메모는 이 브라우저에만 임시로 기록됩니다. 다른 면접관과 실시간으로 공유하려면 [면접관 공유] 버튼으로 링크를 생성하세요.',
            scoreAdjustment: 0
          }
        ]);
        return;
      }
      try {
        const payload = await getSharedEvaluation(shareId);
        if (isMounted && payload?.collaborativeNotes) {
          setNotes(payload.collaborativeNotes);
        }
      } catch (err) {
        console.error('Failed to load notes:', err);
      }
    };
    fetchNotes();

    // Periodic sync so notes written by other interviewers appear without reload
    // Also subscribes to Supabase Realtime channel when configured
    let timerId = null;
    let unsubscribeRealtime = () => {};
    if (shareId) {
      timerId = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return; // skip while tab is hidden
        fetchNotes();
      }, NOTES_POLL_INTERVAL_MS);

      if (isSupabaseConfigured) {
        unsubscribeRealtime = subscribeCollaborationNotes(shareId, () => {
          fetchNotes();
        });
      }
    }

    return () => {
      isMounted = false;
      if (timerId) clearInterval(timerId);
      unsubscribeRealtime();
    };
  }, [shareId, applicant?.id]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const noteData = {
      author: currentUser?.name || '면접관',
      role: currentUser?.role || 'INTERVIEWER',
      content: newComment.trim(),
      scoreAdjustment: scoreAdj
    };

    try {
      if (shareId) {
        const updatedPayload = await addCollaborativeNote(shareId, noteData);
        if (updatedPayload?.collaborativeNotes) {
          setNotes(updatedPayload.collaborativeNotes);
        }
      } else {
        // Local state update
        setNotes(prev => [
          ...prev,
          {
            id: `note_${Date.now()}`,
            ...noteData,
            timestamp: new Date().toISOString()
          }
        ]);
      }
      setNewComment('');
      setScoreAdj(0);
    } catch (err) {
      console.error('Failed to add note:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              다인 면접관 실시간 협업 메모
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30">
                Live Sync
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              면접관들이 실시간으로 질의 결과 및 추가 검증 의견을 기록하고 점수를 보정합니다.
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400 font-medium">
          총 {notes.length}건의 기록
        </span>
      </div>

      {/* 1-Click Live Interview Scorecard */}
      {Array.isArray(applicant?.analysis?.interviewQuestions) && applicant.analysis.interviewQuestions.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-950/80 border border-indigo-500/20 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-indigo-400" />
              실전 면접관용 1-Click 팩트체크 채점표 (타이핑 없이 즉시 기록)
            </span>
            <span className="text-[10px] text-slate-400">질문별 원클릭 판정</span>
          </div>
          <div className="space-y-2">
            {applicant.analysis.interviewQuestions.map((iq, qIdx) => {
              const currentVerdict = questionRatings[qIdx];
              return (
                <div key={iq.id || qIdx} className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="text-xs text-slate-200 flex-1 pr-2">
                    <span className="font-mono font-bold text-indigo-400 mr-1.5">Q{qIdx + 1}.</span>
                    <span>{iq.question}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleQuickScorecardClick(qIdx, iq.question, '검증 통과', 3)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        currentVerdict === '검증 통과'
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      ✅ 검증 통과 (+3)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScorecardClick(qIdx, iq.question, '보완 필요', 0)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        currentVerdict === '보완 필요'
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                      }`}
                    >
                      ⚠️ 보완 필요 (0)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickScorecardClick(qIdx, iq.question, '과장 확인', -5)}
                      className={`px-2 py-1 rounded text-[10px] font-bold border transition-all ${
                        currentVerdict === '과장 확인'
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                      }`}
                    >
                      ❌ 과장 확인 (-5)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes Timeline List */}
      <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
        {notes.map((note) => (
          <div
            key={note.id}
            className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 transition-all hover:border-slate-700"
          >
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{note.author}</span>
                <span className={`px-1.5 py-0.2 text-[9px] rounded font-semibold ${
                  note.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-300' :
                  note.role === 'RECRUITER' ? 'bg-blue-500/20 text-blue-300' :
                  'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {note.role}
                </span>
                {note.scoreAdjustment !== 0 && (
                  <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                    note.scoreAdjustment > 0 
                      ? 'bg-emerald-500/20 text-emerald-300' 
                      : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {note.scoreAdjustment > 0 ? `+${note.scoreAdjustment}점 보정` : `${note.scoreAdjustment}점 감점`}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-slate-500">
                {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
              {note.content}
            </p>
          </div>
        ))}
      </div>

      {/* New Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>작성자: <strong className="text-white">{currentUser?.name}</strong> ({currentUser?.roleTitle})</span>
          
          {/* Quick Score Adjustment Buttons */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px]">점수 가감:</span>
            {[-5, 0, 5].map(v => (
              <button
                type="button"
                key={v}
                onClick={() => setScoreAdj(v)}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                  scoreAdj === v
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {v > 0 ? `+${v}점` : v < 0 ? `${v}점` : '변동없음'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="면접 질문에 대한 지원자의 답변 내용 및 기술 역량 코멘트를 입력하세요..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>등록</span>
          </button>
        </div>
      </form>
    </div>
  );
}
