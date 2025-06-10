// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Try multiple possible .env locations
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env')
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.OPENAI_API_KEY) {
      console.log(`✅ Environment loaded from: ${envPath}`);
      console.log(`🔑 OpenAI API Key loaded: ${process.env.OPENAI_API_KEY?.substring(0, 7)}${process.env.OPENAI_API_KEY?.length > 7 ? '***' : ''}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.error('❌ Failed to load .env file from any location');
  console.error('Tried paths:', envPaths);
}

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
import firecrawlRoutes from './routes/firecrawl';
import mcpScrapingRoutes from './routes/mcpScraping';
import aiRoutes from './routes/ai';
import aiTransparencyRoutes from './routes/aiTransparency';
import aiWritingRoutes from './routes/aiWriting';
import progressiveFormRoutes from './routes/progressiveForm';
import complianceRoutes from './routes/compliance';
import budgetOptimizationRoutes from './routes/budgetOptimization';
import monitoringRoutes from './routes/monitoring';
import predictiveRoutes from './routes/predictive';
import stripeRoutes from './routes/stripe';
import exportRoutes from './routes/export';
import newsletterRoutes from './routes/newsletter';
import semanticSearchRoutes from './routes/semanticSearch';
import knowledgeBaseRoutes from './routes/knowledgeBase';
import openaiAssistantsRoutes from './routes/openaiAssistants-simple';
import aiCostManagementRoutes from './routes/aiCostManagement';
import aiLoadBalancerRoutes from './routes/aiLoadBalancer';
import aiMonitoringRoutes from './routes/aiMonitoring';
import aiEditorRoutes from './routes/aiEditor';
import grantIntelligenceRoutes from './routes/grantIntelligence';
import templatesRoutes from './routes/templates';
import databaseSyncRoutes from './routes/databaseSync';
import reviewApprovalRoutes from './routes/reviewApproval';
// import partnerCoordinationRoutes from './routes/partnerCoordination';

// Import database service
import { db } from './services/database';

// TODO: Add Sentry integration in production

const app = express();
const PORT = parseInt(process.env.PORT || '8000');

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
        name: 'AI Transparency',
        description: 'AI interaction tracking, transparency, and user feedback systems'
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
        name: 'MCP Scraping',
        description: 'Enhanced scraping using MCP server with Firecrawl fallback'
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
      },
      {
        name: 'Compliance',
        description: 'AI-powered compliance checking, rule validation, and automated quality assurance'
      },
      {
        name: 'Budget Optimization',
        description: 'AI-powered budget optimization, cost analysis, and financial planning for grants'
      },
      {
        name: 'Semantic Search',
        description: 'AI-powered semantic search, embedding generation, and similarity analysis'
      },
      {
        name: 'Knowledge Base',
        description: 'RAG knowledge base management, document storage, and intelligent retrieval'
      },
      {
        name: 'OpenAI Assistants',
        description: 'Specialized OpenAI Assistant integration for grant writing, compliance, and analysis'
      },
      {
        name: 'Partner Coordination',
        description: 'AI-powered partner matching and collaboration planning for multi-partner grants'
      },
      {
        name: 'AI Cost Management',
        description: 'AI cost tracking, optimization, and threshold management for cost control'
      },
      {
        name: 'AI Load Balancing',
        description: 'AI provider management, load balancing, and scaling infrastructure'
      },
      {
        name: 'AI Monitoring',
        description: 'AI system monitoring, metrics collection, and performance analytics'
      },
      {
        name: 'Review & Approval',
        description: 'Comprehensive review workflows, approval management, and process automation'
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
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const dbResult = await db.query('SELECT NOW() as current_time');
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'connected',
        serverTime: dbResult.rows[0].current_time
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      database: {
        status: 'error',
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }
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
app.use('/firecrawl', firecrawlRoutes);
app.use('/mcp-scraping', mcpScrapingRoutes);
app.use('/ai', aiRoutes);
app.use('/ai', aiTransparencyRoutes);
app.use('/ai', aiWritingRoutes);
app.use('/progressive-form', progressiveFormRoutes);
app.use('/compliance', complianceRoutes);
app.use('/budget-optimization', budgetOptimizationRoutes);
app.use('/monitoring', monitoringRoutes);
app.use('/predictive', predictiveRoutes);
app.use('/stripe', stripeRoutes);
app.use('/export', exportRoutes);
app.use('/newsletter', newsletterRoutes);
app.use('/semantic-search', semanticSearchRoutes);
app.use('/knowledge-base', knowledgeBaseRoutes);
app.use('/assistants', openaiAssistantsRoutes);
app.use('/ai-cost', aiCostManagementRoutes);
app.use('/ai-load-balancer', aiLoadBalancerRoutes);
app.use('/ai-monitoring', aiMonitoringRoutes);
app.use('/ai/editor', aiEditorRoutes);
app.use('/grant-intelligence', grantIntelligenceRoutes);
app.use('/templates', templatesRoutes);
app.use('/database-sync', databaseSyncRoutes);
app.use('/review-approval', reviewApprovalRoutes);
// app.use('/partner-coordination', partnerCoordinationRoutes);

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
    app.listen(PORT, '0.0.0.0', () => {
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