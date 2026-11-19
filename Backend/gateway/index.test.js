// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import http from 'http';
import app, { buildPromptAddendumFromSettings, EVALUATE_LIMITS, isMailApiEnabled, isShareApiEnabled } from './index.js';
import { __setClaudeClientForTests, createClaudeClient } from '../../Front/services/agents/claudeClient.js';

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

  describe('Share API 기본값 꺼짐 (무인증 공유 저장소 노출 방지)', () => {
    it('SHARE_API_ENABLED 가 없으면 생성·조회·메모가 모두 503 SHARES_DISABLED 여야 한다', async () => {
      const saved = process.env.SHARE_API_ENABLED;
      delete process.env.SHARE_API_ENABLED;
      try {
        const responses = await Promise.all([
          fetch(`${baseUrl}/api/v1/shares`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shareId: 'eval_disabled_check', applicantSnapshot: {} })
          }),
          fetch(`${baseUrl}/api/v1/shares/eval_disabled_check`),
          fetch(`${baseUrl}/api/v1/shares/eval_disabled_check/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: 'x' })
          })
        ]);
        for (const res of responses) {
          expect(res.status).toBe(503);
          expect((await res.json()).error).toBe('SHARES_DISABLED');
        }
      } finally {
        if (saved === undefined) delete process.env.SHARE_API_ENABLED;
        else process.env.SHARE_API_ENABLED = saved;
      }
    });

    it('isShareApiEnabled: 명시적으로 true 일 때만 켜져야 한다', () => {
      expect(isShareApiEnabled({})).toBe(false);
      expect(isShareApiEnabled({ SHARE_API_ENABLED: 'false' })).toBe(false);
      expect(isShareApiEnabled({ SHARE_API_ENABLED: 'true' })).toBe(true);
    });
  });

  describe('Multi-Interviewer Share & Collaboration API (SHARE_API_ENABLED=true)', () => {
    let savedShareFlag;
    beforeAll(() => {
      savedShareFlag = process.env.SHARE_API_ENABLED;
      process.env.SHARE_API_ENABLED = 'true';
    });
    afterAll(() => {
      if (savedShareFlag === undefined) delete process.env.SHARE_API_ENABLED;
      else process.env.SHARE_API_ENABLED = savedShareFlag;
    });

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

    const postShare = (body) => fetch(`${baseUrl}/api/v1/shares`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    it('POST /api/v1/shares: 이미 있는 shareId 는 덮어쓰지 않고 409 여야 한다', async () => {
      const res = await postShare({
        ...sampleSharePayload,
        applicantSnapshot: { ...sampleSharePayload.applicantSnapshot, name: '덮어쓰기 시도' }
      });
      expect(res.status).toBe(409);
      expect((await res.json()).error).toBe('SHARE_ID_TAKEN');

      const stored = await (await fetch(`${baseUrl}/api/v1/shares/eval_unit_test_999`)).json();
      expect(stored.applicantSnapshot.name).toBe('정지훈');
    });

    it('POST /api/v1/shares: 형식이 잘못된 shareId 는 400 이어야 한다', async () => {
      const res = await postShare({ ...sampleSharePayload, shareId: '../etc/passwd' });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe('INVALID_SHARE_ID');
    });

    it('POST /api/v1/shares: 만료 시간은 최대 168시간으로 제한돼야 한다', async () => {
      const before = Date.now();
      const res = await postShare({ ...sampleSharePayload, shareId: 'eval_ttl_cap_check', expiresHours: 24 * 365 * 100 });
      expect(res.status).toBe(201);
      const { expiresAt } = await res.json();
      const hours = (new Date(expiresAt).getTime() - before) / 3_600_000;
      expect(hours).toBeLessThanOrEqual(168.01);
      expect(hours).toBeGreaterThan(167.9);
    });

    it('POST /api/v1/shares/:shareId/notes: 점수 보정은 ±20, 메모 길이는 2000자로 제한돼야 한다', async () => {
      const clamped = await fetch(`${baseUrl}/api/v1/shares/eval_unit_test_999/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '과도한 보정 시도', scoreAdjustment: 999, role: 'ADMIN' })
      });
      expect(clamped.status).toBe(200);
      const { note } = await clamped.json();
      expect(note.scoreAdjustment).toBe(20);
      expect(note.role).toBe('INTERVIEWER');

      const tooLong = await fetch(`${baseUrl}/api/v1/shares/eval_unit_test_999/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'a'.repeat(2001) })
      });
      expect(tooLong.status).toBe(400);
      expect((await tooLong.json()).error).toBe('NOTE_TOO_LONG');
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

    describe('입력 상한 (AI 호출 비용 상한)', () => {
      it(`본문이 ${EVALUATE_LIMITS.rawTextChars}자를 넘으면 Claude 를 호출하지 않고 413 RAW_TEXT_TOO_LONG 이어야 한다`, async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
        const create = vi.fn();
        __setClaudeClientForTests({ beta: { messages: { create } } });

        const res = await post({ ...sampleBody, rawText: '가'.repeat(EVALUATE_LIMITS.rawTextChars + 1) });
        expect(res.status).toBe(413);
        expect((await res.json()).error).toBe('RAW_TEXT_TOO_LONG');
        expect(create).not.toHaveBeenCalled();
      });

      it('문자열이 아닌 본문은 400 INVALID_PARAMETERS 여야 한다', async () => {
        process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
        const res = await post({ ...sampleBody, rawText: { injected: true } });
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('INVALID_PARAMETERS');
      });

      it('1MB 를 넘는 요청 본문은 HTML 이 아니라 JSON 413 PAYLOAD_TOO_LARGE 여야 한다', async () => {
        const res = await post({ ...sampleBody, rawText: 'a'.repeat(1_100_000) });
        expect(res.status).toBe(413);
        expect(res.headers.get('content-type')).toContain('application/json');
        expect((await res.json()).error).toBe('PAYLOAD_TOO_LARGE');
      });

      it('깨진 JSON 은 400 INVALID_JSON 이어야 한다', async () => {
        const res = await fetch(`${baseUrl}/api/v1/evaluate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{"name": "a", "rawText": '
        });
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe('INVALID_JSON');
      });
    });
  });

  describe('Mail API (기본값 꺼짐: 무인증 오픈 릴레이 방지)', () => {
    const MAIL_ENV_KEYS = ['MAIL_API_ENABLED', 'RESEND_API_KEY', 'RESEND_FROM'];
    let savedEnv;

    beforeEach(() => {
      savedEnv = Object.fromEntries(MAIL_ENV_KEYS.map((k) => [k, process.env[k]]));
    });

    afterEach(() => {
      for (const k of MAIL_ENV_KEYS) {
        if (savedEnv[k] === undefined) delete process.env[k];
        else process.env[k] = savedEnv[k];
      }
    });

    const mailBody = { to: 'someone@example.com', subject: '안내', text: '본문' };
    const sendMailRequest = () => fetch(`${baseUrl}/api/v1/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mailBody)
    });

    it('Resend 키가 설정돼 있어도 MAIL_API_ENABLED 가 없으면 상태는 꺼짐이어야 한다', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_FROM = 'Check-Mate <noreply@example.com>';
      delete process.env.MAIL_API_ENABLED;

      const res = await fetch(`${baseUrl}/api/v1/notifications/status`);
      expect(res.status).toBe(200);
      expect((await res.json()).emailEnabled).toBe(false);
    });

    it('Resend 키가 설정돼 있어도 MAIL_API_ENABLED 가 없으면 발송 요청은 503 MAIL_DISABLED 여야 한다', async () => {
      process.env.RESEND_API_KEY = 'test-key';
      process.env.RESEND_FROM = 'Check-Mate <noreply@example.com>';
      delete process.env.MAIL_API_ENABLED;

      const res = await sendMailRequest();
      expect(res.status).toBe(503);
      expect((await res.json()).error).toBe('MAIL_DISABLED');
    });

    it('isMailApiEnabled: 명시적으로 켜고 Resend 설정이 있을 때만 true 여야 한다', () => {
      const configured = { RESEND_API_KEY: 'k', RESEND_FROM: 'f' };
      expect(isMailApiEnabled({ ...configured })).toBe(false);
      expect(isMailApiEnabled({ ...configured, MAIL_API_ENABLED: 'false' })).toBe(false);
      expect(isMailApiEnabled({ MAIL_API_ENABLED: 'true' })).toBe(false);
      expect(isMailApiEnabled({ ...configured, MAIL_API_ENABLED: 'true' })).toBe(true);
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
