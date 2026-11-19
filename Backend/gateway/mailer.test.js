// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import http from 'http';
import app from './index.js';
import { validateMailRequest, sendMail, isMailConfigured, __setMailFetchForTests, MAIL_LIMITS } from './mailer.js';

const ENV = { RESEND_API_KEY: 're_test_key', RESEND_FROM: 'Check-Mate <noreply@example.com>' };
const okReq = { to: 'applicant@example.com', subject: '서류 전형 결과 안내', text: '안녕하세요.\n결과를 안내드립니다.' };

describe('validateMailRequest', () => {
  it('정상 요청은 정리된 값을 돌려준다', () => {
    expect(validateMailRequest({ ...okReq, to: ' applicant@example.com ' }).value.to).toBe('applicant@example.com');
  });

  it.each([
    [{ ...okReq, to: 'not-an-email' }, '이메일'],
    [{ ...okReq, to: 'a@example.com,b@example.com' }, '이메일'],
    [{ ...okReq, subject: '' }, '제목'],
    [{ ...okReq, subject: '제목\nBcc: x@example.com' }, '줄바꿈'],
    [{ ...okReq, subject: 'a'.repeat(MAIL_LIMITS.subject + 1) }, '제목'],
    [{ ...okReq, text: '' }, '본문'],
    [{ ...okReq, text: 'a'.repeat(MAIL_LIMITS.text + 1) }, '본문']
  ])('잘못된 요청 거부 %#', (body, word) => {
    expect(validateMailRequest(body).error).toContain(word);
  });
});

describe('sendMail', () => {
  afterEach(() => __setMailFetchForTests(null));

  it('키가 없으면 503 으로 거부하고 외부 호출을 하지 않는다', async () => {
    const fake = vi.fn();
    __setMailFetchForTests(fake);
    expect(isMailConfigured({})).toBe(false);
    await expect(sendMail(okReq, {})).rejects.toMatchObject({ status: 503 });
    expect(fake).not.toHaveBeenCalled();
  });

  it('Resend 에 받는 사람 1명, 텍스트 본문으로 보낸다', async () => {
    const fake = vi.fn(async () => ({ ok: true, json: async () => ({ id: 'email_123' }) }));
    __setMailFetchForTests(fake);
    await expect(sendMail(okReq, { ...ENV, RESEND_REPLY_TO: 'hr@example.com' })).resolves.toEqual({ id: 'email_123' });

    const [url, init] = fake.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer re_test_key');
    const payload = JSON.parse(init.body);
    expect(payload).toMatchObject({ from: ENV.RESEND_FROM, to: ['applicant@example.com'], subject: okReq.subject, text: okReq.text, reply_to: 'hr@example.com' });
    expect(payload.html).toBeUndefined();
  });

  it('Resend 오류 메시지를 한국어 에러로 전달한다', async () => {
    __setMailFetchForTests(async () => ({ ok: false, status: 403, json: async () => ({ message: 'domain is not verified' }) }));
    await expect(sendMail(okReq, ENV)).rejects.toThrow('domain is not verified');
  });
});

describe('POST /api/v1/notifications/email (MAIL_API_ENABLED=true 로 명시적으로 켠 경우)', () => {
  let server;
  let baseUrl;
  const saved = {};
  const ROUTE_ENV = { ...ENV, MAIL_API_ENABLED: 'true' };

  beforeAll(async () => {
    for (const k of Object.keys(ROUTE_ENV)) {
      saved[k] = process.env[k];
      process.env[k] = ROUTE_ENV[k];
    }
    __setMailFetchForTests(async () => ({ ok: true, json: async () => ({ id: 'email_route' }) }));
    await new Promise((resolve) => {
      server = http.createServer(app).listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    __setMailFetchForTests(null);
    for (const k of Object.keys(ROUTE_ENV)) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    await new Promise((resolve) => server.close(resolve));
  });

  const post = (body) =>
    fetch(`${baseUrl}/api/v1/notifications/email`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

  it('상태 API 가 발송 가능 여부를 알려준다', async () => {
    const res = await fetch(`${baseUrl}/api/v1/notifications/status`);
    expect(await res.json()).toEqual({ emailEnabled: true });
  });

  it('정상 요청은 201 과 발송 ID 를 돌려준다', async () => {
    const res = await post(okReq);
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ success: true, id: 'email_route' });
  });

  it('잘못된 요청은 400', async () => {
    const res = await post({ ...okReq, to: 'nope' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('INVALID_MAIL_REQUEST');
  });
});
