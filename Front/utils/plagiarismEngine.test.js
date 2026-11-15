import { describe, it, expect } from 'vitest';
import {
  calculateNGramSimilarity,
  calculatePlagiarismPercentage,
  generatePlagiarismMatrix
} from './plagiarismEngine';

describe('Cover Letter Mutual Plagiarism Engine', () => {
  it('동일한 자소서 텍스트는 100% 표절율을 반환해야 함', () => {
    const text = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 단축했습니다.';
    const percentage = calculatePlagiarismPercentage(text, text);
    expect(percentage).toBe(100);
  });

  it('전혀 다른 자소서 텍스트는 15% 미만의 낮은 표절율을 반환해야 함', () => {
    const text1 = 'Redis 캐싱 기법을 도입하여 백엔드 응답 속도를 86.6% 개선하고 트래픽 처리량을 증대시켰습니다.';
    const text2 = '소비자 행동 데이터를 기반으로 SNS 마케팅 캠페인을 전개하여 신규 매출을 300% 창출했습니다.';

    const percentage = calculatePlagiarismPercentage(text1, text2);
    expect(percentage).toBeLessThan(15);
  });

  it('문장을 상당수 복사-붙여넣기 한 표절 사례는 40% 이상의 고위험(isHighRisk)으로 감지해야 함', () => {
    const text1 = '대용량 트래픽 환경에서 Redis 캐싱 기법을 도입하여 서버 응답 속도를 0.4초로 86% 단축했습니다. 또한 데이터베이스 인덱스를 재설계하여 처리량을 늘렸습니다.';
    const text2 = '대용량 트래픽 환경에서 Redis 캐싱 기법을 도입하여 서버 응답 속도를 0.4초로 86% 단축했습니다. 추가로 데이터베이스 인덱스를 조정했습니다.';

    const percentage = calculatePlagiarismPercentage(text1, text2);
    expect(percentage).toBeGreaterThanOrEqual(40);
  });

  it('generatePlagiarismMatrix가 대각선 100% 및 대칭 매트릭스를 생성해야 함', () => {
    const applicants = [
      { id: '1', name: '김민준', rawText: 'Redis 캐싱 도입 0.4초 단축' },
      { id: '2', name: '이서연', rawText: '마케팅 캠페인 매출 증대' }
    ];

    const matrix = generatePlagiarismMatrix(applicants);
    expect(matrix.length).toBe(2);
    expect(matrix[0][0].plagiarismRate).toBe(100);
    expect(matrix[1][1].plagiarismRate).toBe(100);
    expect(matrix[0][1].plagiarismRate).toBe(matrix[1][0].plagiarismRate);
  });
});
