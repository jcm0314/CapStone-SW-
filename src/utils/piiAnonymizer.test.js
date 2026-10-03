import { describe, it, expect } from 'vitest';
import { anonymizePII, hasPII } from './piiAnonymizer';

describe('Client-side PII Anonymizer Filter (Blind Recruitment)', () => {
  it('이메일 주소를 [이메일 익명화]로 마스킹해야 함', () => {
    const rawText = '문의사항은 minjun.kim@gmail.com으로 연락 부탁드립니다.';
    const result = anonymizePII(rawText);

    expect(result.anonymizedText).toContain('[이메일 익명화]');
    expect(result.anonymizedText).not.toContain('minjun.kim@gmail.com');
    expect(result.maskedCategories).toContain('이메일');
  });

  it('전화번호(010-XXXX-XXXX)를 [전화번호 익명화]로 마스킹해야 함', () => {
    const rawText = '연락처: 010-1234-5678 입니다.';
    const result = anonymizePII(rawText);

    expect(result.anonymizedText).toContain('[전화번호 익명화]');
    expect(result.anonymizedText).not.toContain('010-1234-5678');
    expect(result.maskedCategories).toContain('전화번호');
  });

  it('출신 학교명(대학교, 고등학교 등)을 [학교명 익명화]로 마스킹해야 함', () => {
    const rawText = '저는 서울대학교 컴퓨터공학과를 졸업하였으며, 대전고등학교 출신입니다.';
    const result = anonymizePII(rawText);

    expect(result.anonymizedText).toContain('[학교명 익명화]');
    expect(result.anonymizedText).not.toContain('서울대학교');
    expect(result.anonymizedText).not.toContain('대전고등학교');
    expect(result.maskedCategories).toContain('출신학교');
  });

  it('생년월일을 [생년월일 익명화]로 마스킹해야 함', () => {
    const rawText = '1998년 05월 12일 출생하여 군복무를 마쳤습니다.';
    const result = anonymizePII(rawText);

    expect(result.anonymizedText).toContain('[생년월일 익명화]');
    expect(result.maskedCategories).toContain('생년월일');
  });

  it('지원자 성명이 지정된 경우 본문 내 성명을 마스킹해야 함', () => {
    const rawText = '안녕하십니까, 지원자 김민준입니다. 김민준은 주도적인 개발자입니다.';
    const result = anonymizePII(rawText, '김민준');

    expect(result.anonymizedText).toContain('[성명 익명화]');
    expect(result.anonymizedText).not.toContain('김민준');
    expect(result.maskedCategories).toContain('성명');
  });

  it('hasPII가 개인정보 포함 여부를 올바르게 검출해야 함', () => {
    expect(hasPII('test@company.com으로 문의하세요')).toBe(true);
    expect(hasPII('서울대학교 졸업')).toBe(true);
    expect(hasPII('Redis 캐싱 도입으로 성능 향상')).toBe(false);
  });
});
