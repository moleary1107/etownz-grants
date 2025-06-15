import { apiService } from './index';

export interface MCPFetchOptions {
  extractStructuredData?: boolean;
  convertToMarkdown?: boolean;
  timeout?: number;
}

export interface MCPFetchResult {
  url: string;
  content: string;
  markdown?: string;
  structuredData?: {
    grantName?: string
    program?: string
    fundingAmount?: string | number
    amount?: string | number
    deadline?: string
    applicationDeadline?: string
    eligibility?: string | string[]
    eligibilityCriteria?: string | string[]
    confidence?: number
    [key: string]: unknown
  };
  metadata: {
    title?: string;
    description?: string;
    statusCode: number;
    contentType: string;
    timestamp: string;
    responseTime: number;
  };
}

export interface GrantSource {
  name: string;
  url: string;
  category: string;
  description: string;
}

export interface BatchScrapingConfig {
  urls: string[];
  extractionPrompt?: string;
  useAI?: boolean;
  batchSize?: number;
  rateLimitMs?: number;
}

export interface BatchScrapingResult {
  results: MCPFetchResult[];
  progressUpdates: Array<{
    timestamp: string
    status: string
    message: string
    progress: number
    url?: string
    error?: string
  }>;
  summary: {
    totalUrls: number;
    successfulScrapes: number;
    failedScrapes: number;
    aiEnhanced: number;
  };
}

export interface ServiceHealth {
  mcpServer: boolean;
  firecrawl: boolean;
}

class MCPScrapingService {
  /**
   * Enhanced fetch using MCP server with Firecrawl fallback
   */
  async enhancedFetch(url: string, options: MCPFetchOptions = {}): Promise<MCPFetchResult> {
    const response = await apiService.post('/mcp-scraping/fetch', {
      url,
      options
    });
    
    return response.data.data;
  }

  /**
   * Batch scrape grant sources with intelligent routing
   */
  async batchScrapeGrants(config: BatchScrapingConfig): Promise<BatchScrapingResult> {
    const response = await apiService.post('/mcp-scraping/batch-grants', config);
    
    return response.data.data;
  }

  /**
   * Get predefined grant source URLs for Ireland
   */
  async getGrantSources(): Promise<{
    sources: GrantSource[];
    categories: string[];
    totalSources: number;
  }> {
    const response = await apiService.get('/mcp-scraping/grant-sources');
    
    return response.data.data;
  }

  /**
   * Quick scan of Irish grant sources for new opportunities
   */
  async quickScan(categories: string[] = [], useAI: boolean = true): Promise<{
    scan: {
      totalSources: number;
      successfulScans: number;
      newOpportunities: number;
      opportunities: Array<{
        id: string
        title: string
        source: string
        url: string
        deadline?: string
        amount?: string | number
        category?: string
        extractedAt: string
        confidence: number
      }>;
    };
    recommendations: string;
  }> {
    const response = await apiService.post('/mcp-scraping/quick-scan', {
      categories,
      useAI
    });
    
    return response.data.data;
  }

  /**
   * Check health of MCP and Firecrawl services
   */
  async healthCheck(): Promise<{
    services: ServiceHealth;
    overall: 'healthy' | 'degraded';
    timestamp: string;
  }> {
    const response = await apiService.get('/mcp-scraping/health');
    
    return response.data.data;
  }

  /**
   * Scrape specific Irish government grant pages
   */
  async scrapeGovernmentGrants(): Promise<MCPFetchResult[]> {
    const governmentSources = [
      'https://www.enterprise-ireland.com/en/funding-supports/',
      'https://www.sfi.ie/funding/',
      'https://research.ie/funding/',
      'https://www.localenterprise.ie/Discover-Business-Supports/'
    ];

    const results = await this.batchScrapeGrants({
      urls: governmentSources,
      extractionPrompt: 'Extract grant programs, funding amounts, application deadlines, and eligibility requirements',
      useAI: true,
      batchSize: 2,
      rateLimitMs: 3000
    });

    return results.results;
  }

  /**
   * Monitor for new grant opportunities
   */
  async monitorNewOpportunities(categories: string[] = []): Promise<{
    hasNewOpportunities: boolean;
    opportunities: Array<{
      id: string
      title: string
      source: string
      url: string
      deadline?: string
      amount?: string | number
      category?: string
      extractedAt: string
      confidence: number
    }>;
    lastChecked: string;
  }> {
    const scanResult = await this.quickScan(categories, true);
    
    return {
      hasNewOpportunities: scanResult.scan.newOpportunities > 0,
      opportunities: scanResult.scan.opportunities,
      lastChecked: new Date().toISOString()
    };
  }

  /**
   * Get enhanced grant data with AI extraction
   */
  async getEnhancedGrantData(urls: string[]): Promise<{
    grants: Array<{
      id: string
      source: string
      title: string
      funding?: string | number
      deadline?: string
      eligibility?: string | string[]
      extractedAt: string
      confidence: number
    }>;
    extractedData: Array<{
    grantName?: string
    program?: string
    fundingAmount?: string | number
    deadline?: string
    eligibility?: string | string[]
    source?: string
    confidence?: number
    [key: string]: unknown
  }>;
    confidence: number;
  }> {
    const results = await this.batchScrapeGrants({
      urls,
      extractionPrompt: `
        Extract detailed grant information including:
        - Grant name and program
        - Funding amount (min/max)
        - Application deadline
        - Eligibility criteria
        - Application process
        - Contact information
        - Required documents
        - Success rate (if available)
      `,
      useAI: true,
      batchSize: 3,
      rateLimitMs: 2000
    });

    const extractedData = results.results
      .filter(r => r.structuredData)
      .map(r => r.structuredData!);

    const grants = extractedData.map((data, index) => ({
      id: `extracted_${index}`,
      source: results.results[index]?.url,
      title: data.grantName || data.program || 'Unknown Grant',
      funding: data.fundingAmount || data.amount,
      deadline: data.deadline || data.applicationDeadline,
      eligibility: data.eligibility || data.eligibilityCriteria,
      extractedAt: new Date().toISOString(),
      confidence: data.confidence || 0.8
    }));

    const averageConfidence = grants.reduce((sum, g) => sum + (g.confidence || 0), 0) / grants.length;

    return {
      grants,
      extractedData,
      confidence: averageConfidence || 0
    };
  }
}

export const mcpScrapingService = new MCPScrapingService();