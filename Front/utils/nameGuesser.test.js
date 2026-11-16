import { describe, it, expect } from 'vitest';
import { guessApplicantName, guessNameFromText, guessNameFromFilename } from './nameGuesser';

describe('guessApplicantName', () => {
  it('본문의 "지원하는 OOO입니다"에서 이름을 찾음 (영문 파일 이름 조각보다 우선)', () => {
    const text = '안녕하세요. 백엔드 개발자로 지원하는 정하늘입니다. 연락처는 010-2468-1357입니다.';
    expect(guessApplicantName(text, 'sample_coverletter_backend.txt')).toBe('정하늘');
  });

  it('"이름: 김 민 수"처럼 띄어 쓴 이름도 찾음', () => {
    expect(guessNameFromText('이름: 김 민 수\n지원 직무: 백엔드')).toBe('김민수');
  });

  it('"저는 열정적인 개발자입니다" 같은 문장은 이름으로 보지 않음', () => {
    expect(guessNameFromText('저는 개발자입니다. 끈기가 있습니다.')).toBe('');
  });

  it('영문 파일 이름은 쓰지 않고, 한글 이름이 든 파일 이름은 씀', () => {
    expect(guessNameFromFilename('sample_coverletter.txt')).toBe('');
    expect(guessNameFromFilename('자소서_박서준_최종.pdf')).toBe('박서준');
    expect(guessApplicantName('본문에 이름 없음', 'resume.pdf')).toBe('');
  });
});
