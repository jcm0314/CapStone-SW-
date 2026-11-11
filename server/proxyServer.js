import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { VertexAI } from '@google-cloud/vertexai';
import { BigQuery } from '@google-cloud/bigquery';
import { PRIMARY_MODEL } from '../src/services/agents/geminiClient.js';
import { anonymizePII as fullAnonymizePII } from '../src/utils/piiAnonymizer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// GCP Enterprise Environment Configuration
const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'enterprise-hr-ax-project';
const GCP_LOCATION = process.env.GCP_LOCATION || 'asia-northeast3'; // 서울 리전

// Initialize Official Google Cloud Enterprise SDKs
let vertexAI = null;
let bigQuery = null;

try {
  if (process.env.GCP_PROJECT_ID) {
    vertexAI = new VertexAI({ project: GCP_PROJECT_ID, location: GCP_LOCATION });
    bigQuery = new BigQuery({ projectId: GCP_PROJECT_ID });
    console.log(`🏛️ GCP Vertex AI Enterprise SDK bound to project: ${GCP_PROJECT_ID} (${GCP_LOCATION})`);
  }
} catch (err) {
  console.warn("⚠️ GCP Service Account / SDK Initialization notice:", err.message);
}

app.use(cors());
app.use(express.json());

// Enterprise PII Masking Filter Helper (7-Category Regex Anonymizer)
function anonymizePII(text, name = '') {
  return fullAnonymizePII(text, name).anonymizedText;
}

// Enterprise BigQuery Audit Trail Logging
async function logBigQueryAudit({ candidateName, jobTitle, score, decision }) {
  const auditLog = {
    timestamp: new Date().toISOString(),
    candidateName,
    jobTitle,
    score,
    decision,
    clientIp: '10.240.0.12' // Internal Enterprise VPC Proxy IP
  };

  if (bigQuery && process.env.BIGQUERY_DATASET_ID) {
    try {
      await bigQuery
        .dataset(process.env.BIGQUERY_DATASET_ID)
        .table('hr_evaluation_audit_logs')
        .insert([auditLog]);
      console.log(`[BigQuery Streaming Audit Log] Streamed to BigQuery: ${candidateName} (${decision})`);
    } catch (err) {
      console.error("[BigQuery Audit Error]", err);
    }
  } else {
    console.log(`[BigQuery Audit Trail Log] ${auditLog.timestamp} | Candidate: ${candidateName} | Job: ${jobTitle} | Score: ${score} | Decision: ${decision}`);
  }
}

// Enterprise Gateway Route (/api/v1/enterprise/vertex-evaluator)
app.post('/api/v1/enterprise/vertex-evaluator', async (req, res) => {
  const { name, applyJobId, rawText } = req.body;

  // 1. PII Anonymization Layer
  const cleanText = anonymizePII(rawText || '', name || '');

  // 2. Vertex AI 미설정 시: 가짜 평가 결과를 만들지 않고 명시적으로 503 반환
  if (!vertexAI || !process.env.GCP_PROJECT_ID) {
    return res.status(503).json({
      error: 'VERTEX_NOT_CONFIGURED',
      message: 'GCP_PROJECT_ID / 서비스 계정 자격 증명이 설정되지 않아 평가를 수행할 수 없습니다.'
    });
  }

  let analysisResult;

  // 3. Official Google Cloud Vertex AI SDK Execution
  {
    try {
      const generativeModel = vertexAI.getGenerativeModel({
        model: process.env.GEMINI_MODEL || PRIMARY_MODEL,
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.2,
          responseMimeType: 'application/json'
        }
      });

      const prompt = `
당신은 대기업 HR 역량 평가 전문가입니다. 아래 PII 마스킹 처리된 지원서 본문을 읽고 5대 핵심 역량 점수와 원문 근거(Grounding), 그리고 맞춤형 심층 면접 질문을 JSON 형식으로 작성하세요.

지원서 본문:
${cleanText}
`;

      const response = await generativeModel.generateContent(prompt);
      const responseText = response.response.candidates[0].content.parts[0].text;
      const parsedJson = JSON.parse(responseText);

      analysisResult = {
        id: `corp_app_${Date.now()}`,
        name,
        applyJobId,
        applyJobTitle: "Enterprise Software Engineer",
        rawText: cleanText,
        analysis: parsedJson
      };
    } catch (gcpErr) {
      // 실패를 가짜 결과로 덮지 않고 그대로 알림
      console.error("[Vertex AI Error]", gcpErr.message);
      return res.status(502).json({
        error: 'VERTEX_EVALUATION_FAILED',
        message: 'Vertex AI 평가 호출 또는 응답 파싱에 실패했습니다.'
      });
    }
  }

  // 4. BigQuery Audit Trail Logging (실제 결과 값만 기록, 없으면 null)
  const summary = analysisResult.analysis?.summary || {};
  await logBigQueryAudit({
    candidateName: name,
    jobTitle: "Enterprise Software Engineer",
    score: summary.totalScore ?? null,
    decision: summary.decision ?? null
  });

  res.json(analysisResult);
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🏛️ Official GCP Vertex AI Enterprise Gateway listening on port ${PORT}`);
  });
}

export default app;

