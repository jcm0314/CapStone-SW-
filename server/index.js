import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const SSO_HMAC_SECRET = process.env.SSO_JWT_SECRET || 'checkmate-enterprise-hmac-secret-2026';

export function signSsoToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SSO_HMAC_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  return `chk_sso_${encodedPayload}.${signature}`;
}

export function verifySsoToken(token) {
  if (!token || !token.startsWith('chk_sso_')) return null;
  const raw = token.slice('chk_sso_'.length);
  const [encodedPayload, signature] = raw.split('.');
  if (!encodedPayload || !signature) return null;
  const expectedSig = crypto
    .createHmac('sha256', SSO_HMAC_SECRET)
    .update(encodedPayload)
    .digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

const app = express();
const PORT = process.env.PORT || 3001;

// Enable Trust Proxy for Load Balancers (Nginx / Cloud Run / K8s Ingress)
app.set('trust proxy', 1);

// Security & CORS Middleware
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Enterprise-Client-Id', 'X-Tenant-Id']
}));

app.use(express.json({ limit: '10mb' }));

// Rate Limiter: Prevent DoS & Abuse (Max 200 requests per 15 mins per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use('/api/', apiLimiter);

// In-Memory Cloud Sync Store (Emulates Distributed Cloud DB / Supabase)
const sharedEvaluationsStore = new Map();

// Preset Tenant Database & FinOps Quota
const tenantsStore = new Map([
  ['toss-payments', {
    id: 'toss-payments',
    name: '토스페이먼츠',
    domain: 'tosspayments.com',
    plan: 'Enterprise Tier',
    totalCredit: 500000,
    usedCredit: 80000,
    industry: 'Fintech / Payment'
  }],
  ['daangn', {
    id: 'daangn',
    name: '당근',
    domain: 'daangn.com',
    plan: 'Growth Pro',
    totalCredit: 300000,
    usedCredit: 115000,
    industry: 'Hyperlocal Commerce / AI Feed'
  }],
  ['woowa', {
    id: 'woowa',
    name: '우아한형제들',
    domain: 'woowahan.com',
    plan: 'Enterprise Ultimate',
    totalCredit: 1000000,
    usedCredit: 250000,
    industry: 'Food Delivery / Mobility Tech'
  }]
]);

// Root Service Information Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Check-Mate Enterprise HR API Gateway',
    version: 'v2.2.0',
    status: 'ONLINE',
    capabilities: [
      'Multi-Tenancy RLS Isolation',
      'Multi-Interviewer Live Sync Sharing',
      'SSO Authentication Proxy',
      'Gemini 3.8 Flash AI Evaluation BFF'
    ],
    endpoints: {
      health: '/health',
      evaluate: '/api/v1/evaluate (POST)',
      shares: '/api/v1/shares (POST, GET)',
      tenants: '/api/v1/tenants (GET)',
      ssoLogin: '/api/v1/auth/sso-login (POST)'
    },
    timestamp: new Date().toISOString()
  });
});

// Liveness & Readiness Healthcheck Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'hr-evaluator-api-gateway',
    timestamp: new Date().toISOString()
  });
});

// -------------------------------------------------------------
// [1] Multi-Interviewer Share & Live Collaboration Endpoints
// -------------------------------------------------------------

