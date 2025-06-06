import { Router, Response } from 'express';
import { firecrawlIntegrationService } from '../services/firecrawlIntegrationService';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { body, query, param, validationResult } from 'express-validator';
import { logger } from '../services/logger';

const router = Router();

// Validation middleware
const validate = (req: AuthenticatedRequest, res: Response, next: Function) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// Create a new crawl job
router.post('/jobs',
  authenticateToken,
  [
    body('sourceUrl').isURL().withMessage('Valid URL required'),
    body('jobType').isIn(['full_crawl', 'targeted_scrape', 'document_harvest', 'link_discovery', 'ai_extract', 'monitor']),
    body('configuration.maxDepth').optional().isInt({ min: 1, max: 10 }),
    body('configuration.rateLimitMs').optional().isInt({ min: 0, max: 10000 }),
    body('priority').optional().isInt({ min: 0, max: 100 }),
    body('webhookUrl').optional().isURL()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sourceUrl, jobType, configuration, priority, webhookUrl } = req.body;
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const job = await firecrawlIntegrationService.createJob(
      sourceUrl,
      jobType,
      configuration,
      {
        userId,
        organizationId,
        priority,
        webhookUrl
      }
    );

    logger.info('Firecrawl job created', { jobId: job.id, userId, jobType });
    res.status(201).json(job);
  })
);

// Create batch jobs
router.post('/jobs/batch',
  authenticateToken,
  [
    body('jobs').isArray().withMessage('Jobs array required'),
    body('jobs.*.sourceUrl').isURL(),
    body('jobs.*.jobType').isIn(['full_crawl', 'targeted_scrape', 'document_harvest', 'link_discovery', 'ai_extract', 'monitor'])
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobs } = req.body;
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    const createdJobs = await firecrawlIntegrationService.createBatchJobs(
      jobs,
      { userId, organizationId }
    );

    logger.info('Batch Firecrawl jobs created', { count: createdJobs.length, userId });
    res.status(201).json({ jobs: createdJobs });
  })
);

// List jobs with filtering
router.get('/jobs',
  authenticateToken,
  [
    query('status').optional().isIn(['pending', 'running', 'completed', 'failed', 'paused', 'cancelled']),
    query('jobType').optional().isIn(['full_crawl', 'targeted_scrape', 'document_harvest', 'link_discovery', 'ai_extract', 'monitor']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { status, jobType, limit = 20, offset = 0 } = req.query;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const result = await firecrawlIntegrationService.listJobs({
      userId: isAdmin ? undefined : userId,
      status: status as any,
      jobType: jobType as any,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(result);
  })
);

// Get job details
router.get('/jobs/:jobId',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;
    const job = await firecrawlIntegrationService.getJob(jobId);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check access permissions
    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(job);
  })
);

// Get job content
router.get('/jobs/:jobId/content',
  authenticateToken,
  [
    param('jobId').isUUID(),
    query('contentType').optional().isIn(['page', 'document', 'ai_extraction']),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;
    const { contentType, limit = 50, offset = 0 } = req.query;

    // Verify job access
    const job = await firecrawlIntegrationService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await firecrawlIntegrationService.getJobContent(jobId, {
      contentType: contentType as string,
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(result);
  })
);

// Cancel a job
router.post('/jobs/:jobId/cancel',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    // Verify job access
    const job = await firecrawlIntegrationService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await firecrawlIntegrationService.cancelJob(jobId);
    res.json({ message: 'Job cancelled successfully' });
  })
);

// Retry a failed job
router.post('/jobs/:jobId/retry',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    // Verify job access
    const job = await firecrawlIntegrationService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const newJob = await firecrawlIntegrationService.retryJob(jobId);
    res.json(newJob);
  })
);

// Get extracted grants
router.get('/grants',
  authenticateToken,
  [
    query('jobId').optional().isUUID(),
    query('minConfidence').optional().isFloat({ min: 0, max: 1 }),
    query('deadlineAfter').optional().isISO8601(),
    query('deadlineBefore').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 })
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { 
      jobId, 
      minConfidence, 
      deadlineAfter, 
      deadlineBefore,
      limit = 20, 
      offset = 0 
    } = req.query;

    const result = await firecrawlIntegrationService.getExtractedGrants({
      jobId: jobId as string,
      minConfidence: minConfidence ? Number(minConfidence) : undefined,
      deadline: {
        after: deadlineAfter ? new Date(deadlineAfter as string) : undefined,
        before: deadlineBefore ? new Date(deadlineBefore as string) : undefined
      },
      limit: Number(limit),
      offset: Number(offset)
    });

    res.json(result);
  })
);

// Get statistics
router.get('/statistics',
  authenticateToken,
  [
    query('startDate').optional().isISO8601(),
    query('endDate').optional().isISO8601()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { startDate, endDate } = req.query;
    const userId = req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const stats = await firecrawlIntegrationService.getStatistics({
      userId: isAdmin ? undefined : userId,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined
    });

    res.json(stats);
  })
);

// Server-Sent Events for real-time updates
router.get('/jobs/:jobId/subscribe',
  authenticateToken,
  [param('jobId').isUUID()],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    // Verify job access
    const job = await firecrawlIntegrationService.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && job.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);

    // Subscribe to job updates
    const unsubscribe = firecrawlIntegrationService.subscribeToJobUpdates(
      jobId,
      (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    );

    // Clean up on client disconnect
    req.on('close', () => {
      unsubscribe();
      res.end();
    });
  })
);

// AI Extraction endpoint for one-off extractions
router.post('/extract',
  authenticateToken,
  [
    body('url').isURL().withMessage('Valid URL required'),
    body('extractionPrompt').optional().isString(),
    body('screenshot').optional().isBoolean()
  ],
  validate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { url, extractionPrompt, screenshot } = req.body;
    const userId = req.user!.id;
    const organizationId = req.user!.organizationId;

    // Create an AI extraction job
    const job = await firecrawlIntegrationService.createJob(
      url,
      'ai_extract',
      {
        extractionPrompt,
        captureScreenshots: screenshot,
        aiExtraction: true
      },
      {
        userId,
        organizationId,
        priority: 10 // Higher priority for one-off extractions
      }
    );

    // Wait for completion (with timeout)
    const timeout = 30000; // 30 seconds
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const currentJob = await firecrawlIntegrationService.getJob(job.id);
      
      if (currentJob?.status === 'completed') {
        return res.json({
          jobId: job.id,
          status: 'completed',
          results: currentJob.aiExtractionResults
        });
      }
      
      if (currentJob?.status === 'failed') {
        return res.status(500).json({
          jobId: job.id,
          status: 'failed',
          error: currentJob.errorMessage
        });
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Timeout - return job ID for polling
    res.json({
      jobId: job.id,
      status: 'processing',
      message: 'Extraction is taking longer than expected. Use the job ID to check status.'
    });
  })
);

// Health check
router.get('/health',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    try {
      await firecrawlIntegrationService.initialize();
      res.json({ 
        status: 'healthy',
        service: 'firecrawl-integration',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  })
);

export default router;