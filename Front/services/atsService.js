const ATS_CONFIG_PREFIX = 'checkmate_ats_config_';
const ATS_LOG_PREFIX = 'checkmate_ats_logs_';

export const ATS_PROVIDERS = [
  { id: 'greeting', name: '그리팅 (Greeting)', desc: '국내 엔터프라이즈 ATS 웹훅 연동' },
  { id: 'ninehire', name: '나인하이어 (Ninehire)', desc: '채용 파이프라인·지원자 상태 동기화' },
  { id: 'greenhouse', name: 'Greenhouse', desc: '글로벌 ATS Candidate Scorecard 연동' },
  { id: 'lever', name: 'Lever', desc: 'Lever Opportunity Webhook 연동' },
  { id: 'custom', name: '커스텀 Webhook', desc: '사내 HRIS / 자체 채용 시스템 REST API' }
];

export function getAtsConfig(tenantId = 'default') {
  try {
    const raw = localStorage.getItem(`${ATS_CONFIG_PREFIX}${tenantId}`);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore storage errors
  }
  return {
    provider: 'greeting',
    webhookUrl: '',
    apiKey: '',
    autoSync: false
  };
}

export function saveAtsConfig(tenantId = 'default', config) {
  const normalized = {
    provider: config.provider || 'greeting',
    webhookUrl: String(config.webhookUrl || '').trim(),
    apiKey: String(config.apiKey || '').trim(),
    autoSync: Boolean(config.autoSync),
    updatedAt: new Date().toISOString()
  };
  try {
    localStorage.setItem(`${ATS_CONFIG_PREFIX}${tenantId}`, JSON.stringify(normalized));
  } catch {
    // ignore storage errors
  }
  return normalized;
}

export function getAtsSyncLogs(tenantId = 'default') {
  try {
    const raw = localStorage.getItem(`${ATS_LOG_PREFIX}${tenantId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendAtsSyncLog(tenantId, entry) {
  const prev = getAtsSyncLogs(tenantId);
  const next = [entry, ...prev].slice(0, 20);
  try {
    localStorage.setItem(`${ATS_LOG_PREFIX}${tenantId}`, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function buildAtsPayload(applicant, providerId = 'greeting', tenant = {}) {
  const summary = applicant?.analysis?.summary || {};
  return {
    event: 'checkmate.candidate.evaluated',
    provider: providerId,
    timestamp: new Date().toISOString(),
    tenant: {
      id: tenant?.id || applicant?.orgId || 'default',
      name: tenant?.name || ''
    },
    candidate: {
      id: applicant?.id,
      name: applicant?.name,
      email: applicant?.contactEmail || null,
      jobId: applicant?.applyJobId,
      jobTitle: applicant?.applyJobTitle,
      documentScore: summary.totalScore ?? null,
      decision: summary.decision ?? null,
      decisionReason: summary.decisionReason ?? '',
      isHumanVerified: Boolean(applicant?.isHumanVerified),
      interviewTrack: applicant?.interviewTrack || null
    }
  };
}

export async function syncApplicantToAts({ applicant, config, tenant, fetchImpl = fetch }) {
  if (!applicant) {
    throw new Error('동기화할 지원자를 선택하세요.');
  }
  const payload = buildAtsPayload(applicant, config?.provider, tenant);
  const url = String(config?.webhookUrl || '').trim();

  if (!url) {
    const log = {
      id: `ats-log-${Date.now()}`,
      applicantId: applicant.id,
      applicantName: applicant.name,
      provider: config?.provider || 'greeting',
      mode: 'PREVIEW',
      status: 'SIMULATED',
      syncedAt: new Date().toISOString()
    };
    appendAtsSyncLog(tenant?.id || 'default', log);
    return { ok: true, mode: 'PREVIEW', payload, log };
  }

  const headers = { 'Content-Type': 'application/json' };
  if (config?.apiKey) {
    headers['X-ATS-Api-Key'] = config.apiKey;
  }

  const res = await fetchImpl(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const log = {
      id: `ats-log-${Date.now()}`,
      applicantId: applicant.id,
      applicantName: applicant.name,
      provider: config?.provider || 'greeting',
      mode: 'WEBHOOK',
      status: `ERROR_${res.status}`,
      syncedAt: new Date().toISOString()
    };
    appendAtsSyncLog(tenant?.id || 'default', log);
    throw new Error(`ATS Webhook 응답 오류 (${res.status})`);
  }

  const log = {
    id: `ats-log-${Date.now()}`,
    applicantId: applicant.id,
    applicantName: applicant.name,
    provider: config?.provider || 'greeting',
    mode: 'WEBHOOK',
    status: 'SYNCED',
    syncedAt: new Date().toISOString()
  };
  appendAtsSyncLog(tenant?.id || 'default', log);
  return { ok: true, mode: 'WEBHOOK', payload, log };
}