// Create/Upload a Shared Evaluation Snapshot
app.post('/api/v1/shares', (req, res) => {
  try {
    const { shareId, applicantSnapshot, tenantId, createdBy, expiresHours = 72, collaborativeNotes } = req.body;

    if (!shareId || !applicantSnapshot) {
      return res.status(400).json({ error: 'shareId와 applicantSnapshot은 필수 항목입니다.' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresHours * 60 * 60 * 1000).toISOString();

    const record = {
      shareId,
      createdAt: now.toISOString(),
      expiresAt,
      tenantId: tenantId || 'toss-payments',
      createdBy: createdBy || { name: '채용담당자', role: 'RECRUITER' },
      applicantSnapshot,
      collaborativeNotes: collaborativeNotes || [
        {
          id: 'note_init',
          author: createdBy?.name || '채용담당자',
          role: createdBy?.role || 'RECRUITER',
          timestamp: now.toISOString(),
          content: '1차 AI 서류 심사가 완료되어 기술 면접관 공유 링크가 생성되었습니다. 면접 전 1:1 형광펜 원문과 역량 검증 질문을 확인해 주세요.'
        }
      ]
    };

    sharedEvaluationsStore.set(shareId, record);

    return res.status(201).json({
      success: true,
      shareId,
      expiresAt,
      message: '면접관 공유 스냅샷이 클라우드 저장소에 성공적으로 동기화되었습니다.'
    });
  } catch (error) {
    console.error('Save share error:', error);
    return res.status(500).json({ error: '공유 링크 저장 중 서버 오류가 발생했습니다.' });
  }
});

// Retrieve a Shared Evaluation Snapshot
app.get('/api/v1/shares/:shareId', (req, res) => {
  const { shareId } = req.params;
  const record = sharedEvaluationsStore.get(shareId);

  if (!record) {
    return res.status(404).json({ error: '해당 공유 평가서를 찾을 수 없습니다.' });
  }

  // Check TTL expiration
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) {
    sharedEvaluationsStore.delete(shareId);
    return res.status(410).json({ error: '해당 면접관 공유 링크의 유효 기간(TTL)이 만료되었습니다.' });
  }

  return res.status(200).json(record);
});

// Add Real-time Interviewer Collaborative Note / Score Adjustment
app.post('/api/v1/shares/:shareId/notes', (req, res) => {
  const { shareId } = req.params;
  const { author, role, content, scoreAdjustment = 0 } = req.body;

  if (!content) {
    return res.status(400).json({ error: '메모 내용은 필수입니다.' });
  }

  const record = sharedEvaluationsStore.get(shareId);
  if (!record) {
    return res.status(404).json({ error: '해당 공유 평가서를 찾을 수 없습니다.' });
  }

  const newNote = {
    id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    author: author || '기술면접관',
    role: role || 'INTERVIEWER',
    timestamp: new Date().toISOString(),
    content: content.trim(),
    scoreAdjustment: Number(scoreAdjustment) || 0
  };

  record.collaborativeNotes.push(newNote);
  sharedEvaluationsStore.set(shareId, record);

  return res.status(200).json({
    success: true,
    note: newNote,
    collaborativeNotes: record.collaborativeNotes
  });
});

// -------------------------------------------------------------
// [2] Enterprise SSO & Multi-Tenancy Management Endpoints
// -------------------------------------------------------------

// Simulated SSO Login & Session Token Exchange
app.post('/api/v1/auth/sso-login', (req, res) => {
  const { provider = 'Google Workspace', targetRole = 'RECRUITER', email, tenantId = 'toss-payments' } = req.body;

  const tenant = tenantsStore.get(tenantId) || tenantsStore.get('toss-payments');

  const tokenPayload = {
    sub: `usr_${Date.now()}`,
    tenantId: tenant.id,
    tenantName: tenant.name,
    role: targetRole,
    email: email || `user@${tenant.domain}`,
    provider,
    issuedAt: new Date().toISOString()
  };

  return res.status(200).json({
    token: signSsoToken(tokenPayload),
    user: tokenPayload
  });
});

// List Active Tenants (Multi-Tenancy Overview)
app.get('/api/v1/tenants', (req, res) => {
  const list = Array.from(tenantsStore.values());
  return res.status(200).json({ tenants: list });
});

// Retrieve Tenant Credit Quota (FinOps Governance)
app.get('/api/v1/tenants/:tenantId/quota', (req, res) => {
  const { tenantId } = req.params;
  const tenant = tenantsStore.get(tenantId);

  if (!tenant) {
    return res.status(404).json({ error: '등록되지 않은 테넌트(기업)입니다.' });
  }

  const remaining = tenant.totalCredit - tenant.usedCredit;
  const usagePercentage = ((tenant.usedCredit / tenant.totalCredit) * 100).toFixed(1);

  return res.status(200).json({
    tenantId: tenant.id,
    name: tenant.name,
    totalCredit: tenant.totalCredit,
    usedCredit: tenant.usedCredit,
    remainingCredit: remaining,
    usagePercentage: `${usagePercentage}%`,
    isLocked: remaining <= 0,
    plan: tenant.plan
  });
});

// -------------------------------------------------------------
// [3] BFF AI Evaluation Handler (Gemini 3.8 Flash Engine)
// -------------------------------------------------------------
const handleEvaluation = async (req, res) => {
  try {
    const { name, applyJobId, rawText } = req.body;

    if (!rawText || !name) {
      return res.status(400).json({ error: 'Missing required parameters: name and rawText are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VERTEX_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({
        error: 'SERVER_API_KEY_NOT_CONFIGURED',
        message: '서버 환경변수 GEMINI_API_KEY가 설정되지 않았습니다. 클라이언트 직접 호출 모드를 사용하세요.'
      });
    }

    const prompt = `
You are an expert HR Executive & Senior Recruiter AI.
Evaluate the following candidate self-introduction text based on the provided job requirements and criteria.

[Candidate Name]: ${name}
[Target Job ID]: ${applyJobId || 'dev'}

[Candidate Self-Introduction Text]:
"""
${rawText}
"""

Instructions:
1. Extract exact quotes (grounding sentences) from the text that justify your score.
   - positive: Quantitative metrics, clear problem-solving process, specific tool/methodology used.
   - risk: Overstated claims, buzzwords without proof, AI-generated generic fluff.
   - verify: Claims of achievement missing exact metrics that HR needs to verify during interview.
2. Ensure every 'quote' in groundingEvidences is an EXACT substring from the candidate's text.
3. Calculate scores (0 to 100) for competencies.
4. Provide a total score (0-100), decision ('STRONG_PASS' | 'INTERVIEW' | 'HOLD' | 'REJECT'), decisionReason, and aiTextProbability (0-100%).
5. Generate 2-4 tailored interview questions based on the weak points or 'risk/verify' grounding quotes.

Return ONLY a valid JSON object matching this exact structure:
{
  "summary": {
    "totalScore": 85,
    "decision": "STRONG_PASS",
    "decisionReason": "Summary reason here",
    "aiTextProbability": 15
  },
  "competencyScores": {
    "problem_solving": 88,
    "tech_skill": 85,
    "teamwork": 80,
    "growth": 82,
    "ethics": 80
  },
  "groundingEvidences": [
    {
      "quote": "exact sentence from rawText",
      "type": "positive",
      "competencyId": "problem_solving",
      "scoreImpact": 12,
      "title": "Brief title",
      "explanation": "Detailed rationale"
    }
  ],
  "interviewQuestions": [
    {
      "basedQuote": "exact sentence from rawText",
      "category": "Technique Verification",
      "question": "Specific question for candidate",
      "intent": "Why asking this",
      "checklist": ["Checklist item 1", "Checklist item 2"]
    }
  ]
}
`;

    // 2026 Recommended Gemini Models
    const candidateModels = ['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-flash-latest'];
    const project = process.env.GCP_PROJECT || 'ai-review-510606';
    let data = null;
    let successfulModel = '';
    let lastError = '';

    for (const modelName of candidateModels) {
      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${project}/locations/us-central1/publishers/google/models/${modelName}:generateContent?key=${apiKey}`
      ];

      for (const url of endpoints) {
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          });

          if (resp.ok) {
            data = await resp.json();
            successfulModel = modelName;
            break;
          } else {
            const errText = await resp.text();
            lastError = `[${modelName}] (${resp.status}): ${errText.slice(0, 150)}`;
          }
        } catch (err) {
          lastError = err.message;
        }
      }
      if (data) break;
    }

    if (!data) {
      console.warn(`Upstream API failed: ${lastError}`);
      return res.status(502).json({
        error: 'UPSTREAM_AI_FAILED',
        message: `Google Gemini AI 서비스 호출에 실패했습니다: ${lastError}`
      });
    }

    const rawTextResp = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedAnalysis = JSON.parse(rawTextResp);

    return res.status(200).json({
      id: `app_${Date.now()}`,
      name,
      applyJobId: applyJobId || 'dev',
      applyJobTitle: 'Software Engineer',
      rawText,
      analysis: parsedAnalysis,
      modelUsed: successfulModel,
      mode: 'BFF_GEMINI_GATEWAY'
    });
  } catch (error) {
    console.error('API Gateway Error:', error.message);
    return res.status(500).json({
      error: 'GATEWAY_INTERNAL_ERROR',
      message: error.message || '서버 내부 오류가 발생했습니다.'
    });
  }
};

app.post('/api/v1/evaluate', handleEvaluation);
app.post('/api/v1/enterprise/vertex-evaluator', handleEvaluation);

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Enterprise HR API Gateway running on port ${PORT}`);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

export default app;
