/**
 * Shared Gemini API Client for Multi-Agent Pipeline
 */

const CANDIDATE_MODELS = [
  'gemini-1.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash',
  'gemini-1.5-pro'
];

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

  let lastError = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
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
