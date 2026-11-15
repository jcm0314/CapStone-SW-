export const PRIORITY_TIERS = [
  { id: 'core', label: '핵심', multiplier: 1.5 },
  { id: 'standard', label: '기본', multiplier: 1.0 },
  { id: 'ref', label: '참고', multiplier: 0.5 }
];

export const DEFAULT_FOCUS_TAG_SUGGESTIONS = [
  '대용량트래픽',
  '문제해결',
  '데이터기반',
  '협업리더십',
  '고객집착',
  'AI활용'
];

/**
 * 역량 목록의 priority('core' | 'standard' | 'ref')를 바탕으로 합계가 정확히 100이 되도록 정규화한다.
 */
export function normalizeWeightsFromTags(competencies = []) {
  if (!Array.isArray(competencies) || competencies.length === 0) return [];

  const tierMap = Object.fromEntries(PRIORITY_TIERS.map((t) => [t.id, t.multiplier]));
  const rawWeights = competencies.map((c) => {
    const tier = c.priority || 'standard';
    return tierMap[tier] ?? 1.0;
  });

  const sum = rawWeights.reduce((acc, w) => acc + w, 0);
  if (sum <= 0) return competencies;

  const floored = rawWeights.map((w) => Math.floor((w / sum) * 100));
  let remainder = 100 - floored.reduce((acc, v) => acc + v, 0);

  // 나머지를 소수점이 큰 항목부터 1씩 분배
  const fractions = rawWeights
    .map((w, idx) => ({ idx, frac: (w / sum) * 100 - floored[idx] }))
    .sort((a, b) => b.frac - a.frac);

  for (let i = 0; i < remainder; i += 1) {
    floored[fractions[i % fractions.length].idx] += 1;
  }

  return competencies.map((c, idx) => ({
    ...c,
    priority: c.priority || 'standard',
    weight: floored[idx]
  }));
}

/**
 * 역량 점수 객체와 가중치 배열을 이용해 가중 평균 점수(0~100)를 계산한다.
 */
export function calculateTagWeightedScore(competencyScores = {}, competencies = []) {
  if (!Array.isArray(competencies) || competencies.length === 0) return null;
  let weightedSum = 0;
  let totalWeight = 0;

  competencies.forEach((c) => {
    const score = competencyScores?.[c.id];
    const weight = Number(c.weight) || 0;
    if (typeof score === 'number' && !Number.isNaN(score) && weight > 0) {
      weightedSum += score * weight;
      totalWeight += weight;
    }
  });

  if (totalWeight <= 0) return null;
  return Math.round(weightedSum / totalWeight);
}
