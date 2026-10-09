/**
 * Enterprise AI Credit Governance & 2,000 User Mapping Mock Dataset
 * Reflects Dankook University departments, student associations, and administrative centers.
 */

export const INITIAL_DEPARTMENTS = [
  {
    id: 'dept_cs',
    name: '컴퓨터공학과 (캡스톤/학부)',
    code: 'CSE-DKU',
    allocatedUsd: 3500.00,
    usedUsd: 1420.50,
    userCount: 680,
    autoLockEnabled: true,
    leadManager: '박단국 교수',
    color: 'from-blue-600 to-indigo-600'
  },
  {
    id: 'dept_career',
    name: '대학일자리플러스센터 (취업지원)',
    code: 'CAREER-CENTER',
    allocatedUsd: 2500.00,
    usedUsd: 890.25,
    userCount: 520,
    autoLockEnabled: true,
    leadManager: '김진로 팀장',
    color: 'from-emerald-600 to-teal-600'
  },
  {
    id: 'dept_club',
    name: '중앙동아리 연합회 (DCC 등 부원선발)',
    code: 'CLUB-UNION',
    allocatedUsd: 1500.00,
    usedUsd: 1180.80,
    userCount: 310,
    autoLockEnabled: false,
    leadManager: '이X태 회장',
    color: 'from-amber-600 to-orange-600'
  },
  {
    id: 'dept_plan',
    name: '기획실 평가혁신팀 (행정 AX)',
    code: 'PLAN-EVAL',
    allocatedUsd: 1500.00,
    usedUsd: 310.10,
    userCount: 90,
    autoLockEnabled: true,
    leadManager: '최혁신 계장',
    color: 'from-purple-600 to-fuchsia-600'
  },
  {
    id: 'dept_biz',
    name: '경영대학 HR 실습 트랙',
    code: 'BIZ-HR',
    allocatedUsd: 1000.00,
    usedUsd: 895.40,
    userCount: 448,
    autoLockEnabled: true,
    leadManager: '정경영 교수',
    color: 'from-rose-600 to-pink-600'
  }
];

// Generates 2,048 realistic Dankook University user accounts
export function generate2000Users() {
  const users = [];
  const deptIds = ['dept_cs', 'dept_career', 'dept_club', 'dept_plan', 'dept_biz'];
  const firstNames = ['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '전', '홍'];
  const middleNames = ['민', '서', '도', '예', '지', '하', '준', '시', '채', '은', '현', '우', '윤', '태', '원', '진', '수', '성', '주', '호'];
  const lastNames = ['우', '준', '윤', '은', '서', '현', '후', '율', '진', '영', '환', '석', '경', '호', '찬', '훈', '기', '혁', '빈', '솔'];

  // Seed with prominent pilot users
  users.push(
    {
      id: 'usr_0001',
      studentId: '32203919',
      name: '장천명 (프로젝트 책임)',
      email: 'jcm03141@gmail.com',
      deptId: 'dept_cs',
      deptName: '컴퓨터공학과 (캡스톤/학부)',
      evalCount: 42,
      tokensUsed: 168400,
      spentUsd: 0.151,
      isLocked: false,
      lastActive: '방금 전'
    },
    {
      id: 'usr_0002',
      studentId: '32211048',
      name: '이X태 (DCC 동아리 회장)',
      email: 'dcc_president@dankook.ac.kr',
      deptId: 'dept_club',
      deptName: '중앙동아리 연합회 (DCC 등 부원선발)',
      evalCount: 65,
      tokensUsed: 260500,
      spentUsd: 0.234,
      isLocked: false,
      lastActive: '12분 전'
    },
    {
      id: 'usr_0003',
      studentId: '32194012',
      name: '김현직 (모의면접관)',
      email: 'interview_pro@dankook.ac.kr',
      deptId: 'dept_career',
      deptName: '대학일자리플러스센터 (취업지원)',
      evalCount: 38,
      tokensUsed: 152000,
      spentUsd: 0.136,
      isLocked: false,
      lastActive: '1시간 전'
    },
    {
      id: 'usr_0004',
      studentId: '32220194',
      name: '박단국 (캡스톤 평가자)',
      email: 'prof_park@dankook.ac.kr',
      deptId: 'dept_cs',
      deptName: '컴퓨터공학과 (캡스톤/학부)',
      evalCount: 89,
      tokensUsed: 356000,
      spentUsd: 0.320,
      isLocked: false,
      lastActive: '3시간 전'
    },
    {
      id: 'usr_0005',
      studentId: '32219981',
      name: '강초과 (예산 초과 테스트)',
      email: 'over_budget_user@dankook.ac.kr',
      deptId: 'dept_biz',
      deptName: '경영대학 HR 실습 트랙',
      evalCount: 194,
      tokensUsed: 895000,
      spentUsd: 2.150,
      isLocked: true,
      lastActive: '어제'
    }
  );

  // Generate up to 2,048 users
  for (let i = 6; i <= 2048; i++) {
    const fn = firstNames[i % firstNames.length];
    const mn = middleNames[(i * 3) % middleNames.length];
    const ln = lastNames[(i * 7) % lastNames.length];
    const name = `${fn}${mn}${ln}`;
    const sId = `322${String(10000 + i).slice(1)}`;
    const deptId = deptIds[i % deptIds.length];
    const deptObj = INITIAL_DEPARTMENTS.find(d => d.id === deptId);
    
    // Weighted token usage
    const evalCount = Math.floor(Math.sin(i) * 15) + 8;
    const tokensUsed = evalCount * 4000;
    // Gemini 2.5 Flash-Lite rate: ~$0.0009 per 6K tokens
    const spentUsd = +(evalCount * 0.0009).toFixed(4);
    const isLocked = i === 18 || i === 44 || i === 105;

    users.push({
      id: `usr_${String(i).padStart(4, '0')}`,
      studentId: sId,
      name,
      email: `student_${sId}@dankook.ac.kr`,
      deptId,
      deptName: deptObj ? deptObj.name : '학부생',
      evalCount: Math.max(1, evalCount),
      tokensUsed,
      spentUsd: Math.max(0.001, spentUsd),
      isLocked,
      lastActive: i % 5 === 0 ? '오늘' : i % 3 === 0 ? '어제' : '3일 전'
    });
  }

  return users;
}
