/**
 * Enterprise Google Cloud Vertex AI Engine Service
 * Strictly enforces Enterprise Proxy Gateway Architecture (/api/v1/enterprise/vertex-evaluator)
 * No Consumer API keys, no local fallback engines.
 */
export async function analyzeApplicant({ name, applyJobId, rawText }) {
  try {
    const response = await fetch('/api/v1/enterprise/vertex-evaluator', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Enterprise-Client-Id': 'HR-AX-CORP-CLIENT-01'
      },
      body: JSON.stringify({ name, applyJobId, rawText })
    });

    if (!response.ok) {
      throw new Error(`Enterprise Proxy Gateway Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Enterprise Vertex AI Service Error:", err);
    throw new Error("대기업 엔터프라이즈 Vertex AI 프록시 게이트웨이 연결 실패. (Google Cloud Vertex AI & BigQuery Audit 서비스 점검 필요)");
  }
}
