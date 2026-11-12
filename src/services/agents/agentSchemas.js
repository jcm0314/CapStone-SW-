/**
 * JSON schemas for Claude structured outputs (output_config.format = json_schema).
 * Mirrors docs/AI_AGENT_PROMPT_SPEC.md. Structured outputs require additionalProperties:false
 * on every object and do not support numeric min/max, so numeric ranges stay in the prompt text
 * and are clamped in code where it matters.
 */

const DECISIONS = ['STRONG_PASS', 'INTERVIEW', 'HOLD', 'REJECT'];
const LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

function competencyIds(jobTemplate) {
  return (jobTemplate?.competencies || []).map(c => c.id);
}

export function buildGroundingSchema(jobTemplate) {
  return {
    type: 'object',
    properties: {
      groundingEvidences: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            quote: { type: 'string', description: '자기소개서 본문에 실제로 존재하는 문장을 그대로 복사' },
            type: { type: 'string', enum: ['positive', 'risk', 'verify'] },
            competencyId: { type: 'string', enum: competencyIds(jobTemplate) },
            scoreImpact: { type: 'integer', description: '-20 ~ 20' },
            title: { type: 'string' },
            explanation: { type: 'string' }
          },
          required: ['quote', 'type', 'competencyId', 'scoreImpact', 'title', 'explanation'],
          additionalProperties: false
        }
      },
      agentSummary: { type: 'string' }
    },
    required: ['groundingEvidences', 'agentSummary'],
    additionalProperties: false
  };
}

export const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    aiTextProbability: { type: 'integer', description: '0 ~ 100' },
    exaggerationRisk: { type: 'string', enum: LEVELS },
    critiqueNotes: { type: 'string' },
    flaggedQuotes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          reason: { type: 'string' },
          severity: { type: 'string', enum: LEVELS }
        },
        required: ['quote', 'reason', 'severity'],
        additionalProperties: false
      }
    },
    recommendedPenalty: { type: 'integer', description: '0 ~ 30' }
  },
  required: ['aiTextProbability', 'exaggerationRisk', 'critiqueNotes', 'flaggedQuotes', 'recommendedPenalty'],
  additionalProperties: false
};

export function buildSupervisorSchema(jobTemplate) {
  const ids = competencyIds(jobTemplate);
  return {
    type: 'object',
    properties: {
      summary: {
        type: 'object',
        properties: {
          totalScore: { type: 'integer', description: '0 ~ 100' },
          decision: { type: 'string', enum: DECISIONS },
          decisionReason: { type: 'string' },
          aiTextProbability: { type: 'integer', description: '0 ~ 100' }
        },
        required: ['totalScore', 'decision', 'decisionReason', 'aiTextProbability'],
        additionalProperties: false
      },
      competencyScores: {
        type: 'object',
        properties: Object.fromEntries(ids.map(id => [id, { type: 'integer', description: '0 ~ 100' }])),
        required: ids,
        additionalProperties: false
      },
      executiveComments: { type: 'string' }
    },
    required: ['summary', 'competencyScores', 'executiveComments'],
    additionalProperties: false
  };
}

export const INTERVIEWER_SCHEMA = {
  type: 'object',
  properties: {
    interviewQuestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          basedQuote: { type: 'string' },
          category: { type: 'string' },
          question: { type: 'string' },
          intent: { type: 'string' },
          checklist: { type: 'array', items: { type: 'string' } }
        },
        required: ['basedQuote', 'category', 'question', 'intent', 'checklist'],
        additionalProperties: false
      }
    }
  },
  required: ['interviewQuestions'],
  additionalProperties: false
};
