import React, { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Clock, ShieldCheck, ExternalLink, Users, AlertCircle } from 'lucide-react';
import { createSharedEvaluation } from '../services/shareService';
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';

export default function ShareModal({ isOpen, onClose, applicant }) {
  if (!isOpen || !applicant) return null;

  const { currentUser } = useAuth();
  const { currentTenant } = useTenant();

  const [shareUrl, setShareUrl] = useState('');
  const [shareId, setShareId] = useState('');
  const [expiresHours, setExpiresHours] = useState(72);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const generate = async () => {
      setIsGenerating(true);
      try {
        const res = await createSharedEvaluation(applicant, {
          expiresHours,
          creatorName: currentUser?.name,
          creatorRole: currentUser?.role,
          tenantId: currentTenant?.id
        });
        if (isMounted) {
          setShareUrl(res.shareUrl);
          setShareId(res.shareId);
        }
      } catch (err) {
        console.error('Failed to create share link:', err);
      } finally {
        if (isMounted) setIsGenerating(false);
      }
    };
    generate();

    return () => { isMounted = false; };
  }, [applicant?.id, expiresHours]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {
      // fallback
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">면접관 결과 공유 링크 생성</h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                  Share ID: {shareId || '...'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                [{applicant.name}] 지원자의 1:1 형광펜 원문 및 맞춤 면접 질문 공유
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Section 1: Generated Share Link */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block mb-2">
              실시간 동기화 공유 URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={isGenerating ? '링크 생성 중...' : shareUrl}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-blue-300 font-mono focus:outline-none select-all"
              />
              <button
                type="button"
                onClick={handleCopy}
                disabled={!shareUrl || isGenerating}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                  isCopied
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                }`}
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> 복사 완료!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> 링크 복사
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Section 2: Expiration Setting */}
          <div>
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Clock className="w-3.5 h-3.5 text-indigo-400" /> 링크 유효 기간(TTL) 설정
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { hours: 24, label: '24시간 (당일 면접용)' },
                { hours: 72, label: '72시간 (3일 기본 권장)' },
                { hours: 168, label: '7일 (채용 전형 기간)' }
              ].map(opt => (
                <button
                  key={opt.hours}
                  type="button"
                  onClick={() => setExpiresHours(opt.hours)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition-all text-center ${
                    expiresHours === opt.hours
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Collaboration Preview */}
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-white">
              <Users className="w-4 h-4 text-purple-400" />
              <span>다인 면접관 접속 시 제공되는 기능</span>
            </div>
            <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
              <li>사전 AI 서류 분석 결과(종합 점수, 역량별 1:1 증거 원문) 즉시 렌더링</li>
              <li>위조/AI 대필 의심 문장 형광펜 강조 및 심층 검증 질문 열람</li>
              <li>면접장 내 여러 면접관이 실시간 평가 코멘트 및 점수 보정(HITL) 작성 가능</li>
            </ul>
          </div>

          {/* Security Banner */}
          <div className="p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-300/90">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-[11px]">
              본 링크는 <strong>{currentTenant?.name}</strong> 전용 테넌트 토큰으로 암호화되어 있으며, 타사 접근이 통제됩니다. 만료 시간 경과 시 자동으로 링크가 폐기됩니다.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
          {shareUrl && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium transition-colors"
            >
              <span>새 창에서 면접관 뷰 열어보기</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors ml-auto"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
