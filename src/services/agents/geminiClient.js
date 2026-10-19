/**
 * Shared Gemini API Client for Multi-Agent Pipeline
 * Uses the standard 'gemini-1.5-flash' model with clear, diagnostic error reporting.
 */

// Primary model: fast, cost-efficient, 1M context window
const PRIMARY_MODEL = 'gemini-1.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-pro';

/**
 * Diagnostic helper to format Google API errors into user-friendly explanations
 */
function parseGoogleApiError(status, errorJson, defaultMsg) {
  const rawMsg = errorJson?.error?.message || defaultMsg || '';

  if (status === 400 && rawMsg.includes('API_KEY_INVALID')) {
    return '유효하지 않은 Gemini API Key입니다. aistudio.google.com/apikey 에서 키를 다시 발급받아 확인해주세요.';
  }
  if (status === 403 && (rawMsg.includes('disabled') || rawMsg.includes('not been used in project'))) {
    return '해당 GCP 프로젝트에 "Generative Language API"가 활성화되어 있지 않습니다. Google Cloud Console(또는 AI Studio)에서 API를 [사용 설정] 해주세요.';
  }
  if (status === 404) {
    return `[HTTP 404] 구글 API에서 모델(${PRIMARY_MODEL})을 찾을 수 없습니다. Google Cloud 일반 API 키 대신 반드시 aistudio.google.com/apikey 에서 발급한 키를 사용해주세요. (상세: ${rawMsg})`;
  }
  if (status === 429) {
    return 'Google Gemini API 무료 요청 한도(15 RPM)를 초과했습니다. 잠시 후(약 30초 뒤) 다시 시도해주세요.';
  }
  return `[HTTP ${status}] ${rawMsg}`;
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
    throw new Error('Google Gemini API 키가 유효하지 않습니다. 상단 헤더의 [API Key 설정]에서 키를 등록해주세요.');
  }

  const cleanKey = apiKey.trim();
  const modelsToTry = [PRIMARY_MODEL, FALLBACK_MODEL];
  let lastError = null;

  for (const model of modelsToTry) {
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
        const formattedErr = parseGoogleApiError(response.status, errorJson, response.statusText);
        throw new Error(formattedErr);
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
      return { data: parsed, modelUsed: model };
    } catch (err) {
      console.warn(`[Gemini Client] Model [${model}] failed:`, err.message);
      lastError = err;
      // Stop immediately on critical credential errors (no need to retry other models)
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('403') || err.message.includes('Generative Language API')) {
        break;
      }
    }
  }

  throw new Error(`Gemini API 통신 실패: ${lastError?.message || '알 수 없는 오류'}`);
}

// Backward compatibility export
export async function getAvailableGeminiModels() {
  return [PRIMARY_MODEL, FALLBACK_MODEL];
}


