import { describe, it, expect } from 'vitest';
import { generateCacheKey, buildCacheScopeFingerprint, CACHE_KEY_VERSION } from './cacheService';

const BACKEND_WEIGHTS = [
  { id: 'problem_solving', weight: 30 },
  { id: 'tech_skill', weight: 30 },
  { id: 'teamwork', weight: 20 },
  { id: 'growth', weight: 10 },
  { id: 'ethics', weight: 10 }
];

const baseScope = {
  tenantId: 'toss-payments',
  competencies: BACKEND_WEIGHTS,
  promptAddendum: ''
};

describe('IndexedDB & LocalStorage Cache Service', () => {
  it('rawText와 applyJobId 기반으로 일관된 고유 캐시 키를 생성해야 함', () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱을 도입했습니다.';
    const key1 = generateCacheKey(rawText, 'tech_backend', baseScope);
    const key2 = generateCacheKey(rawText, 'tech_backend', baseScope);

    expect(key1).toBe(key2);
    expect(key1).toContain('tech_backend');
  });

  it('서로 다른 자소서 텍스트나 직무 ID는 서로 다른 캐시 키를 생성해야 함', () => {
    const text1 = 'Redis 캐싱 기법 도입하여 0.4초 단축';
    const text2 = '마케팅 캠페인을 기획하여 매출 200% 달성';

    const key1 = generateCacheKey(text1, 'tech_backend');
    const key2 = generateCacheKey(text2, 'marketing');

    expect(key1).not.toBe(key2);
  });

  it('앞 100자와 길이가 같고 뒷부분만 다른 자소서는 서로 다른 캐시 키를 가져야 함 (충돌 방지)', () => {
    const prefix = '가'.repeat(120);
    const key1 = generateCacheKey(`${prefix}성과A`, 'tech_backend');
    const key2 = generateCacheKey(`${prefix}성과B`, 'tech_backend');

    expect(key1).not.toBe(key2);
  });

  it('공백/줄바꿈 차이만 있는 동일 본문은 같은 캐시 키를 가져야 함', () => {
    const key1 = generateCacheKey('Redis 캐싱 도입\n\n0.4초 단축', 'tech_backend', baseScope);
    const key2 = generateCacheKey('Redis 캐싱 도입 0.4초 단축', 'tech_backend', baseScope);

    expect(key1).toBe(key2);
  });
});

describe('캐시 키 범위(테넌트 · 가중치 · Prompt Studio) 분리', () => {
  const text = 'Kafka 스트리밍으로 초당 12,000건을 처리하고 지연 시간을 18ms로 줄였습니다.';

  it('버전 접두사(v2)가 붙어 이전 스키마(cache_<jobId>_...) 키와 절대 겹치지 않아야 함', () => {
    const key = generateCacheKey(text, 'tech_backend', baseScope);
    expect(CACHE_KEY_VERSION).toBe('v2');
    expect(key.startsWith(`cache_${CACHE_KEY_VERSION}_`)).toBe(true);
    expect(key.startsWith('cache_tech_backend_')).toBe(false);
  });

  it('테넌트(회사)가 다르면 같은 자소서라도 다른 키를 생성해야 함', () => {
    const toss = generateCacheKey(text, 'tech_backend', baseScope);
    const daangn = generateCacheKey(text, 'tech_backend', { ...baseScope, tenantId: 'daangn' });

    expect(toss).not.toBe(daangn);
    expect(toss).toContain('toss-payments');
    expect(daangn).toContain('daangn');
  });

  it('역량 가중치가 바뀌면 다른 키를 생성해야 함', () => {
    const changedWeights = BACKEND_WEIGHTS.map(c => (c.id === 'tech_skill' ? { ...c, weight: 40 } : c.id === 'teamwork' ? { ...c, weight: 10 } : c));
    const before = generateCacheKey(text, 'tech_backend', baseScope);
    const after = generateCacheKey(text, 'tech_backend', { ...baseScope, competencies: changedWeights });

    expect(before).not.toBe(after);
  });

  it('역량 배열 순서만 다르고 가중치가 같으면 같은 키여야 함', () => {
    const reversed = [...BACKEND_WEIGHTS].reverse();
    expect(generateCacheKey(text, 'tech_backend', baseScope))
      .toBe(generateCacheKey(text, 'tech_backend', { ...baseScope, competencies: reversed }));
  });

  it('Prompt Studio 설정(프롬프트 addendum)이 바뀌면 다른 키를 생성해야 함', () => {
    const none = generateCacheKey(text, 'tech_backend', baseScope);
    const custom = generateCacheKey(text, 'tech_backend', {
      ...baseScope,
      promptAddendum: '[Enterprise Custom HR Requirements]:\n- Company Core Values: 고객 집착'
    });
    const custom2 = generateCacheKey(text, 'tech_backend', {
      ...baseScope,
      promptAddendum: '[Enterprise Custom HR Requirements]:\n- Company Core Values: 정직'
    });

    expect(none).not.toBe(custom);
    expect(custom).not.toBe(custom2);
  });

  it('범위 지문(fingerprint)은 결정적이며 16자리 hex여야 함', () => {
    const fp1 = buildCacheScopeFingerprint(baseScope);
    const fp2 = buildCacheScopeFingerprint({ ...baseScope });
    expect(fp1).toBe(fp2);
    expect(fp1).toMatch(/^[0-9a-f]{16}$/);
  });

  it('테넌트 ID에 특수문자가 있어도 키 구분자를 깨뜨리지 않아야 함', () => {
    const key = generateCacheKey(text, 'tech_backend', { ...baseScope, tenantId: 'evil_id/../x y' });
    expect(key).not.toContain('/');
    expect(key).not.toContain(' ');
  });

  it('scope 미지정 시 default 테넌트로 처리되어야 함', () => {
    expect(generateCacheKey(text, 'tech_backend')).toContain(`cache_${CACHE_KEY_VERSION}_default_tech_backend_`);
  });
});
