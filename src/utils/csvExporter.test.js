import { describe, it, expect } from 'vitest';
import { generateApplicantsCSV } from './csvExporter';

describe('CSV & Excel Bulk Exporter Engine', () => {
  it('지원자 평가 데이터를 UTF-8 BOM CSV 포맷으로 정확히 변환해야 함', () => {
    const mockApplicants = [
      {
        name: '김민준',
        applyJobTitle: '백엔드 엔지니어',
        analysis: {
          summary: {
            totalScore: 88,
            decision: 'STRONG_PASS',
            decisionReason: '수치 기반 성과 우수',
            aiTextProbability: 12
          },
          competencyScores: {
            problem_solving: 90,
            tech_skill: 88,
            teamwork: 85,
            growth: 85,
            ethics: 90
          },
          groundingEvidences: [
            { type: 'positive' },
            { type: 'risk' }
          ]
        }
      }
    ];

    const csvOutput = generateApplicantsCSV(mockApplicants);

    // Should start with UTF-8 BOM
    expect(csvOutput.startsWith('\uFEFF')).toBe(true);
    expect(csvOutput).toContain('지원자 성명');
    expect(csvOutput).toContain('"김민준"');
    expect(csvOutput).toContain('"합격 우수"');
    expect(csvOutput).toContain('88');
    expect(csvOutput).toContain('12%');
  });
});
