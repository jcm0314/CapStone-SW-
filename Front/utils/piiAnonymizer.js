/**
 * Client-Side PII (Personally Identifiable Information) Anonymizer & Blind Recruitment Filter
 * Masks Email, Phone Numbers, School Names, RRNs/DOBs, and Candidate Names before AI processing.
 */

// PII Regex Patterns
const REGEX_PATTERNS = {
  // Email address
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi,
  
  // Korean Mobile & Landline Phone numbers (incl. international +82 prefix, e.g. +82 10-1234-5678)
  phone: /(?:\+82[-.\s]?0?(?:1[016789]|2|[3-9][0-9])|01[016789]|02|0[3-9][0-9])[-.\s]?\d{3,4}[-.\s]?\d{4}/g,
  
  // Resident Registration Number (RRN)
  rrn: /\d{6}[-.\s]?[1-4]\d{6}/g,
  
  // Date of Birth (e.g. 1998년 05월 12일)
  dob: /(19\d{2}|20\d{2})년\s?(0?[1-9]|1[0-2])월\s?(0?[1-9]|[12]\d|3[01])일/g,

  // Birth year shorthand (e.g. 97년생, 2002년생)
  dobYear: /(?<!\d)(?:19|20)?\d{2}년생/g,

  // Numeric date (1999.07.21 / 2000-11-03 / 1996/02/29) — only right after a birth cue,
  // so project/release dates ("2024.03.15에 배포") are never masked. Group 1 keeps the cue.
  dobNumeric: /((?:생년월일|생일|출생|태어난\s?날|DOB|Birth(?:day)?)[\s:：은는이가]{0,4})(?:19|20)\d{2}[.\-/]\s?(?:0?[1-9]|1[0-2])[.\-/]\s?(?:0?[1-9]|[12]\d|3[01])(?!\d)/gi,
  
  // School / University Names (e.g. OO대학교, OO대학원, 단국대, KAIST 등 축약형 및 특수대학 포함, 사내대학 등 직무용어 오탐지 방지)
  school: /(?:(?:(?!(?:사내|시민|노인|여성|어린이)대학)[가-힣]{2,10}(?:대학교|대학원|대학|고등학교|고교|중학교|초등학교))|(?:포항공대|금오공대|한국공대|서울과기대|서울과학기술대|한국기술교육대|서울교대|경인교대|부산교대|서울대|연세대|고려대|성균관대|한양대|서강대|중앙대|경희대|한국외대|시립대|건국대|동국대|홍익대|숙명여대|이화여대|국민대|숭실대|세종대|단국대|아주대|인하대|경북대|부산대|전남대|충남대|전북대|충북대|강원대|제주대|카이스트|포스텍|지스트|유니스트|디지스트)|\b(?:KAIST|POSTECH|UNIST|GIST|DGIST|MIT|Stanford|Harvard|Berkeley)\b)/gi,

  // General Address/Region (e.g. 서울특별시 강남구, 경기도 성남시)
  address: /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣]+(시|군|구)/g,

  // Short region form (e.g. 서울 강남구, 경기 성남시, 부산 중구). Requires a 시/군/구 district right after,
  // followed by a particle or non-Hangul, so "서울에서 열린", "경기 침체", "부산 지사" stay untouched.
  addressShort: /(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)(?:시|도)?\s+(?:[가-힣]{2,4}(?:시|군|구)|[중동서남북]구)(?=$|[^가-힣]|[에의은는이가을를로와과민])/g
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

/**
 * Regex source for one name variant. A 2~4 syllable Korean name also matches when written
 * with spaces between syllables (e.g. "정 해 인").
 */
function nameVariantSource(variant) {
  if (/^[가-힣]{2,4}$/.test(variant)) {
    return variant.split('').join('\\s?');
  }
  return escapeRegExp(variant);
}

// Ordered masking rules applied after name masking
const MASKING_RULES = [
  { key: 'email', token: '[이메일 익명화]', category: '이메일' },
  { key: 'phone', token: '[전화번호 익명화]', category: '전화번호' },
  { key: 'rrn', token: '[주민번호 익명화]', category: '주민번호' },
  { key: 'dob', token: '[생년월일 익명화]', category: '생년월일' },
  { key: 'dobYear', token: '[생년월일 익명화]', category: '생년월일' },
  { key: 'dobNumeric', token: '$1[생년월일 익명화]', category: '생년월일' },
  { key: 'school', token: '[학교명 익명화]', category: '출신학교' },
  { key: 'address', token: '[거주지역 익명화]', category: '거주지역' },
  { key: 'addressShort', token: '[거주지역 익명화]', category: '거주지역' }
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
    const nameRegex = new RegExp(nameVariantSource(variant), 'g');
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
      if (!maskedCategories.has(rule.category)) piiCount++;
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
