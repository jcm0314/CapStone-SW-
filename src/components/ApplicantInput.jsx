import React, { useState } from 'react';
import { UserCheck, Sparkles, FileText, Play, RotateCcw } from 'lucide-react';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';

export default function ApplicantInput({ onAnalyze, isAnalyzing, currentJobId }) {
  const [name, setName] = useState('김민준');
  const [rawText, setRawText] = useState(SAMPLE_APPLICANTS[0].rawText);
  const [selectedSampleId, setSelectedSampleId] = useState(SAMPLE_APPLICANTS[0].id);

  const handleSelectSample = (sample) => {
    setName(sample.name);
    setRawText(sample.rawText);
    setSelectedSampleId(sample.id);
  };

  const handleRun = () => {
    if (!rawText.trim()) return;
    onAnalyze({ name, rawText });
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-gray-800 space-y-4">
      {/* Header & Sample Selector Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-gray-800/80">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <h2 className="text-sm font-bold text-white">지원서 서류 입력</h2>
        </div>

        {/* Quick Sample Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-gray-400 font-medium mr-1">테스트 샘플:</span>
          {SAMPLE_APPLICANTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSelectSample(sample)}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                selectedSampleId === sample.id
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 font-semibold'
                  : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-white hover:bg-gray-800'
              }`}
            >
              {sample.name} ({sample.analysis.summary.decision === 'STRONG_PASS' ? '🟢 우수' : sample.analysis.summary.decision === 'REJECT' ? '🔴 과장/AI의심' : '🟡 검증필요'})
            </button>
          ))}
        </div>
      </div>

      {/* Candidate Name Input */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-300">지원자 성명</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 김민준"
          className="w-full bg-gray-900/90 border border-gray-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
        />
      </div>

      {/* Text Area */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-gray-300">자기소개서 본문 텍스트</label>
          <span className="text-[10px] text-gray-400 font-mono">{rawText.length}자</span>
        </div>
        <textarea
          rows={9}
          value={rawText}
          onChange={(e) => {
            setRawText(e.target.value);
            setSelectedSampleId('');
          }}
          placeholder="자기소개서 및 경력기술서 본문을 붙여넣으세요..."
          className="w-full bg-gray-900/90 border border-gray-700/80 rounded-xl p-3.5 text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-blue-500 font-mono resize-none"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleRun}
        disabled={isAnalyzing || !rawText.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            AI 근거 문장 매칭 및 역량 분석 중...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> AI 근거 기반 서류 분석 실행
          </>
        )}
      </button>
    </div>
  );
}
