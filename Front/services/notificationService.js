import { getApiBaseUrl } from './aiEvaluator';

/** 지원자 결과 메일 템플릿. {name} {company} {job} 은 보내기 전에 채워지고, 담당자가 자유롭게 고칠 수 있습니다. */
export const MAIL_TEMPLATES = [
  {
    id: 'pass',
    label: '서류 합격',
    subject: '[{company}] {job} 서류 전형 결과 안내',
    text: `{name}님, 안녕하세요.
{company} 채용 담당자입니다.

{job} 포지션에 지원해 주셔서 감사합니다.
서류 전형에 합격하셨음을 알려드립니다.

다음 전형 일정은 별도로 안내드리겠습니다.
감사합니다.

{company} 채용팀 드림`
  },
  {
    id: 'interview',
    label: '면접 안내',
    subject: '[{company}] {job} 면접 일정 안내',
    text: `{name}님, 안녕하세요.
{company} 채용 담당자입니다.

{job} 포지션 면접 일정을 안내드립니다.

- 일시:
- 장소/방식:
- 준비물:

가능 여부를 이 메일에 회신해 주세요.
감사합니다.

{company} 채용팀 드림`
  },
  {
    id: 'reject',
    label: '불합격',
    subject: '[{company}] {job} 서류 전형 결과 안내',
    text: `{name}님, 안녕하세요.
{company} 채용 담당자입니다.

{job} 포지션에 관심을 갖고 지원해 주셔서 진심으로 감사드립니다.
아쉽게도 이번 서류 전형에서는 함께하지 못하게 되었음을 알려드립니다.

보내주신 지원서는 신중하게 검토했으며, 앞으로의 여정을 응원하겠습니다.
감사합니다.

{company} 채용팀 드림`
  }
];

/** 판정·합격권 여부로 기본 템플릿을 고릅니다. */
export function suggestTemplateId(applicant, { isTopN } = {}) {
  if (isTopN === true) return 'pass';
  if (isTopN === false) return 'reject';
  const decision = applicant?.analysis?.summary?.decision;
  if (decision === 'REJECT') return 'reject';
  if (decision === 'INTERVIEW') return 'interview';
  return 'pass';
}

/** 이름 뒤 "(지원자)" 같은 꼬리표는 메일에서 뺍니다. */
function cleanName(name) {
  return String(name || '').replace(/\s*[([{].*?[)\]}]\s*/g, ' ').trim() || '지원자';
}

export function fillTemplate(templateId, { name, company, job } = {}) {
  const tpl = MAIL_TEMPLATES.find((t) => t.id === templateId) || MAIL_TEMPLATES[0];
  const vars = { name: cleanName(name), company: company || '저희 회사', job: job || '지원' };
  const fill = (s) => s.replace(/\{(name|company|job)\}/g, (_, k) => vars[k]);
  return { subject: fill(tpl.subject), text: fill(tpl.text) };
}

export async function getEmailStatus() {
  try {
    const resp = await fetch(`${getApiBaseUrl()}/api/v1/notifications/status`);
    if (!resp.ok) return { emailEnabled: false };
    return await resp.json();
  } catch {
    return { emailEnabled: false };
  }
}

export async function sendApplicantEmail({ to, subject, text }) {
  let resp;
  try {
    resp = await fetch(`${getApiBaseUrl()}/api/v1/notifications/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text })
    });
  } catch {
    throw new Error('메일 서버에 연결할 수 없습니다. 네트워크를 확인하세요.');
  }
  const body = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(body.message || `메일 발송 실패 (HTTP ${resp.status})`);
  return body;
}
