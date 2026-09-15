import React, { useState } from 'react';
import { ShieldCheck, Key, Cpu, Sparkles, Layers, FileText } from 'lucide-react';

export default function Header({ apiKey, setApiKey, activeTab, setActiveTab, applicantCount }) {
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey || '');

  const handleSaveKey = () => {
    setApiKey(tempKey);
    setShowKeyModal(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#0B0F19]/90 backdrop-blur-md border-b border-gray-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand & Title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 p-0.5 shadow-lg shadow-blue-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-[#0B0F19] rounded-[10px] flex items-center justify-center">
              <Cpu className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-blue-300">
                HR AX Smart Evaluator
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> AX Engine 2.5
              </span>
            </div>
            <p className="text-xs text-gray-400">근거 기반 자기소개서 AI 역량 평가 및 서류 검증 시스템</p>
          </div>
        </div>

        {/* Navigation Tabs & Actions */}
        <div className="flex items-center gap-3">
          <nav className="flex bg-gray-900/80 p-1 rounded-xl border border-gray-800 text-xs font-medium">
            <button
              onClick={() => setActiveTab('evaluator')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'evaluator'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> 서류 평가 & 근거 검증
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'comparison'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> 지원자 비교 매트릭스
              {applicantCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-blue-400/20 text-blue-300 text-[10px] flex items-center justify-center font-bold">
                  {applicantCount}
                </span>
              )}
            </button>
          </nav>

          {/* Gemini API Key Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all ${
              apiKey
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-gray-800/80 text-gray-300 border-gray-700 hover:bg-gray-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            {apiKey ? 'Gemini API 연동됨' : 'API Key 설정'}
          </button>
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Google Gemini API 연동</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-gray-400 hover:text-white text-sm">✕</button>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              Google Gemini API Key를 입력하시면 실시간 AI 2.5/1.5 Flash 모델로 자소서를 심층 분석합니다. 
              <br />
              <span className="text-blue-400">* Key 없이도 내장된 고성능 AI 엔진으로 완벽 체험이 가능합니다.</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-300">Gemini API Key</label>
              <input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white rounded-xl border border-gray-800"
              >
                취소
              </button>
              <button
                onClick={handleSaveKey}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-xl shadow-lg shadow-blue-600/30"
              >
                저장 및 적용
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
