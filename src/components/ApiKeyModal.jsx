import React, { useState, useEffect } from 'react';
import { Key, X, Check, ExternalLink, ShieldCheck, AlertCircle } from 'lucide-react';

export default function ApiKeyModal({ isOpen, onClose, onSaveKey }) {
  const [keyInput, setKeyInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('gemini_api_key') || '';
      setKeyInput(stored);
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      localStorage.setItem('gemini_api_key', trimmed);
    } else {
      localStorage.removeItem('gemini_api_key');
    }
    setSavedSuccess(true);
    if (onSaveKey) onSaveKey(trimmed);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    localStorage.removeItem('gemini_api_key');
    setKeyInput('');
    if (onSaveKey) onSaveKey('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111827] border border-gray-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
              <Key className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">AI 토큰 과금 및 연동 설정</h3>
              <p className="text-[11px] text-gray-400">B2B 기업 일괄 결제 또는 개별 API Key(BYOK) 관리</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Mode 1: B2B Enterprise Managed Token (Default) */}
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 text-xs text-emerald-300 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>기본: B2B 기업 일괄 결제 (Managed Token)</span>
              </div>
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full font-bold">
                권장 / 무설정
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-emerald-300/90">
              고객사 인사담당자는 복잡한 API 키를 직접 발급받을 필요가 없습니다. 백엔드 게이트웨이가 엔터프라이즈 풀에서 토큰을 일괄 결제하고 4대 에이전트를 고속 병렬 구동합니다.
            </p>
          </div>

          {/* Mode 2: Custom API Key (BYOK) */}
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-200 flex items-center gap-1.5">
                <span>🛠️ 커스텀 Google Gemini Key (BYOK)</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                개별 키 발급 <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              자체 Google AI Studio 프로젝트의 API Key를 직접 연동하여 사용하려면 아래에 입력하세요. 입력하지 않거나 비워두면 <strong>B2B 일괄 결제 모드</strong>로 자동 동작합니다.
            </p>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy... (비워두면 B2B 일괄 결제 모드 적용)"
              className="w-full bg-[#0B0F19] border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900/60 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-emerald-400 transition-colors flex items-center gap-1"
            title="커스텀 키를 지우고 기본 B2B 기업 일괄 결제 모드로 돌아갑니다"
          >
            기본 B2B 일괄 결제로 전환
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition-all"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 flex items-center gap-1.5 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5" /> 저장 완료
                </>
              ) : (
                '저장 및 적용'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
