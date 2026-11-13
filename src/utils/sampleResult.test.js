import { describe, it, expect } from 'vitest';
import { isSampleResult, SAMPLE_RESULT_IDS } from './sampleResult';
import { TENANTS } from '../contexts/TenantContext';

describe('isSampleResult (샘플 데이터 판별)', () => {
  it('테넌트에는 기본 샘플 지원자가 없다', () => {
    TENANTS.forEach((tenant) => expect(tenant.defaultApplicants).toEqual([]));
    expect(SAMPLE_RESULT_IDS.size).toBe(0);
  });

  it('isSample 플래그가 있으면 샘플로 판별한다', () => {
    expect(isSampleResult({ id: 'whatever', isSample: true })).toBe(true);
  });

  it('플래그가 없는 결과는 ID나 이름만으로 샘플 판별하지 않는다', () => {
    expect(isSampleResult({ id: 'app_101', name: '테스트 지원자' })).toBe(false);
  });

  it('실제 AI 평가 결과는 샘플이 아니다', () => {
    expect(isSampleResult({ id: 'app_1731390000000' })).toBe(false);
    expect(isSampleResult(null)).toBe(false);
    expect(isSampleResult(undefined)).toBe(false);
  });
});
