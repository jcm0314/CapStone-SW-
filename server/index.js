import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { executeMultiAgentEvaluation } from '../src/services/multiAgentEvaluator.js';
import { resolveClaudeModel, isClaudeConfigured } from '../src/services/agents/claudeClient.js';
import { formatCustomPromptAddendum } from '../src/services/promptStudioService.js';
import { JOB_TEMPLATES } from '../src/data/jobTemplates.js';
import { anonymizePII } from '../src/utils/piiAnonymizer.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(DATA_DIR, 'shared_evaluations.json');
const SSO_SECRET = process.env.SSO_TOKEN_SECRET || 'checkmate-enterprise-hmac-default-secret-2026';

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

// -------------------------------------------------------------
// Persistent + In-Memory Share Store
// Persists snapshots to server/data/shared_evaluations.json (except in unit tests)
// -------------------------------------------------------------
const sharedEvaluationsStore = new Map();

function loadPersistedShares() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf8');
      const entries = JSON.parse(raw);
      if (Array.isArray(entries)) {
        for (const [k, v] of entries) {
          sharedEvaluationsStore.set(k, v);
        }
      }
    }
  } catch (err) {
    console.warn('[ShareStore] Failed to load persisted shares:', err.message);
  }
}

function persistShares() {
  if (process.env.NODE_ENV === 'test') return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const entries = Array.from(sharedEvaluationsStore.entries());
    fs.writeFileSync(STORE_FILE, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.warn('[ShareStore] Failed to persist shares:', err.message);
  }
}

loadPersistedShares();

// -------------------------------------------------------------
// HMAC-SHA256 Signed Token Helpers
// -------------------------------------------------------------
export function signSsoToken(payload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SSO_SECRET)
    .update(encoded)
    .digest('hex');
  return `chk_sso_${encoded}.${signature}`;
}

export function verifySsoToken(token) {
  if (!token || typeof token !== 'string' || !token.startsWith('chk_sso_')) {
    return null;
  }
  const body = token.slice('chk_sso_'.length);
  const dotIdx = body.lastIndexOf('.');
  if (dotIdx === -1) return null;

  const encoded = body.slice(0, dotIdx);
  const signature = body.slice(dotIdx + 1);
  const expectedSig = crypto
    .createHmac('sha256', SSO_SECRET)
    .update(encoded)
    .digest('hex');

  if (signature.length !== expectedSig.length) return null;
  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSig, 'utf8')
  );
  if (!isValid) return null;

  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

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
    version: 'v2.5.0',
    status: 'ONLINE',
    capabilities: [
      'Multi-Tenancy RLS Isolation',
      'Multi-Interviewer Live Sync Sharing (File-Backed Persistence)',
      'HMAC-SHA256 Signed SSO Authentication',
      '4-Agent Multi-Agent Claude (Anthropic) Evaluation BFF'
    ],
    models: [resolveClaudeModel()],
    endpoints: {
      health: '/health',
      evaluate: '/api/v1/evaluate (POST)',
      shares: '/api/v1/shares (POST, GET)',
      tenants: '/api/v1/tenants (GET)',
      ssoLogin: '/api/v1/auth/sso-login (POST)',
      ssoVerify: '/api/v1/auth/verify (GET)'
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
    persistShares();

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
    persistShares();
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
  persistShares();

  return res.status(200).json({
    success: true,
    note: newNote,
    collaborativeNotes: record.collaborativeNotes
  });
});

// -------------------------------------------------------------
// [2] Enterprise SSO & Multi-Tenancy Management Endpoints
// -------------------------------------------------------------

// Simulated SSO Login with HMAC-SHA256 Signed Token
app.post('/api/v1/auth/sso-login', (req, res) => {
  const { provider = 'Google Workspace', targetRole = 'RECRUITER', email, tenantId = 'toss-payments' } = req.body || {};

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

  const token = signSsoToken(tokenPayload);

  return res.status(200).json({
    token,
    user: tokenPayload
  });
});

