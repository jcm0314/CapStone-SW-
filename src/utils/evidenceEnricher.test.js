import { describe, it, expect } from 'vitest';
import { enrichEvidences } from './evidenceEnricher.js';
import { enrichEvidencesSync } from '../services/workerService.js';

const TEXT = '쇼핑몰 API 응답이 3초로 느린 문제를 발견하고 Redis 캐싱을 도입하여 0.4초까지 줄였습니다. 열정을 다해 최고의 시너지를 내겠습니다.';

describe('enrichEvidences (hallucination guard)', () => {
  it('keeps the AI type and score for a quote found verbatim in the text', () => {
    const [ev] = enrichEvidences(TEXT, [
      { quote: 'Redis 캐싱을 도입하여 0.4초까지 줄였습니다.', type: 'positive', scoreImpact: 15 }
    ]);
    expect(ev.matched).toBe(true);
    expect(ev.type).toBe('positive');
    expect(ev.scoreImpact).toBe(15);
    expect(ev.startIndex).toBe(TEXT.indexOf('Redis'));
  });

  it('forces a quote that does not exist in the text to verify with zero score impact', () => {
    const [ev] = enrichEvidences(TEXT, [
      { quote: '저는 구글에서 5년간 근무하며 연봉 2억을 받았습니다.', type: 'positive', scoreImpact: 20, explanation: 'mock' }
    ]);
    expect(ev.matched).toBe(false);
    expect(ev.startIndex).toBe(-1);
    expect(ev.type).toBe('verify');
    expect(ev.originalType).toBe('positive');
    expect(ev.scoreImpact).toBe(0);
    expect(ev.explanation).toContain('원문에서 이 문장을 찾지 못했습니다');
  });

  it('does not let an unmatched risk quote subtract points either', () => {
    const [ev] = enrichEvidences(TEXT, [
      { quote: '회사 기밀을 외부에 유출한 적이 있습니다.', type: 'risk', scoreImpact: -15 }
    ]);
    expect(ev.type).toBe('verify');
    expect(ev.scoreImpact).toBe(0);
  });

  it('still matches a quote with small whitespace differences via fuzzy matching', () => {
    const [ev] = enrichEvidences(TEXT, [
      { quote: '열정을 다해  최고의 시너지를 내겠습니다.', type: 'risk', scoreImpact: -5 }
    ]);
    expect(ev.matched).toBe(true);
    expect(ev.type).toBe('risk');
  });

  it('is what the synchronous worker fallback uses', () => {
    const input = [{ quote: '없는 문장입니다 정말로 원문에 없음', type: 'positive', scoreImpact: 10 }];
    expect(enrichEvidencesSync(TEXT, input)).toEqual(enrichEvidences(TEXT, input));
  });
});
