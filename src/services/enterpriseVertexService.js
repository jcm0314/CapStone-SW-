import { analyzeApplicant as analyzeWithStandardEngine } from './aiEvaluator';

/**
 * Enterprise Vertex AI & Dual-Mode Adaptor
 * Supports Enterprise Proxy Gateway (Google Cloud Vertex AI) & Standard Mode
 */
export async function analyzeEnterpriseApplicant({ name, applyJobId, rawText, apiKey, mode = 'STANDARD' }) {
  if (mode === 'ENTERPRISE_VERTEX') {
    try {
      // Enterprise Proxy Gateway Call (Node.js Server Gateway + Vertex AI + BigQuery Audit)
      const response = await fetch('/api/v1/enterprise/vertex-evaluator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Enterprise-Client-Id': 'HR-AX-CORP-CLIENT-01'
        },
        body: JSON.stringify({ name, applyJobId, rawText })
      });

      if (response.ok) {
        return await response.json();
      }
    } catch (err) {
      console.warn("Enterprise Vertex Gateway offline, falling back to standard engine:", err);
    }
  }

  // Fallback to Standard Engine (Gemini API or Smart Rule Engine)
  return await analyzeWithStandardEngine({ name, applyJobId, rawText, apiKey });
}
