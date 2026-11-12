import { describe, it, expect } from 'vitest';
import { validateProductionBuildEnv } from './checkBuildEnv.js';

describe('validateProductionBuildEnv (production 빌드 필수 env 검사)', () => {
  it('VITE_API_GATEWAY_URL 이 없거나 공백이면 한국어 안내와 함께 실패한다', () => {
    expect(() => validateProductionBuildEnv({})).toThrow(/VITE_API_GATEWAY_URL 이 설정되지 않았습니다/);
    expect(() => validateProductionBuildEnv({ VITE_API_GATEWAY_URL: '   ' })).toThrow(/docs\/DEPLOY\.md/);
  });

  it('URL 형식이 아니거나 http(s) 가 아니면 실패한다', () => {
    expect(() => validateProductionBuildEnv({ VITE_API_GATEWAY_URL: 'gateway-host' })).toThrow(/올바른 URL/);
    expect(() => validateProductionBuildEnv({ VITE_API_GATEWAY_URL: 'ftp://gateway' })).toThrow(/http\(s\)/);
  });

  it('올바른 https 주소면 통과한다', () => {
    expect(validateProductionBuildEnv({ VITE_API_GATEWAY_URL: 'https://gw.example.run.app' })).toBe('https://gw.example.run.app');
  });
});
