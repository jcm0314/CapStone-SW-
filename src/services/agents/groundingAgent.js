import { callGeminiJson } from './geminiClient';
import { formatCustomPromptAddendum } from '../promptStudioService';

/**
 * [Agent 1] Grounding Agent
 * 전문 역할: 자기소개서 본문 텍스트에서 평가의 근거가 되는 실제 문장을 1:1로 발췌 및 역량별 인덱싱
 */
export async function runGroundingAgent({ name, jobTemplate, rawText, apiKey }) {
  const customAddendum = formatCustomPromptAddendum();
  const prompt = `
[역할]: 당신은 HR 채용 전문 "Grounding Agent"입니다.
지원자의 자기소개서 본문을 면밀히 스캔하여, 평가의 객관적 증거가 되는 실제 핵심 문장들만을 100% 원문 그대로 발췌(Quote)하세요.
${customAddendum}

[지원자 정보]:
- 성명: ${name}
- 지원 직무: ${jobTemplate.title}
- 직무 평가 역량 기준: ${JSON.stringify(jobTemplate.competencies)}

[자기소개서 본문]:
"""
${rawText}
${name ? `[참고: 지원자 성명은 사전에 익명화 필터링 처리되었을 수 있습니다]` : ''}
"""

[발췌 규칙]:
1. "quote" 필드에는 반드시 지원서 본문에 실제로 존재하는 문장을 토시 하나 틀리지 않고 그대로 넣어야 합니다. (절대로 요약하거나 재작성하지 마세요.)
2. 문장 유형(type) 분류:
   - "positive": 정량적 수치 성과(%, 건, 초, 원), 구체적인 기술 스택 적용 사례, 명확한 문제 해결 과정.
   - "risk": 근거 없는 주관적 과장 표현, 상투적 미사여구, 구체적 기여도가 누락된 AI 생성 의심 문장.
   - "verify": 성과나 역할이 기술되어 있으나 측정 지표나 본인 기여도가 애매하여 면접에서 팩트체크가 필요한 문장.
3. 역량 매칭(competencyId): ${JSON.stringify(jobTemplate.competencies.map(c => c.id))} 중 가장 관련성이 높은 역량 ID를 지정하세요.
4. 최소 4개~최대 8개의 핵심 문장을 발췌하세요.

반드시 다음 JSON 형식으로만 반환하세요:
{
  "groundingEvidences": [
    {
      "quote": "본문 속 실제 문장",
      "type": "positive",
      "competencyId": "problem_solving",
      "scoreImpact": 15,
      "title": "정량 지표 기반 성과",
      "explanation": "Redis 캐싱 도입 및 응답속도 단축 정량 수치 제시"
    }
  ],
  "agentSummary": "본문에서 긍정 근거 N건, 리스크 문장 N건, 검증 필요 문장 N건 발췌 완료."
}
`;

  const { data, modelUsed } = await callGeminiJson({ prompt, apiKey, temperature: 0.1 });
  return {
    agentName: 'Grounding Agent',
    modelUsed,
    data
  };
}
