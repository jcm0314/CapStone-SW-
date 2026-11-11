import { callGeminiJson } from './geminiClient.js';
import { getActivePromptAddendum } from '../promptStudioService.js';

/**
 * [Agent 4] Interviewer Agent
 * 전문 역할: Critic Agent가 지적한 의심/약점 문장을 타깃팅하여 실무 면접관용 심층 질문 및 검증 체크리스트 생성
 */
export async function runInterviewerAgent({ name, jobTemplate, rawText, groundingEvidences, criticReport, apiKey }) {
  const prompt = `
[역할]: 당신은 10년 차 이상의 시니어 실무 면접관 "Interviewer Agent"입니다.
Critic Agent가 감사한 의심/과장 문장과 Grounding Agent의 검증 필요(verify) 문장을 바탕으로, 실제 면접실에서 지원자의 진위를 가려낼 수 있는 날카로운 심층 면접 질문 2~4개와 검증 체크리스트를 작성하세요.

[지원자 정보]:
- 성명: [익명 지원자] (블라인드 채용 정책상 성명은 전송되지 않습니다)
- 지원 직무: ${jobTemplate.title}
${getActivePromptAddendum()}

[Critic Agent의 비판적 감사 소견]:
${JSON.stringify(criticReport, null, 2)}

[Grounding Agent의 검증/리스크 문장들]:
${JSON.stringify((groundingEvidences || []).filter(e => e.type === 'risk' || e.type === 'verify'), null, 2)}

[자기소개서 발췌문장 목록]:
${JSON.stringify((groundingEvidences || []).map(e => e.quote), null, 2)}

[질문 생성 지침]:
1. basedQuote: 반드시 지원서 본문 속 실제 문장(Grounding quote)을 인용하세요.
2. category: "기술적 사실 검증" | "기여도 및 역할 분담 검증" | "위기 대처 및 문제 해결력" | "직업 윤리 및 협업"
3. question: 단순히 '설명해주세요'가 아닌, 실제 동작 원리나 본인의 구체적 기여도를 꼬집는 실전 압박 질문.
4. intent: 질문의 명확한 면접관 의도.
5. checklist: 지원자가 답변할 때 면접관이 반드시 체크해야 할 2~3개 검증 포인트.

반드시 다음 JSON 형식으로만 반환하세요:
{
  "interviewQuestions": [
    {
      "basedQuote": "본문 속 실제 인용 문장",
      "category": "기술적 사실 검증",
      "question": "Redis 캐싱을 도입하여 응답 속도를 86.8% 단축시켰다고 하셨는데, 캐시 갱신(Cache Invalidation) 전략은 어떤 방식으로 구현하셨으며 캐시 장애 발생 시의 대책은 무엇이었습니까?",
      "intent": "캐싱 아키텍처에 대한 실질적인 구현 경험 및 장애 대응 역량 팩트체크",
      "checklist": [
        "사용한 캐싱 전략(Cache-Aside, Write-Through 등)을 명확히 설명하는지",
        "자신이 직접 설계하고 측정한 지표인지 확인",
        "캐시 스탬피드 현상 등에 대한 이해도가 있는지"
      ]
    }
  ]
}
`;

  const { data, modelUsed } = await callGeminiJson({ prompt, apiKey, temperature: 0.2 });
  return {
    agentName: 'Interviewer Agent',
    modelUsed,
    data
  };
}
