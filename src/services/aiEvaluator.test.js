import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeApplicant } from './aiEvaluator';
import { JOB_TEMPLATES } from '../data/jobTemplates';

describe('AI Grounding Evaluator Core Engine (Gemini API Only)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('JOB_TEMPLATES 데이터가 정상 탑재되어야 함', () => {
    expect(JOB_TEMPLATES.length).toBeGreaterThan(0);
    const techBackend = JOB_TEMPLATES.find(j => j.id === 'tech_backend');
    expect(techBackend).toBeDefined();
    expect(techBackend?.competencies.length).toBe(5);
  });

  it('API Key 미입력 시 B2B 엔터프라이즈 게이트웨이로 라우팅되며 실패 시 안내 에러를 발생시켜야 함', async () => {
    // 게이트웨이 통신 실패를 명시적으로 모킹 (실제 네트워크에 의존하지 않음)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network offline (mocked)')));

    const candidateData = {
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText: '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
      apiKey: ''
    };

    await expect(analyzeApplicant(candidateData)).rejects.toThrow(
      /B2B 게이트웨이 평가 실패/
    );
  });

  it('B2B 게이트웨이 성공 시 PII 마스킹된 본문만 전송하고 원문/모드 메타데이터를 복원해야 함', async () => {
    const rawText = '연락처 minjun@test.com 입니다. Kafka 파이프라인 지연 시간을 120ms에서 30ms로 단축했습니다.';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'app_gw_1',
        name: '이서윤',
        applyJobId: 'tech_backend',
        analysis: {
          summary: { totalScore: 84, decision: 'INTERVIEW', decisionReason: 'ok', aiTextProbability: 10 },
          competencyScores: { problem_solving: 80, tech_skill: 85, teamwork: 80, growth: 80, ethics: 80 },
          groundingEvidences: [],
          interviewQuestions: []
        }
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await analyzeApplicant({ name: '이서윤', applyJobId: 'tech_backend', rawText, apiKey: '' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/v1/evaluate');
    const sentBody = JSON.parse(init.body);
    expect(sentBody.rawText).not.toContain('minjun@test.com');
    expect(sentBody.rawText).toContain('[이메일 익명화]');

    expect(result.mode).toBe('B2B_MANAGED_TOKEN');
    expect(result.rawText).toBe(rawText);
    expect(result.analysis.summary.totalScore).toBe(84);
  });
});
