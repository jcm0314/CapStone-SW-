/**
 * Shared Gemini API Client for Multi-Agent Pipeline
 * Supports Auto-Discovery via ModelService.ListModels for 100% model availability
 */

const DEFAULT_CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.0-flash-exp',
  'gemini-1.5-pro',
  'gemini-1.5-pro-latest',
  'gemini-1.5-flash-8b',
  'gemini-pro'
];

// In-memory cache for discovered/working models for the active session
let cachedWorkingModel = null;
let discoveredModelsCache = null;

/**
 * Discovers available models for the given API key using ModelService.ListModels
 * @param {string} apiKey
 * @returns {Promise<string[]>}
 */
export async function getAvailableGeminiModels(apiKey) {
  if (discoveredModelsCache && discoveredModelsCache.length > 0) {
    return discoveredModelsCache;
  }

  const key = apiKey.trim();
  const models = [...DEFAULT_CANDIDATE_MODELS];

  try {
    const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    if (listRes.ok) {
      const listData = await listRes.json();
      if (Array.isArray(listData.models)) {
        const liveModels = listData.models
          .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
          .map(m => m.name.replace(/^models\//, ''));

        if (liveModels.length > 0) {
          // Sort: flash models first (fast & cost-efficient), then pro, then others
          liveModels.sort((a, b) => {
            const aFlash = a.includes('flash') ? -1 : 1;
            const bFlash = b.includes('flash') ? -1 : 1;
            return aFlash - bFlash;
          });

          // Prepend discovered live models to the candidate list (deduped)
          const merged = Array.from(new Set([...liveModels, ...models]));
          discoveredModelsCache = merged;
          return merged;
        }
      }
    }
  } catch (err) {
    console.warn('[Gemini Client] Failed to list live models, falling back to static list:', err.message);
  }

  return models;
}

/**
 * Calls Gemini API with structured JSON output expectation
 * @param {object} params
 * @param {string} params.prompt
 * @param {string} params.apiKey
 * @param {number} [params.temperature=0.2]
 * @returns {Promise<{ data: any, modelUsed: string }>}
 */
export async function callGeminiJson({ prompt, apiKey, temperature = 0.2 }) {
  if (!apiKey || apiKey.trim().length < 5) {
    throw new Error('Google Gemini API 키가 유효하지 않습니다.');
  }

  const cleanKey = apiKey.trim();

  // If we already found a working model in this session, try it first!
  const candidateModels = await getAvailableGeminiModels(cleanKey);
  const prioritizedModels = cachedWorkingModel 
    ? [cachedWorkingModel, ...candidateModels.filter(m => m !== cachedWorkingModel)]
    : candidateModels;

  let lastError = null;

  for (const model of prioritizedModels) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature,
              responseMimeType: 'application/json'
            }
          })
        }
      );

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errMsg = errorJson.error?.message || response.statusText;
        throw new Error(`[${model}] HTTP ${response.status}: ${errMsg}`);
      }

      const resData = await response.json();
      const rawOutput = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) {
        throw new Error(`[${model}] 모델 응답에서 콘텐츠를 찾을 수 없습니다.`);
      }

      let cleanJson = rawOutput.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      const parsed = JSON.parse(cleanJson);
      cachedWorkingModel = model; // Cache working model for lightning-fast next calls
      return { data: parsed, modelUsed: model };
    } catch (err) {
      console.warn(`[Multi-Agent Gemini Client] Model [${model}] failed:`, err.message);
      lastError = err;
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('403')) {
        break; // Stop immediately if API key itself is wrong
      }
    }
  }

  throw new Error(`Gemini API 통신 실패: ${lastError?.message || '모든 모델 응답 실패'}`);
}

