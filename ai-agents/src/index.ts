import dotenv from 'dotenv';
// Load environment variables immediately to avoid hoisting issues with imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { orchestratorFlow, ai } from './agents/orchestrator';
import { guardedVisionAnalysis } from './agents/vision_guard';
import { logger } from './utils/logger';


const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  logger.info('System', '⚠️ API_KEY not set in .env for ai-agents');
}

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientKey = req.header('X-API-Key');
  if (!clientKey || clientKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing X-API-Key' });
  }
  next();
};

// Apply authentication to protected routes
app.use('/chat', authMiddleware);
app.use('/vision/analyze', authMiddleware);
// /health remains public for monitoring

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Request', `${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'ai-agents',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Chat endpoint - main orchestrator flow
app.post('/chat', async (req, res) => {
  try {
    logger.info('Chat', `Request received: len=${req.body.message?.length || 0}`);

    const result = await orchestratorFlow(req.body);

    logger.info('Chat', {
      agentType: result.agentType,
      contentLength: result.content?.length || 0
    });

    res.json(result);
  } catch (err: any) {
    logger.error('ChatEndpoint', err);

    // Graceful error handling
    const errorResponse = {
      error: err.message || 'An unexpected error occurred',
      agentType: 'general',
      content: 'I apologize, but I\'m experiencing technical difficulties. Please try again later.',
      timestamp: new Date().toISOString()
    };

    res.status(500).json(errorResponse);
  }
});

// Vision analysis endpoint
app.post('/vision/analyze', async (req, res) => {
  try {
    logger.info('Vision', 'Analysis request received');

    const { imageBase64, mimeType, lat, lng } = req.body;

    // Validate required fields
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: imageBase64 and mimeType are required'
      });
    }

    const result = await guardedVisionAnalysis(ai, { imageBase64, mimeType, lat, lng });

    logger.info('Vision', {
      incidentType: result.incidentType,
      confidence: result.confidence
    });

    res.json(result);
  } catch (err: any) {
    logger.error('VisionEndpoint', err);

    // Graceful error handling
    const errorResponse = {
      error: err.message || 'Vision analysis failed',
      incidentType: 'other',
      severity: 'medium',
      confidence: 0.5,
      description: 'Unable to analyze image due to technical issues. Please try again.',
      prefilledForm: {
        serviceType: 'other',
        description: 'Image analysis failed - please describe the issue manually',
        suggestedPriority: 'Normal'
      }
    };

    res.status(500).json(errorResponse);
  }
});

// 404 handler
app.use('*', (_, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: ['/health', '/chat', '/vision/analyze']
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Global', err);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info('Server', `🚀 AI Agents service running on port ${PORT}`);
  logger.info('Server', `🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('System', 'SIGTERM received, shutting down');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('System', 'SIGINT received, shutting down');
  process.exit(0);
});
