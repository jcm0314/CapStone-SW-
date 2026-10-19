import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, User, PlusCircle, ShieldCheck, ThumbsUp, ThumbsDown, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { addCollaborativeNote, getSharedEvaluation } from '../services/shareService';

export default function InterviewerCollaborationPanel({ applicant, shareId }) {
  const { currentUser } = useAuth();
  const [notes, setNotes] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [scoreAdj, setScoreAdj] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchNotes = async () => {
      if (!shareId) {
        // Fallback default notes from applicant
        setNotes([
          {
            id: 'init_1',
            author: '김서아 수석',
            role: 'RECRUITER',
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            content: '1차 AI 서류 심사에서 대규모 트래픽 튜닝 경험에 높은 점수가 부여되었습니다. 기술 면접에서 실제 코드 기여도를 집중 검증해주세요.',
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

    return () => { isMounted = false; };
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
