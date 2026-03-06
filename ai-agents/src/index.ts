// ai-agents/src/index.ts
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { orchestratorFlow } from './agents/orchestrator';
import { visionAnalysisFlow } from './agents/vision_agent';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
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
    console.log('Chat request received:', { body: req.body });
    
    const result = await orchestratorFlow(req.body);
    
    console.log('Chat response generated:', { 
      agentType: result.agentType,
      contentLength: result.content?.length || 0 
    });
    
    res.json(result);
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    
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
    console.log('Vision analysis request received');
    
    const { imageBase64, mimeType, lat, lng } = req.body;
    
    // Validate required fields
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({
        error: 'Missing required fields: imageBase64 and mimeType are required'
      });
    }
    
    const result = await visionAnalysisFlow({ imageBase64, mimeType, lat, lng });
    
    console.log('Vision analysis completed:', { 
      incidentType: result.incidentType,
      confidence: result.confidence 
    });
    
    res.json(result);
  } catch (err: any) {
    console.error('Vision analysis error:', err);
    
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
  console.error('Global error handler:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI Agents service running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`💬 Chat endpoint: http://localhost:${PORT}/chat`);
  console.log(`👁️  Vision endpoint: http://localhost:${PORT}/vision/analyze`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
