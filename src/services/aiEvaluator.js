import { JOB_TEMPLATES } from '../data/jobTemplates';
import { getCachedAnalysis, saveAnalysisToCache } from './cacheService';
import { getActivePromptAddendum, getCompanyPromptSettings, hasCustomPromptSettings } from './promptStudioService';
import { anonymizePIIInWorker } from './workerService';

/**
 * AI Grounding Evaluation Coordinator (browser side).
 * The browser never calls an LLM provider and never holds an API key: it masks PII,
 * checks the local cache, then delegates to the API gateway (POST /api/v1/evaluate),
 * which runs the 4-Agent pipeline on the Claude API with the server's ANTHROPIC_API_KEY.
 */
export async function analyzeApplicant({ name, applyJobId, rawText, tenantId, onProgress }) {
  const jobTemplate = JOB_TEMPLATES.find(j => j.id === applyJobId) || JOB_TEMPLATES[0];

  // Remove any key left over from the removed browser BYOK mode (never sent anywhere)
  try {
    localStorage.removeItem('gemini_api_key');
  } catch {
    // storage unavailable — nothing to clean
  }

  // Cache scope: tenant + competency weights + active Prompt Studio settings (see cacheService.generateCacheKey)
  const cacheScope = buildEvaluationCacheScope(jobTemplate, tenantId);

  // Step 1: IndexedDB Local Cache Lookup
  const cachedResult = await getCachedAnalysis(rawText, jobTemplate.id, cacheScope);
  if (cachedResult && cachedResult.mode !== 'LOCAL_FALLBACK') {
    if (onProgress) {
      onProgress({
        percent: 100,
        status: '⚡ IndexedDB 로컬 캐시에서 즉시 조회 완료 (토큰 비용 0원)'
      });
    }
    // Same text may be re-submitted under a different applicant name: keep the requested name
    return { ...cachedResult, name: name || cachedResult.name };
  }

  // Step 2: Client-Side PII Security & Blind Recruitment Anonymization (via Web Worker for large texts)
  const piiResult = await anonymizePIIInWorker(rawText, name);
  const cleanText = piiResult.anonymizedText;

  if (onProgress && piiResult.piiCount > 0) {
    onProgress({
      percent: 15,
      status: `🔒 개인식별정보(PII) 익명화 선처리 완료 (${piiResult.maskedCategories.join(', ')} 마스킹 적용)...`
    });
  }

  // Step 3: Server-side 4-Agent evaluation via the API gateway (Claude API)
  return analyzeWithBffGateway({
    name,
    applyJobId: jobTemplate.id,
    jobTemplate,
    cleanText,
    rawText,
    piiResult,
    cacheScope,
    tenantId: cacheScope.tenantId,
    onProgress
  });
}

/**
 * Builds the evaluation cache scope: current tenant (explicit arg -> TenantContext's localStorage key),
 * the job's competency weights and the active Prompt Studio addendum.
 */
export function buildEvaluationCacheScope(jobTemplate, tenantId) {
  let resolvedTenantId = tenantId || '';
  if (!resolvedTenantId) {
    try {
      resolvedTenantId = (typeof localStorage !== 'undefined' && localStorage.getItem('checkmate_current_tenant_id')) || '';
    } catch {
      resolvedTenantId = '';
    }
  }
  return {
    tenantId: resolvedTenantId,
    competencies: (jobTemplate?.competencies || []).map(c => ({ id: c.id, weight: c.weight })),
    promptAddendum: getActivePromptAddendum()
  };
}

// 게이트웨이 주소는 빌드 시 VITE_API_GATEWAY_URL 로만 결정합니다.
// window.location.origin 으로 대체하면 프론트 nginx 가 /api/* 에 index.html 을 돌려줘
// "Unexpected token '<'" 오류가 나므로 사용하지 않습니다 (#24). production 빌드는 vite.config.js 에서 미설정 시 실패합니다.
export function getApiBaseUrl() {
  const configured = (import.meta.env?.VITE_API_GATEWAY_URL || '').trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  if (import.meta.env?.PROD) {
    throw new Error('VITE_API_GATEWAY_URL 이 설정되지 않은 빌드입니다. API 게이트웨이 주소를 넣어 다시 빌드하세요 (docs/DEPLOY.md).');
  }
  return 'http://127.0.0.1:3001'; // 로컬 개발 전용
}

/**
 * Analyzes candidate via the API gateway. The gateway holds ANTHROPIC_API_KEY;
 * on failure the server's Korean error message is surfaced as-is (no fake scores, no key prompts).
 */
async function analyzeWithBffGateway({ name, applyJobId, jobTemplate, cleanText, rawText, piiResult, cacheScope, tenantId, onProgress }) {
  const apiBase = getApiBaseUrl();

  if (onProgress) {
    onProgress({ percent: 40, status: '🏢 평가 서버에서 4대 에이전트(Claude) 파이프라인 가동 중...' });
  }

  let resp;
  try {
    resp = await fetch(`${apiBase}/api/v1/evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Enterprise-Client-Id': 'checkmate-b2b-managed',
        ...(tenantId ? { 'X-Tenant-Id': tenantId } : {})
      },
      body: JSON.stringify({
        name,
        applyJobId,
        rawText: cleanText,
        // Prompt Studio lives in this browser's localStorage; the server formats and length-caps it.
        promptSettings: hasCustomPromptSettings() ? getCompanyPromptSettings() : null
      })
    });
  } catch (networkErr) {
    console.error('API gateway unreachable:', networkErr);
    throw new Error(`[AI 평가 실패] 평가 서버(${apiBase})에 연결할 수 없습니다. 게이트웨이 서버가 실행 중인지 확인하세요.`);
  }

  const body = await resp.json().catch(() => ({}));

  if (!resp.ok || body.error) {
    throw new Error(`[AI 평가 실패] ${body.message || body.error || `평가 서버 응답 오류 (HTTP ${resp.status})`}`);
  }

  // Attach local metadata
  body.rawText = cleanText;
  body.piiMeta = piiResult;
  body.mode = 'B2B_MANAGED_TOKEN';

  if (onProgress) {
    onProgress({ percent: 100, status: '✅ 4대 에이전트(Claude) 평가 완료' });
  }

  await saveAnalysisToCache(rawText, jobTemplate.id, body, cacheScope);
  return body;
}
