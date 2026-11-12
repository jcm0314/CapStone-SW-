import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import { TENANTS } from '../contexts/TenantContext';

/**
 * 앱에 기본 탑재된 "샘플 지원자"의 ID 목록.
 * - 1차 판별은 샘플 데이터에 붙은 `isSample: true` 플래그로 합니다.
 * - 플래그가 빠질 수 있는 경우(플래그 도입 전에 localStorage 에 저장된 목록, 공유 링크 스냅샷)를 위해
 *   샘플 데이터에서 직접 뽑은 ID 로 보조 판별합니다. (이름 매칭은 사용하지 않습니다.)
 * - 실제 AI 평가 결과는 항상 새 ID(`app_<timestamp>`)를 받으므로 이 목록과 겹치지 않습니다.
 */
export const SAMPLE_RESULT_IDS = new Set([
  ...SAMPLE_APPLICANTS.map((a) => a.id),
  ...TENANTS.flatMap((t) => (t.defaultApplicants || []).filter((a) => a.isSample).map((a) => a.id))
]);

/** AI를 실행하지 않은 예시(샘플) 결과인지 여부 */
export function isSampleResult(result) {
  if (!result) return false;
  if (result.isSample === true) return true;
  return SAMPLE_RESULT_IDS.has(result.id);
}
