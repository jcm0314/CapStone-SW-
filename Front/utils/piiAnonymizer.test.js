import { describe, it, expect } from 'vitest';
import { anonymizePII, hasPII, detectSuspiciousPII, applyManualMasks } from './piiAnonymizer';

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

  it('출신 학교명(대학교, 고등학교, 약칭 및 영문 과학기술원)을 [학교명 익명화]로 마스킹해야 함', () => {
    const rawText = '저는 서울대학교와 단국대, KAIST 공동 연구를 수행했으며 대전고등학교 출신입니다. 사내대학 프로그램도 이수했습니다.';
    const result = anonymizePII(rawText);

    expect(result.anonymizedText).toContain('[학교명 익명화]');
    expect(result.anonymizedText).not.toContain('서울대학교');
    expect(result.anonymizedText).not.toContain('단국대');
    expect(result.anonymizedText).not.toContain('KAIST');
    expect(result.anonymizedText).not.toContain('대전고등학교');
    expect(result.anonymizedText).toContain('사내대학'); // 일반 명사 오탐 방지 확인
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
    expect(hasPII('단국대 컴퓨터공학과')).toBe(true);
    expect(hasPII('Redis 캐싱 도입으로 성능 향상')).toBe(false);
  });

  it('hasPII/anonymizePII를 연속 호출해도 정규식 lastIndex 상태가 누수되지 않아야 함', () => {
    const text = 'a@b.com 으로 연락 주세요';
    // 동일 입력에 대한 반복 호출 결과가 항상 같아야 한다
    for (let i = 0; i < 3; i++) {
      expect(hasPII(text)).toBe(true);
    }
    expect(hasPII('x@y.com')).toBe(true);
    expect(anonymizePII('x@y.com').maskedCategories).toContain('이메일');
    expect(anonymizePII('x@y.com').anonymizedText).toBe('[이메일 익명화]');
  });

  it('괄호 등 정규식 특수문자가 포함된 성명도 안전하게 마스킹해야 함', () => {
    const rawText = '안녕하세요, 정지훈입니다. 정지훈 (지원자)로 표기되기도 합니다.';
    let result;
    expect(() => {
      result = anonymizePII(rawText, '정지훈 (지원자)');
    }).not.toThrow();
    expect(result.anonymizedText).not.toContain('정지훈');
    expect(result.maskedCategories).toContain('성명');
    expect(result.piiCount).toBe(1);

    expect(() => anonymizePII('본문 a+b', 'a+b[')).not.toThrow();
  });

  describe('변형 표기 (2026-11-16 실측 보완)', () => {
    it('+82 국제번호 표기 전화번호를 마스킹해야 함', () => {
      const out = anonymizePII('+82 10-2345-6789 로 연락주세요.').anonymizedText;
      expect(out).not.toContain('2345-6789');
      expect(out).toContain('[전화번호 익명화]');
    });

    it('YY년생 / YYYY년생 표기를 생년월일로 마스킹해야 함', () => {
      expect(anonymizePII('저는 97년생입니다.').anonymizedText).toBe('저는 [생년월일 익명화]입니다.');
      expect(anonymizePII('2002년생 신입').anonymizedText).toBe('[생년월일 익명화] 신입');
    });

    it('생년월일·생일·출생 단서 뒤의 숫자 날짜만 마스킹하고 단서는 남겨야 함', () => {
      expect(anonymizePII('생년월일: 1999.07.21').anonymizedText).toBe('생년월일: [생년월일 익명화]');
      expect(anonymizePII('생일은 2000-11-03 입니다.').anonymizedText).toBe('생일은 [생년월일 익명화] 입니다.');
      expect(anonymizePII('출생: 1996/02/29').anonymizedText).toBe('출생: [생년월일 익명화]');
    });

    it('프로젝트·릴리스 날짜와 버전은 생년월일로 오탐하지 않아야 함', () => {
      for (const t of ['2024.03.15에 정식 버전을 배포했습니다.', '2023-11-04 릴리스', '주문 번호 2023-1104-5521', 'v2.10.3 버전', '생일 이벤트를 2024.05.05에 열었다']) {
        expect(anonymizePII(t).anonymizedText).toBe(t);
      }
    });

    it('시·도 약칭 + 시/군/구 주소를 마스킹해야 함', () => {
      expect(anonymizePII('서울 강남구에 살고 있습니다.').anonymizedText).toBe('[거주지역 익명화]에 살고 있습니다.');
      expect(anonymizePII('경기 성남시 분당구').anonymizedText).toContain('[거주지역 익명화]');
      expect(anonymizePII('부산 중구 거주').anonymizedText).toBe('[거주지역 익명화] 거주');
    });

    it('지역명이 들어가도 주소가 아닌 문장은 바꾸지 않아야 함', () => {
      for (const t of ['서울에서 열린 해커톤', '경기 침체 속에서도', '부산 지사와 서울 본사 간 협업', '서울 도시 계획', '대전 유성구청과 협업']) {
        expect(anonymizePII(t).anonymizedText).toBe(t);
      }
    });

    it('포항공대·서울과기대 등 약칭을 학교명으로 마스킹하되 공대생 같은 일반 명사는 남겨야 함', () => {
      expect(anonymizePII('포항공대에서 연구했습니다.').anonymizedText).toBe('[학교명 익명화]에서 연구했습니다.');
      expect(anonymizePII('서울과기대 대학원').anonymizedText).not.toContain('서울과기대');
      expect(anonymizePII('공대생 시절부터').anonymizedText).toBe('공대생 시절부터');
    });

    it('음절 사이를 띄어 쓴 성명도 마스킹해야 함', () => {
      expect(anonymizePII('지원자 정 해 인 입니다.', '정해인').anonymizedText).toBe('지원자 [성명 익명화] 입니다.');
    });

    it('같은 카테고리의 여러 규칙이 걸려도 piiCount는 카테고리당 1회만 세야 함', () => {
      const r = anonymizePII('1998년 5월 12일생, 97년생 표기');
      expect(r.maskedCategories).toEqual(['생년월일']);
      expect(r.piiCount).toBe(1);
    });
  });

  describe('2차 Selective HITL 의심 개인정보 추출 (detectSuspiciousPII & applyManualMasks)', () => {
    it('1차 정규식이 보수적으로 남긴 SNS ID·비정형 출생·학번·상세주소를 1줄 스니펫으로 추출해야 함', () => {
      const raw = [
        '카톡 아이디 jiwoo99 / 메일 jiwoo99@outlook.kr',
        '만 25세 (2001-04-17), 학번 32201234',
        '거주지: 범어동 123-4 래미안아파트 102동'
      ].join('\n');

      const stage1 = anonymizePII(raw);
      const suspicious = detectSuspiciousPII(stage1.anonymizedText);

      const matches = suspicious.map((s) => s.match);
      expect(matches).toContain('jiwoo99');
      expect(matches).toContain('2001-04-17');
      expect(matches).toContain('32201234');
      expect(matches.some((m) => m.includes('범어동 123-4'))).toBe(true);
      expect(suspicious.every((s) => s.snippet.length > 0 && s.snippet.length <= 92)).toBe(true);
    });

    it('일반 기술·실적 문장에서는 의심 항목이 0건이어야 담당자 확인 없이 바로 통과됨', () => {
      const clean = [
        '2024.03.15에 v3.0을 출시했습니다.',
        'Redis 캐싱 도입으로 API 응답 시간을 3.2초에서 0.42초로 86.8% 단축했습니다.',
        '생산 라인 불량률을 1.2%로 낮추고 분기 매출 2024-Q3 목표를 달성했습니다.'
      ].join('\n');

      const stage1 = anonymizePII(clean);
      expect(detectSuspiciousPII(stage1.anonymizedText)).toEqual([]);
    });

    it('applyManualMasks가 담당자가 선택한 토큰만 [추가 비식별화]로 치환해야 함', () => {
      const text = '카톡 아이디 jiwoo99, 출생일 2001-04-17, 경력 3년';
      const masked = applyManualMasks(text, ['jiwoo99', '2001-04-17']);
      expect(masked).toBe('카톡 아이디 [추가 비식별화], 출생일 [추가 비식별화], 경력 3년');
    });
  });
});

