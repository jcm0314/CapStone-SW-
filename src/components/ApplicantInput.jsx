import React, { useState } from 'react';
import { Sparkles, FileText, Cpu, UploadCloud, Edit3 } from 'lucide-react';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import FileUploadZone from './FileUploadZone';

export default function ApplicantInput({ onAnalyze, isAnalyzing, currentJobId, progressState }) {
  const [inputTab, setInputTab] = useState('TEXT'); // 'TEXT' | 'FILE'
  const [name, setName] = useState('김민준');
  const [rawText, setRawText] = useState(SAMPLE_APPLICANTS[0].rawText);
  const [selectedSampleId, setSelectedSampleId] = useState(SAMPLE_APPLICANTS[0].id);

  const handleSelectSample = (sample) => {
    setName(sample.name);
    setRawText(sample.rawText);
    setSelectedSampleId(sample.id);
  };

  const handleOnFileSelected = (extractedText, filename) => {
    if (extractedText) {
      setRawText(extractedText);
      setSelectedSampleId('');
      if (filename) {
        const cleanName = filename.replace(/\.[^/.]+$/, '').replace(/[^가-힣a-zA-Z]/g, '');
        if (cleanName && cleanName.length >= 2) {
          setName(cleanName.slice(0, 4));
        }
      }
    }
  };

  const handleRun = () => {
    if (!rawText.trim()) return;
    onAnalyze({ name, rawText });
  };

  const percent = progressState ? progressState.percent : (isAnalyzing ? 50 : 0);
  const statusMsg = progressState ? progressState.status : 'AI 근거 문장 매칭 및 백그라운드 파싱 중...';

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
              onClick={() => {
                setInputTab('TEXT');
                handleSelectSample(sample);
              }}
              className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all ${
                selectedSampleId === sample.id && inputTab === 'TEXT'
                  ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 font-semibold'
                  : 'bg-gray-900/60 text-gray-400 border-gray-800 hover:text-white hover:bg-gray-800'
              }`}
            >
              {sample.name} ({sample.analysis.summary.decision === 'STRONG_PASS' ? '🟢 우수' : sample.analysis.summary.decision === 'REJECT' ? '🔴 과장/AI의심' : '🟡 검증필요'})
            </button>
          ))}
        </div>
      </div>

      {/* Input Method Mode Tabs: Text vs File Drop */}
      <div className="flex items-center gap-2 bg-gray-900/90 p-1 rounded-xl border border-gray-800 text-xs">
        <button
          type="button"
          onClick={() => setInputTab('TEXT')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold ${
            inputTab === 'TEXT'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Edit3 className="w-3.5 h-3.5" /> 텍스트 직접 입력
        </button>
        <button
          type="button"
          onClick={() => setInputTab('FILE')}
          className={`flex-1 py-1.5 rounded-lg flex items-center justify-center gap-1.5 transition-all font-semibold ${
            inputTab === 'FILE'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <UploadCloud className="w-3.5 h-3.5" /> PDF / TXT 파일 업로드 (Drag & Drop)
        </button>
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

      {/* Tab 1: Text Area vs Tab 2: File Upload Zone */}
      {inputTab === 'FILE' ? (
        <FileUploadZone onFileSelected={handleOnFileSelected} />
      ) : (
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
      )}

      {/* Real-time Multi-Agent Pipeline Progress Bar */}
      {isAnalyzing && (
        <div className="bg-gray-950/90 border border-blue-900/60 p-3.5 rounded-xl space-y-2.5 shadow-lg">
          <div className="flex justify-between items-center text-[11px]">
            <span className="text-blue-300 font-semibold flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-blue-400 animate-spin" /> {statusMsg}
            </span>
            <span className="text-blue-400 font-mono font-bold text-xs">{percent}%</span>
          </div>

          {/* 4-Stage Step Indicators */}
          <div className="grid grid-cols-4 gap-1.5 pt-1">
            {[
              { id: 1, name: 'Grounding', threshold: 25 },
              { id: 2, name: 'Critic', threshold: 50 },
              { id: 3, name: 'Supervisor', threshold: 75 },
              { id: 4, name: 'Interviewer', threshold: 90 }
            ].map(step => (
              <div
                key={step.id}
                className={`py-1 text-center rounded text-[10px] font-bold transition-all border ${
                  percent >= step.threshold
                    ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-sm'
                    : 'bg-gray-900 text-gray-500 border-gray-800'
                }`}
              >
                {step.id}. {step.name}
              </div>
            ))}
          </div>

          <div className="w-full bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
            <div
              className="bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleRun}
        disabled={isAnalyzing || !rawText.trim()}
        className="w-full py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isAnalyzing ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            4대 HR Multi-Agent 앙상블 분석 파이프라인 가동 중 ({percent}%)
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> 🤖 4대 HR Multi-Agent 역량 정밀 평가 실행
          </>
        )}
      </button>
    </div>
  );
}
