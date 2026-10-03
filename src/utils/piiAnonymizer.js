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
  
  // School / University Names (e.g. 서울대학교, 한국고등학교)
  school: /([가-힣]{2,10}(?:대학교|대학원|대학|고등학교|고교|중학교|초등학교))/g,

  // General Address/Region (e.g. 서울특별시 강남구, 경기도 성남시)
  address: /(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)\s+[가-힣]+(시|군|구)/g
};

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

  // 1. Candidate Name Masking (if provided)
  if (candidateName && candidateName.trim().length >= 2) {
    const nameRegex = new RegExp(candidateName.trim(), 'g');
    if (nameRegex.test(anonymizedText)) {
      anonymizedText = anonymizedText.replace(nameRegex, '[성명 익명화]');
      piiCount++;
      maskedCategories.add('성명');
    }
  }

  // 2. Email Masking
  if (REGEX_PATTERNS.email.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.email, '[이메일 익명화]');
    piiCount++;
    maskedCategories.add('이메일');
  }

  // 3. Phone Number Masking
  if (REGEX_PATTERNS.phone.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.phone, '[전화번호 익명화]');
    piiCount++;
    maskedCategories.add('전화번호');
  }

  // 4. Resident Registration Number Masking
  if (REGEX_PATTERNS.rrn.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.rrn, '[주민번호 익명화]');
    piiCount++;
    maskedCategories.add('주민번호');
  }

  // 5. Date of Birth Masking
  if (REGEX_PATTERNS.dob.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.dob, '[생년월일 익명화]');
    piiCount++;
    maskedCategories.add('생년월일');
  }

  // 6. School Name Masking (Blind Recruitment)
  if (REGEX_PATTERNS.school.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.school, '[학교명 익명화]');
    piiCount++;
    maskedCategories.add('출신학교');
  }

  // 7. Address Masking
  if (REGEX_PATTERNS.address.test(anonymizedText)) {
    anonymizedText = anonymizedText.replace(REGEX_PATTERNS.address, '[거주지역 익명화]');
    piiCount++;
    maskedCategories.add('거주지역');
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
  return (
    REGEX_PATTERNS.email.test(text) ||
    REGEX_PATTERNS.phone.test(text) ||
    REGEX_PATTERNS.rrn.test(text) ||
    REGEX_PATTERNS.dob.test(text) ||
    REGEX_PATTERNS.school.test(text) ||
    REGEX_PATTERNS.address.test(text)
  );
}
