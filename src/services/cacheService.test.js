import { describe, it, expect } from 'vitest';
import { generateCacheKey } from './cacheService';

describe('IndexedDB & LocalStorage Cache Service', () => {
  it('rawText와 applyJobId 기반으로 일관된 고유 캐시 키를 생성해야 함', () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱을 도입했습니다.';
    const key1 = generateCacheKey(rawText, 'tech_backend');
    const key2 = generateCacheKey(rawText, 'tech_backend');

    expect(key1).toBe(key2);
    expect(key1).toContain('cache_tech_backend');
  });

  it('서로 다른 자소서 텍스트나 직무 ID는 서로 다른 캐시 키를 생성해야 함', () => {
    const text1 = 'Redis 캐싱 기법 도입하여 0.4초 단축';
    const text2 = '마케팅 캠페인을 기획하여 매출 200% 달성';

    const key1 = generateCacheKey(text1, 'tech_backend');
    const key2 = generateCacheKey(text2, 'marketing');

    expect(key1).not.toBe(key2);
  });
});