// Verify HMAC-SHA256 Signed SSO Token
app.get('/api/v1/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const rawToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.query.token;
  const verified = verifySsoToken(String(rawToken || ''));

  if (!verified) {
    return res.status(401).json({ valid: false, error: '유효하지 않거나 위변조된 SSO 토큰입니다.' });
  }

  return res.status(200).json({ valid: true, user: verified });
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
// [3] BFF AI Evaluation Handler (4-Agent Multi-Agent Pipeline)
// -------------------------------------------------------------
const MAX_PROMPT_LIST_ITEMS = 20;
const MAX_PROMPT_FIELD_CHARS = 500;

function sanitizePromptText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_PROMPT_FIELD_CHARS);
}

function sanitizePromptList(value) {
  return (Array.isArray(value) ? value : [])
    .map(sanitizePromptText)
    .filter(Boolean)
    .slice(0, MAX_PROMPT_LIST_ITEMS);
}

/**
 * Prompt Studio settings arrive from the browser (the server has no localStorage).
 * Only known fields are accepted, each trimmed and length-capped, then formatted by the shared formatter.
 */
export function buildPromptAddendumFromSettings(promptSettings) {
  if (!promptSettings || typeof promptSettings !== 'object') return '';
  return formatCustomPromptAddendum({
    companyName: sanitizePromptText(promptSettings.companyName),
    coreValues: sanitizePromptList(promptSettings.coreValues),
    tabooWords: sanitizePromptList(promptSettings.tabooWords),
    customInstruction: sanitizePromptText(promptSettings.customInstruction)
  });
}

function upstreamHttpStatus(err) {
  if (err?.code === 'ANTHROPIC_API_KEY_MISSING') return 503;
  if (err?.code === 'ANTHROPIC_RATE_LIMITED') return 429;
  if (err?.code === 'ANTHROPIC_TIMEOUT') return 504;
  return 502;
}

const handleEvaluation = async (req, res) => {
  try {
    const { name, applyJobId, rawText, promptSettings } = req.body || {};

    if (!rawText || !name) {
      return res.status(400).json({ error: 'Missing required parameters: name and rawText are required.' });
    }

    if (!isClaudeConfigured()) {
      return res.status(503).json({
        error: 'SERVER_API_KEY_NOT_CONFIGURED',
        message: '서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다. 게이트웨이 실행 환경(.env)에 키를 설정한 뒤 서버를 재시작하세요.'
      });
    }

    const jobTemplate = JOB_TEMPLATES.find(j => j.id === applyJobId) || JOB_TEMPLATES[0];
    const tenantId = req.headers['x-tenant-id'] || 'toss-payments';

    // Server-side Defense-in-Depth PII Anonymization (in case caller bypassed client masking)
    const piiResult = anonymizePII(rawText, name);
    const cleanText = piiResult.anonymizedText;

    try {
      // 4-Agent Orchestration Pipeline (Grounding -> Critic -> Supervisor + Interviewer) on Claude.
      // No single-prompt fallback and no fake scores: failures are reported honestly.
      const multiAgentResult = await executeMultiAgentEvaluation({
        name,
        jobTemplate,
        cleanText,
        originalRawText: rawText,
        promptAddendum: buildPromptAddendumFromSettings(promptSettings),
        tenantId
      });

      const tenant = tenantsStore.get(tenantId);
      if (tenant) {
        tenant.usedCredit = Math.min(tenant.totalCredit, tenant.usedCredit + 4);
      }

      return res.status(200).json({
        ...multiAgentResult,
        mode: 'BFF_MULTI_AGENT_GATEWAY',
        modelUsed: multiAgentResult.modelsUsed?.supervisor || resolveClaudeModel()
      });
    } catch (upstreamErr) {
      console.warn(`[BFF Gateway] Claude evaluation failed (${upstreamErr.code || 'ERROR'}): ${upstreamErr.message}`);
      return res.status(upstreamHttpStatus(upstreamErr)).json({
        error: upstreamErr.code || 'UPSTREAM_AI_FAILED',
        message: upstreamErr.message || 'Claude AI 평가 호출에 실패했습니다.'
      });
    }
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
