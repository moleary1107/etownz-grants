import { logger } from './logger';
import { DatabaseService } from './database';
import { firecrawlIntegrationService } from './firecrawlIntegrationService';
import { EventEmitter } from 'events';

interface MCPFetchOptions {
  userAgent?: string;
  followRedirects?: boolean;
  timeout?: number;
  convertToMarkdown?: boolean;
  extractStructuredData?: boolean;
  respectRobots?: boolean;
}

interface MCPFetchResult {
  url: string;
  content: string;
  markdown?: string;
  structuredData?: any;
  metadata: {
    title?: string;
    description?: string;
    statusCode: number;
    contentType: string;
    timestamp: string;
    responseTime: number;
    aiEnhanced?: boolean;
  };
}

interface GrantScrapingConfig {
  urls: string[];
  extractionPrompt?: string;
  useAI?: boolean;
  batchSize?: number;
  rateLimitMs?: number;
}

export class MCPFirecrawlService extends EventEmitter {
  private db: DatabaseService;
  private mcpServerUrl: string;

  constructor() {
    super();
    this.db = DatabaseService.getInstance();
    this.mcpServerUrl = process.env.MCP_FETCH_SERVER_URL || 'http://localhost:9001';
  }

  /**
   * Enhanced fetch using MCP server with fallback to traditional Firecrawl
   */
  async enhancedFetch(url: string, options: MCPFetchOptions = {}): Promise<MCPFetchResult> {
    const startTime = Date.now();
    
    try {
      // Try MCP server first for basic fetching
      const mcpResult = await this.fetchViaMCP(url, options);
      
      // If we need AI extraction or advanced features, combine with Firecrawl
      if (options.extractStructuredData) {
        const enhancedData = await this.enhanceWithFirecrawl(url, mcpResult);
        return { ...mcpResult, ...enhancedData };
      }
      
      return mcpResult;
      
    } catch (mcpError) {
      logger.warn('MCP fetch failed, falling back to Firecrawl', { 
        url, 
        error: mcpError instanceof Error ? mcpError.message : String(mcpError) 
      });
      
      // Fallback to traditional Firecrawl
      return await this.fetchViaFirecrawl(url, options);
    }
  }

