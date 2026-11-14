import { describe, it, expect } from 'vitest';
import { extractContactEmail } from './contactExtractor';

describe('extractContactEmail', () => {
  it('본문의 첫 이메일을 소문자로 돌려준다', () => {
    expect(extractContactEmail('연락처: Hong.GilDong@Example.com / 보조 a@b.co')).toBe('hong.gildong@example.com');
  });

  it('이메일이 없거나 이미 마스킹됐으면 빈 문자열', () => {
    expect(extractContactEmail('[이메일 익명화] 로 연락 주세요')).toBe('');
    expect(extractContactEmail('')).toBe('');
    expect(extractContactEmail(undefined)).toBe('');
  });
});
