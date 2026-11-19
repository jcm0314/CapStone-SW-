/**
 * 지원자 결과 메일 발송 (Resend REST API, SDK 없이 fetch 로 호출)
 *   MAIL_API_ENABLED 'true' 일 때만 HTTP 발송 API 가 켜짐 (기본 꺼짐, index.js isMailApiEnabled 참고)
 *   RESEND_API_KEY   필수. 없으면 발송 기능 자체가 꺼짐 (GET /api/v1/notifications/status → emailEnabled:false)
 *   RESEND_FROM      필수. 예: "Check-Mate <noreply@psyrod.dev>" (Resend 에서 인증한 도메인이어야 함)
 *   RESEND_REPLY_TO  선택. 지원자가 답장하면 받을 주소
 * 스팸 중계로 쓰이지 않게: 받는 사람 1명, 텍스트 본문만(HTML 없음), 길이 제한, 라우트에 별도 속도 제한.
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
export const MAIL_LIMITS = { subject: 150, text: 5000 };
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

let fetchImpl = (...args) => fetch(...args);
/** 테스트에서 Resend 호출을 가로채기 위한 주입점 */
export function __setMailFetchForTests(fn) {
  fetchImpl = fn || ((...args) => fetch(...args));
}

export function isMailConfigured(env = process.env) {
  return Boolean(env.RESEND_API_KEY && env.RESEND_FROM);
}

/** 요청 본문을 검사하고 정리된 값 또는 에러 메시지를 돌려줍니다. */
export function validateMailRequest(body = {}) {
  const to = typeof body.to === 'string' ? body.to.trim() : '';
  const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
  const text = typeof body.text === 'string' ? body.text.replace(/\r\n/g, '\n').trim() : '';

  if (!EMAIL_RE.test(to) || to.length > 254) return { error: '받는 사람 이메일 주소가 올바르지 않습니다.' };
  if (!subject) return { error: '메일 제목을 입력하세요.' };
  if (/[\r\n]/.test(subject)) return { error: '메일 제목에는 줄바꿈을 넣을 수 없습니다.' };
  if (subject.length > MAIL_LIMITS.subject) return { error: `메일 제목은 ${MAIL_LIMITS.subject}자 이하로 입력하세요.` };
  if (!text) return { error: '메일 본문을 입력하세요.' };
  if (text.length > MAIL_LIMITS.text) return { error: `메일 본문은 ${MAIL_LIMITS.text.toLocaleString()}자 이하로 입력하세요.` };

  return { value: { to, subject, text } };
}

/** Resend 로 발송. 성공 시 { id }, 실패 시 Error(한국어 메시지) */
export async function sendMail({ to, subject, text }, env = process.env) {
  if (!isMailConfigured(env)) {
    const err = new Error('메일 발송이 설정되지 않았습니다. 서버에 RESEND_API_KEY, RESEND_FROM 을 설정하세요.');
    err.status = 503;
    throw err;
  }

  const payload = { from: env.RESEND_FROM, to: [to], subject, text };
  if (env.RESEND_REPLY_TO) payload.reply_to = env.RESEND_REPLY_TO;

  let resp;
  try {
    resp = await fetchImpl(RESEND_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch {
    const err = new Error('메일 서버(Resend)에 연결할 수 없습니다. 잠시 후 다시 시도하세요.');
    err.status = 502;
    throw err;
  }

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    // Resend 오류 메시지에는 키가 들어가지 않으므로 원인 파악용으로 그대로 전달
    const err = new Error(`메일 발송 실패: ${data.message || `Resend 응답 오류 (HTTP ${resp.status})`}`);
    err.status = resp.status === 429 ? 429 : 502;
    throw err;
  }
  return { id: data.id };
}
