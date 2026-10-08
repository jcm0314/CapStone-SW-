import { JOB_TEMPLATES } from '../data/jobTemplates';
import { anonymizePII } from '../utils/piiAnonymizer';
import { getCachedAnalysis, saveAnalysisToCache } from './cacheService';
import { findFuzzyMatch } from '../utils/fuzzyMatcher';
import { executeMultiAgentEvaluation } from './multiAgentEvaluator';

/**
 * AI Grounding Evaluation Coordinator (Gemini API Only)
 * Note: Local fallback engines (Web Worker heuristic) are disabled by policy.
 * Evaluation strictly relies on the Google Gemini API.
 */
export async function analyzeApplicant({ name, applyJobId, rawText, apiKey: providedApiKey, onProgress }) {
  const jobTemplate = JOB_TEMPLATES.find(j => j.id === applyJobId) || JOB_TEMPLATES[0];

  // Step 1: Resolve Gemini API Key (Parameter -> localStorage -> Environment Variable)
  const apiKey = (
    providedApiKey ||
    (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') ||
    import.meta.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();

  if (!apiKey || apiKey.length < 5) {
    throw new Error('Google Gemini API 키가 설정되지 않았습니다. 상단 헤더의 [API Key 설정] 버튼을 눌러 유효한 API Key를 등록해주세요.');
  }

  // Step 2: IndexedDB Local Cache Lookup (Strictly cached Gemini results)
  const cachedResult = await getCachedAnalysis(rawText, jobTemplate.id);
  if (cachedResult && cachedResult.mode !== 'LOCAL_FALLBACK') {
    if (onProgress) {
      onProgress({
        percent: 100,
        status: '⚡ IndexedDB 로컬 캐시에서 즉시 조회 완료 (토큰 비용 0원)'
      });
    }
    return cachedResult;
  }

  // Step 3: Client-Side PII Security & Blind Recruitment Anonymization
  const piiResult = anonymizePII(rawText, name);
  const cleanText = piiResult.anonymizedText;

  if (onProgress && piiResult.piiCount > 0) {
    onProgress({
      percent: 15,
      status: `🔒 개인식별정보(PII) 익명화 선처리 완료 (${piiResult.maskedCategories.join(', ')} 마스킹 적용)...`
    });
  }

  if (onProgress) {
    onProgress({ percent: 35, status: 'Google Cloud Gemini API 통신 연결 및 심층 분석 중...' });
  }

  // Step 4: Run 4-Stage HR Multi-Agent Pipeline (Grounding -> Critic -> Supervisor -> Interviewer)
  let finalResult = null;
  try {
    finalResult = await executeMultiAgentEvaluation({
      name,
      jobTemplate,
      cleanText,
      originalRawText: rawText,
      apiKey,
      onProgress
    });
  } catch (multiAgentErr) {
    console.warn("Multi-Agent pipeline encountered an issue, falling back to Single Prompt Engine:", multiAgentErr);
    if (onProgress) {
      onProgress({ percent: 40, status: '단일 프롬프트 백업 엔진으로 전환하여 지속 분석 중...' });
    }
    finalResult = await analyzeWithGeminiAPI({
      name,
      jobTemplate,
      rawText: cleanText,
      originalRawText: rawText,
      apiKey,
      onProgress
    });
  }

  if (finalResult) {
    finalResult.piiMeta = piiResult;
    await saveAnalysisToCache(rawText, jobTemplate.id, finalResult);
  }

  return finalResult;
}

/**
 * Gemini API Live Call with Structured JSON Prompting
 * Cycles through official supported Gemini models (gemini-1.5-flash, gemini-2.0-flash, gemini-2.5-flash)
 */
async function analyzeWithGeminiAPI({ name, jobTemplate, rawText, originalRawText, apiKey, onProgress }) {
  const prompt = `
당신은 대기업 최고 수준의 HR 채용 전문가 및 시니어 면접관 AI입니다.
아래 지원자의 자기소개서 본문을 꼼꼼히 검토하고, 직무 역량 기준에 따라 엄격하고 공정하게 평가하세요.

[지원자 성명]: ${name}
[지원 직무]: ${jobTemplate.title}
[직무 역량 평가 가중치]: ${JSON.stringify(jobTemplate.competencies)}

[지원자 자기소개서 본문]:
"""
${rawText}
"""

[평가 지침]:
1. 지원서 본문에서 점수 산출의 근거가 된 문장(Grounding Sentence)을 반드시 원문 그대로 발췌(quote)하세요.
   - positive (긍정): 정량적 수치 성과(%, 건, 초, 원), 구체적인 문제 해결 프로세스, 실질적인 기술 스택 적용 경험.
   - risk (과장/리스크): 근거 없는 주관적 과장 표현, 상투적 미사여구, 구체적 기여도가 없는 AI 생성 의심 문장.
   - verify (면접 검증 필요): 성과 언급은 있으나 구체적인 역할이나 측정 지표가 누락되어 면접 시 반드시 확인해야 하는 문장.
2. 중요: groundingEvidences의 "quote"는 반드시 지원자 본문 텍스트 안에 실제로 존재하는 문장이어야 합니다.
3. 5대 역량 항목별로 0~100점 점수를 산출하세요 (${JSON.stringify(jobTemplate.competencies.map(c => c.id))}).
4. 종합 점수(0~100점), 최종 판정('STRONG_PASS' | 'INTERVIEW' | 'HOLD' | 'REJECT'), 상세 판정 사유, 그리고 AI 생성/과장 확률(0~100%)을 도출하세요.
5. risk 또는 verify로 분류된 약점 문장을 기반으로 실제 면접관이 사용할 수 있는 심층 검증 면접 질문 2~4개와 체크리스트를 생성하세요.

반드시 다른 설명 없이 아래 JSON 규격과 100% 일치하는 유효한 JSON 형식만을 반환하세요:
{
  "summary": {
    "totalScore": 88,
    "decision": "STRONG_PASS",
    "decisionReason": "정량적 성능 개선 지표와 분산 시스템 장애 극복 경험이 뚜렷하여 실무 즉시 투입 가능.",
    "aiTextProbability": 12
  },
  "competencyScores": {
    "problem_solving": 92,
    "tech_skill": 90,
    "teamwork": 85,
    "growth": 82,
    "ethics": 88
  },
  "groundingEvidences": [
    {
      "quote": "본문 속 실제 문장",
      "type": "positive",
      "competencyId": "problem_solving",
      "scoreImpact": 15,
      "title": "수치 기반 성능 개선",
      "explanation": "Redis 캐싱을 도입하여 86.8% 개선한 정량적 성과가 돋보임."
    }
  ],
  "interviewQuestions": [
    {
      "basedQuote": "본문 속 실제 문장",
      "category": "직무 기술 검증",
      "question": "구체적인 기술 검증 질문",
      "intent": "질문의 목적 및 의도",
      "checklist": ["확인할 사항 1", "확인할 사항 2"]
    }
  ]
}
`;

  // Candidate models to try in priority order
  const candidateModels = [
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-2.5-flash',
    'gemini-1.5-pro'
  ];

  let lastError = null;
  let parsed = null;
  let successfulModel = '';

  for (const model of candidateModels) {
    try {
      if (onProgress) {
        onProgress({ percent: 50, status: `Google Gemini (${model}) AI 엔진 연동 중...` });
      }

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        const errMsg = errorJson.error?.message || response.statusText;
        throw new Error(`[${model}] HTTP ${response.status}: ${errMsg}`);
      }

      const data = await response.json();
      const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawOutput) {
        throw new Error(`[${model}] 모델 응답에서 콘텐츠를 찾을 수 없습니다.`);
      }

      // Clean JSON markdown code fence if present
      let cleanJson = rawOutput.trim();
      if (cleanJson.startsWith('```json')) {
        cleanJson = cleanJson.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
      } else if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      parsed = JSON.parse(cleanJson);
      successfulModel = model;
      break; // Success! Break out of model loop
    } catch (err) {
      console.warn(`Gemini Model [${model}] attempt failed:`, err.message);
      lastError = err;
      // If it's an API key invalid error, don't keep retrying other models
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('403')) {
        break;
      }
    }
  }

  if (!parsed) {
    throw new Error(`Gemini API 서류 분석 실패: ${lastError?.message || '모든 Gemini 모델 호출에 실패했습니다. API 키 및 네트워크 연결을 확인해주세요.'}`);
  }

  if (onProgress) {
    onProgress({ percent: 90, status: '근거 문장 위치 매핑 및 HITL 데이터 구조 정규화 중...' });
  }

  // Grounding evidences enrichment & fallback substring indexing
  const targetText = originalRawText || rawText;
  const enrichedEvidences = (parsed.groundingEvidences || []).map((ev, idx) => {
    let startIndex = -1;
    let endIndex = -1;

    if (ev.quote) {
      startIndex = targetText.indexOf(ev.quote);
      if (startIndex !== -1) {
        endIndex = startIndex + ev.quote.length;
      } else {
        const fuzzy = findFuzzyMatch(targetText, ev.quote, 0.70);
        if (fuzzy) {
          startIndex = fuzzy.start;
          endIndex = fuzzy.end;
        }
      }
    }

    return {
      id: `ev_${idx + 1}`,
      quote: ev.quote || '',
      startIndex,
      endIndex,
      type: ['positive', 'risk', 'verify'].includes(ev.type) ? ev.type : 'verify',
      competencyId: ev.competencyId || 'problem_solving',
      scoreImpact: typeof ev.scoreImpact === 'number' ? ev.scoreImpact : (ev.type === 'positive' ? 12 : ev.type === 'risk' ? -10 : 0),
      title: ev.title || '근거 항목',
      explanation: ev.explanation || ''
    };
  });

  // Interview questions enrichment
  const enrichedQuestions = (parsed.interviewQuestions || []).map((iq, idx) => ({
    id: `iq_${idx + 1}`,
    basedQuote: iq.basedQuote || '',
    category: iq.category || '역량 검증',
    question: iq.question || '',
    intent: iq.intent || '답변 진위 및 문제 해결 역량 확인',
    checklist: Array.isArray(iq.checklist) ? iq.checklist : ['구체적 경험 제시 여부', '역할 및 기여도 증명']
  }));

  if (onProgress) {
    onProgress({ percent: 100, status: 'Gemini AI 평가 완료' });
  }

  return {
    id: `app_${Date.now()}`,
    name,
    applyJobId: jobTemplate.id,
    applyJobTitle: jobTemplate.title,
    rawText: targetText,
    mode: 'GEMINI_API',
    modelUsed: successfulModel,
    isHumanVerified: false,
    analyzedAt: new Date().toISOString(),
    analysis: {
      summary: parsed.summary || {
        totalScore: 75,
        decision: 'HOLD',
        decisionReason: 'Gemini AI 기본 분석 완료',
        aiTextProbability: 20
      },
      competencyScores: parsed.competencyScores || {
        problem_solving: 75,
        tech_skill: 75,
        teamwork: 75,
        growth: 75,
        ethics: 75
      },
      groundingEvidences: enrichedEvidences,
      interviewQuestions: enrichedQuestions
    }
  };
}
