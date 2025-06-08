import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger';
import { db } from './database';
import { openaiService } from './openaiService';
import { EventEmitter } from 'events';
import { z } from 'zod';

// Enhanced type definitions with Zod validation
const FirecrawlConfigSchema = z.object({
  maxDepth: z.number().min(1).max(10).default(3),
  includePatterns: z.array(z.string()).default(['*']),
  excludePatterns: z.array(z.string()).default([]),
  followExternalLinks: z.boolean().default(false),
  captureScreenshots: z.boolean().default(false),
  extractStructuredData: z.boolean().default(true),
  processDocuments: z.boolean().default(true),
  rateLimitMs: z.number().min(0).max(10000).default(1000),
  aiExtraction: z.boolean().default(true),
  extractionPrompt: z.string().optional()
});

const JobTypeSchema = z.enum(['full_crawl', 'targeted_scrape', 'document_harvest', 'link_discovery', 'ai_extract', 'monitor']);
const JobStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'paused', 'cancelled']);

export type FirecrawlConfig = z.infer<typeof FirecrawlConfigSchema>;
export type JobType = z.infer<typeof JobTypeSchema>;
export type JobStatus = z.infer<typeof JobStatusSchema>;

export interface FirecrawlJob {
  id: string;
  sourceUrl: string;
  jobType: JobType;
  status: JobStatus;
  progress: number;
  stats: {
    pagesScraped: number;
    documentsProcessed: number;
    linksDiscovered: number;
    grantsFound: number;
    errorsEncountered: number;
    processingTimeMs: number;
    dataExtracted: number;
  };
  configuration: FirecrawlConfig;
  aiExtractionResults?: any[];
  webhookUrl?: string;
  priority: number;
  userId?: string;
  organizationId?: string;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExtractedGrantData {
  title: string;
  description: string;
  amount?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  deadline?: Date;
  eligibility?: string[];
  categories?: string[];
  contactInfo?: {
    email?: string;
    phone?: string;
    website?: string;
  };
  confidence: number;
  source: {
    url: string;
    pageTitle: string;
    extractedAt: Date;
  };
}

export class FirecrawlIntegrationService extends EventEmitter {
  private firecrawl: FirecrawlApp;
  private isInitialized = false;
  private activeJobs: Map<string, FirecrawlJob> = new Map();
  private jobQueue: FirecrawlJob[] = [];
  private maxConcurrentJobs = 3;

  constructor() {
    super();
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required');
    }
    
    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.createTables();
    this.startJobProcessor();
    this.isInitialized = true;
    logger.info('Firecrawl Integration Service initialized');
  }

  private async createTables(): Promise<void> {
    try {
      // Enhanced crawl jobs table with AI features
      await db.query(`
        CREATE TABLE IF NOT EXISTS firecrawl_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_url TEXT NOT NULL,
          job_type VARCHAR(50) DEFAULT 'full_crawl',
          status VARCHAR(20) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          stats JSONB DEFAULT '{}',
          configuration JSONB DEFAULT '{}',
          ai_extraction_results JSONB DEFAULT '[]',
          webhook_url TEXT,
          priority INTEGER DEFAULT 0,
          user_id UUID REFERENCES users(id),
          organization_id UUID REFERENCES organizations(id),
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_firecrawl_jobs_status ON firecrawl_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_jobs_priority ON firecrawl_jobs(priority DESC);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_jobs_user ON firecrawl_jobs(user_id);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_jobs_org ON firecrawl_jobs(organization_id);
      `);

      // Enhanced scraped content with AI metadata
      await db.query(`
        CREATE TABLE IF NOT EXISTS firecrawl_scraped_content (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          job_id UUID REFERENCES firecrawl_jobs(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          title TEXT,
          content TEXT,
          markdown TEXT,
          html TEXT,
          metadata JSONB DEFAULT '{}',
          structured_data JSONB DEFAULT '[]',
          ai_analysis JSONB DEFAULT '{}',
          screenshots JSONB DEFAULT '{}',
          content_type VARCHAR(50) DEFAULT 'page',
          processing_status VARCHAR(20) DEFAULT 'pending',
          confidence_score DECIMAL(3,2) DEFAULT 0.5,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(job_id, url)
        );
        
        CREATE INDEX IF NOT EXISTS idx_firecrawl_content_job ON firecrawl_scraped_content(job_id);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_content_type ON firecrawl_scraped_content(content_type);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_content_status ON firecrawl_scraped_content(processing_status);
      `);

      // Extracted grants with AI confidence
      await db.query(`
        CREATE TABLE IF NOT EXISTS firecrawl_extracted_grants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          content_id UUID REFERENCES firecrawl_scraped_content(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          description TEXT,
          amount_min DECIMAL(12,2),
          amount_max DECIMAL(12,2),
          currency VARCHAR(3) DEFAULT 'EUR',
          deadline DATE,
          eligibility JSONB DEFAULT '[]',
          categories JSONB DEFAULT '[]',
          contact_info JSONB DEFAULT '{}',
          confidence_score DECIMAL(3,2) DEFAULT 0.5,
          ai_metadata JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_firecrawl_grants_content ON firecrawl_extracted_grants(content_id);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_grants_deadline ON firecrawl_extracted_grants(deadline);
        CREATE INDEX IF NOT EXISTS idx_firecrawl_grants_confidence ON firecrawl_extracted_grants(confidence_score);
      `);

      logger.info('Firecrawl tables created successfully');
    } catch (error) {
      logger.error('Failed to create Firecrawl tables', { error });
      throw error;
    }
  }

