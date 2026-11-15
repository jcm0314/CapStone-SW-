import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  fetchSpringApplicants,
  mergeSpringApplicants,
  syncApplicantsToSpring,
  toFrontendApplicant
} from './springApplicantService';

const TENANT_UUID = '11111111-1111-1111-1111-111111111111';

const ok = (data, status = 200) => ({
  ok: true,
  status,
  text: () => Promise.resolve(JSON.stringify({ success: true, data }))
});
const fail = (status, code) => ({
  ok: false,
  status,
  text: () => Promise.resolve(JSON.stringify({ success: false, error: { code, message: code } }))
});

const loginOk = () => ok({ accessToken: 'jwt-1', expiresIn: 3600, user: { tenantId: TENANT_UUID } });

const evaluated = {
  id: 'app_1',
  name: '김지원',
  applyJobId: 'tech_backend',
  applyJobTitle: '백엔드 소프트웨어 엔지니어',
  rawText: '대규모 결제 트래픽 튜닝 경험',
  analysis: { summary: { totalScore: 88.4, decision: 'STRONG_PASS' } }
};

describe('springApplicantService (지원자 Spring 동기화)', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubEnv('VITE_SPRING_API_URL', 'http://localhost:8081');
    vi.stubEnv('VITE_SPRING_DEV_PASSWORD', 'checkmate1234!');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('VITE_SPRING_API_URL 이 없으면 아무 요청도 보내지 않는다 (기존 localStorage 동작 유지)', async () => {
    vi.stubEnv('VITE_SPRING_API_URL', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await syncApplicantsToSpring('toss-payments', [evaluated])).toBe(0);
    expect(await fetchSpringApplicants('toss-payments')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('개발용 로그인 후 토큰의 tenantId 경로로 등록하고 점수를 COMPLETED 로 기록한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(ok({ id: 'spring-1' }, 201))
      .mockResolvedValueOnce(ok({ id: 'spring-1', status: 'COMPLETED' }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await syncApplicantsToSpring('toss-payments', [evaluated])).toBe(1);

    const [loginUrl, loginInit] = fetchMock.mock.calls[0];
    expect(loginUrl).toBe('http://localhost:8081/api/v1/auth/login');
    expect(JSON.parse(loginInit.body).email).toBe('recruiter@toss.test');

    const [createUrl, createInit] = fetchMock.mock.calls[1];
    expect(createUrl).toBe(`http://localhost:8081/api/v1/tenants/${TENANT_UUID}/applicants`);
    expect(createInit.headers.Authorization).toBe('Bearer jwt-1');
    expect(JSON.parse(createInit.body)).toMatchObject({
      name: '김지원',
      targetRole: '백엔드 소프트웨어 엔지니어',
      coverLetterText: '대규모 결제 트래픽 튜닝 경험'
    });

    const [statusUrl, statusInit] = fetchMock.mock.calls[2];
    expect(statusUrl).toBe(`http://localhost:8081/api/v1/tenants/${TENANT_UUID}/applicants/spring-1/status`);
    expect(JSON.parse(statusInit.body)).toEqual({ status: 'COMPLETED', finalScore: 88, passRecommendation: true });
  });

  it('이미 등록한 지원자는 다시 보내지 않는다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(ok({ id: 'spring-1' }, 201))
      .mockResolvedValueOnce(ok({}));
    vi.stubGlobal('fetch', fetchMock);

    await syncApplicantsToSpring('toss-payments', [evaluated]);
    expect(await syncApplicantsToSpring('toss-payments', [evaluated])).toBe(0);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('대응 시드 계정이 없는 테넌트(woowa)는 동기화하지 않는다', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    expect(await syncApplicantsToSpring('woowa', [evaluated])).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('401 이면 세션을 버리고 재로그인 후 한 번 재시도한다', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(fail(401, 'UNAUTHORIZED'))
      .mockResolvedValueOnce(loginOk())
      .mockResolvedValueOnce(ok([]));
    vi.stubGlobal('fetch', fetchMock);

    expect(await fetchSpringApplicants('daangn')).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).email).toBe('recruiter@daangn.test');
  });

  it('서버에만 있는 지원자를 최소 분석 형태로 목록에 덧붙이고, 이미 아는 지원자는 건너뛴다', () => {
    const springList = [
      { id: 'spring-1', name: '서버 지원자', targetRole: '백엔드', coverLetterText: '원문', status: 'COMPLETED', finalScore: 81, passRecommendation: true },
      { id: 'spring-2', name: '로컬과 같은 지원자', targetRole: '백엔드', coverLetterText: '원문', status: 'PENDING' }
    ];
    const local = [{ ...evaluated, springApplicantId: 'spring-2' }];

    const merged = mergeSpringApplicants(local, springList, 'toss-payments');
    expect(merged).toHaveLength(2);
    expect(merged[1]).toMatchObject({
      id: 'spring_spring-1',
      springApplicantId: 'spring-1',
      source: 'SPRING',
      orgId: 'toss-payments',
      rawText: '원문',
      analysis: { summary: { totalScore: 81, decision: 'INTERVIEW' }, groundingEvidences: [], interviewQuestions: [] }
    });
    expect(mergeSpringApplicants(local, [], 'toss-payments')).toBe(local);
  });

  it('점수 없는 서버 지원자는 0점/HOLD 로 표시한다', () => {
    const app = toFrontendApplicant({ id: 'x', name: 'n', targetRole: 'r', status: 'PENDING' }, 'daangn');
    expect(app.analysis.summary).toMatchObject({ totalScore: 0, decision: 'HOLD' });
    expect(app.rawText).toBe('');
  });
});
