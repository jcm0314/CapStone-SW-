/**
 * 업로드한 자소서에서 지원자 이름을 추정합니다.
 *
 * 개인정보 가리기(anonymizePII)는 "입력된 이름"만 가리므로, 이름이 틀리면 본문의 실제 이름이 AI로 전송됩니다.
 * 그래서 파일 이름(예: sample_coverletter.txt → "samp")보다 본문에서 찾은 이름을 우선합니다.
 */

// 흔한 한국 성씨 (첫 글자 검사용)
const SURNAMES = new Set(
  '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국어은편용예경봉사부'.split('')
);

// 이름 자리에 오지만 이름이 아닌 말
const NOT_NAMES = new Set([
  '개발자', '지원자', '신입', '인재', '사람', '학생', '디자이너', '기획자', '엔지니어', '마케터',
  '여러분', '저희', '본인', '제가', '자신', '경력자', '전공자', '졸업생', '취준생'
]);

const TEXT_PATTERNS = [
  /(?:이\s*름|성\s*명|지원자\s*명)\s*[:：][ \t]*([가-힣](?:[ ]?[가-힣]){1,3})(?![가-힣])/,
  /지원(?:하는|한|하게 된|자)\s+([가-힣]{2,4})(?:입니다|이라고|라고)/,
  /저는\s+([가-힣]{2,4})(?:입니다|이라고|라고)/,
  /(?:안녕하십니까|안녕하세요)[.,!]?\s*([가-힣]{2,4})입니다/
];

export function isLikelyKoreanName(candidate) {
  const name = String(candidate || '').replace(/\s/g, '');
  if (!/^[가-힣]{2,4}$/.test(name)) return false;
  if (NOT_NAMES.has(name)) return false;
  return SURNAMES.has(name[0]);
}

export function guessNameFromText(text) {
  const head = String(text || '').slice(0, 600);
  for (const pattern of TEXT_PATTERNS) {
    const m = head.match(pattern);
    if (m) {
      const name = m[1].replace(/\s/g, '');
      if (isLikelyKoreanName(name)) return name;
    }
  }
  return '';
}

export function guessNameFromFilename(filename) {
  const base = String(filename || '').replace(/\.[^/.]+$/, '');
  // 파일 이름 안의 한글 덩어리 중 이름처럼 보이는 것만 사용 (예: "자소서_정하늘_최종.pdf")
  const chunks = base.match(/[가-힣]{2,4}/g) || [];
  return chunks.find(isLikelyKoreanName) || '';
}

/** 본문 → 파일 이름 순서로 찾고, 못 찾으면 빈 문자열 (사용자가 직접 입력) */
export function guessApplicantName(text, filename) {
  return guessNameFromText(text) || guessNameFromFilename(filename);
}
