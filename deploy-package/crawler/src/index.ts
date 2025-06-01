import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import grantSourcesRouter from './routes/grantSources';
import eligibilityRouter from './routes/eligibility';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, { 
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
});

// Routes
app.use('/api/grant-sources', grantSourcesRouter);
app.use('/api/eligibility', eligibilityRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'grants-ai-crawler',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API info
app.get('/api', (req, res) => {
  res.json({
    service: 'eTownz Grants AI Crawler',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Service health check',
      'GET /api/grant-sources': 'List all grant sources',
      'POST /api/grant-sources': 'Create new grant source',
      'POST /api/grant-sources/:id/crawl': 'Start crawl for specific source',
      'POST /api/eligibility/check': 'Check eligibility for grant',
      'POST /api/eligibility/find-matches': 'Find matching grants for organization'
    },
    documentation: 'See /docs for detailed API documentation'
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: error.message, stack: error.stack, path: req.path });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    message: `${req.method} ${req.originalUrl} is not a valid endpoint`
  });
});

app.listen(PORT, () => {
  logger.info(`🤖 eTownz Grants AI Crawler service running on port ${PORT}`);
  console.log(`🤖 eTownz Grants AI Crawler service running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api`);
});

export default app;