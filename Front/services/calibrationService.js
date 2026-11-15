const CALIBRATION_STORAGE_PREFIX = 'checkmate_hitl_calibrations_';

/**
 * 테넌트 및 직무별 HITL(인간 검토관) 점수/판정 보정 이력을 저장하여
 * 차기 AI 평가 시 Few-Shot Calibration Memory(기업 전용 데이터 해자)로 주입합니다.
 */
export function recordHitlCalibration({
  tenantId = 'default',
  jobId = 'dev',
  originalScore,
  calibratedScore,
  originalDecision,
  calibratedDecision,
  reviewerNote = ''
}) {
  if (typeof window === 'undefined') return null;

  const entry = {
    id: `cal_${Date.now()}`,
    tenantId,
    jobId,
    originalScore: Number(originalScore ?? 0),
    calibratedScore: Number(calibratedScore ?? 0),
    scoreDelta: Number(calibratedScore ?? 0) - Number(originalScore ?? 0),
    originalDecision: originalDecision || 'HOLD',
    calibratedDecision: calibratedDecision || 'HOLD',
    reviewerNote: (reviewerNote || '').trim(),
    recordedAt: new Date().toISOString()
  };

  const key = `${CALIBRATION_STORAGE_PREFIX}${tenantId}_${jobId}`;
  const existing = getHitlCalibrations(tenantId, jobId);
  const updated = [entry, ...existing].slice(0, 10);

  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch {
    // ignore storage quota errors
  }

  return entry;
}

export function getHitlCalibrations(tenantId = 'default', jobId = 'dev') {
  if (typeof window === 'undefined') return [];
  const key = `${CALIBRATION_STORAGE_PREFIX}${tenantId}_${jobId}`;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function formatCalibrationFewShotAddendum(tenantId = 'default', jobId = 'dev') {
  const history = getHitlCalibrations(tenantId, jobId);
  if (!history || history.length === 0) return '';

  const recentExamples = history.slice(0, 3).map((item, idx) => {
    const sign = item.scoreDelta >= 0 ? `+${item.scoreDelta}` : `${item.scoreDelta}`;
    return `  ${idx + 1}. AI 초안 ${item.originalScore}점(${item.originalDecision}) -> 인사담당자 확정 ${item.calibratedScore}점(${item.calibratedDecision}, 보정폭 ${sign}점) | 사유: "${item.reviewerNote || '조직 평가 기준 보정'}"`;
  });

  return `
[기업 전용 HITL Few-Shot Calibration Memory (인사담당자 누적 보정 기준)]:
아래는 본 기업 인사담당자가 최근 서류 평가에서 AI 초안을 직접 교정한 실제 사례입니다. 점수와 판정을 산출할 때 이 기업의 눈높이와 보정 경향성을 반드시 반영하세요:
${recentExamples.join('\n')}
`;
}
