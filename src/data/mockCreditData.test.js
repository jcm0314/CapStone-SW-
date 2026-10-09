import { describe, it, expect } from 'vitest';
import { INITIAL_DEPARTMENTS, generate2000Users } from './mockCreditData';

describe('Enterprise AI Credit Governance & 2,000 Users Mapping Engine', () => {
  it('단국대 5개 핵심 부서의 초기 쿼터가 올바르게 정의되어 있어야 함', () => {
    expect(INITIAL_DEPARTMENTS).toHaveLength(5);
    const totalAllocated = INITIAL_DEPARTMENTS.reduce((acc, d) => acc + d.allocatedUsd, 0);
    expect(totalAllocated).toBe(10000.00); // 총 $10,000 할당

    const deptCodes = INITIAL_DEPARTMENTS.map(d => d.code);
    expect(deptCodes).toContain('CSE-DKU');
    expect(deptCodes).toContain('CAREER-CENTER');
    expect(deptCodes).toContain('CLUB-UNION');
  });

  it('2,000명 이상의 이용자 데이터가 단국대 학번 및 이메일 형식으로 자동 매핑되어야 함', () => {
    const users = generate2000Users();
    expect(users.length).toBeGreaterThanOrEqual(2000);

    // 주요 파일럿 실증 유저 검증
    const pilotLeader = users.find(u => u.email === 'jcm03141@gmail.com');
    expect(pilotLeader).toBeDefined();
    expect(pilotLeader.name).toContain('장천명');
    expect(pilotLeader.deptId).toBe('dept_cs');

    const clubPresident = users.find(u => u.email === 'dcc_president@dankook.ac.kr');
    expect(clubPresident).toBeDefined();
    expect(clubPresident.name).toContain('이X태');
    expect(clubPresident.deptId).toBe('dept_club');

    // 일반 생성 유저 무결성 검증
    const sampleUser = users[100];
    expect(sampleUser.studentId).toMatch(/^322\d+/);
    expect(sampleUser.email).toContain('@dankook.ac.kr');
    expect(sampleUser.spentUsd).toBeGreaterThan(0);
    expect(sampleUser.evalCount).toBeGreaterThanOrEqual(1);
  });
});
