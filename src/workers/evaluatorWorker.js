/**
 * Web Worker for Offloading Heavy Text Analysis & Substring Index Matching
 * Runs on a background thread to ensure main UI remains smooth at 60fps.
 */

self.onmessage = function (e) {
  const { type, payload } = e.data;

  if (type === 'PARSE_EVALUATION') {
    const { name, jobTemplate, rawText } = payload;

    // Step 1: Initialize (10%)
    self.postMessage({ type: 'PROGRESS', percent: 10, status: '텍스트 전처리 및 정규화 작업 중...' });

    // Step 2: Sentence splitting & Regex Substring indexing (35%)
    const sentences = rawText
      .split(/(?<=[.!?\n])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 5);

    self.postMessage({ type: 'PROGRESS', percent: 35, status: '문장별 하이라이트 인덱스 백그라운드 파싱 중...' });

    // Step 3: Heuristic / Grounding indexing calculation (70%)
    const groundingEvidences = [];
    const interviewQuestions = [];

    let positiveScoreAdd = 0;
    let riskScoreSub = 0;
    let aiRiskHits = 0;

    const metricRegex = /(\d+(?:\.\d+)?%|\d+초|\d+건|\d+원|\d+배|\d+개|\d+만|\d+명)/;
    const actionKeywords = ["도입하여", "개선하여", "단축시켰습니다", "개발했습니다", "구축했습니다", "절감하고", "달성했습니다", "적용하고", "주도하였으며", "분석하여"];
    const riskKeywords = ["최고의", "완벽한", "손쉽게", "무한한", "어떠한 거친", "모든 역경", "천재적인", "자부합니다", "성공리에"];
    const verifyKeywords = ["성능 향상", "개선 작업", "문제를 발견", "경험은 부족하지만", "최적의 코드"];

    sentences.forEach((s, idx) => {
      const charOffset = rawText.indexOf(s);
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
          startIndex: charOffset,
          endIndex: charOffset >= 0 ? charOffset + s.length : -1,
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
          startIndex: charOffset,
          endIndex: charOffset >= 0 ? charOffset + s.length : -1,
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
          startIndex: charOffset,
          endIndex: charOffset >= 0 ? charOffset + s.length : -1,
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
          startIndex: charOffset,
          endIndex: charOffset >= 0 ? charOffset + s.length : -1,
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

    self.postMessage({ type: 'PROGRESS', percent: 75, status: '역량 가중치 및 최종 의사결정 집계 중...' });

    // Step 4: Final Calculations (90%)
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

    const competencyScores = {};
    if (jobTemplate && jobTemplate.competencies) {
      jobTemplate.competencies.forEach(c => {
        const delta = (c.id === "problem_solving" || c.id === "tech_skill") 
          ? (positiveScoreAdd > 15 ? 12 : -5)
          : 5;
        competencyScores[c.id] = Math.min(98, Math.max(50, Math.round(rawTotal + (Math.random() * 8 - 4) + delta)));
      });
    }

    self.postMessage({ type: 'PROGRESS', percent: 100, status: '분석 완료' });

    self.postMessage({
      type: 'COMPLETE',
      payload: {
        id: `app_${Date.now()}`,
        name,
        applyJobId: jobTemplate ? jobTemplate.id : 'dev',
        applyJobTitle: jobTemplate ? jobTemplate.title : 'Software Engineer',
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
      }
    });
  }
};
