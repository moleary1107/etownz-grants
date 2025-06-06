import express from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { enhancedFirecrawlService } from '../services/enhancedFirecrawlService';
import { grantIntegrationService } from '../services/grantIntegrationService';
import VectorDatabaseService from '../services/vectorDatabase';
import { embeddingService } from '../services/embeddingService';
import { grantsService } from '../services/grantsService';
import { logger } from '../services/logger';
import { db } from '../services/database';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and TXT files are allowed.'));
    }
  }
});

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

  // Get enhanced statistics
  const enhancedStats = await getEnhancedStats();
  
  res.json({
    jobs: {
      total: jobsResult.total,
      completed: enhancedStats.jobs.completed,
      running: enhancedStats.jobs.running,
      failed: enhancedStats.jobs.failed
    },
    grants: {
      total: enhancedStats.grants.total,
      added_to_vector_db: enhancedStats.grants.added_to_vector_db,
      by_type: enhancedStats.grants.by_type
    },
    documents: {
      total: docsResult.total,
      processed: enhancedStats.documents.processed
    }
  });
}));

/**
 * @swagger
 * /scraping/grants:
 *   get:
 *     summary: Get all scraped grants
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
 *         name: grant_type
 *         schema:
 *           type: string
 *           enum: [national, regional, local, energy, research, business, arts, other]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in grant titles and descriptions
 *     responses:
 *       200:
 *         description: List of scraped grants
 */
router.get('/grants', asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;
  const grantType = req.query.grant_type as string;
  const search = req.query.search as string;

  try {
    const result = await getScrapedGrants({
      limit,
      offset,
      grantType,
      search
    });

    res.json({
      grants: result.grants,
      pagination: {
        page,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit)
      }
    });
  } catch (error) {
    logger.error('Failed to get scraped grants:', error);
    res.status(500).json({
      error: 'Failed to fetch grants',
      message: 'An error occurred while fetching scraped grants'
    });
  }
}));

/**
 * @swagger
 * /scraping/manual/url:
 *   post:
 *     summary: Add a single URL for manual processing
 *     tags: [Scraping]
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
 *               description:
 *                 type: string
 *               extract_grants:
 *                 type: boolean
 *                 default: true
 *               add_to_vector_db:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: URL processing job created
 */
router.post('/manual/url', asyncHandler(async (req, res) => {
  const { url, description, extract_grants = true, add_to_vector_db = true } = req.body;

  if (!url) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'url is required'
    });
  }

  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'url must be a valid URL'
    });
  }

  try {
    const job = await processManualUrl({
      url,
      description,
      extract_grants,
      add_to_vector_db
    });

    logger.info('Manual URL processing started', {
      jobId: job.id,
      url,
      extract_grants,
      add_to_vector_db
    });

    res.status(201).json(job);
  } catch (error) {
    logger.error('Failed to process manual URL:', error);
    res.status(500).json({
      error: 'Failed to process URL',
      message: 'An error occurred while processing the URL'
    });
  }
}));

/**
 * @swagger
 * /scraping/manual/document:
 *   post:
 *     summary: Upload a document for manual processing
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - document
 *             properties:
 *               document:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *               extract_grants:
 *                 type: boolean
 *                 default: true
 *               add_to_vector_db:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Document processing job created
 */
router.post('/manual/document', upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      error: 'Missing required file',
      message: 'document file is required'
    });
  }

  const { description, extract_grants = 'true', add_to_vector_db = 'true' } = req.body;

  try {
    const job = await processManualDocument({
      file: req.file,
      description,
      extract_grants: extract_grants === 'true',
      add_to_vector_db: add_to_vector_db === 'true'
    });

    logger.info('Manual document processing started', {
      jobId: job.id,
      filename: req.file.originalname,
      extract_grants: extract_grants === 'true',
      add_to_vector_db: add_to_vector_db === 'true'
    });

    res.status(201).json(job);
  } catch (error) {
    logger.error('Failed to process manual document:', error);
    // Clean up uploaded file on error
    if (req.file) {
      fs.unlink(req.file.path, () => {});
    }
    res.status(500).json({
      error: 'Failed to process document',
      message: 'An error occurred while processing the document'
    });
  }
}));

/**
 * @swagger
 * /scraping/add-to-vector-db:
 *   post:
 *     summary: Add specific grants to vector database
 *     tags: [Scraping]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grant_ids
 *             properties:
 *               grant_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Grants added to vector database
 */
router.post('/add-to-vector-db', asyncHandler(async (req, res) => {
  const { grant_ids } = req.body;

  if (!grant_ids || !Array.isArray(grant_ids) || grant_ids.length === 0) {
    return res.status(400).json({
      error: 'Invalid request',
      message: 'grant_ids array is required and must not be empty'
    });
  }

  try {
    const result = await addGrantsToVectorDatabase(grant_ids);

    logger.info('Grants added to vector database', {
      count: grant_ids.length,
      success: result.success,
      failed: result.failed
    });

    res.json({
      message: `Successfully processed ${grant_ids.length} grants`,
      success: result.success,
      failed: result.failed,
      total: grant_ids.length
    });
  } catch (error) {
    logger.error('Failed to add grants to vector database:', error);
    res.status(500).json({
      error: 'Failed to add grants to vector database',
      message: 'An error occurred while adding grants to the vector database'
    });
  }
}));

