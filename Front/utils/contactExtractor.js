/**
 * 결과 메일 발송용 지원자 연락처 추출.
 * 개인정보 마스킹 "전" 원문에서 뽑아 담당자 브라우저에만 저장하고, AI 평가 서버로는 보내지 않습니다.
 */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** 본문에 처음 나오는 이메일 주소 (없으면 '') */
export function extractContactEmail(text) {
  if (!text) return '';
  const found = String(text).match(EMAIL_RE);
  return found ? found[0].toLowerCase() : '';
}
