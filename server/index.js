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

    let upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    let response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      response = await fetch(upstreamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
    }

    if (!response.ok) {
      throw new Error(`Upstream API call failed with status ${response.status}`);
    }

    const data = await response.json();
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
