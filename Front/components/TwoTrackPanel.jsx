import React, { useState, useEffect } from 'react';
import { Columns2, FileText, Mic, AlertTriangle, Check, Scale } from 'lucide-react';

const INTERVIEW_STAGES = [
  { id: '1차 실무 면접', label: '1차 실무 면접' },
  { id: '2차 임원 면접', label: '2차 임원 면접' },
  { id: '컬처핏 면접', label: '컬처핏 면접' }
];

const INTERVIEW_VERDICTS = [
  { id: 'PENDING', label: '미정', badgeClass: 'bg-subtle text-fg-muted border-line' },
  { id: 'PASS', label: '합격 추천', badgeClass: 'bg-ok-soft text-ok border-ok-line' },
  { id: 'HOLD', label: '보류', badgeClass: 'bg-warn-soft text-warn border-warn-line' },
  { id: 'REJECT', label: '비추천', badgeClass: 'bg-bad-soft text-bad border-bad-line' }
];

const WEIGHT_PRESETS = [
  { id: '50:50', label: '서류 50% · 면접 50%', docWeight: 0.5 },
  { id: '40:60', label: '서류 40% · 면접 60%', docWeight: 0.4 },
  { id: '60:40', label: '서류 60% · 면접 40%', docWeight: 0.6 }
];

const DOC_DECISION_LABEL = {
  STRONG_PASS: '통과 추천',
  INTERVIEW: '면접 추천',
  HOLD: '보류',
  REJECT: '탈락 권장'
};

export function computeCombinedTrackScore(docScore, interviewScore, docWeight = 0.5) {
  if (typeof interviewScore !== 'number' || Number.isNaN(interviewScore)) {
    return null;
  }
  const safeDoc = Number.isFinite(docScore) ? docScore : 0;
  const safeInterview = Math.max(0, Math.min(100, interviewScore));
  return Math.round(safeDoc * docWeight + safeInterview * (1 - docWeight));
}

function normalizeCompetencies(analysis, currentJob) {
  const raw = analysis?.competencyScores || {};
  const list = Array.isArray(analysis?.competencies) ? analysis.competencies : [];
  const jobComps = currentJob?.competencies || [];

  if (jobComps.length > 0) {
    return jobComps.map((c) => {
      const fromList = list.find((item) => item.id === c.id);
      const score = raw[c.id] ?? fromList?.score ?? null;
      return { id: c.id, name: c.name || c.id, score };
    });
  }

  return Object.entries(raw).map(([id, score]) => ({ id, name: id, score }));
}

