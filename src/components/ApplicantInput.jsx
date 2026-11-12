import React, { useEffect, useState } from 'react';
import { Sparkles, FileText, Loader2, UploadCloud, PenLine } from 'lucide-react';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import FileUploadZone from './FileUploadZone';

const DECISION_TONE = {
  STRONG_PASS: { label: '우수', dot: 'bg-ok-solid' },
  REJECT: { label: '과장 의심', dot: 'bg-bad-solid' },
  DEFAULT: { label: '검증 필요', dot: 'bg-warn-solid' }
};

const PIPELINE_STEPS = [
  { id: 1, name: '근거 문장 찾기', threshold: 25 },
  { id: 2, name: '과장·대필 점검', threshold: 50 },
  { id: 3, name: '종합 판단', threshold: 75 },
  { id: 4, name: '면접 질문 생성', threshold: 90 }
];

export default function ApplicantInput({ onAnalyze, onBatchAnalyze, isAnalyzing, currentJobId, progressState, tabRequest }) {
  const [inputTab, setInputTab] = useState('TEXT'); // 'TEXT' | 'FILE'
  const [name, setName] = useState('김민준');
  const [rawText, setRawText] = useState(SAMPLE_APPLICANTS[0].rawText);
  const [selectedSampleId, setSelectedSampleId] = useState(SAMPLE_APPLICANTS[0].id);

  // 메뉴/검색에서 "PDF / TXT 업로드"를 고르면 파일 탭으로 전환
  useEffect(() => {
    if (tabRequest?.tab) setInputTab(tabRequest.tab);
  }, [tabRequest]);

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
  const statusMsg = progressState ? progressState.status : 'AI가 근거 문장을 찾는 중입니다…';

  const tabClass = (active) =>
    `flex-1 py-2 rounded-md flex items-center justify-center gap-1.5 transition-colors text-[13px] font-semibold ${
      active ? 'bg-surface text-fg shadow-card' : 'text-fg-muted hover:text-fg'
    }`;

  return (
    <div className="card card-pad space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <FileText className="w-[18px] h-[18px] text-fg-subtle mt-0.5" />
          <div>
            <h3 className="section-title">자기소개서 입력</h3>
            <p className="section-desc">붙여 넣거나 파일로 올리세요. AI에 보내기 전에 연락처·이메일 같은 개인정보는 자동으로 가려집니다.</p>
          </div>
        </div>
      </div>

      {/* Quick samples */}
      <div className="space-y-2">
        <p className="text-[12px] font-medium text-fg-subtle">예시 자소서로 바로 해 보기</p>
        <div className="flex flex-wrap gap-1.5">
          {SAMPLE_APPLICANTS.map((sample) => {
            const tone = DECISION_TONE[sample.analysis.summary.decision] || DECISION_TONE.DEFAULT;
            const active = selectedSampleId === sample.id && inputTab === 'TEXT';
            return (
              <button
                key={sample.id}
                type="button"
                onClick={() => {
                  setInputTab('TEXT');
                  handleSelectSample(sample);
                }}
                aria-pressed={active}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] rounded-lg border transition-colors ${
                  active
                    ? 'bg-brand-soft text-brand-fg border-brand-line font-semibold'
                    : 'bg-surface text-fg-muted border-line hover:text-fg hover:border-line-strong'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${tone.dot}`} />
                {sample.name}
                <span className="text-fg-subtle font-normal">· {tone.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Input method */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/70 border border-line" role="tablist" aria-label="입력 방식">
        <button type="button" role="tab" aria-selected={inputTab === 'TEXT'} onClick={() => setInputTab('TEXT')} className={tabClass(inputTab === 'TEXT')}>
          <PenLine className="w-3.5 h-3.5" /> 직접 입력
        </button>
        <button type="button" role="tab" aria-selected={inputTab === 'FILE'} onClick={() => setInputTab('FILE')} className={tabClass(inputTab === 'FILE')}>
          <UploadCloud className="w-3.5 h-3.5" /> PDF / TXT 파일 업로드
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
            <span className="text-[12px] text-fg-subtle tabular-nums">{rawText.length.toLocaleString()}자</span>
          </div>
          <textarea
            id="applicant-text"
            rows={9}
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setSelectedSampleId('');
            }}
            placeholder="자기소개서나 경력기술서 본문을 붙여 넣으세요."
            className="field leading-[1.75] resize-y min-h-[180px]"
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
        className="btn btn-primary btn-lg w-full"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            평가하는 중… ({percent}%)
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> AI 평가 실행
          </>
        )}
      </button>
    </div>
  );
}
