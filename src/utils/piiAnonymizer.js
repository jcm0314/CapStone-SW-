/**
 * Client-Side PII (Personally Identifiable Information) Anonymizer & Blind Recruitment Filter
 * Masks Email, Phone Numbers, School Names, RRNs/DOBs, and Candidate Names before AI processing.
 */

// PII Regex Patterns
const REGEX_PATTERNS = {
  // Email address
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  
  // Korean Mobile & Landline Phone numbers
  phone: /(?:01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
  
  // Resident Registration Number (RRN)
  rrn: /\d{6}[-.\s]?[1-4]\d{6}/g,
  
  // Date of Birth (e.g. 1998년 05월 12일)
  dob: /(19\d{2}|20\d{2})년\s?(0?[1-9]|1[0-2])월\s?(0?[1-9]|[12]\d|3[01])일/g,
  
  // School / University Names (e.g. OO대학교, OO대학원, 단국대, KAIST 등 축약형 및 특수대학 포함, 사내대학 등 직무용어 오탐지 방지)
  school: /(?:(?:(?!(?:사내|시민|노인|여성|어린이)대학)[가-힣]{2,10}(?:대학교|대학원|대학|고등학교|고교|중학교|초등학교))|(?:서울대|연세대|고려대|성균관대|한양대|서강대|중앙대|경희대|한국외대|시립대|건국대|동국대|홍익대|숙명여대|이화여대|국민대|숭실대|세종대|단국대|아주대|인하대|경북대|부산대|전남대|충남대|전북대|충북대|강원대|제주대|카이스트|포스텍|지스트|유니스트|디지스트)|\b(?:KAIST|POSTECH|UNIST|GIST|DGIST|MIT|Stanford|Harvard|Berkeley)\b)/gi,

  // General Address/Region (e.g. 서울특별시 강남구, 경기도 성남시)
  address: /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣]+(시|군|구)/g
};

/**
 * Stateless test helper: global (/g) regexes keep `lastIndex` between `.test()` calls,
 * which caused false negatives on subsequent calls. Always reset before testing.
 */
function matches(regex, text) {
  regex.lastIndex = 0;
  const found = regex.test(text);
  regex.lastIndex = 0;
  return found;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds the list of name variants to mask.
 * e.g. "정지훈 (지원자)" -> ["정지훈 (지원자)", "정지훈"]
 */
function getNameVariants(candidateName) {
  const full = (candidateName || '').trim();
  const base = full.replace(/\s*[([{].*?[)\]}]\s*/g, ' ').trim();
  return [...new Set([full, base])].filter(v => v.length >= 2);
}

// Ordered masking rules applied after name masking
const MASKING_RULES = [
  { key: 'email', token: '[이메일 익명화]', category: '이메일' },
  { key: 'phone', token: '[전화번호 익명화]', category: '전화번호' },
  { key: 'rrn', token: '[주민번호 익명화]', category: '주민번호' },
  { key: 'dob', token: '[생년월일 익명화]', category: '생년월일' },
  { key: 'school', token: '[학교명 익명화]', category: '출신학교' },
  { key: 'address', token: '[거주지역 익명화]', category: '거주지역' }
];

/**
 * Anonymizes PII in candidate text
 * @param {string} text - Raw candidate self-introduction text
 * @param {string} [candidateName] - Candidate's name to mask specifically
 * @returns {{ anonymizedText: string, piiCount: number, maskedCategories: string[] }}
 */
export function anonymizePII(text, candidateName = '') {
  if (!text) return { anonymizedText: '', piiCount: 0, maskedCategories: [] };

  let anonymizedText = text;
  let piiCount = 0;
  const maskedCategories = new Set();

  // 1. Candidate Name Masking (if provided) - name is escaped so regex metacharacters are literal
  for (const variant of getNameVariants(candidateName)) {
    const nameRegex = new RegExp(escapeRegExp(variant), 'g');
    if (matches(nameRegex, anonymizedText)) {
      anonymizedText = anonymizedText.replace(nameRegex, '[성명 익명화]');
      if (!maskedCategories.has('성명')) {
        piiCount++;
        maskedCategories.add('성명');
      }
    }
  }

  // 2~7. Email, Phone, RRN, DOB, School, Address
  for (const rule of MASKING_RULES) {
    const regex = REGEX_PATTERNS[rule.key];
    if (matches(regex, anonymizedText)) {
      anonymizedText = anonymizedText.replace(regex, rule.token);
      regex.lastIndex = 0;
      piiCount++;
      maskedCategories.add(rule.category);
    }
  }

  return {
    anonymizedText,
    piiCount,
    maskedCategories: Array.from(maskedCategories)
  };
}

/**
 * Checks if text contains any PII categories
 */
export function hasPII(text) {
  if (!text) return false;
  return MASKING_RULES.some(rule => matches(REGEX_PATTERNS[rule.key], text));
}
