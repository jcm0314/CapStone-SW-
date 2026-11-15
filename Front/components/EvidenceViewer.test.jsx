import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import EvidenceViewer from './EvidenceViewer';
import * as fuzzyMatcher from '../utils/fuzzyMatcher';

describe('EvidenceViewer Memoization & Overlap Prevention (#39)', () => {
  const sampleRawText = 'Redis 캐싱을 도입하여 API 응답 속도를 86.8% 단축시켰습니다. 이후 안정적인 운영을 이어갔습니다.';

  it('중첩(Overlapping)된 인용 구간이 주어져도 본문 텍스트가 중복 출력되거나 깨지지 않아야 함', () => {
    const mockResult = {
      id: 'app_overlap_test',
      name: '테스트',
      rawText: sampleRawText,
      analysis: {
        groundingEvidences: [
          {
            id: 'ev_outer',
            quote: 'Redis 캐싱을 도입하여 API 응답 속도를 86.8% 단축시켰습니다.',
            type: 'positive',
            scoreImpact: 15,
            title: '전체 성과 문장',
            explanation: '외부 문장'
          },
          {
            id: 'ev_inner',
            quote: 'API 응답 속도를 86.8% 단축',
            type: 'verify',
            scoreImpact: 0,
            title: '부분 중첩 문장',
            explanation: '내부 중첩 문장'
          }
        ]
      }
    };

    const { container } = render(<EvidenceViewer result={mockResult} />);
    const marks = container.querySelectorAll('mark');
    // 중첩된 두 번째 구간은 스킵되어 1개의 mark만 렌더링되고 본문이 중복되지 않아야 함
    expect(marks.length).toBe(1);
    expect(container.textContent).toContain('이후 안정적인 운영을 이어갔습니다.');
  });

  it('사전 계산된 startIndex/endIndex가 있으면 마우스 호버 시 findFuzzyMatch를 재호출하지 않아야 함', () => {
    const spyFuzzy = vi.spyOn(fuzzyMatcher, 'findFuzzyMatch');

    const quote = 'Redis 캐싱을 도입하여 API 응답 속도를 86.8% 단축시켰습니다.';
    const startIndex = sampleRawText.indexOf(quote);
    const endIndex = startIndex + quote.length;

    const mockResult = {
      id: 'app_memo_test',
      name: '테스트',
      rawText: sampleRawText,
      analysis: {
        groundingEvidences: [
          {
            id: 'ev_precomputed',
            quote,
            startIndex,
            endIndex,
            type: 'positive',
            scoreImpact: 15,
            title: '사전 인덱싱 문장',
            explanation: '호버 시 재연산 방지 검증'
          }
        ]
      }
    };

    const { container } = render(<EvidenceViewer result={mockResult} />);
    expect(spyFuzzy).not.toHaveBeenCalled();

    const markEl = container.querySelector('mark');
    fireEvent.mouseEnter(markEl);
    fireEvent.click(markEl);
    expect(spyFuzzy).not.toHaveBeenCalled();

    spyFuzzy.mockRestore();
  });
});
