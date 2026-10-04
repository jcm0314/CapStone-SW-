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
  allowedHeaders: ['Content-Type', 'Authorization']
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

// Liveness & Readiness Healthcheck Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    service: 'hr-evaluator-api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Secure Proxy Endpoint for Enterprise Vertex AI / Gemini API
app.post('/api/v1/evaluate', async (req, res) => {
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

    // Secure upstream API call to Gemini API without exposing credentials to browser
    const upstreamUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const response = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Evaluate candidate ${name} for job ${applyJobId}: ${rawText}` }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!response.ok) {
      throw new Error(`Upstream API call failed with status ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json({ mode: 'ENTERPRISE_GATEWAY', data });
  } catch (error) {
    console.error('API Gateway Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error during AI evaluation proxying.' });
  }
});

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
