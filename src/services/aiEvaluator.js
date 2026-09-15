import { JOB_TEMPLATES } from '../data/jobTemplates';

/**
 * AI Grounding Evaluation Coordinator
 * Performs real-time Gemini API analysis or smart heuristic fallback evaluation
 */
export async function analyzeApplicant({ name, applyJobId, rawText, apiKey }) {
  const jobTemplate = JOB_TEMPLATES.find(j => j.id === applyJobId) || JOB_TEMPLATES[0];

  if (apiKey && apiKey.trim().length > 10) {
    try {
      return await analyzeWithGeminiAPI({ name, jobTemplate, rawText, apiKey });
    } catch (err) {
      console.warn("Gemini API call failed, falling back to smart heuristic engine:", err);
      return analyzeWithSmartRuleEngine({ name, jobTemplate, rawText });
    }
  }

  // Fallback to Smart Heuristic Engine
  return analyzeWithSmartRuleEngine({ name, jobTemplate, rawText });
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

/**
 * Smart Heuristic Grounding Engine (Offline/Fallback)
 */
function analyzeWithSmartRuleEngine({ name, jobTemplate, rawText }) {
  const sentences = rawText
    .split(/(?<=[.!?\n])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 5);

  const groundingEvidences = [];
  const interviewQuestions = [];

  let positiveScoreAdd = 0;
  let riskScoreSub = 0;
  let aiRiskHits = 0;

  // Pattern definitions
  const metricRegex = /(\d+(?:\.\d+)?%|\d+초|\d+건|\d+원|\d+배|\d+개|\d+만|\d+명)/;
  const actionKeywords = ["도입하여", "개선하여", "단축시켰습니다", "개발했습니다", "구축했습니다", "절감하고", "달성했습니다", "적용하고", "주도하였으며", "분석하여"];
  const riskKeywords = ["최고의", "완벽한", "손쉽게", "무한한", "어떠한 거친", "모든 역경", "천재적인", "자부합니다", "성공리에"];
  const verifyKeywords = ["성능 향상", "개선 작업", "문제를 발견", "경험은 부족하지만", "최적의 코드"];

  sentences.forEach((s, idx) => {
    const hasMetric = metricRegex.test(s);
    const hasAction = actionKeywords.some(kw => s.includes(kw));
    const hasRisk = riskKeywords.some(kw => s.includes(kw));
    const hasVerify = verifyKeywords.some(kw => s.includes(kw));

    if (hasRisk) {
      aiRiskHits += 2;
      riskScoreSub += 12;
      const compId = idx % 2 === 0 ? "problem_solving" : "tech_skill";
      groundingEvidences.push({
        id: `ev_${idx}`,
        quote: s,
        type: "risk",
        competencyId: compId,
        scoreImpact: -12,
        title: "상투적 과장 표현 및 구체적 근거 부재",
        explanation: "객관적 성과 수치나 기술적 행동 없이 주관적 완벽함이나 과장된 문구 사용."
      });
      if (interviewQuestions.length < 3) {
        interviewQuestions.push({
          id: `iq_${idx}`,
          basedQuote: s,
          category: "서류 사실관계 검증",
          question: `서류에 작성하신 "${s.slice(0, 30)}..." 문장과 관련하여, 실제 당면했던 객관적 제약 사항과 정량적 성과는 무엇이었습니까?`,
          intent: "과장된 수식어 속에 포함된 구체적 기여도 확인",
          checklist: ["정량적 지표 제시 가능 여부", "실제 본인 역할 비중 증명"]
        });
      }
    } else if (hasMetric && hasAction) {
      positiveScoreAdd += 15;
      const compId = s.includes("%") || s.includes("초") ? "problem_solving" : "tech_skill";
      groundingEvidences.push({
        id: `ev_${idx}`,
        quote: s,
        type: "positive",
        competencyId: compId,
        scoreImpact: 15,
        title: "수치 기반 명확한 실질 성과 근거",
        explanation: "문제 해결 과정 및 구체적 수치 개선 지표가 본문에 명확히 포함되어 있음."
      });
    } else if (hasMetric) {
      positiveScoreAdd += 10;
      groundingEvidences.push({
        id: `ev_${idx}`,
        quote: s,
        type: "positive",
        competencyId: "growth",
        scoreImpact: 10,
        title: "수치적 정량 지표 기술",
        explanation: "업무 수행 중 정량화된 수치 데이터를 기술함."
      });
    } else if (hasVerify || (hasAction && !hasMetric)) {
      groundingEvidences.push({
        id: `ev_${idx}`,
        quote: s,
        type: "verify",
        competencyId: "tech_skill",
        scoreImpact: 0,
        title: "성과 지표 데이터 면접 확인 필요",
        explanation: "행동에 대한 진술은 있으나 구체적 수치나 툴 활용법 면접 검증 요망."
      });
      if (interviewQuestions.length < 3) {
        interviewQuestions.push({
          id: `iq_${idx}`,
          basedQuote: s,
          category: "직무 기술 심층 검증",
          question: `"${s.slice(0, 32)}..." 서술 내용에서 실제로 활용하신 아키텍처/도구의 작동 원리와 측정 지표는 무엇이었습니까?`,
          intent: "기술 실질 역량 깊이 파악",
          checklist: ["기술 개념 이해 정확도", "실무 적용 경험 검증"]
        });
      }
    }
  });

  // Score computation
  const baseScore = 75;
  const rawTotal = Math.min(98, Math.max(45, baseScore + positiveScoreAdd - riskScoreSub));
  const aiTextProb = Math.min(95, Math.max(8, Math.round((aiRiskHits / (sentences.length || 1)) * 40 + 10)));

  let decision = "INTERVIEW";
  let decisionReason = "서류 전반의 역량이 수긍 가능하나 면접을 통한 세부 확인 필요.";

  if (rawTotal >= 88) {
    decision = "STRONG_PASS";
    decisionReason = "수치화된 정량 성과 및 구체적 문제해결 본문 근거(Grounding)가 매우 우수함.";
  } else if (rawTotal < 65) {
    decision = "REJECT";
    decisionReason = "상투적인 과장 표현이 많고 정량적 근거가 크게 부족하여 서류 통과 미달.";
  } else if (rawTotal < 78) {
    decision = "HOLD";
    decisionReason = "기초 역량은 존재하나 실무 대용량 처리 또는 핵심 역량 검증이 추가로 필요함.";
  }

  // Competency scores calculation
  const competencyScores = {};
  jobTemplate.competencies.forEach(c => {
    const delta = (c.id === "problem_solving" || c.id === "tech_skill") 
      ? (positiveScoreAdd > 15 ? 12 : -5)
      : 5;
    competencyScores[c.id] = Math.min(98, Math.max(50, Math.round(rawTotal + (Math.random() * 8 - 4) + delta)));
  });

  return {
    id: `app_${Date.now()}`,
    name,
    applyJobId: jobTemplate.id,
    applyJobTitle: jobTemplate.title,
    rawText,
    analysis: {
      summary: {
        totalScore: Math.round(rawTotal),
        decision,
        decisionReason,
        aiTextProbability: aiTextProb
      },
      competencyScores,
      groundingEvidences,
      interviewQuestions
    }
  };
}