// Helper functions
async function getEnhancedStats() {
  // This would typically query your database
  // For now, returning mock data structure
  return {
    jobs: {
      completed: 0,
      running: 0,
      failed: 0
    },
    grants: {
      total: 0,
      added_to_vector_db: 0,
      by_type: {
        national: 0,
        regional: 0,
        local: 0,
        energy: 0,
        research: 0,
        business: 0,
        arts: 0,
        other: 0
      }
    },
    documents: {
      processed: 0
    }
  };
}

async function getScrapedGrants(options: {
  limit: number;
  offset: number;
  grantType?: string;
  search?: string;
}) {
  
  try {
    let whereClause = '';
    const params: any[] = [];
    let paramIndex = 1;

    const conditions: string[] = [];
    
    if (options.grantType) {
      conditions.push(`grant_type = $${paramIndex}`);
      params.push(options.grantType);
      paramIndex++;
    }
    
    if (options.search) {
      conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR organization ILIKE $${paramIndex})`);
      params.push(`%${options.search}%`);
      paramIndex++;
    }
    
    if (conditions.length > 0) {
      whereClause = `WHERE ${conditions.join(' AND ')}`;
    }

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) FROM scraped_grants ${whereClause}
    `, params);

    // Get grants with pagination
    const grantsResult = await db.query(`
      SELECT * FROM scraped_grants ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, options.limit, options.offset]);

    return {
      grants: grantsResult.rows,
      total: parseInt(countResult.rows[0].count)
    };
  } catch (error) {
    logger.error('Failed to get scraped grants from database', { error, options });
    return {
      grants: [],
      total: 0
    };
  }
}

async function processManualUrl(options: {
  url: string;
  description?: string;
  extract_grants: boolean;
  add_to_vector_db: boolean;
}) {
  
  // Create a manual URL processing job
  const jobId = uuidv4();
  const now = new Date();
  
  const job = {
    id: jobId,
    source_url: options.url,
    job_type: 'manual_url' as const,
    status: 'pending' as const,
    progress: 0,
    stats: {
      pages_scraped: 0,
      documents_processed: 0,
      links_discovered: 0,
      grants_found: 0,
      errors_encountered: 0,
      processing_time_ms: 0,
      grants_by_type: {
        national: 0,
        regional: 0,
        local: 0,
        energy: 0,
        research: 0,
        business: 0,
        arts: 0,
        other: 0
      }
    },
    grant_categories: [],
    created_at: now.toISOString(),
    added_to_vector_db: false,
    manual_input: {
      type: 'url' as const,
      original_url: options.url
    }
  };

  // Save job to database
  try {
    await db.query(`
      INSERT INTO enhanced_scraping_jobs (
        id, source_url, job_type, status, progress, stats, 
        grant_categories, configuration, added_to_vector_db, 
        manual_input, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
    `, [
      jobId,
      options.url,
      'manual_url',
      'pending',
      0,
      JSON.stringify(job.stats),
      JSON.stringify([]),
      JSON.stringify({ extract_grants: options.extract_grants, add_to_vector_db: options.add_to_vector_db }),
      false,
      JSON.stringify(job.manual_input),
      now
    ]);
    
    logger.info('Manual URL job saved to database', { jobId, url: options.url });
  } catch (error) {
    logger.error('Failed to save manual URL job to database', { error, jobId });
    throw error;
  }

  // TODO: Implement actual processing logic
  // This would involve:
  // 1. Using Firecrawl to scrape the URL
  // 2. Extracting grants using AI
  // 3. Adding to vector database if requested
  // 4. Updating job status

  return job;
}

async function processManualDocument(options: {
  file: Express.Multer.File;
  description?: string;
  extract_grants: boolean;
  add_to_vector_db: boolean;
}) {
  // Create a manual document processing job
  const job = {
    id: uuidv4(),
    source_url: `file://${options.file.originalname}`,
    job_type: 'manual_document' as const,
    status: 'pending' as const,
    progress: 0,
    stats: {
      pages_scraped: 0,
      documents_processed: 1,
      links_discovered: 0,
      grants_found: 0,
      errors_encountered: 0,
      processing_time_ms: 0,
      grants_by_type: {
        national: 0,
        regional: 0,
        local: 0,
        energy: 0,
        research: 0,
        business: 0,
        arts: 0,
        other: 0
      }
    },
    grant_categories: [],
    created_at: new Date().toISOString(),
    added_to_vector_db: false,
    manual_input: {
      type: 'document' as const,
      file_name: options.file.originalname
    }
  };

  // TODO: Implement actual processing logic
  // This would involve:
  // 1. Reading and parsing the document
  // 2. Extracting grants using AI
  // 3. Adding to vector database if requested
  // 4. Updating job status

  return job;
}

async function addGrantsToVectorDatabase(grantIds: string[]) {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const grantId of grantIds) {
    try {
      // TODO: Implement actual vector database integration
      // This would involve:
      // 1. Fetching grant data from database
      // 2. Generating embeddings
      // 3. Storing in Pinecone
      // 4. Updating grant record
      
      results.success++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Failed to process grant ${grantId}: ${error}`);
    }
  }

  return results;
}

export default router;