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
              <h3 className="text-sm font-bold text-white">Google Gemini API Key 설정</h3>
              <p className="text-[11px] text-gray-400">Gemini 전용 서류 평가 엔진에 사용됩니다.</p>
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
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span>보안 안내 및 로컬 저장</span>
            </div>
            <p className="text-[11px] leading-relaxed text-blue-300/90">
              입력하신 API Key는 외부 서버로 전송되지 않고 브라우저(localStorage)에만 안전하게 보관됩니다.
              Gemini 공식 API 엔드포인트와 직접 통신합니다.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Gemini API Key</span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-blue-400 hover:underline flex items-center gap-1"
              >
                무료 키 발급받기 <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type="password"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <p className="text-[11px] text-gray-400 leading-relaxed">
            * Fallback 없이 오직 Google Gemini API로만 지원서 검토가 수행되므로, 키가 반드시 필요합니다.
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900/60 border-t border-gray-800 flex items-center justify-between">
          <button
            onClick={handleClear}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-rose-400 transition-colors"
          >
            키 삭제
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
