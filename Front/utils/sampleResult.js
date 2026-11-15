import { TENANTS } from '../contexts/TenantContext';

export const SAMPLE_RESULT_IDS = new Set([
  ...TENANTS.flatMap((t) => (t.defaultApplicants || []).filter((a) => a.isSample).map((a) => a.id))
]);

/** AI를 실행하지 않은 예시(샘플) 결과인지 여부 */
export function isSampleResult(result) {
  if (!result) return false;
  if (result.isSample === true) return true;
  return SAMPLE_RESULT_IDS.has(result.id);
}

/** 영상 촬영용 목업 지원자(demo-…)·가짜 평가 결과(demo_…, DEMO_MOCK_PREVIEW)인지 여부 (#104, 이후 제거됨) */
export function isDemoMockResult(result) {
  if (!result) return false;
  if (result.mode === 'DEMO_MOCK_PREVIEW') return true;
  return typeof result.id === 'string' && /^demo[-_]/.test(result.id);
}
