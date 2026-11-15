import { describe, it, expect } from 'vitest';
import { extractQuestionKeywords, groupQuestionsByKeyword } from './questionTagging';

describe('questionTagging', () => {
  it('질문과 의도에서 도메인 키워드 태그를 자동 추출한다', () => {
    const tags = extractQuestionKeywords({
      category: '기술 역량',
      question: 'Redis 캐시 도입 시 트래픽 병목을 어떻게 해결했나요?',
      intent: '성능 최적화 경험 확인'
    });
    expect(tags).toContain('기술 역량');
    expect(tags).toContain('성능·트래픽');
    expect(tags).toContain('문제해결');
  });

  it('키워드 태그별로 면접 질문을 묶고 빈도순으로 정렬한다', () => {
    const groups = groupQuestionsByKeyword([
      { category: '기술', question: 'Redis 장애 대응 경험', intent: '' },
      { category: '협업', question: '팀 코드 리뷰 갈등 해결', intent: '' },
      { category: '기술', question: 'Kafka 성능 최적화', intent: '' }
    ]);
    expect(groups[0].tag).toBe('기술');
    expect(groups[0].count).toBe(2);
    expect(groups.some((g) => g.tag === '협업·소통')).toBe(true);
  });
});
