import { JOB_TEMPLATES } from '../data/jobTemplates';
import { runWorkerEvaluation } from './workerService';
import { anonymizePII } from '../utils/piiAnonymizer';

/**
 * AI Grounding Evaluation Coordinator
 * Performs real-time Gemini API analysis or Web Worker background heuristic fallback evaluation
 */
export async function analyzeApplicant({ name, applyJobId, rawText, apiKey, onProgress }) {
  const jobTemplate = JOB_TEMPLATES.find(j => j.id === applyJobId) || JOB_TEMPLATES[0];

  // Step 1: Client-Side PII Security & Blind Recruitment Anonymization
  const piiResult = anonymizePII(rawText, name);
  const cleanText = piiResult.anonymizedText;

  if (onProgress && piiResult.piiCount > 0) {
    onProgress({
      percent: 15,
      status: `🔒 개인식별정보(PII) 익명화 선처리 완료 (${piiResult.maskedCategories.join(', ')} 마스킹 적용)...`
    });
  }

  if (apiKey && apiKey.trim().length > 10) {
    try {
      if (onProgress) onProgress({ percent: 25, status: 'Google Cloud Gemini API 통신 연결 중...' });
      const result = await analyzeWithGeminiAPI({ name, jobTemplate, rawText: cleanText, apiKey });
      if (onProgress) onProgress({ percent: 100, status: 'Gemini API 분석 완료' });
      result.piiMeta = piiResult;
      return result;
    } catch (err) {
      console.warn("Gemini API call failed, falling back to Web Worker engine:", err);
      const res = await runWorkerEvaluation({ name, jobTemplate, rawText: cleanText, onProgress });
      res.piiMeta = piiResult;
      return res;
    }
  }

  // Fallback to Web Worker Background Parsing Engine
  const result = await runWorkerEvaluation({ name, jobTemplate, rawText: cleanText, onProgress });
  result.piiMeta = piiResult;
  return result;
}

/**
 * Gemini API Live Call with Structured Prompting
 */
async function analyzeWithGeminiAPI({ name, jobTemplate, rawText, apiKey }) {
  const prompt = `
You are an expert HR Executive & Senior Recruiter AI.
Evaluate the following candidate self-introduction text based on the provided job requirements and criteria.

[Candidate Name]: ${name}
[Target Job Title]: ${jobTemplate.title}
[Competency Weights]: ${JSON.stringify(jobTemplate.competencies)}

[Candidate Self-Introduction Text]:
"""
${rawText}
"""

Instructions:
1. Extract exact quotes (grounding sentences) from the text that justify your score.
   - positive: Quantitative metrics, clear problem-solving process, specific tool/methodology used.
   - risk: Overstated claims, buzzwords without proof, AI-generated generic fluff.
   - verify: Claims of achievement missing exact metrics that HR needs to verify during interview.
2. Ensure every 'quote' in groundingEvidences is an EXACT substring from the candidate's text.
3. Calculate scores (0 to 100) for each competency in ${JSON.stringify(jobTemplate.competencies.map(c => c.id))}.
4. Provide a total score (0-100), decision ('STRONG_PASS' | 'INTERVIEW' | 'HOLD' | 'REJECT'), decisionReason, and aiTextProbability (0-100%).
5. Generate 2-4 tailored interview questions based on the weak points or 'risk/verify' grounding quotes.

Return ONLY a valid JSON object matching this exact structure:
{
  "summary": {
    "totalScore": 85,
    "decision": "STRONG_PASS",
    "decisionReason": "Summary reason here",
    "aiTextProbability": 15
  },
  "competencyScores": {
    "problem_solving": 88,
    "tech_skill": 85,
    "teamwork": 80,
    "growth": 82,
    "ethics": 80
  },
  "groundingEvidences": [
    {
      "quote": "exact sentence from rawText",
      "type": "positive",
      "competencyId": "problem_solving",
      "scoreImpact": 12,
      "title": "Brief title",
      "explanation": "Detailed rationale"
    }
  ],
  "interviewQuestions": [
    {
      "basedQuote": "exact sentence from rawText",
      "category": "Technique Verification",
      "question": "Specific question for candidate",
      "intent": "Why asking this",
      "checklist": ["Checklist item 1", "Checklist item 2"]
    }
  ]
}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API Error: ${response.statusText}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  const parsed = JSON.parse(text);

  return {
    id: `app_${Date.now()}`,
    name,
    applyJobId: jobTemplate.id,
    applyJobTitle: jobTemplate.title,
    rawText,
    analysis: parsed
  };
}
