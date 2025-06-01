import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { enhancedFirecrawlService } from '../services/enhancedFirecrawlService';
import { logger } from '../services/logger';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ScrapedPage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         metadata:
 *           type: object
 *         processing_status:
 *           type: string
 *           enum: [pending, processed, failed]
 *         created_at:
 *           type: string
 *           format: date-time
 *     
 *     ScrapedDocument:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         url:
 *           type: string
 *           format: uri
 *         title:
 *           type: string
 *         content:
 *           type: string
 *         file_type:
 *           type: string
 *           enum: [pdf, docx, doc, txt]
 *         extracted_data:
 *           type: object
 *         confidence_score:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *     
 *     CrawlJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         source_url:
 *           type: string
 *           format: uri
 *         job_type:
 *           type: string
 *           enum: [full_crawl, targeted_scrape, document_harvest, link_discovery]
 *         status:
 *           type: string
 *           enum: [pending, running, completed, failed, paused]
 *         progress:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         stats:
 *           type: object
 *         configuration:
 *           type: object
 */

/**
 * @swagger
 * /scraping/jobs:
 *   get:
 *     summary: Get all crawl jobs
 *     tags: [Scraping]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, running, completed, failed, paused]
 *     responses:
 *       200:
 *         description: List of crawl jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/CrawlJob'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/jobs', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;

  const result = await enhancedFirecrawlService.getCrawlJobs({
    limit,
    offset,
    status
  });

  res.json({
    jobs: result.jobs,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit)
    }
  });
}));

/**
 * @swagger
 * /scraping/jobs:
 *   post:
 *     summary: Start a new crawl job
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - source_url
 *             properties:
 *               source_url:
 *                 type: string
 *                 format: uri
 *                 description: URL to start crawling from
 *               job_type:
 *                 type: string
 *                 enum: [full_crawl, targeted_scrape, document_harvest, link_discovery]
 *                 default: full_crawl
 *               configuration:
 *                 type: object
 *                 properties:
 *                   max_depth:
 *                     type: integer
 *                     minimum: 1
 *                     maximum: 10
 *                     default: 3
 *                   include_patterns:
 *                     type: array
 *                     items:
 *                       type: string
 *                     default: ["*"]
 *                   exclude_patterns:
 *                     type: array
 *                     items:
 *                       type: string
 *                     default: []
 *                   follow_external_links:
 *                     type: boolean
 *                     default: false
 *                   capture_screenshots:
 *                     type: boolean
 *                     default: false
 *                   extract_structured_data:
 *                     type: boolean
 *                     default: true
 *                   process_documents:
 *                     type: boolean
 *                     default: true
 *                   rate_limit_ms:
 *                     type: integer
 *                     minimum: 0
 *                     default: 1000
 *     responses:
 *       201:
 *         description: Crawl job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CrawlJob'
 *       400:
 *         description: Invalid request parameters
 */
router.post('/jobs', asyncHandler(async (req, res) => {
  const { source_url, job_type = 'full_crawl', configuration = {} } = req.body;

  if (!source_url) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'source_url is required'
    });
  }

  // Validate URL
  try {
    new URL(source_url);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'source_url must be a valid URL'
    });
  }

  const job = await enhancedFirecrawlService.startAdvancedCrawl(
    source_url,
    job_type,
    configuration
  );

  logger.info('Crawl job started', {
    jobId: job.id,
    sourceUrl: source_url,
    jobType: job_type
  });

  res.status(201).json(job);
}));

/**
 * @swagger
 * /scraping/jobs/{jobId}:
 *   get:
 *     summary: Get detailed information about a specific crawl job
 *     tags: [Scraping]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed job information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 job:
 *                   $ref: '#/components/schemas/CrawlJob'
 *                 pages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScrapedPage'
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScrapedDocument'
 *                 stats:
 *                   type: object
 *       404:
 *         description: Job not found
 */
router.get('/jobs/:jobId', asyncHandler(async (req, res) => {
  const { jobId } = req.params;

  const jobDetails = await enhancedFirecrawlService.getJobDetails(jobId);

  if (!jobDetails) {
    return res.status(404).json({
      error: 'Job not found',
      message: `Crawl job with ID ${jobId} does not exist`
    });
  }

  res.json(jobDetails);
}));

/**
 * @swagger
 * /scraping/pages:
 *   get:
 *     summary: Get all scraped pages
 *     tags: [Scraping]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processed, failed]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in page titles and URLs
 *     responses:
 *       200:
 *         description: List of scraped pages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 pages:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScrapedPage'
 *                 pagination:
 *                   type: object
 */
