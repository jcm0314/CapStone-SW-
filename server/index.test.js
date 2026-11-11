// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import http from 'http';
import app from './index.js';

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
});
