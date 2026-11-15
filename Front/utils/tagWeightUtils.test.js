import { describe, it, expect } from 'vitest';
import { normalizeWeightsFromTags, calculateTagWeightedScore } from './tagWeightUtils';

describe('tagWeightUtils', () => {
  it('우선순위 태그(핵심/기본/참고)에 따라 가중치 합을 정확히 100%로 정규화한다', () => {
    const comps = [
      { id: 'a', name: 'A', priority: 'core', weight: 20 },
      { id: 'b', name: 'B', priority: 'standard', weight: 20 },
      { id: 'c', name: 'C', priority: 'ref', weight: 20 }
    ];
    const normalized = normalizeWeightsFromTags(comps);
    const total = normalized.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBe(100);
    expect(normalized[0].weight).toBeGreaterThan(normalized[1].weight);
    expect(normalized[1].weight).toBeGreaterThan(normalized[2].weight);
  });

  it('역량 점수와 태그 가중치를 반영한 가중 평균 점수를 계산한다', () => {
    const comps = [
      { id: 'problem_solving', weight: 60 },
      { id: 'teamwork', weight: 40 }
    ];
    const scores = { problem_solving: 90, teamwork: 65 };
    expect(calculateTagWeightedScore(scores, comps)).toBe(80);
  });
});
