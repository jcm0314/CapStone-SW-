import { describe, it, expect } from 'vitest';
import { fillTemplate, suggestTemplateId, MAIL_TEMPLATES } from './notificationService';

describe('notificationService 템플릿', () => {
  it('이름·회사·직무를 채우고 이름 꼬리표는 뺀다', () => {
    const { subject, text } = fillTemplate('pass', { name: '정지훈 (지원자)', company: '체크메이트', job: '백엔드 엔지니어' });
    expect(subject).toBe('[체크메이트] 백엔드 엔지니어 서류 전형 결과 안내');
    expect(text.startsWith('정지훈님, 안녕하세요.')).toBe(true);
    expect(text).not.toMatch(/\{(name|company|job)\}/);
  });

  it('값이 없으면 기본 문구로 채운다', () => {
    expect(fillTemplate('reject', {}).text.startsWith('지원자님')).toBe(true);
  });

  it('모든 템플릿 제목에 줄바꿈이 없다 (서버 검증 통과)', () => {
    MAIL_TEMPLATES.forEach((t) => expect(t.subject).not.toMatch(/\n/));
  });

  it('합격권 여부 > 판정 순으로 기본 템플릿을 고른다', () => {
    const rejectApp = { analysis: { summary: { decision: 'REJECT' } } };
    expect(suggestTemplateId(rejectApp)).toBe('reject');
    expect(suggestTemplateId(rejectApp, { isTopN: true })).toBe('pass');
    expect(suggestTemplateId({ analysis: { summary: { decision: 'INTERVIEW' } } })).toBe('interview');
    expect(suggestTemplateId({}, { isTopN: false })).toBe('reject');
  });
});
