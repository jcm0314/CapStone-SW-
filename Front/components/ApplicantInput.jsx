import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, UploadCloud, PenLine, ShieldCheck, AlertTriangle, EyeOff, Check } from 'lucide-react';
import FileUploadZone from './FileUploadZone';
import { guessApplicantName } from '../utils/nameGuesser';
import { anonymizePII, detectSuspiciousPII, applyManualMasks } from '../utils/piiAnonymizer';

const CONSENT_KEY = 'checkmate_pii_consent_confirmed';

const PIPELINE_STEPS = [
  { id: 1, name: '근거 문장 찾기', threshold: 25 },
  { id: 2, name: '과장·대필 점검', threshold: 50 },
  { id: 3, name: '종합 판단', threshold: 75 },
  { id: 4, name: '면접 질문 생성', threshold: 90 }
];

export default function ApplicantInput({ onAnalyze, onBatchAnalyze, isAnalyzing, currentJobId, progressState, tabRequest }) {
  const [inputTab, setInputTab] = useState('FILE'); // 'FILE' | 'TEXT' (파일 업로드가 기본)
  const [name, setName] = useState('');
  const [rawText, setRawText] = useState('');
  // 지원자 개인정보 수집·이용 동의 확인 (이 브라우저 세션 동안 기억)
  const [consent, setConsent] = useState(() => {
    try {
      return sessionStorage.getItem(CONSENT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [consentMissing, setConsentMissing] = useState(false);
  // 2차 Selective HITL: 담당자가 원클릭으로 추가 가림 승인한 토큰 & 무시한 항목
  const [manualMaskedTokens, setManualMaskedTokens] = useState([]);
  const [ignoredSuspiciousIds, setIgnoredSuspiciousIds] = useState([]);

  const piiPreview = useMemo(() => {
    if (!rawText.trim()) return null;
    const stage1 = anonymizePII(rawText, name);
    const afterManual = applyManualMasks(stage1.anonymizedText, manualMaskedTokens);
    const suspicious = detectSuspiciousPII(afterManual).filter(
      (item) => !ignoredSuspiciousIds.includes(item.match)
    );
    return {
      piiCount: stage1.piiCount,
      maskedCategories: stage1.maskedCategories,
      suspicious
    };
  }, [rawText, name, manualMaskedTokens, ignoredSuspiciousIds]);

  useEffect(() => {
    if (!rawText.trim()) {
      setManualMaskedTokens([]);
      setIgnoredSuspiciousIds([]);
    }
  }, [rawText]);

  const handleMaskSuspicious = (token) => {
    setManualMaskedTokens((prev) => (prev.includes(token) ? prev : [...prev, token]));
  };

  const handleMaskAllSuspicious = () => {
    if (!piiPreview?.suspicious?.length) return;
    const tokens = piiPreview.suspicious.map((s) => s.match);
    setManualMaskedTokens((prev) => [...new Set([...prev, ...tokens])]);
  };

  const handleIgnoreSuspicious = (token) => {
    setIgnoredSuspiciousIds((prev) => (prev.includes(token) ? prev : [...prev, token]));
  };

  const updateConsent = (checked) => {
    setConsent(checked);
    setConsentMissing(false);
    try {
      if (checked) sessionStorage.setItem(CONSENT_KEY, '1');
      else sessionStorage.removeItem(CONSENT_KEY);
    } catch {
      // 저장소를 못 쓰면 이번 화면에서만 유지
    }
  };

  const requireConsent = () => {
    if (consent) return true;
    setConsentMissing(true);
    return false;
  };

  const guardedBatchAnalyze = (candidates) => {
    if (!requireConsent()) return;
    onBatchAnalyze(candidates);
  };

  // 메뉴/검색에서 "PDF / TXT 업로드"를 고르면 파일 탭으로 전환
  useEffect(() => {
    if (tabRequest?.tab) setInputTab(tabRequest.tab);
  }, [tabRequest]);

  const handleOnFileSelected = (extractedText, filename) => {
    if (extractedText) {
      setRawText(extractedText);
      // 이름은 본문에서 먼저 찾고, 없으면 한글 이름이 든 파일 이름에서 찾음 (못 찾으면 직접 입력)
      const guessed = guessApplicantName(extractedText, filename);
      if (guessed) setName(guessed);
    }
  };

  const handleRun = () => {
    if (!rawText.trim()) return;
    if (!requireConsent()) return;
    const preparedText = manualMaskedTokens.length > 0
      ? applyManualMasks(rawText, manualMaskedTokens)
      : rawText;
    onAnalyze({ name, rawText: preparedText });
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
        <button type="button" role="tab" aria-selected={inputTab === 'FILE'} onClick={() => setInputTab('FILE')} className={tabClass(inputTab === 'FILE')}>
          <UploadCloud className="w-3.5 h-3.5" /> PDF · TXT 파일
        </button>
        <button type="button" role="tab" aria-selected={inputTab === 'TEXT'} onClick={() => setInputTab('TEXT')} className={tabClass(inputTab === 'TEXT')}>
          <PenLine className="w-3.5 h-3.5" /> 직접 입력
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
          onBatchAnalyze={guardedBatchAnalyze}
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

      {/* 2차 Selective HITL 개인정보 점검 요약 (본문 전체 열람 대신 의심 1~2줄만 3초 확인) */}
      {piiPreview && (
        piiPreview.suspicious.length === 0 ? (
          <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-ok-line bg-ok-soft/60 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-ok">
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              1차 자동 가림 완료
              {piiPreview.maskedCategories.length > 0
                ? ` (${piiPreview.maskedCategories.join('·')})`
                : ' (개인정보 미검출)'}
              {manualMaskedTokens.length > 0 ? ` + 추가 가림 ${manualMaskedTokens.length}건` : ''}
            </span>
            <span className="text-ok/90 font-semibold shrink-0">의심 항목 0건 · 바로 분석 가능</span>
          </div>
        ) : (
          <div className="rounded-lg border border-warn-line bg-warn-soft/50 p-3 space-y-2.5" role="region" aria-label="2차 선택적 개인정보 확인">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-warn">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                비정형 개인정보 의심 {piiPreview.suspicious.length}건만 빠르게 확인하세요 (전체 열람 불필요)
              </div>
              <button
                type="button"
                onClick={handleMaskAllSuspicious}
                className="btn btn-primary btn-sm text-xs"
              >
                <EyeOff className="w-3 h-3" /> 모두 가리기
              </button>
            </div>
            <div className="space-y-1.5">
              {piiPreview.suspicious.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-md bg-surface border border-line text-xs"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-warn-soft text-warn font-semibold text-[11px]">
                        {item.category}
                      </span>
                      <code className="px-1.5 py-0.5 rounded bg-subtle text-fg font-bold">{item.match}</code>
                    </div>
                    <p className="text-[11px] text-fg-muted truncate" title={item.snippet}>
                      {item.snippet}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMaskSuspicious(item.match)}
                      className="btn btn-secondary btn-sm text-[11px]"
                    >
                      <Check className="w-3 h-3" /> 가리기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIgnoreSuspicious(item.match)}
                      className="btn btn-ghost btn-sm text-[11px] text-fg-muted"
                    >
                      무시
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}

      {/* 개인정보 수집·이용 동의 확인 */}
      <label
        className={`flex items-start gap-2 px-3 py-2.5 rounded-md border text-[13px] cursor-pointer ${
          consentMissing ? 'border-bad-line bg-bad-soft' : 'border-line bg-subtle/60'
        }`}
      >
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => updateConsent(e.target.checked)}
          className="mt-0.5 accent-brand"
          aria-describedby="consent-help"
        />
        <span>
          <span className="text-fg">지원자에게 개인정보 수집·이용 동의를 받았습니다.</span>
          <span id="consent-help" className="block text-xs text-fg-muted mt-0.5">
            이름·연락처·학교 등은 AI로 보내기 전에 가려집니다. 자세한 내용은 하단 개인정보 처리방침을 확인하세요.
          </span>
          {consentMissing && <span role="alert" className="block text-xs text-bad mt-1">동의 확인 후 평가할 수 있습니다.</span>}
        </span>
      </label>

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