router.get('/pages', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const status = req.query.status as string;
  const search = req.query.search as string;

  const result = await enhancedFirecrawlService.getScrapedPages({
    limit,
    offset,
    status,
    search
  });

  res.json({
    pages: result.pages,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit)
    }
  });
}));

/**
 * @swagger
 * /scraping/documents:
 *   get:
 *     summary: Get all scraped documents
 *     tags: [Scraping]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: file_type
 *         schema:
 *           type: string
 *           enum: [pdf, docx, doc, txt]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in document titles and content
 *     responses:
 *       200:
 *         description: List of scraped documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ScrapedDocument'
 *                 pagination:
 *                   type: object
 */
router.get('/documents', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const fileType = req.query.file_type as string;
  const search = req.query.search as string;

  const result = await enhancedFirecrawlService.getScrapedDocuments({
    limit,
    offset,
    fileType,
    search
  });

  res.json({
    documents: result.documents,
    pagination: {
      page,
      limit,
      total: result.total,
      pages: Math.ceil(result.total / limit)
    }
  });
}));

/**
 * @swagger
 * /scraping/pages/{pageId}:
 *   get:
 *     summary: Get detailed information about a scraped page
 *     tags: [Scraping]
 *     parameters:
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed page information
 *       404:
 *         description: Page not found
 */
router.get('/pages/:pageId', asyncHandler(async (req, res) => {
  const { pageId } = req.params;

  const result = await enhancedFirecrawlService.getScrapedPages({ 
    limit: 1, 
    offset: 0 
  });
  
  const page = result.pages.find(p => p.id === pageId);

  if (!page) {
    return res.status(404).json({
      error: 'Page not found',
      message: `Scraped page with ID ${pageId} does not exist`
    });
  }

  res.json(page);
}));

/**
 * @swagger
 * /scraping/documents/{documentId}:
 *   get:
 *     summary: Get detailed information about a scraped document
 *     tags: [Scraping]
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Detailed document information
 *       404:
 *         description: Document not found
 */
router.get('/documents/:documentId', asyncHandler(async (req, res) => {
  const { documentId } = req.params;

  const result = await enhancedFirecrawlService.getScrapedDocuments({ 
    limit: 1, 
    offset: 0 
  });
  
  const document = result.documents.find(d => d.id === documentId);

  if (!document) {
    return res.status(404).json({
      error: 'Document not found',
      message: `Scraped document with ID ${documentId} does not exist`
    });
  }

  res.json(document);
}));

/**
 * @swagger
 * /scraping/cleanup:
 *   delete:
 *     summary: Clean up scraped data
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - ids
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [pages, documents, jobs]
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Data cleaned up successfully
 *       400:
 *         description: Invalid request parameters
 */
router.delete('/cleanup', asyncHandler(async (req, res) => {
  const { type, ids } = req.body;

  if (!type || !ids || !Array.isArray(ids)) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'type and ids array are required'
    });
  }

  if (!['pages', 'documents', 'jobs'].includes(type)) {
    return res.status(400).json({
      error: 'Invalid type',
      message: 'type must be one of: pages, documents, jobs'
    });
  }

  await enhancedFirecrawlService.deleteScrapedData(type, ids);

  logger.info('Scraped data cleaned up', {
    type,
    count: ids.length,
    ids: ids.slice(0, 5) // Log first 5 IDs only
  });

  res.json({
    message: `Successfully deleted ${ids.length} ${type}`,
    deleted_count: ids.length
  });
}));

/**
 * @swagger
 * /scraping/stats:
 *   get:
 *     summary: Get scraping statistics
 *     tags: [Scraping]
 *     responses:
 *       200:
 *         description: Scraping statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 jobs:
 *                   type: object
 *                 pages:
 *                   type: object
 *                 documents:
 *                   type: object
 */
router.get('/stats', asyncHandler(async (req, res) => {
  // Get basic statistics
  const jobsResult = await enhancedFirecrawlService.getCrawlJobs({ limit: 1 });
  const pagesResult = await enhancedFirecrawlService.getScrapedPages({ limit: 1 });
  const docsResult = await enhancedFirecrawlService.getScrapedDocuments({ limit: 1 });

  res.json({
    jobs: {
      total: jobsResult.total,
      // Additional job stats would require more queries
    },
    pages: {
      total: pagesResult.total,
      // Additional page stats would require more queries
    },
    documents: {
      total: docsResult.total,
      // Additional document stats would require more queries
    }
  });
}));

export default router;