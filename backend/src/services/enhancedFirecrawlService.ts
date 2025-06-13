import FirecrawlApp from '@mendable/firecrawl-js';
import { logger } from './logger';
import { db } from './database';

export interface ScrapedPage {
  id: string;
  url: string;
  title: string;
  content: string;
  markdown?: string;
  html?: string;
  metadata: {
    statusCode: number;
    timestamp: string;
    headers: Record<string, string>;
    links: string[];
    images: string[];
    description?: string;
    keywords?: string[];
  };
  structured_data?: any[];
  screenshots?: {
    desktop?: string;
    mobile?: string;
  };
  processing_status: 'pending' | 'processed' | 'failed';
  created_at: Date;
  updated_at: Date;
}

export interface ScrapedDocument {
  id: string;
  page_id?: string;
  url: string;
  title: string;
  content: string;
  file_type: 'pdf' | 'docx' | 'doc' | 'txt';
  file_size?: number;
  extracted_data?: {
    grants?: any[];
    contacts?: any[];
    dates?: any[];
    amounts?: any[];
  };
  processing_status: 'pending' | 'processed' | 'failed';
  confidence_score: number;
  created_at: Date;
  updated_at: Date;
}

export interface ScrapedLink {
  id: string;
  page_id: string;
  url: string;
  anchor_text: string;
  link_type: 'internal' | 'external' | 'document' | 'email' | 'phone';
  is_scraped: boolean;
  priority_score: number;
  created_at: Date;
}

