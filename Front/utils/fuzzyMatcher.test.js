import { describe, it, expect } from 'vitest';
import { levenshteinDistance, calculateSimilarity, findFuzzyMatch } from './fuzzyMatcher';

describe('Fuzzy Matching Engine (Levenshtein & Similarity)', () => {
  it('levenshteinDistance가 편집 거리를 정확히 계산해야 함', () => {
    expect(levenshteinDistance('kitten', 'sitting')).toBe(3);
    expect(levenshteinDistance('Redis 캐싱', 'Redis 캐싱')).toBe(0);
    expect(levenshteinDistance('안녕', '안녕하세요')).toBe(3);
  });

  it('calculateSimilarity가 0.0 ~ 1.0 사이의 정규화된 유사도를 반환해야 함', () => {
    expect(calculateSimilarity('Redis 캐싱 도입', 'Redis 캐싱 도입')).toBe(1.0);
    expect(calculateSimilarity('Redis 캐싱 도입', 'Redis 캐시 도입')).toBeGreaterThan(0.8);
  });

  it('Exact Match 문장을 1.0 유사도로 즉시 탐지해야 함', () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.';
    const quote = 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.';

    const match = findFuzzyMatch(rawText, quote);
    expect(match).not.toBeNull();
    expect(match?.isExact).toBe(true);
    expect(match?.similarity).toBe(1.0);
  });

  it('줄바꿈(\\n)이나 다중 공백이 포함된 문장도 95% 이상 유사도로 탐지해야 함', () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고\nRedis 캐싱 기법을 도입하여\n0.4초로 86.6% 단축시켰습니다.';
    const quote = 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.';

    const match = findFuzzyMatch(rawText, quote, 0.85);
    expect(match).not.toBeNull();
    expect(match?.similarity).toBeGreaterThanOrEqual(0.85);
  });

  it('오타가 미세하게 섞여 있어도 Threshold(0.80) 이상이면 탐지해야 함', () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐시 기법을 도입하여 0.4초로 86% 단축했습니다.';
    const quote = 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.';

    const match = findFuzzyMatch(rawText, quote, 0.75);
    expect(match).not.toBeNull();
    expect(match?.similarity).toBeGreaterThan(0.75);
  });
});