export default function TwoTrackPanel({ applicant, currentJob, onSaveTwoTrack }) {
  const existing = applicant?.interviewTrack || {};
  const docScore = applicant?.analysis?.summary?.totalScore ?? 0;
  const docDecision = applicant?.analysis?.summary?.decision || 'INTERVIEW';
  const docReason = applicant?.analysis?.summary?.decisionReason || '';
  const competencies = normalizeCompetencies(applicant?.analysis, currentJob);

  const [stage, setStage] = useState(existing.stage || '1차 실무 면접');
  const [score, setScore] = useState(
    typeof existing.score === 'number' ? String(existing.score) : ''
  );
  const [verdict, setVerdict] = useState(existing.verdict || 'PENDING');
  const [docWeight, setDocWeight] = useState(
    typeof existing.docWeight === 'number' ? existing.docWeight : 0.5
  );
  const [strengthsNote, setStrengthsNote] = useState(existing.strengthsNote || '');
  const [concernsNote, setConcernsNote] = useState(existing.concernsNote || '');
  const [summaryNote, setSummaryNote] = useState(existing.summaryNote || '');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    const next = applicant?.interviewTrack || {};
    setStage(next.stage || '1차 실무 면접');
    setScore(typeof next.score === 'number' ? String(next.score) : '');
    setVerdict(next.verdict || 'PENDING');
    setDocWeight(typeof next.docWeight === 'number' ? next.docWeight : 0.5);
    setStrengthsNote(next.strengthsNote || '');
    setConcernsNote(next.concernsNote || '');
    setSummaryNote(next.summaryNote || '');
    setSavedNotice(false);
  }, [applicant?.id]);

  if (!applicant || !applicant.analysis) return null;

  const parsedInterviewScore = score === '' ? null : Math.max(0, Math.min(100, Number(score)));
  const hasInterviewScore = parsedInterviewScore !== null && !Number.isNaN(parsedInterviewScore);
  const combinedScore = computeCombinedTrackScore(docScore, parsedInterviewScore, docWeight);
  const scoreGap = hasInterviewScore ? parsedInterviewScore - docScore : null;
  const hasLargeGap = scoreGap !== null && Math.abs(scoreGap) >= 15;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!onSaveTwoTrack) return;
    onSaveTwoTrack(applicant.id, {
      stage,
      score: hasInterviewScore ? parsedInterviewScore : null,
      verdict,
      docWeight,
      strengthsNote: strengthsNote.trim(),
      concernsNote: concernsNote.trim(),
      summaryNote: summaryNote.trim(),
      updatedAt: new Date().toISOString()
    });
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2500);
  };

  return (
    <section className="card" aria-labelledby="two-track-heading">
      <div className="px-4 py-3 border-b border-line flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Columns2 className="w-4 h-4 text-fg-muted" />
          <h2 id="two-track-heading" className="text-[14px] font-semibold text-fg">
            서류·면접 2-Track 비교
          </h2>
          {hasLargeGap && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-warn-soft text-warn border border-warn-line">
              <AlertTriangle className="w-3 h-3" />
              서류·면접 편차 {Math.abs(scoreGap)}점 — 추가 검증 권장
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Scale className="w-3.5 h-3.5 text-fg-subtle" />
          <select
            aria-label="서류 면접 가중치"
            value={String(docWeight)}
            onChange={(e) => setDocWeight(Number(e.target.value))}
            className="text-[12px] bg-subtle border border-line rounded px-2 py-1 text-fg"
          >
            {WEIGHT_PRESETS.map((preset) => (
              <option key={preset.id} value={String(preset.docWeight)}>
                {preset.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 상단 2-Track 점수 비교 요약 바 */}
      <div className="px-4 py-3 bg-subtle/60 border-b border-line grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-md bg-surface border border-line px-3 py-2">
          <div className="text-[11px] text-fg-subtle">Track 1 · 서류 평가</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-bold text-fg tabular-nums">{docScore}점</span>
            <span className="text-[12px] text-fg-muted">
              {DOC_DECISION_LABEL[docDecision] || docDecision}
            </span>
          </div>
        </div>
        <div className="rounded-md bg-surface border border-line px-3 py-2">
          <div className="text-[11px] text-fg-subtle">Track 2 · 면접 평가</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-bold text-fg tabular-nums">
              {hasInterviewScore ? `${parsedInterviewScore}점` : '미입력'}
            </span>
            {scoreGap !== null && (
              <span
                className={`text-[12px] font-medium tabular-nums ${
                  scoreGap > 0 ? 'text-ok' : scoreGap < 0 ? 'text-bad' : 'text-fg-muted'
                }`}
              >
                {scoreGap > 0 ? `+${scoreGap}점` : `${scoreGap}점`}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-md bg-surface border border-line px-3 py-2">
          <div className="text-[11px] text-fg-subtle">2-Track 통합 점수</div>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-lg font-bold text-brand-fg tabular-nums">
              {combinedScore !== null ? `${combinedScore}점` : '면접 점수 대기'}
            </span>
            <span className="text-[11px] text-fg-muted">{stage}</span>
          </div>
        </div>
      </div>

      {/* 좌우 나란히 보기: Track 1 (서류) | Track 2 (면접) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-line">
        {/* Track 1: 서류 평가 요약 */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
            <FileText className="w-4 h-4 text-fg-muted" />
            Track 1 · 서류 AI 평가
          </div>
          {docReason && (
            <p className="text-[12.5px] text-fg-muted leading-relaxed bg-subtle rounded p-2.5 border border-line">
              {docReason}
            </p>
          )}
          <div className="space-y-2">
            {competencies.map((comp) => (
              <div key={comp.id} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-fg-muted">{comp.name}</span>
                  <span className="font-semibold text-fg tabular-nums">
                    {comp.score !== null ? `${comp.score}점` : '-'}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-subtle overflow-hidden">
                  <div
                    className="h-full bg-fg-muted rounded-full transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, comp.score ?? 0))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Track 2: 면접 기록 입력 & 저장 */}
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
              <Mic className="w-4 h-4 text-fg-muted" />
              Track 2 · 면접 기록 및 점수
            </div>
            {existing.updatedAt && (
              <span className="text-[11px] text-fg-subtle">
                최근 저장: {new Date(existing.updatedAt).toLocaleString('ko-KR')}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">면접 단계</span>
              <select
                aria-label="면접 단계"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
                className="w-full h-8 px-2 text-[12.5px] rounded border border-line bg-surface text-fg"
              >
                {INTERVIEW_STAGES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">면접 점수 (0~100)</span>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="예: 85"
                aria-label="면접 점수"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="w-full h-8 px-2 text-[12.5px] rounded border border-line bg-surface text-fg tabular-nums"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">면접 판정</span>
              <select
                aria-label="면접 판정"
                value={verdict}
                onChange={(e) => setVerdict(e.target.value)}
                className="w-full h-8 px-2 text-[12.5px] rounded border border-line bg-surface text-fg"
              >
                {INTERVIEW_VERDICTS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">면접에서 확인된 강점</span>
              <textarea
                rows={2}
                placeholder="질의응답 중 검증된 역량, 구체적 사례"
                aria-label="면접에서 확인된 강점"
                value={strengthsNote}
                onChange={(e) => setStrengthsNote(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12.5px] rounded border border-line bg-surface text-fg resize-y"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] text-fg-muted">우려사항 / 추가 확인</span>
              <textarea
                rows={2}
                placeholder="서류와 불일치하거나 추가 검증이 필요한 부분"
                aria-label="우려사항"
                value={concernsNote}
                onChange={(e) => setConcernsNote(e.target.value)}
                className="w-full px-2.5 py-1.5 text-[12.5px] rounded border border-line bg-surface text-fg resize-y"
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-[11px] text-fg-muted">종합 면접 코멘트</span>
            <textarea
              rows={2}
              placeholder="최종 합격/보류 의견 및 처우·배치 참고 사항"
              aria-label="종합 면접 코멘트"
              value={summaryNote}
              onChange={(e) => setSummaryNote(e.target.value)}
              className="w-full px-2.5 py-1.5 text-[12.5px] rounded border border-line bg-surface text-fg resize-y"
            />
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-[12px] text-ok">
                <Check className="w-3.5 h-3.5" /> 저장됨
              </span>
            )}
            <button type="submit" className="btn btn-primary btn-sm">
              면접 기록 저장
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
