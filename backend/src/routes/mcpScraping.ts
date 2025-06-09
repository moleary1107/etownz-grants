import { Router, Response } from 'express';
import { mcpFirecrawlService } from '../services/mcpFirecrawlService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { body, query, validationResult } from 'express-validator';
import { logger } from '../services/logger';

const router = Router();

// Validation middleware
const validate = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false,
      errors: errors.array() 
    });
  }
  next();
};

/**
 * @swagger
 * /api/mcp-scraping/fetch:
 *   post:
 *     summary: Enhanced fetch using MCP server with Firecrawl fallback
 *     tags: [MCP Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 format: uri
 *               options:
 *                 type: object
 *                 properties:
 *                   extractStructuredData:
 *                     type: boolean
 *                   convertToMarkdown:
 *                     type: boolean
 *                   timeout:
 *                     type: integer
 *                     minimum: 1000
 *                     maximum: 60000
 */
router.post('/fetch',
  authenticateToken,
  [
    body('url').isURL().withMessage('Valid URL required'),
    body('options.timeout').optional().isInt({ min: 1000, max: 60000 }),
    body('options.extractStructuredData').optional().isBoolean(),
    body('options.convertToMarkdown').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url, options = {} } = req.body;
    const userId = req.user!.id;

    logger.info('Enhanced fetch request', { url, userId, options });

    const result = await mcpFirecrawlService.enhancedFetch(url, options);

    res.json({
      success: true,
      data: result,
      message: 'Content fetched successfully'
    });
  })
);

/**
 * @swagger
 * /api/mcp-scraping/batch-grants:
 *   post:
 *     summary: Batch scrape grant sources with intelligent routing
 *     tags: [MCP Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - urls
 *             properties:
 *               urls:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uri
 *                 maxItems: 50
 *               extractionPrompt:
 *                 type: string
 *               useAI:
 *                 type: boolean
 *               batchSize:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               rateLimitMs:
 *                 type: integer
 *                 minimum: 500
 *                 maximum: 10000
 */
router.post('/batch-grants',
  authenticateToken,
  [
    body('urls').isArray({ min: 1, max: 50 }).withMessage('URLs array required (1-50 items)'),
    body('urls.*').isURL().withMessage('Each URL must be valid'),
    body('batchSize').optional().isInt({ min: 1, max: 10 }),
    body('rateLimitMs').optional().isInt({ min: 500, max: 10000 }),
    body('useAI').optional().isBoolean(),
    body('extractionPrompt').optional().isString()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { urls, extractionPrompt, useAI, batchSize, rateLimitMs } = req.body;
    const userId = req.user!.id;

    logger.info('Batch grant scraping request', { 
      urlCount: urls.length, 
      userId, 
      useAI,
      batchSize 
    });

    // Set up real-time progress updates
    const progressUpdates: any[] = [];
    
    mcpFirecrawlService.on('urlScraped', (data) => {
      progressUpdates.push({
        ...data,
        timestamp: new Date().toISOString()
      });
    });

    const results = await mcpFirecrawlService.scrapeGrantSources({
      urls,
      extractionPrompt,
      useAI: useAI || false,
      batchSize: batchSize || 5,
      rateLimitMs: rateLimitMs || 2000
    });

    // Remove event listeners
    mcpFirecrawlService.removeAllListeners('urlScraped');

    res.json({
      success: true,
      data: {
        results,
        progressUpdates,
        summary: {
          totalUrls: urls.length,
          successfulScrapes: results.length,
          failedScrapes: urls.length - results.length,
          aiEnhanced: results.filter(r => r.structuredData).length
        }
      },
      message: `Batch scraping completed: ${results.length}/${urls.length} successful`
    });
  })
);

/**
 * @swagger
 * /api/mcp-scraping/health:
 *   get:
 *     summary: Check health of MCP and Firecrawl services
 *     tags: [MCP Scraping]
 *     security:
 *       - bearerAuth: []
 */
router.get('/health',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const health = await mcpFirecrawlService.healthCheck();
    
    const overallHealth = health.mcpServer && health.firecrawl;
    
    res.status(overallHealth ? 200 : 503).json({
      success: overallHealth,
      data: {
        services: health,
        overall: overallHealth ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString()
      },
      message: overallHealth ? 'All services healthy' : 'Some services unavailable'
    });
  })
);

