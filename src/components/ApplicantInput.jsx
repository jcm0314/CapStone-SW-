import React, { useEffect, useState } from 'react';
import { Loader2, UploadCloud, PenLine } from 'lucide-react';
import FileUploadZone from './FileUploadZone';

const PIPELINE_STEPS = [
  { id: 1, name: '근거 문장 찾기', threshold: 25 },
  { id: 2, name: '과장·대필 점검', threshold: 50 },
  { id: 3, name: '종합 판단', threshold: 75 },
  { id: 4, name: '면접 질문 생성', threshold: 90 }
];

export default function ApplicantInput({ onAnalyze, onBatchAnalyze, isAnalyzing, currentJobId, progressState, tabRequest }) {
  const [inputTab, setInputTab] = useState('TEXT'); // 'TEXT' | 'FILE'
  const [name, setName] = useState('');
  const [rawText, setRawText] = useState('');

  // 메뉴/검색에서 "PDF / TXT 업로드"를 고르면 파일 탭으로 전환
  useEffect(() => {
    if (tabRequest?.tab) setInputTab(tabRequest.tab);
  }, [tabRequest]);

  const handleOnFileSelected = (extractedText, filename) => {
    if (extractedText) {
      setRawText(extractedText);
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
  const statusMsg = progressState ? progressState.status : 'AI가 근거 문장을 찾는 중입니다…';

  const tabClass = (active) =>
    `relative -mb-px h-8 flex items-center gap-1.5 border-b-2 transition-colors text-[13px] ${
      active ? 'border-fg text-fg font-medium' : 'border-transparent text-fg-muted hover:text-fg'
    }`;

  return (
    <div className="card card-pad space-y-4">
      {/* Header */}
      <h2 className="section-title">자기소개서</h2>

      {/* Input method */}
      <div className="flex gap-4 border-b border-line" role="tablist" aria-label="입력 방식">
        <button type="button" role="tab" aria-selected={inputTab === 'TEXT'} onClick={() => setInputTab('TEXT')} className={tabClass(inputTab === 'TEXT')}>
          <PenLine className="w-3.5 h-3.5" /> 직접 입력
        </button>
        <button type="button" role="tab" aria-selected={inputTab === 'FILE'} onClick={() => setInputTab('FILE')} className={tabClass(inputTab === 'FILE')}>
          <UploadCloud className="w-3.5 h-3.5" /> PDF · TXT 파일
        </button>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <label htmlFor="applicant-name" className="label">지원자 이름</label>
        <input
          id="applicant-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 김민준"
          className="field"
        />
      </div>

      {inputTab === 'FILE' ? (
        <FileUploadZone
          onFileSelected={handleOnFileSelected}
          onBatchAnalyze={onBatchAnalyze}
          isAnalyzing={isAnalyzing}
        />
      ) : (
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="applicant-text" className="label">자기소개서 본문</label>
            <span className="text-xs text-fg-subtle tabular-nums">{rawText.length.toLocaleString()}자 · 개인정보는 자동으로 가려집니다</span>
          </div>
          <textarea
            id="applicant-text"
            rows={12}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
            }}
            placeholder="자기소개서나 경력기술서 본문을 붙여 넣으세요."
            className="field leading-[1.75] resize-y min-h-[220px]"
          />
        </div>
      )}

      {/* Progress */}
      {isAnalyzing && (
        <div className="rounded-xl border border-brand-line bg-brand-soft/60 p-4 space-y-3" aria-live="polite">
          <div className="flex justify-between items-center gap-3 text-[13px]">
            <span className="text-fg font-medium flex items-center gap-2 min-w-0">
              <Loader2 className="w-4 h-4 text-brand animate-spin shrink-0" />
              <span className="truncate">{statusMsg}</span>
            </span>
            <span className="text-brand-fg font-semibold tabular-nums">{percent}%</span>
          </div>
          <div className="w-full bg-surface rounded-full h-1.5 overflow-hidden border border-line">
            <div className="bg-brand h-full rounded-full transition-all duration-300 ease-out" style={{ width: `${percent}%` }} />
          </div>
          <ol className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            {PIPELINE_STEPS.map((step) => {
              const done = percent >= step.threshold;
              return (
                <li
                  key={step.id}
                  className={`py-1 px-2 rounded-md text-[11px] font-medium border text-center ${
                    done ? 'bg-surface text-brand-fg border-brand-line' : 'bg-transparent text-fg-subtle border-line'
                  }`}
                >
                  {step.id}. {step.name}
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleRun}
        disabled={isAnalyzing || !rawText.trim()}
        className="btn btn-primary btn-lg w-full sm:w-auto sm:min-w-[160px]"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            평가하는 중… ({percent}%)
          </>
        ) : (
          <>
            평가 실행
          </>
        )}
      </button>
    </div>
  );
}
