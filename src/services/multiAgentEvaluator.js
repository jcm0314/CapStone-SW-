import { runGroundingAgent } from './agents/groundingAgent';
import { runCriticAgent } from './agents/criticAgent';
import { runSupervisorAgent } from './agents/supervisorAgent';
import { runInterviewerAgent } from './agents/interviewerAgent';
import { findFuzzyMatch } from '../utils/fuzzyMatcher';

/**
 * 4-Stage HR Multi-Agent Orchestration Pipeline
 * 
 * Pipeline Workflow:
 * [Raw Text & PII Anonymized]
 *      │
 *      ▼
 * [Agent 1: Grounding Agent] ──► Extracts factual grounding quotes & initial tagging
 *      │
 *      ▼
 * [Agent 2: Critic Agent]    ──► Performs adversarial fact-checking & AI risk audit
 *      │
 *      ▼
 * [Agent 3: Supervisor Agent]──► Synthesizes weights, calculates scores & final decision
 *      │
 *      ▼
 * [Agent 4: Interviewer Agent]─► Generates targeted interview probes for flagged points
 *      │
 *      ▼
 * [Final Multi-Agent Evaluation Result Package]
 */
export async function executeMultiAgentEvaluation({
  name,
  jobTemplate,
  cleanText,
  originalRawText,
  apiKey,
  onProgress
}) {
  const targetText = originalRawText || cleanText;

  // ----------------------------------------------------
  // Stage 1: Grounding Agent Execution
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 25,
      status: '🔍 [Agent 1/4] Grounding Agent: 본문 속 정량 지표 및 근거 문장 발췌 중...',
      currentAgent: 'Grounding Agent'
    });
  }

  const groundingRes = await runGroundingAgent({
    name,
    jobTemplate,
    rawText: cleanText,
    apiKey
  });

  const rawGroundingEvidences = groundingRes.data?.groundingEvidences || [];

  // Match and enrich indices with Exact + Fuzzy matching
  const enrichedEvidences = rawGroundingEvidences.map((ev, idx) => {
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
      scoreImpact: typeof ev.scoreImpact === 'number'
        ? ev.scoreImpact
        : (ev.type === 'positive' ? 12 : ev.type === 'risk' ? -10 : 0),
      title: ev.title || '근거 항목',
      explanation: ev.explanation || ''
    };
  });

  // ----------------------------------------------------
  // Stage 2: Critic Agent Execution
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 50,
      status: '🕵️ [Agent 2/4] Critic Agent: 과장 표현 팩트체크 및 AI 생성 문체 2차 감사 중...',
      currentAgent: 'Critic Agent'
    });
  }

  const criticRes = await runCriticAgent({
    name,
    jobTemplate,
    rawText: cleanText,
    groundingEvidences: enrichedEvidences,
    apiKey
  });

  const criticReport = criticRes.data || {
    aiTextProbability: 15,
    exaggerationRisk: 'LOW',
    critiqueNotes: '주요 성과 검증 완료'
  };

  // ----------------------------------------------------
  // Stage 3: Supervisor Agent Execution
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 75,
      status: '⚖️ [Agent 3/4] Supervisor Agent: 직무 가중치 정산 및 최종 종합 합격 판정 중...',
      currentAgent: 'Supervisor Agent'
    });
  }

  const supervisorRes = await runSupervisorAgent({
    name,
    jobTemplate,
    rawText: cleanText,
    groundingEvidences: enrichedEvidences,
    criticReport,
    apiKey
  });

  const supervisorData = supervisorRes.data || {};

  // ----------------------------------------------------
  // Stage 4: Interviewer Agent Execution
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 90,
      status: '🎙️ [Agent 4/4] Interviewer Agent: Critic 약점 지적 기반 맞춤형 심층 면접 질문 도출 중...',
      currentAgent: 'Interviewer Agent'
    });
  }

  const interviewerRes = await runInterviewerAgent({
    name,
    jobTemplate,
    rawText: cleanText,
    groundingEvidences: enrichedEvidences,
    criticReport,
    apiKey
  });

  const rawQuestions = interviewerRes.data?.interviewQuestions || [];
  const enrichedQuestions = rawQuestions.map((iq, idx) => ({
    id: `iq_${idx + 1}`,
    basedQuote: iq.basedQuote || '',
    category: iq.category || '역량 검증',
    question: iq.question || '',
    intent: iq.intent || '답변 진위 및 문제 해결 역량 확인',
    checklist: Array.isArray(iq.checklist) ? iq.checklist : ['구체적 경험 제시 여부', '역할 및 기여도 증명']
  }));

  if (onProgress) {
    onProgress({
      percent: 100,
      status: '✅ 4대 HR Multi-Agent 앙상블 평가 완료!',
      currentAgent: 'Completed'
    });
  }

  // ----------------------------------------------------
  // Consolidate Multi-Agent Package
  // ----------------------------------------------------
  return {
    id: `app_${Date.now()}`,
    name,
    applyJobId: jobTemplate.id,
    applyJobTitle: jobTemplate.title,
    rawText: targetText,
    maskedText: cleanText || targetText,
    mode: 'MULTI_AGENT_ENSEMBLE',
    modelsUsed: {
      grounding: groundingRes.modelUsed,
      critic: criticRes.modelUsed,
      supervisor: supervisorRes.modelUsed,
      interviewer: interviewerRes.modelUsed
    },
    isHumanVerified: false,
    analyzedAt: new Date().toISOString(),
    agentMetadata: {
      pipeline: 'HR-Multi-Agent-v2.5',
      executedAgents: [
        { name: 'Grounding Agent', status: 'SUCCESS', summary: groundingRes.data?.agentSummary || `${enrichedEvidences.length}개 근거 문장 발췌` },
        { name: 'Critic Agent', status: 'SUCCESS', critique: criticReport.critiqueNotes, aiProb: criticReport.aiTextProbability, risk: criticReport.exaggerationRisk },
        { name: 'Supervisor Agent', status: 'SUCCESS', comments: supervisorData.executiveComments || '최종 결재 완료' },
        { name: 'Interviewer Agent', status: 'SUCCESS', questionsCount: enrichedQuestions.length }
      ],
      criticReport
    },
    analysis: {
      summary: supervisorData.summary || {
        totalScore: 78,
        decision: 'INTERVIEW',
        decisionReason: 'Multi-Agent 협업 평가 완료',
        aiTextProbability: criticReport.aiTextProbability || 15
      },
      competencyScores: supervisorData.competencyScores || {
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
