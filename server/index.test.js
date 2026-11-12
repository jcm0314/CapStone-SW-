// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest';
import http from 'http';
import app, { buildPromptAddendumFromSettings } from './index.js';
import { __setClaudeClientForTests, createClaudeClient } from '../src/services/agents/claudeClient.js';

let server;
let baseUrl;

beforeAll(async () => {
  await new Promise((resolve) => {
    // Listen on dynamic available port
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

afterAll(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Check-Mate Express API Gateway Endpoints', () => {
  it('GET /health: 서버 헬스체크가 정상(UP)이어야 한다', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('UP');
    expect(body.service).toBe('hr-evaluator-api-gateway');
  });

  describe('Multi-Interviewer Share & Collaboration API', () => {
    const sampleSharePayload = {
      shareId: 'eval_unit_test_999',
      tenantId: 'toss-payments',
      createdBy: { name: '김서아 수석', role: 'RECRUITER' },
      expiresHours: 24,
      applicantSnapshot: {
        id: 'app_unit_01',
        name: '정지훈',
        rawText: '대규모 트래픽 분산 시스템 개발 경험',
        analysis: {
          summary: { totalScore: 92, decision: 'STRONG_PASS' }
        }
      }
    };

    it('POST /api/v1/shares: 스냅샷을 성공적으로 저장해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sampleSharePayload)
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.shareId).toBe('eval_unit_test_999');
    });

    it('GET /api/v1/shares/:shareId: 저장된 스냅샷을 정상 조회해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/eval_unit_test_999`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.applicantSnapshot.name).toBe('정지훈');
      expect(body.tenantId).toBe('toss-payments');
      expect(body.collaborativeNotes.length).toBeGreaterThan(0);
    });

    it('POST /api/v1/shares/:shareId/notes: 면접관 실시간 협업 코멘트를 추가해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/eval_unit_test_999/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: '박도현 팀장',
          role: 'INTERVIEWER',
          content: '분산 락 구현 질문에 명확하게 답변함.',
          scoreAdjustment: 5
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.note.author).toBe('박도현 팀장');
      expect(body.note.scoreAdjustment).toBe(5);
      expect(body.collaborativeNotes.length).toBeGreaterThan(1);
    });

    it('GET /api/v1/shares/:shareId: 존재하지 않는 shareId는 404를 반환해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/shares/eval_non_existent`);
      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error).toContain('찾을 수 없습니다');
    });
  });

  describe('Enterprise SSO & Multi-Tenancy API', () => {
    it('POST /api/v1/auth/sso-login & GET /api/v1/auth/verify: HMAC-SHA256 서명된 SSO 토큰을 발급하고 검증해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/sso-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'Google Workspace',
          targetRole: 'ADMIN',
          tenantId: 'toss-payments'
        })
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.token).toBeDefined();
      expect(body.token).toContain('.');
      expect(body.user.role).toBe('ADMIN');
      expect(body.user.tenantId).toBe('toss-payments');

      // 정상 서명 토큰 검증
      const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify`, {
        headers: { Authorization: `Bearer ${body.token}` }
      });
      expect(verifyRes.status).toBe(200);
      const verifyBody = await verifyRes.json();
      expect(verifyBody.valid).toBe(true);
      expect(verifyBody.user.tenantId).toBe('toss-payments');

      // 위변조 토큰 검증 거부
      const tamperedRes = await fetch(`${baseUrl}/api/v1/auth/verify`, {
        headers: { Authorization: `Bearer ${body.token}tampered` }
      });
      expect(tamperedRes.status).toBe(401);
    });

    it('GET /api/v1/tenants: 등록된 기업(테넌트) 목록을 반환해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/tenants`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tenants.length).toBe(3);
      expect(body.tenants.map(t => t.id)).toContain('toss-payments');
      expect(body.tenants.map(t => t.id)).toContain('daangn');
    });

    it('GET /api/v1/tenants/:tenantId/quota: 테넌트 크레딧 쿼터를 계산해야 한다', async () => {
      const res = await fetch(`${baseUrl}/api/v1/tenants/toss-payments/quota`);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.tenantId).toBe('toss-payments');
      expect(body.remainingCredit).toBe(420000); // 500k - 80k
      expect(body.isLocked).toBe(false);
    });
  });

  describe('POST /api/v1/evaluate (Claude 4-Agent, SDK 모킹 — 네트워크 없음)', () => {
    const savedKey = process.env.ANTHROPIC_API_KEY;
    const sampleBody = {
      name: '김민준',
      applyJobId: 'tech_backend',
      rawText: '연락처 minjun@test.com. Redis 캐싱을 도입하여 응답 시간을 3초에서 0.4초로 단축했습니다.'
    };

    afterEach(() => {
      __setClaudeClientForTests(null);
      if (savedKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = savedKey;
    });

    const post = (body, headers = {}) => fetch(`${baseUrl}/api/v1/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    });

    it('ANTHROPIC_API_KEY가 없으면 503과 한국어 안내 메시지를 반환해야 한다 (가짜 점수 없음)', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await post(sampleBody);
      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toBe('SERVER_API_KEY_NOT_CONFIGURED');
      expect(body.message).toContain('ANTHROPIC_API_KEY가 설정되지 않았습니다');
      expect(body.analysis).toBeUndefined();
    });

    it('4개 에이전트를 Claude로 실행하고, PII가 마스킹된 본문 + Prompt Studio 설정만 전송해야 한다', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
      const create = vi.fn(async (params) => {
        const prompt = params.messages[0].content;
        let data;
        if (prompt.includes('Grounding Agent"입니다')) {
          data = { groundingEvidences: [{ quote: 'Redis 캐싱을 도입하여 응답 시간을 3초에서 0.4초로 단축했습니다.', type: 'positive', competencyId: 'tech_skill', scoreImpact: 12, title: '정량 성과', explanation: 'e' }], agentSummary: 'ok' };
        } else if (prompt.includes('Critic Agent (비판적 검증관)')) {
          data = { aiTextProbability: 8, exaggerationRisk: 'LOW', critiqueNotes: 'ok', flaggedQuotes: [], recommendedPenalty: 0 };
        } else if (prompt.includes('Supervisor Agent (최종 의사결정')) {
          data = { summary: { totalScore: 86, decision: 'STRONG_PASS', decisionReason: 'r', aiTextProbability: 8 }, competencyScores: { problem_solving: 85, tech_skill: 90, teamwork: 80, growth: 82, ethics: 84 }, executiveComments: 'c' };
        } else {
          data = { interviewQuestions: [{ basedQuote: 'Redis 캐싱을 도입하여', category: '기술적 사실 검증', question: 'q', intent: 'i', checklist: ['a'] }] };
        }
        return { model: 'claude-opus-5-5', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(data) }], usage: {} };
      });
      __setClaudeClientForTests({ beta: { messages: { create } } });

      const res = await post({
        ...sampleBody,
        promptSettings: { companyName: '테스트전자', coreValues: ['고객 집착'], tabooWords: ['열정페이'], customInstruction: '정직성 검증', injected: 'ignored' }
      }, { 'X-Tenant-Id': 'daangn' });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.mode).toBe('BFF_MULTI_AGENT_GATEWAY');
      expect(body.modelUsed).toBe('claude-opus-5-5');
      expect(body.analysis.summary.totalScore).toBe(86);
      expect(body.analysis.groundingEvidences[0].startIndex).toBeGreaterThanOrEqual(0);
      expect(create).toHaveBeenCalledTimes(4);
      for (const [params] of create.mock.calls) {
        const prompt = params.messages[0].content;
        expect(prompt).not.toContain('minjun@test.com');
        expect(prompt).not.toContain('김민준');
        expect(prompt).toContain('테스트전자');
        expect(prompt).not.toContain('ignored');
        expect(params.output_config.format.type).toBe('json_schema');
      }
    });

    it('Claude 인증 실패 시 단일 프롬프트 재시도/가짜 점수 없이 502와 한국어 메시지를 반환해야 한다', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
      const fetchMock = vi.fn(async () => new Response(JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }), { status: 401, headers: { 'content-type': 'application/json' } }));
      __setClaudeClientForTests(createClaudeClient({ apiKey: 'bad', fetch: fetchMock }));

      const res = await post(sampleBody);
      expect(res.status).toBe(502);
      const body = await res.json();
      expect(body.error).toBe('ANTHROPIC_AUTH_FAILED');
      expect(body.message).toContain('인증에 실패');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildPromptAddendumFromSettings', () => {
    it('알려진 필드만 허용하고 길이/개수를 제한해야 한다', () => {
      const addendum = buildPromptAddendumFromSettings({
        companyName: 'A'.repeat(2000),
        coreValues: Array.from({ length: 50 }, (_, i) => `v${i}`),
        tabooWords: ['x'],
        customInstruction: 'ok'
      });
      expect(addendum).toContain('A'.repeat(500));
      expect(addendum).not.toContain('A'.repeat(501));
      expect(addendum).toContain('v19');
      expect(addendum).not.toContain('v20');
      expect(buildPromptAddendumFromSettings(null)).toBe('');
    });
  });
});