  /**
   * Fetch content via MCP server
   */
  private async fetchViaMCP(url: string, options: MCPFetchOptions): Promise<MCPFetchResult> {
    const fetchOptions = {
      userAgent: options.userAgent || 'eTownz-Grants-Bot/1.0',
      followRedirects: options.followRedirects ?? true,
      timeout: options.timeout || 30000
    };

    const response = await fetch(`${this.mcpServerUrl}/tools/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'fetch',
        arguments: {
          url,
          options: fetchOptions
        }
      })
    });

    if (!response.ok) {
      throw new Error(`MCP fetch failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    return {
      url,
      content: result.content,
      markdown: options.convertToMarkdown ? result.markdown : undefined,
      metadata: {
        title: result.title,
        description: result.description,
        statusCode: result.statusCode,
        contentType: result.contentType,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - Date.now()
      }
    };
  }

  /**
   * Enhance MCP result with Firecrawl AI extraction
   */
  private async enhanceWithFirecrawl(url: string, mcpResult: MCPFetchResult): Promise<Partial<MCPFetchResult>> {
    try {
      // Use existing Firecrawl service for AI extraction
      const aiJob = await firecrawlIntegrationService.createJob(
        url,
        'ai_extract',
        {
          extractStructuredData: true,
          aiExtraction: true,
          extractionPrompt: 'Extract grant information, funding details, eligibility criteria, and application deadlines'
        },
        { priority: 80 }
      );

      // Wait for job completion (with timeout)
      const result = await this.waitForJobCompletion(aiJob.id, 60000);
      
      return {
        structuredData: result.extractedData,
        metadata: {
          ...mcpResult.metadata,
          aiEnhanced: true
        }
      };
      
    } catch (error) {
      logger.error('Firecrawl AI enhancement failed', { url, error });
      return {};
    }
  }

  /**
   * Fallback to traditional Firecrawl
   */
  private async fetchViaFirecrawl(url: string, options: MCPFetchOptions): Promise<MCPFetchResult> {
    const job = await firecrawlIntegrationService.createJob(
      url,
      'targeted_scrape',
      {
        maxDepth: 1,
        extractStructuredData: options.extractStructuredData || false,
        processDocuments: true
      },
      { priority: 70 }
    );

    const result = await this.waitForJobCompletion(job.id, 45000);
    
    return {
      url,
      content: result.content || '',
      markdown: result.markdown,
      structuredData: result.extractedData,
      metadata: {
        title: result.title,
        description: result.description,
        statusCode: 200,
        contentType: 'text/html',
        timestamp: new Date().toISOString(),
        responseTime: 0
      }
    };
  }

  /**
   * Batch scrape grant sources with intelligent routing
   */
  async scrapeGrantSources(config: GrantScrapingConfig): Promise<MCPFetchResult[]> {
    const results: MCPFetchResult[] = [];
    const batchSize = config.batchSize || 5;
    const rateLimitMs = config.rateLimitMs || 2000;

    logger.info('Starting batch grant source scraping', { 
      urlCount: config.urls.length, 
      batchSize 
    });

    // Process URLs in batches
    for (let i = 0; i < config.urls.length; i += batchSize) {
      const batch = config.urls.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (url, index) => {
        // Add staggered delay to avoid overwhelming servers
        await new Promise(resolve => setTimeout(resolve, index * (rateLimitMs / batchSize)));
        
        return await this.enhancedFetch(url, {
          extractStructuredData: config.useAI || false,
          convertToMarkdown: true,
          respectRobots: true,
          timeout: 30000
        });
      });

      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
            this.emit('urlScraped', { url: batch[index], success: true });
          } else {
            logger.error('Failed to scrape URL', { 
              url: batch[index], 
              error: result.reason 
            });
            this.emit('urlScraped', { url: batch[index], success: false, error: result.reason });
          }
        });

      } catch (error) {
        logger.error('Batch scraping failed', { batch, error });
      }

      // Rate limiting between batches
      if (i + batchSize < config.urls.length) {
        await new Promise(resolve => setTimeout(resolve, rateLimitMs));
      }
    }

    // Store results in database
    await this.storeBatchResults(results);

    logger.info('Batch grant source scraping completed', { 
      totalUrls: config.urls.length,
      successfulResults: results.length 
    });

    return results;
  }

  /**
   * Store batch scraping results
   */
  private async storeBatchResults(results: MCPFetchResult[]): Promise<void> {
    const query = `
      INSERT INTO scraping_results (
        url, content, markdown, structured_data, metadata, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (url) DO UPDATE SET
        content = EXCLUDED.content,
        markdown = EXCLUDED.markdown,
        structured_data = EXCLUDED.structured_data,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    `;

    for (const result of results) {
      try {
        await this.db.query(query, [
          result.url,
          result.content,
          result.markdown,
          JSON.stringify(result.structuredData || {}),
          JSON.stringify(result.metadata)
        ]);
      } catch (error) {
        logger.error('Failed to store scraping result', { url: result.url, error });
      }
    }
  }

  /**
   * Wait for Firecrawl job completion
   */
  private async waitForJobCompletion(jobId: string, timeoutMs: number): Promise<any> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < timeoutMs) {
      try {
        // Note: Simplified for now - in real implementation would check job status
        // For now, return mock data
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        // Mock completion after a short delay
        if (Date.now() - startTime > 5000) {
          return {
            extractedData: { mockData: true },
            content: 'Mock extracted content',
            markdown: '# Mock Content'
          };
        }
        
      } catch (error) {
        logger.error('Error checking job status', { jobId, error });
        throw error;
      }
    }

    throw new Error(`Job timeout after ${timeoutMs}ms`);
  }

  /**
   * Health check for MCP server
   */
  async healthCheck(): Promise<{ mcpServer: boolean; firecrawl: boolean }> {
    const checks = {
      mcpServer: false,
      firecrawl: false
    };

    // Check MCP server
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${this.mcpServerUrl}/health`, { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      checks.mcpServer = response.ok;
    } catch (error) {
      logger.warn('MCP server health check failed', { error });
    }

    // Check Firecrawl service (simplified check)
    try {
      checks.firecrawl = !!process.env.FIRECRAWL_API_KEY;
    } catch (error) {
      logger.warn('Firecrawl health check failed', { error });
    }

    return checks;
  }
}

// Singleton instance
export const mcpFirecrawlService = new MCPFirecrawlService();