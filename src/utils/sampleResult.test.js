import { describe, it, expect } from 'vitest';
import { isSampleResult, SAMPLE_RESULT_IDS } from './sampleResult';
import { SAMPLE_APPLICANTS } from '../data/sampleApplicants';
import { TENANTS } from '../contexts/TenantContext';

describe('isSampleResult (샘플 데이터 판별)', () => {
  it('모든 기본 샘플 지원자에 isSample 플래그가 있다', () => {
    SAMPLE_APPLICANTS.forEach((a) => expect(a.isSample).toBe(true));
    TENANTS.forEach((t) => t.defaultApplicants.forEach((a) => expect(isSampleResult(a)).toBe(true)));
  });

  it('isSample 플래그가 있으면 샘플로 판별한다', () => {
    expect(isSampleResult({ id: 'whatever', isSample: true })).toBe(true);
  });

  it('플래그가 빠진 공유 스냅샷/구버전 저장 데이터도 샘플 ID로 판별한다', () => {
    expect(SAMPLE_RESULT_IDS.has('app_101')).toBe(true);
    expect(isSampleResult({ id: 'app_101', name: '김민준' })).toBe(true);
    expect(isSampleResult({ id: 'daangn_app_01' })).toBe(true);
  });

  it('실제 AI 평가 결과(새 ID)는 이름이 같아도 샘플이 아니다', () => {
    expect(isSampleResult({ id: 'app_1731390000000', name: '김민준' })).toBe(false);
    expect(isSampleResult(null)).toBe(false);
    expect(isSampleResult(undefined)).toBe(false);
  });
});
