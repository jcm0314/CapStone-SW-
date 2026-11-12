import { describe, it, expect, afterEach, vi } from 'vitest';
import { getApiBaseUrl as evaluatorBaseUrl } from './aiEvaluator';
import { getApiBaseUrl as shareBaseUrl } from './shareService';

// #24: 게이트웨이 주소를 window.location.origin 으로 대체하지 않는다
describe.each([
  ['aiEvaluator', evaluatorBaseUrl],
  ['shareService', shareBaseUrl]
])('%s getApiBaseUrl', (_name, getApiBaseUrl) => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('VITE_API_GATEWAY_URL 이 있으면 그 값을 쓰고 끝 슬래시는 제거한다', () => {
    vi.stubEnv('VITE_API_GATEWAY_URL', 'https://gw.example.run.app/');
    expect(getApiBaseUrl()).toBe('https://gw.example.run.app');
  });

  it('개발/테스트에서 미설정이면 로컬 게이트웨이를 쓰고, 페이지 origin 으로 대체하지 않는다', () => {
    vi.stubEnv('VITE_API_GATEWAY_URL', '');
    const result = getApiBaseUrl();
    expect(result).toBe('http://127.0.0.1:3001');
    expect(result).not.toBe(window.location.origin);
  });

  it('production 빌드에서 미설정이면 분명한 오류를 던진다', () => {
    vi.stubEnv('VITE_API_GATEWAY_URL', '');
    vi.stubEnv('PROD', true);
    expect(() => getApiBaseUrl()).toThrow(/VITE_API_GATEWAY_URL/);
  });
});
