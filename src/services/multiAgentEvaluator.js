import { runGroundingAgent } from './agents/groundingAgent.js';
import { runCriticAgent } from './agents/criticAgent.js';
import { runSupervisorAgent } from './agents/supervisorAgent.js';
import { runInterviewerAgent } from './agents/interviewerAgent.js';
import { enrichEvidencesInWorker } from './workerService.js';

/**
 * 4-Stage HR Multi-Agent Orchestration Pipeline (DAG + Promise.allSettled Fault Isolation)
 *
 * Pipeline Workflow:
 * [Raw Text & PII Anonymized]
 *      │
 *      ▼
 * [Agent 1: Grounding Agent] ──► Extracts factual grounding quotes & Web Worker Fuzzy Offset Indexing
 *      │
 *      ▼
 * [Agent 2: Critic Agent]    ──► Performs adversarial fact-checking & AI risk cross-audit
 *      │
 *      ├───────────────────────────────────────┐ (Promise.allSettled Parallel Execution)
 *      ▼                                       ▼
 * [Agent 3: Supervisor Agent]           [Agent 4: Interviewer Agent]
 *  Synthesizes weights & final score     Generates targeted interview probes
 *      │                                       │
 *      └───────────────────┬───────────────────┘
 *                          ▼
 * [Final Multi-Agent Evaluation Result Package]
 */
export async function executeMultiAgentEvaluation({
  name,
  jobTemplate,
  cleanText,
  originalRawText,
  promptAddendum,
  tenantId,
  onProgress
}) {
  const targetText = originalRawText || cleanText;

  // ----------------------------------------------------
  // Stage 1: Grounding Agent Execution + Worker Offset Matching
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 25,
      status: '🔍 [Agent 1/4] Grounding Agent: 본문 속 정량 지표 및 근거 문장 발췌 중...',
      currentAgent: 'Grounding Agent'
    });
  }

  const groundingRes = await runGroundingAgent({
    jobTemplate,
    rawText: cleanText,
    promptAddendum
  });

  const rawGroundingEvidences = groundingRes.data?.groundingEvidences || [];

  // Match and enrich character indices via Web Worker (or sync fallback in Node/Test)
  const enrichedEvidences = await enrichEvidencesInWorker(targetText, rawGroundingEvidences, 0.70);

  // ----------------------------------------------------
  // Stage 2: Critic Agent Execution (Adversarial Cross-Audit)
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 50,
      status: '🕵️ [Agent 2/4] Critic Agent: 과장 표현 팩트체크 및 AI 생성 문체 2차 감사 중...',
      currentAgent: 'Critic Agent'
    });
  }

  const criticRes = await runCriticAgent({
    jobTemplate,
    rawText: cleanText,
    groundingEvidences: enrichedEvidences,
    promptAddendum
  });

  // No invented defaults: a missing critic report fails the evaluation instead of faking "LOW risk".
  const criticReport = criticRes.data;
  if (!criticReport) {
    throw new Error('Critic Agent가 감사 보고서를 반환하지 않았습니다.');
  }

  // ----------------------------------------------------
  // Stage 3 & 4: Parallel Execution via Promise.allSettled
  // Supervisor Agent (Scoring) + Interviewer Agent (Probes)
  // ----------------------------------------------------
  if (onProgress) {
    onProgress({
      percent: 75,
      status: '⚖️ [Agent 3/4] Supervisor Agent: 직무 가중치 정산 및 최종 종합 합격 판정 중...',
      currentAgent: 'Supervisor Agent'
    });
    onProgress({
      percent: 90,
      status: '🎙️ [Agent 4/4] Interviewer Agent: Critic 약점 지적 기반 맞춤형 심층 면접 질문 도출 중...',
      currentAgent: 'Interviewer Agent'
    });
  }

  const [supervisorOutcome, interviewerOutcome] = await Promise.allSettled([
    runSupervisorAgent({
      jobTemplate,
      groundingEvidences: enrichedEvidences,
      criticReport,
      tenantId,
      promptAddendum
    }),
    runInterviewerAgent({
      jobTemplate,
      groundingEvidences: enrichedEvidences,
      criticReport,
      promptAddendum
    })
  ]);

  // The score/decision comes only from the Supervisor Agent: if it fails, the evaluation fails (no fake score).
  if (supervisorOutcome.status === 'rejected') {
    throw supervisorOutcome.reason;
  }

  const supervisorRes = supervisorOutcome.value;
  if (!supervisorRes.data?.summary || !supervisorRes.data?.competencyScores) {
    throw new Error('Supervisor Agent가 점수/판정을 반환하지 않았습니다.');
  }

  // Interviewer failure only degrades (no questions) — it never affects the score.
  const interviewerRes = interviewerOutcome.status === 'fulfilled'
    ? interviewerOutcome.value
    : { modelUsed: null, data: { interviewQuestions: [] } };
  if (interviewerOutcome.status === 'rejected') {
    console.warn('[Multi-Agent] Interviewer Agent failed, returning without interview questions:', interviewerOutcome.reason?.message);
  }

  const supervisorData = supervisorRes.data;
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
      orchestration: 'DAG + Promise.allSettled',
      executedAgents: [
        { name: 'Grounding Agent', status: 'SUCCESS', summary: groundingRes.data?.agentSummary || `${enrichedEvidences.length}개 근거 문장 발췌` },
        { name: 'Critic Agent', status: 'SUCCESS', critique: criticReport.critiqueNotes, aiProb: criticReport.aiTextProbability, risk: criticReport.exaggerationRisk },
        {
          name: 'Supervisor Agent',
          status: 'SUCCESS',
          comments: supervisorData.executiveComments || ''
        },
        {
          name: 'Interviewer Agent',
          status: interviewerOutcome.status === 'fulfilled' ? 'SUCCESS' : 'DEGRADED_FALLBACK',
          questionsCount: enrichedQuestions.length
        }
      ],
      criticReport
    },
    analysis: {
      summary: supervisorData.summary,
      competencyScores: supervisorData.competencyScores,
      groundingEvidences: enrichedEvidences,
      interviewQuestions: enrichedQuestions
    }
  };
}
