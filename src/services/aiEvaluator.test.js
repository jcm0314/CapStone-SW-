import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { analyzeApplicant, buildEvaluationCacheScope } from './aiEvaluator';
import { JOB_TEMPLATES } from '../data/jobTemplates';
import { saveCompanyPromptSettings } from './promptStudioService';

describe('AI Grounding Evaluator (서버 게이트웨이 전용, 브라우저 API 키 없음)', () => {
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

  it('게이트웨이에 연결할 수 없으면 한국어 안내 에러를 발생시켜야 함', async () => {
    // 게이트웨이 통신 실패를 명시적으로 모킹 (실제 네트워크에 의존하지 않음)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network offline (mocked)')));

    const candidateData = {
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText: '응답 속도가 3초로 느린 문제를 발견하고 Redis 캐싱 기법을 도입하여 0.4초로 86.6% 단축시켰습니다.',
    };

    await expect(analyzeApplicant(candidateData)).rejects.toThrow(
      /평가 서버.*연결할 수 없습니다/
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

    const result = await analyzeApplicant({ name: '이서윤', applyJobId: 'tech_backend', rawText });

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

  it('서버에 키가 없으면(503) 서버의 한국어 메시지를 그대로 보여주고, 요청에 API 키를 싣지 않아야 함', async () => {
    localStorage.setItem('gemini_api_key', 'legacy-browser-key-should-be-ignored');
    saveCompanyPromptSettings({ companyName: '테스트전자' });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({
        error: 'SERVER_API_KEY_NOT_CONFIGURED',
        message: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 게이트웨이 실행 환경(.env)에 키를 설정한 뒤 서버를 재시작하세요.'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(analyzeApplicant({ name: '김민준', applyJobId: 'tech_backend', rawText: '본문 텍스트입니다.', tenantId: 'daangn' }))
      .rejects.toThrow('서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다');

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.stringify(init)).not.toContain('legacy-browser-key-should-be-ignored');
    expect(init.headers['X-Tenant-Id']).toBe('daangn');
    expect(JSON.parse(init.body).promptSettings.companyName).toBe('테스트전자');
  });
});

describe('buildEvaluationCacheScope (캐시 키 범위)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('명시적 tenantId, 직무 가중치, Prompt Studio addendum을 모두 포함해야 함', () => {
    const job = JOB_TEMPLATES.find(j => j.id === 'tech_backend');
    const scope = buildEvaluationCacheScope(job, 'daangn');

    expect(scope.tenantId).toBe('daangn');
    expect(scope.competencies).toEqual(job.competencies.map(c => ({ id: c.id, weight: c.weight })));
    expect(scope.promptAddendum).toBe('');
  });

  it('tenantId 미지정 시 TenantContext가 저장한 테넌트를 쓰고, Prompt Studio 저장 내용이 반영되어야 함', () => {
    localStorage.setItem('checkmate_current_tenant_id', 'toss-payments');
    saveCompanyPromptSettings({ coreValues: ['고객 집착'] });

    const scope = buildEvaluationCacheScope(JOB_TEMPLATES[0]);
    expect(scope.tenantId).toBe('toss-payments');
    expect(scope.promptAddendum).toContain('고객 집착');
  });
});
