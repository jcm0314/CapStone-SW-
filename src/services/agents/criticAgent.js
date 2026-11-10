import { callGeminiJson } from './geminiClient';
import { getActivePromptAddendum } from '../promptStudioService';

/**
 * [Agent 2] Critic Agent
 * 전문 역할: 비판적 2차 감사, 과장/허위 표현 팩트체크, AI 생성 문체 판별 (Red-Teaming)
 */
export async function runCriticAgent({ name, jobTemplate, rawText, groundingEvidences, apiKey }) {
  const prompt = `
[역할]: 당신은 엄격하고 날카로운 HR 채용 감사 전문 "Critic Agent (비판적 검증관)"입니다.
Grounding Agent가 1차 발췌한 근거 문장과 지원자의 자기소개서 원문을 교차 검증하여, 허위/과장 진술, AI 생성 문체 여부, 실현 불가능한 수치 성과를 엄격하게 적발하세요.

[지원자 정보]:
- 성명: [익명 지원자] (블라인드 채용 정책상 성명은 전송되지 않습니다)
- 지원 직무: ${jobTemplate.title}
${getActivePromptAddendum()}

[Grounding Agent가 1차 추출한 근거 목록]:
${JSON.stringify(groundingEvidences, null, 2)}

[자기소개서 원문]:
"""
${rawText}
"""

[비판적 감사 지침]:
1. 과장/허위 탐지:
   - 기여도가 불분명한 단체 성과를 개인 성과처럼 포장했는지 점검.
   - 비현실적이거나 측정 기준이 모호한 수치가 있는지 감사.
2. AI 생성 문체 판별:
   - "열정을 다해", "거친 풍파", "최고의 시너지를 발휘하여" 등 영혼 없는 미사여구와 전형적인 LLM 생성 어투 감지.
3. 점수 조정 권고:
   - 감점 권고액(penaltyScore: 0~30)을 제안하세요.

반드시 다음 JSON 형식으로만 반환하세요:
{
  "aiTextProbability": 15,
  "exaggerationRisk": "LOW",
  "critiqueNotes": "정량 지표는 구체적이나 팀 단위 프로젝트에서의 본인 기여도 경계선이 다소 모호함.",
  "flaggedQuotes": [
    {
      "quote": "문맥상 의심되거나 과장된 문장",
      "reason": "측정 기준 누락 및 주관적 형용사 과다 사용",
      "severity": "MEDIUM"
    }
  ],
  "recommendedPenalty": 5
}
`;

  const { data, modelUsed } = await callGeminiJson({ prompt, apiKey, temperature: 0.2 });
  return {
    agentName: 'Critic Agent',
    modelUsed,
    data
  };
}
