// Load environment variables first
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimiter';
import { logger } from './services/logger';

// Import routes
import authRoutes from './routes/auth';
import grantsRoutes from './routes/grants';
import organizationsRoutes from './routes/organizations';
import submissionsRoutes from './routes/submissions';
import documentsRoutes from './routes/documents';
import usageRoutes from './routes/usage';
import applicationsRoutes from './routes/applications';
import webhooksRoutes from './routes/webhooks';
import scrapingRoutes from './routes/scraping';
import aiRoutes from './routes/ai';
import monitoringRoutes from './routes/monitoring';
import predictiveRoutes from './routes/predictive';
import stripeRoutes from './routes/stripe';
import exportRoutes from './routes/export';
import newsletterRoutes from './routes/newsletter';
import debugRoutes from './routes/debug';

// Import database service
import { db } from './services/database';

// TODO: Add Sentry integration in production

const app = express();
const PORT = process.env.PORT || 8000;

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'eTownz Grants AI-Powered Management API',
      version: '2.0.0',
      description: 'AI-powered API for intelligent grant discovery, matching, and application management in Ireland. Features semantic search, automated grant analysis, and smart recommendations.',
      contact: {
        name: 'eTownz Support',
        email: 'support@etownz.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    tags: [
      {
        name: 'AI',
        description: 'AI-powered grant matching, semantic search, and intelligent analysis'
      },
      {
        name: 'Grants',
        description: 'Grant discovery, search, and management'
      },
      {
        name: 'Scraping',
        description: 'Web scraping and data extraction for grant discovery'
      },
      {
        name: 'Authentication',
        description: 'User authentication and authorization'
      },
      {
        name: 'Organizations',
        description: 'Organization management and profiles'
      },
      {
        name: 'Applications',
        description: 'Grant applications and submissions'
      },
      {
        name: 'Monitoring',
        description: 'AI-powered grant monitoring, alerts, and automated tracking'
      },
      {
        name: 'Predictive Analytics',
        description: 'Machine learning-powered predictive analytics, success probability, and budget optimization'
      }
    ],
    servers: [
      {
        url: process.env.NODE_ENV === 'production' 
          ? 'https://grants.etownz.com/api' 
          : 'http://localhost:8000',
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts']
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://grants.etownz.com'] 
    : ['http://localhost:3001'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimiter);

// API Documentation
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'eTownz Grants API Documentation'
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/grants', grantsRoutes);
app.use('/organizations', organizationsRoutes);
app.use('/submissions', submissionsRoutes);
app.use('/documents', documentsRoutes);
app.use('/usage', usageRoutes);
app.use('/applications', applicationsRoutes);
app.use('/webhooks', webhooksRoutes);
app.use('/scraping', scrapingRoutes);
app.use('/ai', aiRoutes);
app.use('/monitoring', monitoringRoutes);
app.use('/predictive', predictiveRoutes);
app.use('/stripe', stripeRoutes);
app.use('/export', exportRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/debug', debugRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Error handling middleware
app.use(errorHandler);

// Initialize database connection and start server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await db.testConnection();
    if (!dbConnected) {
      logger.warn('⚠️ Failed to connect to database - server will start anyway');
    } else {
      logger.info('✅ Database connection established');
    }

    // Start server
    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📚 API Documentation available at http://localhost:${PORT}/docs`);
      logger.info(`🏥 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('❌ Failed to start server', { error });
    process.exit(1);
  }
}

startServer();

export default app;