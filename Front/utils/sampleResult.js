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