  // Job Management
  async createJob(
    sourceUrl: string,
    jobType: JobType,
    configuration: Partial<FirecrawlConfig> = {},
    options: {
      userId?: string;
      organizationId?: string;
      webhookUrl?: string;
      priority?: number;
    } = {}
  ): Promise<FirecrawlJob> {
    await this.initialize();

    // Validate configuration
    const validatedConfig = FirecrawlConfigSchema.parse(configuration);

    const jobResult = await db.query(`
      INSERT INTO firecrawl_jobs (
        source_url, job_type, status, configuration, stats,
        user_id, organization_id, webhook_url, priority
      ) VALUES ($1, $2, 'pending', $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      sourceUrl,
      jobType,
      JSON.stringify(validatedConfig),
      JSON.stringify({
        pagesScraped: 0,
        documentsProcessed: 0,
        linksDiscovered: 0,
        grantsFound: 0,
        errorsEncountered: 0,
        processingTimeMs: 0,
        dataExtracted: 0
      }),
      options.userId,
      options.organizationId,
      options.webhookUrl,
      options.priority || 0
    ]);

    const job = this.mapRowToJob(jobResult.rows[0]);
    
    // Add to queue
    this.jobQueue.push(job);
    this.emit('job:created', job);
    
    return job;
  }

  async updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string): Promise<void> {
    const updateFields = ['status = $1', 'updated_at = NOW()'];
    const params = [status, jobId];

    if (status === 'running') {
      updateFields.push('started_at = NOW()');
    } else if (status === 'completed' || status === 'failed') {
      updateFields.push('completed_at = NOW()');
    }

    if (errorMessage) {
      updateFields.push(`error_message = $${params.length + 1}`);
      params.unshift(errorMessage);
    }

    await db.query(`
      UPDATE firecrawl_jobs 
      SET ${updateFields.join(', ')}
      WHERE id = $${params.length}
    `, params);

    this.emit(`job:${status}`, jobId);
  }

  async updateJobProgress(jobId: string, progress: number, stats?: Partial<FirecrawlJob['stats']>): Promise<void> {
    if (stats) {
      const currentJob = await this.getJob(jobId);
      if (currentJob) {
        const updatedStats = { ...currentJob.stats, ...stats };
        await db.query(`
          UPDATE firecrawl_jobs 
          SET progress = $1, stats = $2, updated_at = NOW() 
          WHERE id = $3
        `, [progress, JSON.stringify(updatedStats), jobId]);
      }
    } else {
      await db.query(`
        UPDATE firecrawl_jobs 
        SET progress = $1, updated_at = NOW() 
        WHERE id = $2
      `, [progress, jobId]);
    }

    this.emit('job:progress', { jobId, progress });
  }

  // Job Processing
  private async startJobProcessor(): Promise<void> {
    setInterval(async () => {
      await this.processJobQueue();
    }, 5000); // Check every 5 seconds
  }

  private async processJobQueue(): Promise<void> {
    if (this.activeJobs.size >= this.maxConcurrentJobs) return;

    // Get next job from queue (priority-based)
    const nextJob = this.jobQueue
      .sort((a, b) => b.priority - a.priority)
      .find(job => job.status === 'pending');

    if (!nextJob) return;

    // Remove from queue and mark as active
    this.jobQueue = this.jobQueue.filter(j => j.id !== nextJob.id);
    this.activeJobs.set(nextJob.id, nextJob);

    // Process job
    this.processJob(nextJob).catch(error => {
      logger.error('Job processing failed', { jobId: nextJob.id, error });
    });
  }

  private async processJob(job: FirecrawlJob): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.updateJobStatus(job.id, 'running');
      logger.info('Starting Firecrawl job', { jobId: job.id, type: job.jobType });

      let result;
      switch (job.jobType) {
        case 'full_crawl':
          result = await this.executeCrawl(job);
          break;
        case 'targeted_scrape':
          result = await this.executeTargetedScrape(job);
          break;
        case 'ai_extract':
          result = await this.executeAIExtraction(job);
          break;
        case 'document_harvest':
          result = await this.executeDocumentHarvest(job);
          break;
        case 'monitor':
          result = await this.executeMonitoring(job);
          break;
        default:
          result = await this.executeCrawl(job);
      }

      // Update final stats
      const processingTime = Date.now() - startTime;
      job.stats.processingTimeMs = processingTime;
      
      await this.updateJobProgress(job.id, 100, job.stats);
      await this.updateJobStatus(job.id, 'completed');
      
      // Send webhook if configured
      if (job.webhookUrl) {
        await this.sendWebhook(job.webhookUrl, { job, result });
      }

      this.emit('job:completed', { job, result });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateJobStatus(job.id, 'failed', errorMessage);
      throw error;
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  // Crawling Methods
  private async executeCrawl(job: FirecrawlJob): Promise<any> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        // Use Firecrawl v1 API format with enhanced error handling
        const crawlOptions = {
          includePaths: job.configuration.includePatterns?.length ? job.configuration.includePatterns : undefined,
          excludePaths: job.configuration.excludePatterns?.length ? job.configuration.excludePatterns : undefined,
          maxDepth: Math.min(job.configuration.maxDepth || 3, 5),
          limit: 100,
          allowBackwardCrawling: false,
          allowExternalContentLinks: job.configuration.followExternalLinks || false,
          // V1 API format
          formats: ['markdown', 'html'],
          onlyMainContent: true,
          waitFor: 2000,
          timeout: 60000 // 60 second timeout
        };

        logger.info('Starting crawl attempt', { 
          jobId: job.id, 
          attempt: attempt + 1, 
          url: job.sourceUrl,
          options: crawlOptions 
        });

        const crawlResult = await this.firecrawl.crawlUrl(job.sourceUrl, crawlOptions);

        if (!crawlResult.success) {
          throw new Error(`Firecrawl failed: ${crawlResult.error || 'Unknown error'}`);
        }

        const pages = crawlResult.data || [];
        logger.info('Crawl completed successfully', { 
          jobId: job.id, 
          pageCount: pages.length,
          attempt: attempt + 1 
        });

        // Process pages with error handling
        const processedPages = [];
        const failedPages = [];
        
        for (let i = 0; i < pages.length; i++) {
          try {
            await this.processPage(pages[i], job);
            processedPages.push(pages[i].url || pages[i].metadata?.sourceURL);
            
            // Update progress
            const progress = Math.floor((i + 1) / pages.length * 90);
            await this.updateJobProgress(job.id, progress);
            
          } catch (pageError) {
            logger.warn('Failed to process page', { 
              jobId: job.id,
              pageUrl: pages[i].url || pages[i].metadata?.sourceURL,
              error: pageError instanceof Error ? pageError.message : String(pageError)
            });
            failedPages.push({
              url: pages[i].url || pages[i].metadata?.sourceURL,
              error: pageError instanceof Error ? pageError.message : String(pageError)
            });
            job.stats.errorsEncountered++;
          }
          
          // Rate limiting
          if (job.configuration.rateLimitMs > 0) {
            await this.sleep(job.configuration.rateLimitMs);
          }
        }

        return { 
          pagesProcessed: processedPages.length,
          totalPages: pages.length,
          failedPages,
          processedPages,
          successRate: pages.length > 0 ? (processedPages.length / pages.length) * 100 : 0
        };

      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        logger.error(`Crawl attempt ${attempt} failed`, { 
          jobId: job.id, 
          attempt,
          error: errorMessage,
          url: job.sourceUrl
        });

        if (attempt >= maxRetries) {
          // Final attempt failed, record detailed error
          job.stats.errorsEncountered++;
          throw new Error(`Crawl failed after ${maxRetries} attempts. Last error: ${errorMessage}`);
        }

        // Wait before retry with exponential backoff
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        logger.info(`Retrying crawl in ${waitTime}ms`, { jobId: job.id, attempt: attempt + 1 });
        await this.sleep(waitTime);
      }
    }
  }

  private async executeTargetedScrape(job: FirecrawlJob): Promise<any> {
    const scrapeResult = await this.firecrawl.scrapeUrl(job.sourceUrl, {
      formats: ['markdown', 'html'],
      onlyMainContent: true
    });

    if (!scrapeResult.success) {
      throw new Error(`Scrape failed: ${scrapeResult.error}`);
    }

    await this.processPage((scrapeResult as any).data || scrapeResult, job);
    return { pagesProcessed: 1 };
  }

  private async executeAIExtraction(job: FirecrawlJob): Promise<any> {
    // Use Firecrawl's AI extraction with custom prompt
    const extractionPrompt = job.configuration.extractionPrompt || `
      Extract grant funding information including:
      - Grant title and description
      - Funding amount (min/max)
      - Application deadline
      - Eligibility criteria
      - Contact information
      - Categories or focus areas
    `;

    // Use Firecrawl v1 API for basic extraction
    const extractResult = await this.firecrawl.scrapeUrl(job.sourceUrl, {
      formats: ['markdown'],
      onlyMainContent: true
    } as any);

    if (!extractResult.success) {
      throw new Error(`AI extraction failed: ${extractResult.error}`);
    }

    // Use our OpenAI service for extraction
    const content = (extractResult as any).data?.markdown || (extractResult as any).data?.content || '';
    if (content) {
      const aiAnalysis = await openaiService.analyzeContentForGrants(content);
      job.aiExtractionResults = aiAnalysis.grants || [];
      
      // Save to database
      await this.saveAIExtractionResults(job, { grants: aiAnalysis.grants });
    } else {
      job.aiExtractionResults = [];
    }

    return { grantsExtracted: (job.aiExtractionResults || []).length };
  }

  private async executeDocumentHarvest(job: FirecrawlJob): Promise<any> {
    // First crawl to find documents using v1 API format
    const crawlResult = await this.firecrawl.crawlUrl(job.sourceUrl, {
      includePaths: ['*.pdf', '*.docx', '*.doc'],
      maxDepth: job.configuration.maxDepth,
      formats: ['markdown', 'html'],
      onlyMainContent: true
    } as any);

    if (!crawlResult.success || !crawlResult.data) {
      throw new Error('Document harvest failed');
    }

    const documentUrls = crawlResult.data
      .map((page: any) => page.url)
      .filter((url: string) => /\.(pdf|docx?|txt)$/i.test(url));

    // Process each document
    for (const docUrl of documentUrls) {
      await this.processDocument(docUrl, job);
    }

    return { documentsProcessed: documentUrls.length };
  }

  private async executeMonitoring(job: FirecrawlJob): Promise<any> {
    // Check for changes since last crawl
    const lastCrawl = await db.query(`
      SELECT content, metadata FROM firecrawl_scraped_content 
      WHERE url = $1 AND job_id != $2
      ORDER BY created_at DESC LIMIT 1
    `, [job.sourceUrl, job.id]);

    const scrapeResult = await this.firecrawl.scrapeUrl(job.sourceUrl, {
      formats: ['markdown', 'html'],
      onlyMainContent: true
    });

    if (!scrapeResult.success) {
      throw new Error('Monitoring scrape failed');
    }

    const currentContent = (scrapeResult as any).data?.markdown || '';
    const hasChanged = !lastCrawl.rows[0] || 
                      lastCrawl.rows[0].content !== currentContent;

    if (hasChanged) {
      await this.processPage((scrapeResult as any).data || scrapeResult, job);
      this.emit('content:changed', { jobId: job.id, url: job.sourceUrl });
    }

    return { hasChanged, url: job.sourceUrl };
  }

  // Processing Methods
  private async processPage(pageData: any, job: FirecrawlJob): Promise<void> {
    const url = pageData.metadata?.sourceURL || pageData.url;
    const title = pageData.metadata?.title || this.extractTitle(pageData.markdown);
    
    // Save scraped content
    const contentResult = await db.query(`
      INSERT INTO firecrawl_scraped_content (
        job_id, url, title, content, markdown, html, 
        metadata, content_type, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'page', 'processing')
      ON CONFLICT (job_id, url) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        markdown = EXCLUDED.markdown,
        html = EXCLUDED.html,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING id
    `, [
      job.id,
      url,
      title,
      pageData.content || pageData.markdown || '',
      pageData.markdown || '',
      pageData.html || '',
      JSON.stringify(pageData.metadata || {})
    ]);

    const contentId = contentResult.rows[0].id;
    job.stats.pagesScraped++;

    // AI Analysis if enabled
    if (job.configuration.aiExtraction && pageData.markdown) {
      await this.analyzeContent(contentId, pageData.markdown, job);
    }

    // Extract structured data
    if (job.configuration.extractStructuredData && pageData.html) {
      const structuredData = this.extractStructuredData(pageData.html);
      if (structuredData.length > 0) {
        await db.query(`
          UPDATE firecrawl_scraped_content 
          SET structured_data = $1 
          WHERE id = $2
        `, [JSON.stringify(structuredData), contentId]);
      }
    }

    // Update processing status
    await db.query(`
      UPDATE firecrawl_scraped_content 
      SET processing_status = 'processed' 
      WHERE id = $1
    `, [contentId]);
  }

  private async processDocument(url: string, job: FirecrawlJob): Promise<void> {
    try {
      const docResult = await this.firecrawl.scrapeUrl(url, {
        formats: ['markdown', 'html'],
        onlyMainContent: true
      });

      if (!docResult.success) {
        throw new Error(`Failed to scrape document: ${docResult.error}`);
      }

      const fileType = this.getFileType(url);
      const title = (docResult as any).data?.metadata?.title || this.extractTitle(url);

      // Save document
      const contentResult = await db.query(`
        INSERT INTO firecrawl_scraped_content (
          job_id, url, title, content, markdown, 
          metadata, content_type, processing_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'processing')
        RETURNING id
      `, [
        job.id,
        url,
        title,
        (docResult as any).data?.content || '',
        (docResult as any).data?.markdown || '',
        JSON.stringify({ ...(docResult as any).data?.metadata, fileType }),
        fileType
      ]);

      const contentId = contentResult.rows[0].id;
      job.stats.documentsProcessed++;

      // AI Analysis for grant extraction
      if (job.configuration.aiExtraction && (docResult as any).data?.markdown) {
        await this.analyzeContent(contentId, (docResult as any).data.markdown, job);
      }

      // Update status
      await db.query(`
        UPDATE firecrawl_scraped_content 
        SET processing_status = 'processed' 
        WHERE id = $1
      `, [contentId]);

    } catch (error) {
      logger.error('Document processing failed', { url, error });
      job.stats.errorsEncountered++;
    }
  }

  // AI Analysis Methods
  private async analyzeContent(contentId: string, content: string, job: FirecrawlJob): Promise<void> {
    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        // Skip content that's too short or likely not grant-related
        if (content.length < 100) {
          logger.debug('Skipping AI analysis for short content', { contentId, length: content.length });
          return;
        }

        // Pre-filter content for grant-related keywords
        const grantKeywords = [
          'grant', 'funding', 'application', 'deadline', 'eligibility', 
          'award', 'scholarship', 'finance', 'budget', 'proposal'
        ];
        const hasGrantKeywords = grantKeywords.some(keyword => 
          content.toLowerCase().includes(keyword)
        );

        if (!hasGrantKeywords) {
          logger.debug('Skipping AI analysis for non-grant content', { contentId });
          return;
        }

        logger.info('Starting AI content analysis', { 
          contentId, 
          attempt: attempt + 1,
          contentLength: content.length 
        });

        // Use OpenAI to analyze content for grants with rate limiting
        const analysis = await this.withRetryAndRateLimit(async () => {
          return await openaiService.analyzeContentForGrants(content.substring(0, 12000)); // Limit content size
        }, `AI analysis for content ${contentId}`);
        
        if (analysis && analysis.grants && analysis.grants.length > 0) {
          logger.info('Found grants in content', { 
            contentId, 
            grantsFound: analysis.grants.length 
          });

          // Save extracted grants with validation
          for (const grant of analysis.grants) {
            try {
              // Validate grant data
              if (!grant.title || grant.title.trim().length === 0) {
                logger.warn('Skipping grant with empty title', { contentId, grant });
                continue;
              }

              await db.query(`
                INSERT INTO firecrawl_extracted_grants (
                  content_id, title, description, amount_min, amount_max,
                  currency, deadline, eligibility, categories, contact_info,
                  confidence_score, ai_metadata
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
              `, [
                contentId,
                grant.title.trim().substring(0, 500), // Ensure title isn't too long
                grant.description ? grant.description.substring(0, 2000) : null,
                grant.amount?.min || null,
                grant.amount?.max || null,
                grant.amount?.currency || 'EUR',
                grant.deadline || null,
                JSON.stringify(grant.eligibility || []),
                JSON.stringify(grant.categories || []),
                JSON.stringify(grant.contactInfo || {}),
                Math.min(Math.max(grant.confidence || 0.7, 0), 1), // Clamp between 0 and 1
                JSON.stringify(analysis.metadata || {})
              ]);
              
              job.stats.grantsFound++;
            } catch (grantSaveError) {
              logger.error('Failed to save extracted grant', { 
                contentId, 
                grant: grant.title,
                error: grantSaveError instanceof Error ? grantSaveError.message : String(grantSaveError)
              });
            }
          }
        }

        // Save AI analysis results
        await db.query(`
          UPDATE firecrawl_scraped_content 
          SET ai_analysis = $1, confidence_score = $2, processing_status = 'ai_analyzed'
          WHERE id = $3
        `, [
          JSON.stringify({
            ...analysis,
            analyzedAt: new Date().toISOString(),
            contentLength: content.length
          }),
          Math.min(Math.max(analysis?.overallConfidence || 0.5, 0), 1),
          contentId
        ]);

        job.stats.dataExtracted++;
        
        logger.info('AI analysis completed successfully', { 
          contentId,
          grantsFound: analysis?.grants?.length || 0,
          confidence: analysis?.overallConfidence || 0.5
        });

        return; // Success, exit retry loop

      } catch (error) {
        attempt++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        logger.error(`AI analysis attempt ${attempt} failed`, { 
          contentId,
          attempt,
          error: errorMessage
        });

        if (attempt >= maxRetries) {
          // Final attempt failed
          job.stats.errorsEncountered++;
          
          // Save error state
          await db.query(`
            UPDATE firecrawl_scraped_content 
            SET processing_status = 'ai_failed', ai_analysis = $1
            WHERE id = $2
          `, [
            JSON.stringify({
              error: errorMessage,
              failedAt: new Date().toISOString(),
              attempts: attempt
            }),
            contentId
          ]);
          
          throw new Error(`AI analysis failed after ${maxRetries} attempts: ${errorMessage}`);
        }

        // Wait before retry
        const waitTime = 2000 * attempt; // 2s, 4s
        await this.sleep(waitTime);
      }
    }
  }

  /**
   * Helper method for rate limiting and retry logic
   */
  private async withRetryAndRateLimit<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 2
  ): Promise<T> {
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        // Add small delay for rate limiting
        if (attempt > 0) {
          await this.sleep(1000 * attempt);
        }
        
        return await operation();
      } catch (error) {
        attempt++;
        
        if (attempt >= maxRetries) {
          logger.error(`Operation ${operationName} failed after ${maxRetries} attempts`, { error });
          throw error;
        }
        
        logger.warn(`Operation ${operationName} attempt ${attempt} failed, retrying...`, { 
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    throw new Error(`Operation ${operationName} failed unexpectedly`);
  }

  private async saveAIExtractionResults(job: FirecrawlJob, extractedData: any): Promise<void> {
    // Save the extraction results to the job
    await db.query(`
      UPDATE firecrawl_jobs 
      SET ai_extraction_results = $1 
      WHERE id = $2
    `, [JSON.stringify(extractedData), job.id]);

    // If grants were extracted, save them
    if (extractedData.grants && Array.isArray(extractedData.grants)) {
      for (const grant of extractedData.grants) {
        // First create a content record for the extraction
        const contentResult = await db.query(`
          INSERT INTO firecrawl_scraped_content (
            job_id, url, title, content, content_type, processing_status
          ) VALUES ($1, $2, $3, $4, 'ai_extraction', 'processed')
          RETURNING id
        `, [
          job.id,
          job.sourceUrl,
          grant.title || 'AI Extracted Grant',
          JSON.stringify(grant)
        ]);

        // Then save the grant
        await db.query(`
          INSERT INTO firecrawl_extracted_grants (
            content_id, title, description, amount_min, amount_max,
            currency, deadline, eligibility, categories, contact_info,
            confidence_score
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          contentResult.rows[0].id,
          grant.title,
          grant.description,
          grant.amount?.min,
          grant.amount?.max,
          grant.amount?.currency || 'EUR',
          grant.deadline,
          JSON.stringify(grant.eligibility || []),
          JSON.stringify(grant.categories || []),
          JSON.stringify(grant.contactInfo || {}),
          0.9 // High confidence for direct AI extraction
        ]);
      }
    }
  }

  // Utility Methods
  private extractStructuredData(html: string): any[] {
    const structuredData: any[] = [];
    
    // Extract JSON-LD
    const jsonLdRegex = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gis;
    let match;
    
    while ((match = jsonLdRegex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        structuredData.push({ type: 'json-ld', data });
      } catch (error) {
        logger.warn('Failed to parse JSON-LD', { error });
      }
    }

    return structuredData;
  }

  private extractTitle(content: string): string {
    // Try to extract from markdown header
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) return titleMatch[1];
    
    // Try to extract from URL
    if (content.startsWith('http')) {
      const parts = content.split('/');
      return parts[parts.length - 1].split('.')[0] || 'Untitled';
    }
    
    return 'Untitled';
  }

  private getFileType(url: string): string {
    const extension = url.split('.').pop()?.toLowerCase();
    return extension || 'unknown';
  }

  private async sendWebhook(url: string, data: any): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch (error) {
      logger.error('Webhook failed', { url, error });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private mapRowToJob(row: any): FirecrawlJob {
    return {
      id: row.id,
      sourceUrl: row.source_url,
      jobType: row.job_type,
      status: row.status,
      progress: row.progress,
      stats: row.stats,
      configuration: row.configuration,
      aiExtractionResults: row.ai_extraction_results,
      webhookUrl: row.webhook_url,
      priority: row.priority,
      userId: row.user_id,
      organizationId: row.organization_id,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // Public API Methods
  /**
   * Simple website crawling method for compatibility
   */
  async crawlWebsite(url: string, options: {
    maxPages?: number;
    includePdfs?: boolean;
    followInternalLinks?: boolean;
    excludePatterns?: string[];
    includePatterns?: string[];
    extractContacts?: boolean;
    extractImages?: boolean;
    extractMetadata?: boolean;
  } = {}): Promise<{
    success: boolean;
    jobId?: string;
    pages?: any[];
    error?: string;
  }> {
    try {
      // Create a job for this crawl
      const job = await this.createJob(url, 'full_crawl', {
        maxDepth: Math.min(options.maxPages || 5, 3),
        includePatterns: options.includePatterns || ['*'],
        excludePatterns: options.excludePatterns || [],
        followExternalLinks: false,
        processDocuments: options.includePdfs !== false,
        extractStructuredData: options.extractMetadata !== false
      });

      // Process the job immediately (simplified for compatibility)
      try {
        await this.processFullCrawl(job);
        
        // Get the results
        const content = await this.getJobContent(job.id, { includePages: true });
        
        return {
          success: true,
          jobId: job.id,
          pages: content.pages || []
        };
      } catch (processingError) {
        await this.updateJobStatus(job.id, 'failed', processingError instanceof Error ? processingError.message : String(processingError));
        throw processingError;
      }
    } catch (error) {
      logger.error('Website crawl failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getJob(jobId: string): Promise<FirecrawlJob | null> {
    const result = await db.query('SELECT * FROM firecrawl_jobs WHERE id = $1', [jobId]);
    return result.rows[0] ? this.mapRowToJob(result.rows[0]) : null;
  }

  async listJobs(options: {
    userId?: string;
    organizationId?: string;
    status?: JobStatus;
    jobType?: JobType;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: FirecrawlJob[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(options.userId);
    }

    if (options.organizationId) {
      whereClause += ` AND organization_id = $${paramIndex++}`;
      params.push(options.organizationId);
    }

    if (options.status) {
      whereClause += ` AND status = $${paramIndex++}`;
      params.push(options.status);
    }

    if (options.jobType) {
      whereClause += ` AND job_type = $${paramIndex++}`;
      params.push(options.jobType);
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM firecrawl_jobs ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const jobsResult = await db.query(`
      SELECT * FROM firecrawl_jobs ${whereClause}
      ORDER BY priority DESC, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, options.limit || 20, options.offset || 0]);

    return {
      jobs: jobsResult.rows.map(row => this.mapRowToJob(row)),
      total
    };
  }

  async getJobContent(jobId: string, options: {
    contentType?: string;
    limit?: number;
    offset?: number;
    includePages?: boolean;
  } = {}): Promise<{ content: any[]; total: number; pages?: any[] }> {
    let whereClause = 'WHERE job_id = $1';
    const params: any[] = [jobId];
    let paramIndex = 2;

    if (options.contentType) {
      whereClause += ` AND content_type = $${paramIndex++}`;
      params.push(options.contentType);
    }

    const countResult = await db.query(
      `SELECT COUNT(*) FROM firecrawl_scraped_content ${whereClause}`, 
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const contentResult = await db.query(`
      SELECT * FROM firecrawl_scraped_content ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, options.limit || 50, options.offset || 0]);

    const result: any = {
      content: contentResult.rows,
      total
    };

    if (options.includePages) {
      result.pages = contentResult.rows.map(row => ({
        url: row.url,
        title: row.title,
        content: row.content,
        markdown: row.markdown,
        html: row.html,
        metadata: row.metadata,
        contentType: row.content_type,
        createdAt: row.created_at
      }));
    }

    return result;
  }

  async getExtractedGrants(options: {
    jobId?: string;
    minConfidence?: number;
    deadline?: { after?: Date; before?: Date };
    limit?: number;
    offset?: number;
  } = {}): Promise<{ grants: ExtractedGrantData[]; total: number }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options.jobId) {
      whereClause += ` AND c.job_id = $${paramIndex++}`;
      params.push(options.jobId);
    }

    if (options.minConfidence) {
      whereClause += ` AND g.confidence_score >= $${paramIndex++}`;
      params.push(options.minConfidence);
    }

    if (options.deadline?.after) {
      whereClause += ` AND g.deadline >= $${paramIndex++}`;
      params.push(options.deadline.after);
    }

    if (options.deadline?.before) {
      whereClause += ` AND g.deadline <= $${paramIndex++}`;
      params.push(options.deadline.before);
    }

    const countResult = await db.query(`
      SELECT COUNT(*) FROM firecrawl_extracted_grants g
      JOIN firecrawl_scraped_content c ON g.content_id = c.id
      ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].count);

    const grantsResult = await db.query(`
      SELECT 
        g.*,
        c.url as source_url,
        c.title as source_title
      FROM firecrawl_extracted_grants g
      JOIN firecrawl_scraped_content c ON g.content_id = c.id
      ${whereClause}
      ORDER BY g.confidence_score DESC, g.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, options.limit || 20, options.offset || 0]);

    const grants = grantsResult.rows.map(row => ({
      title: row.title,
      description: row.description,
      amount: {
        min: row.amount_min,
        max: row.amount_max,
        currency: row.currency
      },
      deadline: row.deadline,
      eligibility: row.eligibility,
      categories: row.categories,
      contactInfo: row.contact_info,
      confidence: row.confidence_score,
      source: {
        url: row.source_url,
        pageTitle: row.source_title,
        extractedAt: row.created_at
      }
    }));

    return { grants, total };
  }

  async cancelJob(jobId: string): Promise<void> {
    await this.updateJobStatus(jobId, 'cancelled');
    
    // Remove from queue if pending
    this.jobQueue = this.jobQueue.filter(j => j.id !== jobId);
    
    // TODO: Implement actual cancellation for running jobs
    if (this.activeJobs.has(jobId)) {
      logger.warn('Job cancellation requested for running job', { jobId });
    }
  }

  async retryJob(jobId: string): Promise<FirecrawlJob> {
    const originalJob = await this.getJob(jobId);
    if (!originalJob) {
      throw new Error('Job not found');
    }

    // Create new job with same configuration
    return this.createJob(
      originalJob.sourceUrl,
      originalJob.jobType,
      originalJob.configuration,
      {
        userId: originalJob.userId,
        organizationId: originalJob.organizationId,
        webhookUrl: originalJob.webhookUrl,
        priority: originalJob.priority
      }
    );
  }

  // Real-time updates
  subscribeToJobUpdates(jobId: string, callback: (event: any) => void): () => void {
    const handlers = {
      progress: (data: any) => {
        if (data.jobId === jobId) callback({ type: 'progress', ...data });
      },
      completed: (data: any) => {
        if (data.job?.id === jobId) callback({ type: 'completed', ...data });
      },
      failed: (id: string) => {
        if (id === jobId) callback({ type: 'failed', jobId: id });
      }
    };

    this.on('job:progress', handlers.progress);
    this.on('job:completed', handlers.completed);
    this.on('job:failed', handlers.failed);

    // Return unsubscribe function
    return () => {
      this.off('job:progress', handlers.progress);
      this.off('job:completed', handlers.completed);
      this.off('job:failed', handlers.failed);
    };
  }

  // Batch operations
  async createBatchJobs(jobs: Array<{
    sourceUrl: string;
    jobType: JobType;
    configuration?: Partial<FirecrawlConfig>;
    priority?: number;
  }>, options: {
    userId?: string;
    organizationId?: string;
  } = {}): Promise<FirecrawlJob[]> {
    const createdJobs: FirecrawlJob[] = [];

    for (const jobData of jobs) {
      const job = await this.createJob(
        jobData.sourceUrl,
        jobData.jobType,
        jobData.configuration,
        {
          ...options,
          priority: jobData.priority
        }
      );
      createdJobs.push(job);
    }

    return createdJobs;
  }

  /**
   * Process a full crawl job immediately (for compatibility)
   */
  private async processFullCrawl(job: FirecrawlJob): Promise<void> {
    await this.processJob(job);
  }

  // Statistics
  async getStatistics(options: {
    userId?: string;
    organizationId?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<{
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    totalPages: number;
    totalDocuments: number;
    totalGrants: number;
    averageProcessingTime: number;
  }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (options.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(options.userId);
    }

    if (options.organizationId) {
      whereClause += ` AND organization_id = $${paramIndex++}`;
      params.push(options.organizationId);
    }

    if (options.startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(options.startDate);
    }

    if (options.endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(options.endDate);
    }

    const statsResult = await db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
        SUM((stats->>'pagesScraped')::int) as total_pages,
        SUM((stats->>'documentsProcessed')::int) as total_documents,
        SUM((stats->>'grantsFound')::int) as total_grants,
        AVG((stats->>'processingTimeMs')::int) as avg_processing_time
      FROM firecrawl_jobs
      ${whereClause}
    `, params);

    const stats = statsResult.rows[0];
    return {
      totalJobs: parseInt(stats.total_jobs),
      completedJobs: parseInt(stats.completed_jobs),
      failedJobs: parseInt(stats.failed_jobs),
      totalPages: parseInt(stats.total_pages) || 0,
      totalDocuments: parseInt(stats.total_documents) || 0,
      totalGrants: parseInt(stats.total_grants) || 0,
      averageProcessingTime: parseInt(stats.avg_processing_time) || 0
    };
  }
}

export const firecrawlIntegrationService = new FirecrawlIntegrationService();