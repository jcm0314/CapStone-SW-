const KEYWORD_RULES = [
  { tag: '아키텍처·설계', pattern: /아키텍처|설계|MSA|분산|시스템|구조|확장/i },
  { tag: '성능·트래픽', pattern: /트래픽|성능|병목|최적화|캐시|Redis|Kafka|지연|TPS/i },
  { tag: '문제해결', pattern: /장애|오류|원인|해결|디버깅|트러블슈팅|개선|대응/i },
  { tag: '협업·소통', pattern: /협업|소통|갈등|팀|리뷰|조율|커뮤니케이션|설득/i },
  { tag: '성과·지표', pattern: /성과|매출|ROAS|CAC|LTV|지표|수치|검증|퍼널|전환/i },
  { tag: '기술깊이', pattern: /DB|SQL|인덱스|쿼리|알고리즘|보안|테스트|CI\/CD|API/i },
  { tag: '책임감·컬처핏', pattern: /책임|실패|윤리|문화|가치관|동기|포부|주도/i }
];

/**
 * 개별 면접 질문에서 키워드 태그 배열을 추출한다.
 */
export function extractQuestionKeywords(iq = {}) {
  const tags = new Set();

  if (Array.isArray(iq.keywords)) {
    iq.keywords.forEach((k) => {
      const cleaned = String(k || '').replace(/^#/, '').trim();
      if (cleaned) tags.add(cleaned);
    });
  }

  if (iq.category) {
    const cat = String(iq.category).trim();
    if (cat) tags.add(cat);
  }

  const corpus = [iq.question, iq.intent, iq.basedQuote].filter(Boolean).join(' ');
  KEYWORD_RULES.forEach((rule) => {
    if (rule.pattern.test(corpus)) {
      tags.add(rule.tag);
    }
  });

  if (tags.size === 0) tags.add('일반');
  return Array.from(tags);
}

/**
 * 면접 질문 배열을 키워드 태그별로 묶어 반환한다.
 */
export function groupQuestionsByKeyword(interviewQuestions = []) {
  const counts = new Map();
  const groups = new Map();

  interviewQuestions.forEach((iq, idx) => {
    const tags = extractQuestionKeywords(iq);
    const enriched = { ...iq, _tags: tags, _origIndex: idx };
    tags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag).push(enriched);
    });
  });

  const sortedTags = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag, count]) => ({ tag, count, questions: groups.get(tag) }));

  return sortedTags;
}