/**
 * @swagger
 * /api/mcp-scraping/grant-sources:
 *   get:
 *     summary: Get predefined grant source URLs for Ireland
 *     tags: [MCP Scraping]
 *     security:
 *       - bearerAuth: []
 */
router.get('/grant-sources',
  authenticateToken,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // Predefined Irish grant sources
    const grantSources = [
      {
        name: 'Enterprise Ireland',
        url: 'https://www.enterprise-ireland.com/en/funding-supports/',
        category: 'business',
        description: 'Government supports for Irish businesses'
      },
      {
        name: 'Science Foundation Ireland',
        url: 'https://www.sfi.ie/funding/',
        category: 'research',
        description: 'Research and innovation funding'
      },
      {
        name: 'Irish Research Council',
        url: 'https://research.ie/funding/',
        category: 'research',
        description: 'Postgraduate and postdoctoral funding'
      },
      {
        name: 'Local Enterprise Offices',
        url: 'https://www.localenterprise.ie/Discover-Business-Supports/',
        category: 'local',
        description: 'Local business support and grants'
      },
      {
        name: 'Department of Agriculture',
        url: 'https://www.gov.ie/en/organisation/department-of-agriculture-food-and-the-marine/',
        category: 'agriculture',
        description: 'Agriculture and food sector funding'
      },
      {
        name: 'Sustainable Energy Authority',
        url: 'https://www.seai.ie/grants/',
        category: 'energy',
        description: 'Energy efficiency and renewable grants'
      },
      {
        name: 'Arts Council Ireland',
        url: 'https://www.artscouncil.ie/funding/',
        category: 'arts',
        description: 'Arts and culture funding opportunities'
      },
      {
        name: 'Sport Ireland',
        url: 'https://www.sportireland.ie/grants-and-funding',
        category: 'sports',
        description: 'Sports development and facility grants'
      }
    ];

    res.json({
      success: true,
      data: {
        sources: grantSources,
        categories: [...new Set(grantSources.map(s => s.category))],
        totalSources: grantSources.length
      },
      message: 'Grant sources retrieved successfully'
    });
  })
);

/**
 * @swagger
 * /api/mcp-scraping/quick-scan:
 *   post:
 *     summary: Quick scan of Irish grant sources for new opportunities
 *     tags: [MCP Scraping]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               categories:
 *                 type: array
 *                 items:
 *                   type: string
 *               useAI:
 *                 type: boolean
 */
router.post('/quick-scan',
  authenticateToken,
  [
    body('categories').optional().isArray(),
    body('categories.*').optional().isString(),
    body('useAI').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { categories = [], useAI = true } = req.body;
    const userId = req.user!.id;

    // Get grant sources (filtered by categories if provided)
    const allSources = [
      'https://www.enterprise-ireland.com/en/funding-supports/',
      'https://www.sfi.ie/funding/',
      'https://research.ie/funding/',
      'https://www.localenterprise.ie/Discover-Business-Supports/'
    ];

    logger.info('Quick grant scan initiated', { userId, categories, useAI });

    const results = await mcpFirecrawlService.scrapeGrantSources({
      urls: allSources,
      extractionPrompt: 'Extract new grant opportunities, funding amounts, deadlines, and eligibility criteria',
      useAI,
      batchSize: 2,
      rateLimitMs: 3000
    });

    // Analyze results for new opportunities
    const newOpportunities = results
      .filter(r => r.structuredData && Object.keys(r.structuredData).length > 0)
      .map(r => ({
        source: r.url,
        title: r.metadata.title,
        opportunities: r.structuredData,
        scannedAt: r.metadata.timestamp
      }));

    res.json({
      success: true,
      data: {
        scan: {
          totalSources: allSources.length,
          successfulScans: results.length,
          newOpportunities: newOpportunities.length,
          opportunities: newOpportunities
        },
        recommendations: newOpportunities.length > 0 ? 
          'New grant opportunities found! Review extracted data for application deadlines.' :
          'No new opportunities detected. Try again later.'
      },
      message: `Quick scan completed: ${newOpportunities.length} opportunities found`
    });
  })
);

export default router;