import { callGeminiJson } from './geminiClient';
import { getActivePromptAddendum } from '../promptStudioService';

/**
 * [Agent 3] Scoring & Supervisor Agent
 * 전문 역할: 5대 직무 역량 정량 점수화, 종합 결재 및 최종 인사 판정 (Decision Maker)
 */
export async function runSupervisorAgent({ name, jobTemplate, rawText, groundingEvidences, criticReport, apiKey }) {
  const prompt = `
[역할]: 당신은 최고인사책임자(CHO) 수준의 권한을 가진 "Supervisor Agent (최종 의사결정 수석 에이전트)"입니다.
Grounding Agent가 수집한 객관적 증거와 Critic Agent의 비판적 감사 소견을 종합 검토하여, 직무 역량 가중치에 따라 공정하고 균형 잡힌 최종 점수와 채용 결정을 내리세요.

[지원자 정보]:
- 성명: [익명 지원자] (블라인드 채용 정책상 성명은 전송되지 않습니다)
- 지원 직무: ${jobTemplate.title}
- 직무 역량 가중치: ${JSON.stringify(jobTemplate.competencies)}
${getActivePromptAddendum()}

[Grounding Agent 수집 근거]:
${JSON.stringify(groundingEvidences, null, 2)}

[Critic Agent 감사 보고서]:
${JSON.stringify(criticReport, null, 2)}

[평가 및 결재 지침]:
1. 5대 역량 항목별로 0~100점 점수를 산출하세요 (${JSON.stringify(jobTemplate.competencies.map(c => c.id))}).
   - Critic Agent의 감점 권고 및 비판 소견을 합리적으로 반영하되, 객관적 실적은 정당하게 평가하세요.
2. 종합 점수(totalScore: 0~100점)를 산출하세요.
3. 최종 인사 판정(decision):
   - "STRONG_PASS": 탁월한 역량 및 실무 투입 즉시 가능 (85점 이상)
   - "INTERVIEW": 서류 적격, 면접에서 추가 검증 권장 (75~84점)
   - "HOLD": 합격선 경계, 정원 및 타 지원자 대비 비교 필요 (65~74점)
   - "REJECT": 역량 미달 또는 과장/허위 리스크 극심 (64점 이하)
4. 종합 판정 사유(decisionReason): 임원 및 채용팀장이 납득할 수 있는 논리적이고 전문적인 2~3줄 요약.

반드시 다음 JSON 형식으로만 반환하세요:
{
  "summary": {
    "totalScore": 88,
    "decision": "STRONG_PASS",
    "decisionReason": "정량적 성능 개선 지표가 뚜렷하며 분산 시스템 장애 극복 경험이 직무 요건에 부합함.",
    "aiTextProbability": ${criticReport.aiTextProbability || 15}
  },
  "competencyScores": {
    "problem_solving": 90,
    "tech_skill": 88,
    "teamwork": 85,
    "growth": 82,
    "ethics": 85
  },
  "executiveComments": "Critic Agent가 지적한 기여도 경계선에 대해서는 2차 기술 면접에서 검증 필요."
}
`;

  const { data, modelUsed } = await callGeminiJson({ prompt, apiKey, temperature: 0.1 });
  return {
    agentName: 'Supervisor Agent',
    modelUsed,
    data
  };
}
