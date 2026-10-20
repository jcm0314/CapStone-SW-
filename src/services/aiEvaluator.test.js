import { describe, it, expect, vi } from 'vitest';
import { analyzeApplicant } from './aiEvaluator';
import { JOB_TEMPLATES } from '../data/jobTemplates';

describe('AI Grounding Evaluator Core Engine (Gemini API Only)', () => {
  it('JOB_TEMPLATES 데이터가 정상 탑재되어야 함', () => {
    expect(JOB_TEMPLATES.length).toBeGreaterThan(0);
    const techBackend = JOB_TEMPLATES.find(j => j.id === 'tech_backend');
    expect(techBackend).toBeDefined();
    expect(techBackend?.competencies.length).toBe(5);
  });

  it('API Key 미입력 시 B2B 엔터프라이즈 게이트웨이로 라우팅되며 실패 시 안내 에러를 발생시켜야 함', async () => {
    const candidateData = {
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText: '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
      apiKey: ''
    };

    // 클라이언트 API 키가 없으면 B2B 일괄 결제 게이트웨이로 자동 분기되며,
    // 로컬 mock 서버가 없거나 실패 시 명확한 B2B 게이트웨이 안내 에러를 던짐
    await expect(analyzeApplicant(candidateData)).rejects.toThrow(
      /B2B 게이트웨이 평가 실패/
    );
  }, 15000);
});
