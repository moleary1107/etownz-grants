interface FirecrawlJob {
  id: string;
  sourceUrl: string;
  jobType: 'full_crawl' | 'targeted_scrape' | 'document_harvest' | 'link_discovery' | 'ai_extract' | 'monitor';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
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
  configuration: {
    maxDepth: number;
    includePatterns: string[];
    excludePatterns: string[];
    aiExtraction: boolean;
    captureScreenshots: boolean;
    extractionPrompt?: string;
  };
  priority: number;
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ExtractedGrant {
  title: string;
  description: string;
  amount?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  deadline?: string;
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
    extractedAt: string;
  };
}

interface Statistics {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalPages: number;
  totalDocuments: number;
  totalGrants: number;
  averageProcessingTime: number;
}

export class FirecrawlService {
  private baseUrl = '/api/firecrawl';

  async createJob(jobData: {
    sourceUrl: string;
    jobType: FirecrawlJob['jobType'];
    configuration?: Partial<FirecrawlJob['configuration']>;
    priority?: number;
  }): Promise<FirecrawlJob> {
    const response = await fetch(`${this.baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(jobData)
    });

    if (!response.ok) {
      throw new Error(`Failed to create job: ${response.statusText}`);
    }

    return response.json();
  }

  async createBatchJobs(jobs: Array<{
    sourceUrl: string;
    jobType: FirecrawlJob['jobType'];
    configuration?: Partial<FirecrawlJob['configuration']>;
    priority?: number;
  }>): Promise<{ jobs: FirecrawlJob[] }> {
    const response = await fetch(`${this.baseUrl}/jobs/batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ jobs })
    });

    if (!response.ok) {
      throw new Error(`Failed to create batch jobs: ${response.statusText}`);
    }

    return response.json();
  }

  async listJobs(options: {
    status?: FirecrawlJob['status'];
    jobType?: FirecrawlJob['jobType'];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ jobs: FirecrawlJob[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/jobs?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list jobs: ${response.statusText}`);
    }

    return response.json();
  }

  async getJob(jobId: string): Promise<FirecrawlJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get job: ${response.statusText}`);
    }

    return response.json();
  }

  async cancelJob(jobId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`);
    }
  }

  async retryJob(jobId: string): Promise<FirecrawlJob> {
    const response = await fetch(`${this.baseUrl}/jobs/${jobId}/retry`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to retry job: ${response.statusText}`);
    }

    return response.json();
  }

  async getExtractedGrants(options: {
    jobId?: string;
    minConfidence?: number;
    deadlineAfter?: string;
    deadlineBefore?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ grants: ExtractedGrant[]; total: number }> {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        params.append(key, value.toString());
      }
    });

    const response = await fetch(`${this.baseUrl}/grants?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get grants: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatistics(): Promise<Statistics> {
    const response = await fetch(`${this.baseUrl}/statistics`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get statistics: ${response.statusText}`);
    }

    return response.json();
  }

  async extractWithPrompt(url: string, extractionPrompt: string, screenshot = false): Promise<{
    jobId: string;
    status: string;
    results?: {
      extractedData?: Record<string, unknown>
      content?: string
      metadata?: Record<string, unknown>
      screenshots?: string[]
    };
    message?: string;
  }> {
    const response = await fetch(`${this.baseUrl}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        url,
        extractionPrompt,
        screenshot
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to extract: ${response.statusText}`);
    }

    return response.json();
  }

  subscribeToJobUpdates(jobId: string, onUpdate: (event: {
    type: 'progress' | 'complete' | 'error' | 'status_change'
    jobId: string
    data?: Record<string, unknown>
    message?: string
    timestamp: string
  }) => void): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/jobs/${jobId}/subscribe`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as {
          type: 'progress' | 'complete' | 'error' | 'status_change'
          jobId: string
          data?: Record<string, unknown>
          message?: string
          timestamp: string
        };
        onUpdate(data);
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }

  async healthCheck(): Promise<{ status: string; service: string; timestamp: string }> {
    const response = await fetch(`${this.baseUrl}/health`);
    
    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    return response.json();
  }

  // Organization Analysis Methods
  async scrapeAndAnalyzeOrganization(
    organizationId: string,
    websiteUrl: string,
    options: {
      maxPages?: number;
      includePdfs?: boolean;
      followLinks?: boolean;
    } = {}
  ): Promise<{
    success: boolean;
    organizationId: string;
    websiteUrl: string;
    pagesScraped: number;
    intelligenceExtracted: number;
    capabilitiesIdentified: number;
    scrapedPages: string[];
    error?: string;
  }> {
    const response = await fetch(`/api/grant-intelligence/scrape-and-analyze/${organizationId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        websiteUrl,
        maxPages: options.maxPages || 5,
        includePdfs: options.includePdfs !== false,
        followLinks: options.followLinks !== false,
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to scrape organization: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getOrganizationCapabilities(organizationId: string): Promise<{
    organizationId: string;
    capabilities: Array<{
      id: string;
      capability_type: string;
      capability_name: string;
      description: string;
      proficiency_level: string;
      evidence_sources: string[];
      keywords: string[];
      created_at: string;
    }>;
  }> {
    const response = await fetch(`/api/grant-intelligence/capabilities/${organizationId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get capabilities: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }

  async getOrganizationIntelligence(organizationId: string): Promise<{
    intelligence: Array<{
      id: string;
      data_source: string;
      intelligence_type: string;
      extracted_data: {
        grants?: Array<{
          title: string
          description?: string
          amount?: { min?: number; max?: number; currency?: string }
          deadline?: string
          eligibility?: string[]
          contact?: Record<string, unknown>
        }>
        content?: {
          text: string
          sections: Array<{ title: string; content: string }>
          links: string[]
        }
        metadata?: {
          title?: string
          description?: string
          keywords?: string[]
        }
        [key: string]: unknown
      };
      summary: string;
      keywords: string[];
      relevance_tags: string[];
      confidence_score: number;
      created_at: string;
    }>;
  }> {
    const response = await fetch(`/api/organizations/${organizationId}/intelligence`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get intelligence: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data;
  }
}

export const firecrawlService = new FirecrawlService();
export type { FirecrawlJob, ExtractedGrant, Statistics };