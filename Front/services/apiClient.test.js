import { describe, it, expect, afterEach, vi } from 'vitest';
import { ApiError, apiRequest, getSpringApiUrl, isSpringApiEnabled, login } from './apiClient';

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: () => Promise.resolve(body === undefined ? '' : JSON.stringify(body))
});

describe('apiClient (Spring 코어 API)', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('VITE_SPRING_API_URL 이 없으면 비활성화되고 호출 시 SPRING_API_DISABLED 에러', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', '');
    expect(isSpringApiEnabled()).toBe(false);
    await expect(apiRequest('/api/v1/health')).rejects.toMatchObject({ code: 'SPRING_API_DISABLED' });
  });

  it('끝의 슬래시를 제거한 base URL 에 Bearer 토큰과 JSON 본문을 붙여 호출하고 data 를 반환한다', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081/');
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { success: true, data: { id: 'a1' } }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await apiRequest('/api/v1/tenants/t1/applicants', {
      method: 'POST',
      token: 'jwt-token',
      body: { name: '김지원' }
    });

    expect(getSpringApiUrl()).toBe('http://localhost:8081');
    expect(data).toEqual({ id: 'a1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://localhost:8081/api/v1/tenants/t1/applicants');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer jwt-token');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body)).toEqual({ name: '김지원' });
  });

  it('Spring 에러 응답의 code/message/status 를 ApiError 로 전달한다', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      jsonResponse(404, { success: false, error: { code: 'ENTITY_NOT_FOUND', message: '요청한 리소스를 찾을 수 없습니다.' } })
    ));

    const err = await apiRequest('/api/v1/tenants/other/applicants').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(404);
    expect(err.code).toBe('ENTITY_NOT_FOUND');
    expect(err.message).toBe('요청한 리소스를 찾을 수 없습니다.');
  });

  it('HTML(index.html) 같은 비 JSON 응답은 NON_JSON_RESPONSE 로 알려준다', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: () => Promise.resolve('<!doctype html><html></html>')
    }));

    await expect(apiRequest('/api/v1/health')).rejects.toMatchObject({ code: 'NON_JSON_RESPONSE', status: 200 });
  });

  it('네트워크 오류는 NETWORK_ERROR', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

    await expect(apiRequest('/api/v1/health')).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('login 은 /api/v1/auth/login 에 이메일·비밀번호를 POST 한다', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081');
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { success: true, data: { accessToken: 'tok', expiresIn: 3600, user: { tenantId: 't1' } } })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await login('recruiter@toss.test', 'pw');
    expect(result.accessToken).toBe('tok');
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8081/api/v1/auth/login');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
  });
});
