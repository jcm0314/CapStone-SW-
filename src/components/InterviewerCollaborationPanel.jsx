import React, { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
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

  const ROLE_LABEL = { ADMIN: '관리자', RECRUITER: '채용 담당자', INTERVIEWER: '면접관', SYSTEM: '안내' };
  const VERDICTS = [
    { label: '검증 통과', delta: 3, text: '검증 통과 (+3)', on: 'bg-ok-solid text-white border-ok-solid', off: 'bg-surface text-ok border-ok-line hover:bg-ok-soft' },
    { label: '보완 필요', delta: 0, text: '보완 필요 (0)', on: 'bg-warn-solid text-white border-warn-solid', off: 'bg-surface text-warn border-warn-line hover:bg-warn-soft' },
    { label: '과장 확인', delta: -5, text: '과장 확인 (-5)', on: 'bg-bad-solid text-white border-bad-solid', off: 'bg-surface text-bad border-bad-line hover:bg-bad-soft' }
  ];

  return (
    <div className="card card-pad space-y-4">
      {/* Panel Header */}
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="section-title">
          면접관 메모 <span className="ml-1 text-xs font-normal text-fg-subtle tabular-nums">{notes.length}</span>
        </h2>
        {shareId && <span className="text-xs text-ok">공유 중</span>}
      </div>

      {/* 1-Click Live Interview Scorecard */}
      {Array.isArray(applicant?.analysis?.interviewQuestions) && applicant.analysis.interviewQuestions.length > 0 && (
        <div className="rounded-md border border-line overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-subtle border-b border-line">
            <span className="text-xs font-medium text-fg">질문별 판정</span>
            <span className="text-xs text-fg-subtle">누르면 메모로 기록</span>
          </div>
          <div className="divide-y divide-line">
            {applicant.analysis.interviewQuestions.map((iq, qIdx) => {
              const currentVerdict = questionRatings[qIdx];
              return (
                <div key={iq.id || qIdx} className="px-3 py-2.5 flex flex-col gap-2">
                  <p className="text-[13px] text-fg flex-1 min-w-0 break-keep">
                    <span className="font-semibold text-brand-fg mr-1.5 tabular-nums">Q{qIdx + 1}</span>
                    {iq.question}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {VERDICTS.map((v) => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => handleQuickScorecardClick(qIdx, iq.question, v.label, v.delta)}
                        aria-pressed={currentVerdict === v.label}
                        className={`px-2.5 py-1 rounded-md text-[12px] font-semibold border transition-colors ${
                          currentVerdict === v.label ? v.on : v.off
                        }`}
                      >
                        {v.text}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes Timeline List */}
      <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {notes.map((note) => (
          <li key={note.id} className="border-l-2 border-line-strong pl-3 py-1 space-y-0.5">
            <div className="flex items-center justify-between gap-2 text-[12px]">
              <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                <span className="font-semibold text-fg">{note.author}</span>
                <span className="chip chip-neutral !py-0">{ROLE_LABEL[note.role] || note.role}</span>
                {note.scoreAdjustment !== 0 && (
                  <span className={`chip !py-0 ${note.scoreAdjustment > 0 ? 'chip-ok' : 'chip-bad'}`}>
                    {note.scoreAdjustment > 0 ? `+${note.scoreAdjustment}점 보정` : `${note.scoreAdjustment}점 감점`}
                  </span>
                )}
              </div>
              <span className="text-fg-subtle shrink-0 tabular-nums">
                {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-[13px] text-fg-muted whitespace-pre-wrap leading-relaxed break-keep">{note.content}</p>
          </li>
        ))}
      </ul>

      {/* New Note Form */}
      <form onSubmit={handleAddNote} className="space-y-2.5 pt-4 border-t border-line">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12px] text-fg-muted">
          <span>
            작성자 <strong className="text-fg font-semibold">{currentUser?.name}</strong> · {currentUser?.roleTitle}
          </span>
          <div className="flex items-center gap-1.5">
            <span>점수 가감</span>
            <div className="flex p-0.5 rounded-md bg-muted/70 border border-line">
              {[-5, 0, 5].map(v => (
                <button
                  type="button"
                  key={v}
                  onClick={() => setScoreAdj(v)}
                  aria-pressed={scoreAdj === v}
                  className={`px-2.5 py-0.5 rounded text-[12px] font-semibold transition-colors ${
                    scoreAdj === v ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg'
                  }`}
                >
                  {v > 0 ? `+${v}점` : v < 0 ? `${v}점` : '변동없음'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="면접 질문에 대한 지원자의 답변과 의견을 적어 주세요"
            className="field flex-1 min-w-0"
            aria-label="면접관 메모"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="btn btn-primary btn-md shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>등록</span>
          </button>
        </div>
      </form>
    </div>
  );
}
