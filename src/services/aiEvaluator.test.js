import { describe, it, expect, vi } from 'vitest';
import { analyzeApplicant } from './aiEvaluator';
import { JOB_TEMPLATES } from '../data/jobTemplates';

// Mock workerService to isolate unit testing
vi.mock('./workerService', () => ({
  runWorkerEvaluation: vi.fn().mockImplementation(async ({ name, jobTemplate, rawText }) => ({
    id: 'test_app_1',
    name,
    applyJobId: jobTemplate.id,
    applyJobTitle: jobTemplate.title,
    rawText,
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
        {
          id: 'ev_1',
          quote: 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
          type: 'positive',
          competencyId: 'problem_solving',
          scoreImpact: 15,
          title: '수치 기반 성과 명확',
          explanation: '정량적 성과 서술됨'
        }
      ],
      interviewQuestions: [
        {
          id: 'iq_1',
          basedQuote: 'Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
          category: '직무 검증',
          question: 'Redis 도입 시 데이터 정합성은 어떻게 해결하였습니까?',
          intent: '기술 검증',
          checklist: ['Cache invalidation 경험 유무']
        }
      ]
    }
  }))
}));

describe('AI Grounding Evaluator Core Engine', () => {
  it('JOB_TEMPLATES 데이터가 정상 탑재되어야 함', () => {
    expect(JOB_TEMPLATES.length).toBeGreaterThan(0);
    const techBackend = JOB_TEMPLATES.find(j => j.id === 'tech_backend');
    expect(techBackend).toBeDefined();
    expect(techBackend?.competencies.length).toBe(5);
  });

  it('API Key 미입력 시 Web Worker Fallback 엔진이 호출되어 평가 결과를 반환해야 함', async () => {
    const candidateData = {
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText: '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
      apiKey: ''
    };

    const result = await analyzeApplicant(candidateData);

    expect(result).toBeDefined();
    expect(result.name).toBe('김민준');
    expect(result.analysis.summary.totalScore).toBe(88);
    expect(result.analysis.summary.decision).toBe('STRONG_PASS');
    expect(result.analysis.groundingEvidences.length).toBe(1);
    expect(result.analysis.groundingEvidences[0].type).toBe('positive');
  });

  it('평가 결과의 근거(quote)가 지원자 원문 텍스트 내 서브스트링으로 포함되어야 함', async () => {
    const rawText = '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.';
    const result = await analyzeApplicant({
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText,
      apiKey: ''
    });

    result.analysis.groundingEvidences.forEach(ev => {
      expect(rawText).toContain(ev.quote);
    });
  });
});