export interface CrawlJobExtended {
  id: string;
  source_url: string;
  job_type: 'full_crawl' | 'targeted_scrape' | 'document_harvest' | 'link_discovery';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  stats: {
    pages_scraped: number;
    documents_processed: number;
    links_discovered: number;
    grants_found: number;
    errors_encountered: number;
    processing_time_ms: number;
  };
  configuration: {
    max_depth: number;
    include_patterns: string[];
    exclude_patterns: string[];
    follow_external_links: boolean;
    capture_screenshots: boolean;
    extract_structured_data: boolean;
    process_documents: boolean;
    rate_limit_ms: number;
  };
  started_at: Date;
  completed_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export class EnhancedFirecrawlService {
  private firecrawl: FirecrawlApp;
  private isInitialized = false;

  constructor() {
    if (!process.env.FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY environment variable is required');
    }
    
    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY
    });
  }

  /**
   * Retry wrapper for API calls with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        const errorMessage = lastError.message?.toLowerCase() || '';
        const isRetryable = errorMessage.includes('502') || 
                           errorMessage.includes('timeout') || 
                           errorMessage.includes('bad gateway') ||
                           errorMessage.includes('service unavailable') ||
                           errorMessage.includes('network');
        
        if (!isRetryable || attempt === maxRetries - 1) {
          throw lastError;
        }
        
        const delay = initialDelay * Math.pow(2, attempt);
        logger.warn(`Firecrawl API call failed, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          maxRetries,
          error: errorMessage
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Create enhanced tables for advanced scraping
    await this.createEnhancedTables();
    this.isInitialized = true;
    logger.info('Enhanced Firecrawl service initialized');
  }

  private async createEnhancedTables(): Promise<void> {
    try {
      // Scraped pages table
      await db.query(`
        CREATE TABLE IF NOT EXISTS scraped_pages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          url TEXT NOT NULL UNIQUE,
          title TEXT,
          content TEXT,
          markdown TEXT,
          html TEXT,
          metadata JSONB DEFAULT '{}',
          structured_data JSONB DEFAULT '[]',
          screenshots JSONB DEFAULT '{}',
          processing_status VARCHAR(20) DEFAULT 'pending',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_scraped_pages_url ON scraped_pages(url);
        CREATE INDEX IF NOT EXISTS idx_scraped_pages_status ON scraped_pages(processing_status);
        CREATE INDEX IF NOT EXISTS idx_scraped_pages_created ON scraped_pages(created_at);
      `);

      // Scraped documents table  
      await db.query(`
        CREATE TABLE IF NOT EXISTS scraped_documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          page_id UUID REFERENCES scraped_pages(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          title TEXT,
          content TEXT,
          file_type VARCHAR(10) NOT NULL,
          file_size INTEGER,
          extracted_data JSONB DEFAULT '{}',
          processing_status VARCHAR(20) DEFAULT 'pending',
          confidence_score DECIMAL(3,2) DEFAULT 0.5,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_scraped_documents_page ON scraped_documents(page_id);
        CREATE INDEX IF NOT EXISTS idx_scraped_documents_type ON scraped_documents(file_type);
        CREATE INDEX IF NOT EXISTS idx_scraped_documents_status ON scraped_documents(processing_status);
      `);

      // Scraped links table
      await db.query(`
        CREATE TABLE IF NOT EXISTS scraped_links (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          page_id UUID NOT NULL REFERENCES scraped_pages(id) ON DELETE CASCADE,
          url TEXT NOT NULL,
          anchor_text TEXT,
          link_type VARCHAR(20) DEFAULT 'external',
          is_scraped BOOLEAN DEFAULT FALSE,
          priority_score INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_scraped_links_page ON scraped_links(page_id);
        CREATE INDEX IF NOT EXISTS idx_scraped_links_type ON scraped_links(link_type);
        CREATE INDEX IF NOT EXISTS idx_scraped_links_scraped ON scraped_links(is_scraped);
      `);

      // Enhanced crawl jobs table
      await db.query(`
        CREATE TABLE IF NOT EXISTS enhanced_crawl_jobs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          source_url TEXT NOT NULL,
          job_type VARCHAR(50) DEFAULT 'full_crawl',
          status VARCHAR(20) DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          stats JSONB DEFAULT '{}',
          configuration JSONB DEFAULT '{}',
          started_at TIMESTAMP WITH TIME ZONE,
          completed_at TIMESTAMP WITH TIME ZONE,
          error_message TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_enhanced_crawl_jobs_status ON enhanced_crawl_jobs(status);
        CREATE INDEX IF NOT EXISTS idx_enhanced_crawl_jobs_type ON enhanced_crawl_jobs(job_type);
        CREATE INDEX IF NOT EXISTS idx_enhanced_crawl_jobs_created ON enhanced_crawl_jobs(created_at);
      `);

      logger.info('Enhanced Firecrawl tables created successfully');
    } catch (error) {
      logger.error('Failed to create enhanced Firecrawl tables', { error });
      throw error;
    }
  }

  async startAdvancedCrawl(
    sourceUrl: string,
    jobType: CrawlJobExtended['job_type'] = 'full_crawl',
    configuration: Partial<CrawlJobExtended['configuration']> = {}
  ): Promise<CrawlJobExtended> {
    await this.initialize();

    const defaultConfig: CrawlJobExtended['configuration'] = {
      max_depth: 3,
      include_patterns: ['*'],
      exclude_patterns: [],
      follow_external_links: false,
      capture_screenshots: false,
      extract_structured_data: true,
      process_documents: true,
      rate_limit_ms: 1000
    };

    const finalConfig = { ...defaultConfig, ...configuration };

    // Create job record
    const jobResult = await db.query(`
      INSERT INTO enhanced_crawl_jobs (
        source_url, job_type, status, configuration, started_at, stats
      ) VALUES ($1, $2, 'running', $3, NOW(), $4)
      RETURNING *
    `, [
      sourceUrl,
      jobType,
      JSON.stringify(finalConfig),
      JSON.stringify({
        pages_scraped: 0,
        documents_processed: 0,
        links_discovered: 0,
        grants_found: 0,
        errors_encountered: 0,
        processing_time_ms: 0
      })
    ]);

    const job = jobResult.rows[0] as CrawlJobExtended;
    
    // Start crawling in background
    this.executeCrawlJob(job).catch(error => {
      logger.error('Crawl job failed', { jobId: job.id, error });
    });

    return job;
  }

  private async executeCrawlJob(job: CrawlJobExtended): Promise<void> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting enhanced crawl job', { jobId: job.id, sourceUrl: job.source_url });

      // Configure Firecrawl v1 API options (removed deprecated parameters)
      const crawlOptions: any = {
        maxDepth: job.configuration.max_depth,
        limit: 100
      };

      // Only add includePaths if they're not the default wildcard
      if (job.configuration.include_patterns && 
          job.configuration.include_patterns.length > 0 && 
          !job.configuration.include_patterns.includes('*')) {
        crawlOptions.includePaths = job.configuration.include_patterns;
      }

      // Only add excludePaths if they exist
      if (job.configuration.exclude_patterns && job.configuration.exclude_patterns.length > 0) {
        crawlOptions.excludePaths = job.configuration.exclude_patterns;
      }

      // Start the crawl with retry logic
      const crawlResult = await this.retryWithBackoff(
        () => this.firecrawl.crawlUrl(job.source_url, crawlOptions as any)
      );

      if (!crawlResult.success) {
        throw new Error(`Firecrawl failed: ${crawlResult.error || 'Unknown error'}`);
      }

      const pages = crawlResult.data || [];
      logger.info('Crawl completed, processing pages', { jobId: job.id, pageCount: pages.length });

      // Process each page
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as any;
        
        try {
          await this.processScrapedPage(page, job);
          
          // Update progress
          const progress = Math.floor((i + 1) / pages.length * 80); // Reserve 20% for final processing
          await this.updateJobProgress(job.id, progress);
          
          // Rate limiting
          if (job.configuration.rate_limit_ms > 0) {
            await this.sleep(job.configuration.rate_limit_ms);
          }
        } catch (error) {
          logger.error('Failed to process page', { jobId: job.id, url: page.url, error });
          job.stats.errors_encountered++;
        }
      }

      // Final processing and cleanup
      await this.finalizeJob(job, startTime);

    } catch (error) {
      await this.failJob(job.id, error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  private async processScrapedPage(pageData: any, job: CrawlJobExtended): Promise<ScrapedPage> {
    const url = pageData.metadata?.sourceURL || pageData.url;
    const title = pageData.metadata?.title || this.extractTitleFromContent(pageData.markdown || pageData.content);
    
    // Extract metadata
    const metadata = {
      statusCode: pageData.metadata?.statusCode || 200,
      timestamp: new Date().toISOString(),
      headers: pageData.metadata?.headers || {},
      links: this.extractLinks(pageData.html || pageData.content || ''),
      images: this.extractImages(pageData.html || pageData.content || ''),
      description: pageData.metadata?.description,
      keywords: pageData.metadata?.keywords || []
    };

    // Save scraped page
    const pageResult = await db.query(`
      INSERT INTO scraped_pages (
        url, title, content, markdown, html, metadata, processing_status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'processed')
      ON CONFLICT (url) DO UPDATE SET
        title = EXCLUDED.title,
        content = EXCLUDED.content,
        markdown = EXCLUDED.markdown,
        html = EXCLUDED.html,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
      RETURNING *
    `, [
      url,
      title,
      pageData.content || pageData.markdown || '',
      pageData.markdown || '',
      pageData.html || '',
      JSON.stringify(metadata)
    ]);

    const savedPage = pageResult.rows[0] as ScrapedPage;

    // Process links
    await this.processPageLinks(savedPage.id, metadata.links);

    // Process documents if enabled
    if (job.configuration.process_documents) {
      await this.processPageDocuments(savedPage, job);
    }

    // Extract structured data if enabled
    if (job.configuration.extract_structured_data) {
      await this.extractStructuredData(savedPage);
    }

    job.stats.pages_scraped++;
    return savedPage;
  }

  private async processPageLinks(pageId: string, links: string[]): Promise<void> {
    for (const link of links) {
      try {
        const linkType = this.classifyLink(link);
        const priorityScore = this.calculateLinkPriority(link, linkType);
        
        await db.query(`
          INSERT INTO scraped_links (
            page_id, url, anchor_text, link_type, priority_score
          ) VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
        `, [pageId, link, '', linkType, priorityScore]);
      } catch (error) {
        logger.warn('Failed to save link', { pageId, link, error });
      }
    }
  }

  private async processPageDocuments(page: ScrapedPage, job: CrawlJobExtended): Promise<void> {
    const documentLinks = await db.query(`
      SELECT url FROM scraped_links 
      WHERE page_id = $1 AND link_type = 'document'
    `, [page.id]);

    for (const docLink of documentLinks.rows) {
      try {
        await this.processDocument(docLink.url, page.id, job);
      } catch (error) {
        logger.error('Failed to process document', { url: docLink.url, error });
        job.stats.errors_encountered++;
      }
    }
  }

  private async processDocument(url: string, pageId: string, job: CrawlJobExtended): Promise<ScrapedDocument> {
    const fileType = this.getFileTypeFromUrl(url);
    
    // Scrape document with Firecrawl v1 API (removed deprecated parameters)
    const docResult = await this.retryWithBackoff(
      () => this.firecrawl.scrapeUrl(url, {
        // Only basic parameters supported in v1
      })
    );

    if (!docResult.success) {
      throw new Error(`Failed to scrape document: ${docResult.error}`);
    }

    const docData = (docResult as any).data || docResult;
    const title = docData.metadata?.title || this.extractTitleFromUrl(url);
    const content = docData.markdown || docData.content || '';

    // Extract grant-specific data using AI
    const extractedData = await this.extractGrantDataFromDocument(content, fileType);

    // Save document
    const docResult2 = await db.query(`
      INSERT INTO scraped_documents (
        page_id, url, title, content, file_type, extracted_data, 
        processing_status, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, 'processed', $7)
      RETURNING *
    `, [
      pageId,
      url,
      title,
      content,
      fileType,
      JSON.stringify(extractedData),
      extractedData.confidence || 0.5
    ]);

    job.stats.documents_processed++;
    job.stats.grants_found += extractedData.grants?.length || 0;

    return docResult2.rows[0] as ScrapedDocument;
  }

  private async extractGrantDataFromDocument(content: string, fileType: string): Promise<any> {
    try {
      // Import OpenAI service
      const { openaiService } = await import('./openaiService');
      
      const prompt = `
        Analyze the following document content and extract any grant-related information.
        Return a JSON object with the following structure:
        {
          "grants": [
            {
              "title": "Grant name",
              "description": "Grant description",
              "amount_min": number or null,
              "amount_max": number or null,
              "currency": "EUR" or "USD" or null,
              "deadline": "YYYY-MM-DD" or null,
              "funder": "Organization name",
              "eligibility": "Brief eligibility description",
              "categories": ["category1", "category2"],
              "url": "Application URL if found"
            }
          ],
          "contacts": [
            {
              "name": "Contact name",
              "email": "email@example.com",
              "phone": "phone number",
              "role": "role/title"
            }
          ],
          "dates": [
            {
              "type": "deadline" | "opening" | "info_session",
              "date": "YYYY-MM-DD",
              "description": "Event description"
            }
          ],
          "confidence": 0.0-1.0
        }
        
        If no grant information is found, return empty arrays but include a confidence score.
        
        Document content:
        ${content.substring(0, 8000)} // Limit to avoid token limits
      `;

      const response = await openaiService.chatCompletion(
        [
          {
            role: 'system',
            content: 'You are an expert at extracting grant and funding information from documents. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        {
          model: 'gpt-4o-mini',
          maxTokens: 1500,
          temperature: 0.1
        }
      );

      try {
        const extractedData = JSON.parse(response.content);
        logger.info('Successfully extracted grant data', { 
          grantsFound: extractedData.grants?.length || 0,
          confidence: extractedData.confidence
        });
        return extractedData;
      } catch (parseError) {
        logger.warn('Failed to parse AI response as JSON', { response: response.content });
        return {
          grants: [],
          contacts: [],
          dates: [],
          confidence: 0.1
        };
      }

    } catch (error) {
      logger.error('Failed to extract grant data using AI', { error: error instanceof Error ? error.message : String(error) });
      
      // Fallback: Try simple text analysis for grant indicators
      const grantIndicators = this.simpleGrantExtraction(content);
      return {
        grants: grantIndicators.grants,
        contacts: grantIndicators.contacts,
        dates: grantIndicators.dates,
        confidence: 0.3
      };
    }
  }

  private simpleGrantExtraction(content: string): { grants: any[], contacts: any[], dates: any[] } {
    const grants: any[] = [];
    const contacts: any[] = [];
    const dates: any[] = [];

    // Simple regex patterns for grant detection
    const grantPatterns = [
      /(?:grant|funding|award|scheme|programme?)\s+(?:for|of|to)\s+([^.]{10,100})/gi,
      /(?:€|EUR|USD|\$)\s*([0-9,]+(?:\.[0-9]{2})?)/gi,
      /deadline\s*:?\s*([^.]{5,50})/gi
    ];

    let match;
    while ((match = grantPatterns[0].exec(content)) !== null) {
      grants.push({
        title: match[1].trim(),
        description: null,
        amount_min: null,
        amount_max: null,
        currency: null,
        deadline: null,
        funder: null,
        eligibility: null,
        categories: [],
        url: null
      });
    }

    // Extract email addresses
    const emailPattern = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    while ((match = emailPattern.exec(content)) !== null) {
      contacts.push({
        name: null,
        email: match[1],
        phone: null,
        role: null
      });
    }

    return { grants: grants.slice(0, 3), contacts: contacts.slice(0, 3), dates };
  }

  private async extractStructuredData(page: ScrapedPage): Promise<void> {
    // Extract structured data from HTML using JSON-LD, microdata, etc.
    if (!page.html) return;

    const structuredData = this.parseStructuredData(page.html);
    
    if (structuredData.length > 0) {
      await db.query(`
        UPDATE scraped_pages SET structured_data = $1 WHERE id = $2
      `, [JSON.stringify(structuredData), page.id]);
    }
  }

  private parseStructuredData(html: string): any[] {
    const structuredData: any[] = [];
    
    // Extract JSON-LD
    const jsonLdRegex = /<script[^>]*type\s*=\s*[\"']application\/ld\+json[\"'][^>]*>(.*?)<\/script>/gis;
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

  // Utility methods
  private extractLinks(content: string): string[] {
    const linkRegex = /href\s*=\s*[\"']([^\"']+)[\"']/gi;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const url = match[1];
      if (url && !url.startsWith('#') && !url.startsWith('javascript:')) {
        links.push(url);
      }
    }

    return [...new Set(links)]; // Remove duplicates
  }

  private extractImages(content: string): string[] {
    const imageRegex = /src\s*=\s*[\"']([^\"']+\.(jpg|jpeg|png|gif|webp|svg))[\"']/gi;
    const images: string[] = [];
    let match;

    while ((match = imageRegex.exec(content)) !== null) {
      images.push(match[1]);
    }

    return [...new Set(images)];
  }

  private extractTitleFromContent(content: string): string {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : 'Untitled';
  }

  private extractTitleFromUrl(url: string): string {
    const parts = url.split('/');
    const filename = parts[parts.length - 1];
    return filename.split('.')[0] || 'Document';
  }

  private classifyLink(url: string): ScrapedLink['link_type'] {
    if (url.includes('@') || url.startsWith('mailto:')) return 'email';
    if (url.startsWith('tel:')) return 'phone';
    if (url.match(/\.(pdf|docx?|txt|rtf)$/i)) return 'document';
    if (url.startsWith('http') && !url.includes(new URL(url).hostname)) return 'external';
    return 'internal';
  }

  private calculateLinkPriority(url: string, linkType: string): number {
    let score = 0;
    
    // Document links get higher priority
    if (linkType === 'document') score += 50;
    
    // Grant-related keywords
    const grantKeywords = ['grant', 'funding', 'scheme', 'application', 'call', 'tender'];
    if (grantKeywords.some(keyword => url.toLowerCase().includes(keyword))) {
      score += 30;
    }
    
    // Recency indicators
    const currentYear = new Date().getFullYear();
    if (url.includes(currentYear.toString())) score += 20;
    
    return Math.min(score, 100);
  }

  private getFileTypeFromUrl(url: string): ScrapedDocument['file_type'] {
    const extension = url.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'doc': return 'doc';
      case 'txt': return 'txt';
      default: return 'pdf';
    }
  }

  private async updateJobProgress(jobId: string, progress: number): Promise<void> {
    await db.query(`
      UPDATE enhanced_crawl_jobs SET progress = $1, updated_at = NOW() WHERE id = $2
    `, [progress, jobId]);
  }

  private async finalizeJob(job: CrawlJobExtended, startTime: number): Promise<void> {
    const processingTime = Date.now() - startTime;
    job.stats.processing_time_ms = processingTime;

    await db.query(`
      UPDATE enhanced_crawl_jobs SET 
        status = 'completed',
        progress = 100,
        stats = $1,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(job.stats), job.id]);

    logger.info('Crawl job completed successfully', {
      jobId: job.id,
      stats: job.stats,
      processingTimeMs: processingTime
    });
  }

  private async failJob(jobId: string, errorMessage: string): Promise<void> {
    await db.query(`
      UPDATE enhanced_crawl_jobs SET 
        status = 'failed',
        error_message = $1,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
    `, [errorMessage, jobId]);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods
  async getScrapedPages(options: {
    limit?: number;
    offset?: number;
    status?: string;
    search?: string;
  } = {}): Promise<{ pages: ScrapedPage[]; total: number }> {
    await this.initialize();

    const { limit = 20, offset = 0, status, search } = options;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND processing_status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR url ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM scraped_pages ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const pagesResult = await db.query(`
      SELECT * FROM scraped_pages ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return {
      pages: pagesResult.rows,
      total
    };
  }

  async getScrapedDocuments(options: {
    limit?: number;
    offset?: number;
    fileType?: string;
    search?: string;
  } = {}): Promise<{ documents: ScrapedDocument[]; total: number }> {
    await this.initialize();

    const { limit = 20, offset = 0, fileType, search } = options;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (fileType) {
      whereClause += ` AND file_type = $${paramIndex}`;
      params.push(fileType);
      paramIndex++;
    }

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR content ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM scraped_documents ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const docsResult = await db.query(`
      SELECT * FROM scraped_documents ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return {
      documents: docsResult.rows,
      total
    };
  }

  async getCrawlJobs(options: {
    limit?: number;
    offset?: number;
    status?: string;
  } = {}): Promise<{ jobs: CrawlJobExtended[]; total: number }> {
    await this.initialize();

    const { limit = 20, offset = 0, status } = options;
    
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM enhanced_crawl_jobs ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const jobsResult = await db.query(`
      SELECT * FROM enhanced_crawl_jobs ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    return {
      jobs: jobsResult.rows,
      total
    };
  }

  async getJobDetails(jobId: string): Promise<{
    job: CrawlJobExtended;
    pages: ScrapedPage[];
    documents: ScrapedDocument[];
    stats: any;
  } | null> {
    await this.initialize();

    const jobResult = await db.query('SELECT * FROM enhanced_crawl_jobs WHERE id = $1', [jobId]);
    if (jobResult.rows.length === 0) return null;

    const job = jobResult.rows[0] as CrawlJobExtended;

    // Get related pages (simplified - would need proper relation)
    const pagesResult = await db.query(`
      SELECT * FROM scraped_pages 
      WHERE created_at >= $1 AND created_at <= COALESCE($2, NOW())
      ORDER BY created_at DESC
    `, [job.started_at, job.completed_at]);

    const docsResult = await db.query(`
      SELECT d.* FROM scraped_documents d
      JOIN scraped_pages p ON d.page_id = p.id
      WHERE p.created_at >= $1 AND p.created_at <= COALESCE($2, NOW())
    `, [job.started_at, job.completed_at]);

    return {
      job,
      pages: pagesResult.rows,
      documents: docsResult.rows,
      stats: job.stats
    };
  }

  async deleteScrapedData(type: 'pages' | 'documents' | 'jobs', ids: string[]): Promise<void> {
    await this.initialize();

    const table = type === 'pages' ? 'scraped_pages' : 
                  type === 'documents' ? 'scraped_documents' : 
                  'enhanced_crawl_jobs';

    await db.query(`DELETE FROM ${table} WHERE id = ANY($1)`, [ids]);
    logger.info(`Deleted ${ids.length} ${type}`, { ids });
  }

  /**
   * Simple crawl website method for grant intelligence integration
   */
  async crawlWebsite(
    url: string,
    options: {
      maxPages?: number;
      includePdfs?: boolean;
      followInternalLinks?: boolean;
      excludePatterns?: string[];
      includePatterns?: string[];
      extractContacts?: boolean;
      extractImages?: boolean;
      extractMetadata?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    jobId?: string;
    pages?: Array<{
      url: string;
      title?: string;
      content: string;
      metadata?: any;
    }>;
    documents?: Array<{
      url: string;
      title?: string;
      content: string;
      file_type: string;
      metadata?: any;
    }>;
    error?: string;
  }> {
    try {
      await this.initialize();

      const {
        maxPages = 10,
        includePdfs = true,
        followInternalLinks = true,
        excludePatterns = [],
        includePatterns = ['*'],
        extractContacts = false,
        extractImages = false,
        extractMetadata = true
      } = options;

      logger.info('Starting website crawl', { url, options });

      // Configure crawl options for Firecrawl v1 API
      const crawlOptions: any = {
        maxDepth: 2,
        limit: maxPages
      };

      // Only add paths if they're actual path patterns, not wildcards
      if (includePatterns && includePatterns.length > 0 && !includePatterns.includes('*')) {
        crawlOptions.includePaths = includePatterns;
      }
      if (excludePatterns && excludePatterns.length > 0) {
        crawlOptions.excludePaths = excludePatterns;
      }

      // Execute crawl with retry logic
      const crawlResult = await this.retryWithBackoff(
        () => this.firecrawl.crawlUrl(url, crawlOptions)
      );

      if (!crawlResult.success) {
        return {
          success: false,
          error: crawlResult.error || 'Crawl failed'
        };
      }

      const pages = (crawlResult.data || []).map((page: any) => ({
        url: page.metadata?.sourceURL || page.url || url,
        title: page.metadata?.title || 'Untitled',
        content: page.markdown || page.content || '',
        metadata: page.metadata || {}
      }));

      // If PDFs are requested, try to extract document links and scrape them
      const documents: any[] = [];
      if (includePdfs && pages.length > 0) {
        for (const page of pages) {
          const docLinks = this.extractDocumentLinks(page.content);
          for (const docUrl of docLinks.slice(0, 3)) { // Limit to 3 documents per page
            try {
              const docResult = await this.retryWithBackoff(
                () => this.firecrawl.scrapeUrl(docUrl, {
                  // Basic v1 API call
                })
              );

              if (docResult.success) {
                const docData = (docResult as any).data || docResult;
                documents.push({
                  url: docUrl,
                  title: docData.metadata?.title || this.extractTitleFromUrl(docUrl),
                  content: docData.markdown || docData.content || '',
                  file_type: this.getFileTypeFromUrl(docUrl),
                  metadata: docData.metadata || {}
                });
              }
            } catch (error) {
              logger.warn('Failed to scrape document', { url: docUrl, error });
            }
          }
        }
      }

      const jobId = `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      logger.info('Website crawl completed', {
        url,
        jobId,
        pagesFound: pages.length,
        documentsFound: documents.length
      });

      return {
        success: true,
        jobId,
        pages,
        documents
      };

    } catch (error) {
      logger.error('Website crawl failed', { url, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown crawl error'
      };
    }
  }

  private extractDocumentLinks(content: string): string[] {
    const documentRegex = /href\s*=\s*["']([^"']*\.(?:pdf|docx?|txt|rtf))["']/gi;
    const links: string[] = [];
    let match;

    while ((match = documentRegex.exec(content)) !== null) {
      links.push(match[1]);
    }

    return [...new Set(links)]; // Remove duplicates
  }
}

export const enhancedFirecrawlService = new EnhancedFirecrawlService();