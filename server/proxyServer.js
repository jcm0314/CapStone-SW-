import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Enterprise PII Masking Filter Helper
function anonymizePII(text) {
  return text
    .replace(/01[016789]-?\d{3,4}-?\d{4}/g, '010-****-****')
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@enterprise.com');
}

// Enterprise BigQuery Audit Trail Simulator
function logBigQueryAudit({ candidateName, jobTitle, score, decision }) {
  console.log(`[BigQuery Audit Trail Log] ${new Date().toISOString()} | Candidate: ${candidateName} | Job: ${jobTitle} | Score: ${score} | Decision: ${decision}`);
}

// Enterprise Gateway Route
app.post('/api/v1/enterprise/vertex-evaluator', (req, res) => {
  const { name, applyJobId, rawText } = req.body;

  // 1. PII Anonymization
  const cleanText = anonymizePII(rawText || '');

  // 2. Simulated Vertex AI Analysis
  const mockAnalysis = {
    id: `corp_app_${Date.now()}`,
    name,
    applyJobId,
    applyJobTitle: "Enterprise Software Engineer",
    rawText: cleanText,
    analysis: {
      summary: {
        totalScore: 90,
        decision: "STRONG_PASS",
        decisionReason: "Google Cloud Vertex AI Enterprise 엔진 분석 완료: 수치적 성과 및 기술 아키텍처 근거 우수.",
        aiTextProbability: 10
      },
      competencyScores: {
        problem_solving: 92,
        tech_skill: 90,
        teamwork: 88,
        growth: 85,
        ethics: 90
      },
      groundingEvidences: [
        {
          id: "corp_ev_1",
          quote: "Redis 인메모리 캐싱 기법을 도입하여 평균 응답 속도를 0.42초로 86.8% 단축시켰습니다.",
          type: "positive",
          competencyId: "problem_solving",
          scoreImpact: 15,
          title: "수치 기반 성능 개선 (Vertex AI 검증)",
          explanation: "정량적 지표(86.8% 단축) 및 기술 도구(Redis) 명확히 서술됨."
        }
      ],
      interviewQuestions: [
        {
          id: "corp_iq_1",
          basedQuote: "Redis 인메모리 캐싱 기법을 도입하여 평균 응답 속도를 0.42초로 86.8% 단축시켰습니다.",
          category: "엔터프라이즈 기술 검증",
          question: "Redis 적용 시 캐시 데이터 정합성(Cache Invalidation) 및 Cache Stampede 현상은 어떻게 예방하셨습니까?",
          intent: "대용량 프로덕션 환경에서의 분산 트랜잭션 깊이 검증",
          checklist: ["캐시 만료 정책 서술 여부", "DB 동기화 패턴 구현 경험 확인"]
        }
      ]
    }
  };

  // 3. BigQuery Audit Trail Logging
  logBigQueryAudit({
    candidateName: name,
    jobTitle: "Enterprise Software Engineer",
    score: 90,
    decision: "STRONG_PASS"
  });

  res.json(mockAnalysis);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🏛️ Enterprise Proxy Gateway Server listening on port ${PORT}`);
  });
}

export default app;
