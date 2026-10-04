import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enable Trust Proxy for Load Balancers (Nginx / Cloud Run / K8s Ingress)
app.set('trust proxy', 1);

// Security & CORS Middleware
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS ? process.env.CORS_ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Enterprise-Client-Id']
}));

app.use(express.json({ limit: '10mb' }));

// Rate Limiter: Prevent DoS & Abuse (Max 100 requests per 15 mins per IP)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use('/api/', apiLimiter);

// Root Service Information Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'HR AX Evaluator Enterprise API Gateway',
    version: 'v2.1.0',
    status: 'ONLINE',
    endpoints: {
      health: '/health',
      evaluate: '/api/v1/evaluate (POST)',
      vertexEvaluator: '/api/v1/enterprise/vertex-evaluator (POST)'
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

// Handler for AI Evaluation Requests (Vertex AI / Gemini 2.5 Flash)
const handleEvaluation = async (req, res) => {
  try {
    const { name, applyJobId, rawText } = req.body;

    if (!rawText || !name) {
      return res.status(400).json({ error: 'Missing required parameters: name and rawText are required.' });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.VERTEX_API_KEY;
    
    if (!apiKey) {
      // Return structured fallback signal if server API key is not configured
      return res.status(200).json({
        mode: 'LOCAL_FALLBACK',
        message: 'Server API key not configured. Handing off to Web Worker Client Fallback Engine.'
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

    const candidateModels = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'];
    const project = process.env.GCP_PROJECT || 'ai-review-510606';
    let data = null;
    let successfulModel = '';
    let lastError = '';

    for (const modelName of candidateModels) {
      // Endpoint candidate 1: Google AI Studio REST API
      // Endpoint candidate 2: Vertex AI us-central1 REST API
      // Endpoint candidate 3: Vertex AI asia-northeast3 REST API
      const endpoints = [
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        `https://us-central1-aiplatform.googleapis.com/v1/projects/${project}/locations/us-central1/publishers/google/models/${modelName}:generateContent?key=${apiKey}`,
        `https://asia-northeast3-aiplatform.googleapis.com/v1/projects/${project}/locations/asia-northeast3/publishers/google/models/${modelName}:generateContent?key=${apiKey}`
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
            lastError = `[${modelName}] (${resp.status}): ${errText.slice(0, 100)}`;
          }
        } catch (err) {
          lastError = err.message;
        }
      }
      if (data) break;
    }

    if (!data) {
      throw new Error(`Google Cloud Vertex AI & Gemini API Upstream Error: ${lastError}`);
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
      mode: 'VERTEX_AI_FREE_TIER'
    });
  } catch (error) {
    console.error('API Gateway Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error during AI evaluation proxying.' });
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
