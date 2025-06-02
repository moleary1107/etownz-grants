/**
 * Scraping Service Client
 * Frontend utility for interacting with web scraping APIs
 */

export interface CrawlJob {
  id: string
  source_url: string
  job_type: 'full_crawl' | 'targeted_scrape' | 'document_harvest' | 'link_discovery'
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  progress: number
  stats: {
    pages_scraped: number
    documents_processed: number
    links_discovered: number
    grants_found: number
    errors_encountered: number
    processing_time_ms: number
  }
  started_at: string
  completed_at?: string
  created_at: string
}

export interface ScrapedPage {
  id: string
  url: string
  title: string
  content: string
  metadata: {
    statusCode: number
    timestamp: string
    links: string[]
    images: string[]
  }
  processing_status: 'pending' | 'processed' | 'failed'
  created_at: string
}

export interface ScrapedDocument {
  id: string
  url: string
  title: string
  file_type: 'pdf' | 'docx' | 'doc' | 'txt'
  extracted_data: {
    grants?: any[]
    contacts?: any[]
  }
  confidence_score: number
  created_at: string
}

export interface ScrapingStats {
  jobs: {
    total: number
  }
  pages: {
    total: number
  }
  documents: {
    total: number
  }
}

export interface CrawlJobConfig {
  max_depth?: number
  include_patterns?: string[]
  exclude_patterns?: string[]
  follow_external_links?: boolean
  capture_screenshots?: boolean
  extract_structured_data?: boolean
  process_documents?: boolean
  rate_limit_ms?: number
}

class ScrapingService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  /**
   * Get all crawl jobs with filtering and pagination
   */
  async getJobs(
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{
    jobs: CrawlJob[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (status) params.append('status', status)

    const response = await fetch(`${this.baseUrl}/scraping/jobs?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch scraping jobs: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Create a new crawl job
   */
  async createJob(
    sourceUrl: string,
    jobType: CrawlJob['job_type'] = 'full_crawl',
    config: CrawlJobConfig = {}
  ): Promise<CrawlJob> {
    const response = await fetch(`${this.baseUrl}/scraping/jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        source_url: sourceUrl,
        job_type: jobType,
        configuration: {
          max_depth: 3,
          include_patterns: ['*'],
          exclude_patterns: [],
          process_documents: true,
          rate_limit_ms: 1000,
          ...config
        }
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to create scraping job: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all scraped pages with filtering and pagination
   */
  async getPages(
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string
  ): Promise<{
    pages: ScrapedPage[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (status) params.append('status', status)
    if (search) params.append('search', search)

    const response = await fetch(`${this.baseUrl}/scraping/pages?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch scraped pages: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get all scraped documents with filtering and pagination
   */
  async getDocuments(
    page: number = 1,
    limit: number = 20,
    fileType?: string,
    search?: string
  ): Promise<{
    documents: ScrapedDocument[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
    }
  }> {
    const params = new URLSearchParams()
    params.append('page', page.toString())
    params.append('limit', limit.toString())
    if (fileType) params.append('file_type', fileType)
    if (search) params.append('search', search)

    const response = await fetch(`${this.baseUrl}/scraping/documents?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch scraped documents: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get scraping statistics
   */
  async getStats(): Promise<ScrapingStats> {
    const response = await fetch(`${this.baseUrl}/scraping/stats`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to fetch scraping stats: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get job status icon component props
   */
  getStatusIconProps(status: CrawlJob['status']): {
    icon: string
    color: string
    variant: 'default' | 'secondary' | 'destructive' | 'outline'
  } {
    switch (status) {
      case 'running':
        return { icon: 'Activity', color: 'text-blue-500', variant: 'default' }
      case 'completed':
        return { icon: 'CheckCircle', color: 'text-green-500', variant: 'secondary' }
      case 'failed':
        return { icon: 'AlertCircle', color: 'text-red-500', variant: 'destructive' }
      case 'pending':
        return { icon: 'Clock', color: 'text-yellow-500', variant: 'outline' }
      case 'paused':
        return { icon: 'Pause', color: 'text-gray-500', variant: 'outline' }
      default:
        return { icon: 'Clock', color: 'text-gray-500', variant: 'outline' }
    }
  }

  /**
   * Format processing time from milliseconds
   */
  formatProcessingTime(timeMs: number): string {
    if (timeMs < 1000) return `${timeMs}ms`
    if (timeMs < 60000) return `${Math.round(timeMs / 1000)}s`
    if (timeMs < 3600000) return `${Math.round(timeMs / 60000)}m`
    return `${Math.round(timeMs / 3600000)}h`
  }

  /**
   * Get progress percentage as a formatted string
   */
  formatProgress(progress: number): string {
    return `${Math.round(progress)}%`
  }

  /**
   * Check if a job is currently active (running or pending)
   */
  isJobActive(job: CrawlJob): boolean {
    return job.status === 'running' || job.status === 'pending'
  }

  /**
   * Get human-readable job type
   */
  formatJobType(jobType: CrawlJob['job_type']): string {
    switch (jobType) {
      case 'full_crawl':
        return 'Full Crawl'
      case 'targeted_scrape':
        return 'Targeted Scrape'
      case 'document_harvest':
        return 'Document Harvest'
      case 'link_discovery':
        return 'Link Discovery'
      default:
        return jobType
    }
  }

  /**
   * Calculate success rate for a job
   */
  calculateSuccessRate(job: CrawlJob): number {
    const total = job.stats.pages_scraped + job.stats.errors_encountered
    if (total === 0) return 0
    return (job.stats.pages_scraped / total) * 100
  }
}

// Export singleton instance
export const scrapingService = new ScrapingService()

// Export class for testing
export { ScrapingService }