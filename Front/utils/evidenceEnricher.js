/**
 * Grounding evidence enricher (shared by the Web Worker and the synchronous fallback).
 *
 * Locates each AI-quoted sentence in the applicant text (exact match first, then fuzzy).
 * Hallucination guard: when a quote cannot be found in the text, the evidence is forced to
 * type "verify" with scoreImpact 0, so a fabricated sentence can never add or subtract points.
 */
import { findFuzzyMatch } from './fuzzyMatcher.js';

const VALID_TYPES = ['positive', 'risk', 'verify'];

function defaultImpact(type) {
  if (type === 'positive') return 12;
  if (type === 'risk') return -10;
  return 0;
}

export function enrichEvidences(targetText, rawGroundingEvidences = [], threshold = 0.70) {
  return (rawGroundingEvidences || []).map((ev, idx) => {
    let startIndex = -1;
    let endIndex = -1;

    if (ev.quote && targetText) {
      startIndex = targetText.indexOf(ev.quote);
      if (startIndex !== -1) {
        endIndex = startIndex + ev.quote.length;
      } else {
        const fuzzy = findFuzzyMatch(targetText, ev.quote, threshold);
        if (fuzzy) {
          startIndex = fuzzy.start;
          endIndex = fuzzy.end;
        }
      }
    }

    const aiType = VALID_TYPES.includes(ev.type) ? ev.type : 'verify';
    const aiImpact = typeof ev.scoreImpact === 'number' ? ev.scoreImpact : defaultImpact(aiType);
    const matched = startIndex !== -1;

    return {
      id: ev.id || `ev_${idx + 1}`,
      quote: ev.quote || '',
      startIndex,
      endIndex,
      matched,
      type: matched ? aiType : 'verify',
      originalType: aiType,
      competencyId: ev.competencyId || 'problem_solving',
      scoreImpact: matched ? aiImpact : 0,
      title: ev.title || '근거 항목',
      explanation: matched
        ? (ev.explanation || '')
        : `원문에서 이 문장을 찾지 못했습니다. AI가 만든 문장일 수 있어 점수에 반영하지 않고 면접 확인 항목으로 전환했습니다.${ev.explanation ? ` (AI 설명: ${ev.explanation})` : ''}`
    };
  });
}
