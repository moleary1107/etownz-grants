import FirecrawlApp from '@mendable/firecrawl-js'
import { GrantSource, DiscoveredGrant, CrawlSettings, CrawlJob, CrawlLog } from '../types/grants'
import { GrantAnalysisService } from './grantAnalysisService'
import { logger } from '../utils/logger'

export class FirecrawlService {
  private firecrawl: FirecrawlApp
  private grantAnalysis: GrantAnalysisService

  constructor() {
    this.firecrawl = new FirecrawlApp({
      apiKey: process.env.FIRECRAWL_API_KEY || ''
    })
    this.grantAnalysis = new GrantAnalysisService()
  }

  async crawlGrantSource(source: GrantSource): Promise<CrawlJob> {
    const job: CrawlJob = {
      id: this.generateJobId(),
      sourceId: source.id,
      status: 'running',
      progress: 0,
      startedAt: new Date(),
      stats: {
        pagesProcessed: 0,
        grantsDiscovered: 0,
        grantsUpdated: 0,
        documentsProcessed: 0
      },
      logs: []
    }

    try {
      this.addLog(job, 'info', `Starting crawl for ${source.name}`, source.url)

      // Configure crawl options based on settings
      const crawlOptions = this.buildCrawlOptions(source.crawlSettings)
      
      // Start the crawl
      const crawlResult = await this.firecrawl.crawlUrl(source.url, crawlOptions as any)
      
      if (!crawlResult.success) {
        throw new Error(`Crawl failed: ${crawlResult.error}`)
      }

      this.addLog(job, 'info', `Crawl completed. Processing ${crawlResult.data?.length || 0} pages`)
      job.progress = 30

      // Process each crawled page
      const discoveredGrants: DiscoveredGrant[] = []
      
      if (crawlResult.data) {
        for (let i = 0; i < crawlResult.data.length; i++) {
          const page = crawlResult.data[i]
          job.stats.pagesProcessed++
          
          try {
            // Analyze page content for grants
            const grants = await this.grantAnalysis.extractGrantsFromPage(
              (page as any).markdown || (page as any).content || '',
              (page as any).metadata?.sourceURL || (page as any).url || source.url,
              source
            )

            discoveredGrants.push(...grants)
            job.stats.grantsDiscovered += grants.length

            if (grants.length > 0) {
              this.addLog(job, 'info', `Found ${grants.length} grants`, (page as any).url)
            }

          } catch (error) {
            this.addLog(job, 'error', `Error processing page: ${error}`, (page as any).url)
          }

          job.progress = 30 + (i / crawlResult.data.length) * 50
        }
      }

      // Process documents (PDFs, DOCX) if enabled
      if (source.crawlSettings.followPdfs || source.crawlSettings.followDocx) {
        await this.processDocuments(job, source, discoveredGrants)
      }

      // Save discovered grants to database
      await this.saveDiscoveredGrants(discoveredGrants, source)
      
      job.status = 'completed'
      job.completedAt = new Date()
      job.progress = 100
      
      this.addLog(job, 'info', `Crawl completed successfully. Discovered ${job.stats.grantsDiscovered} grants`)

    } catch (error) {
      job.status = 'failed'
      job.completedAt = new Date()
      job.error = error instanceof Error ? error.message : 'Unknown error'
      this.addLog(job, 'error', `Crawl failed: ${job.error}`)
      logger.error('Crawl failed', { sourceId: source.id, error })
    }

    return job
  }

  private buildCrawlOptions(settings: CrawlSettings) {
    return {
      crawlerOptions: {
        excludes: settings.excludePatterns,
        includes: settings.includePatterns,
        maxDepth: settings.depth,
        limit: 100, // Reasonable limit to avoid overwhelming the system
      },
      pageOptions: {
        onlyMainContent: true,
        includeHtml: false,
        includePdf: settings.followPdfs
      }
    }
  }

  private async processDocuments(job: CrawlJob, source: GrantSource, grants: DiscoveredGrant[]) {
    this.addLog(job, 'info', 'Processing documents (PDFs, DOCX)')
    
    // Extract document URLs from discovered grants
    const documentUrls = grants.flatMap(grant => grant.documentUrls)
    
    for (const docUrl of documentUrls) {
      try {
        if (this.isPdfUrl(docUrl) && source.crawlSettings.followPdfs) {
          await this.processPdfDocument(docUrl, job)
        } else if (this.isDocxUrl(docUrl) && source.crawlSettings.followDocx) {
          await this.processDocxDocument(docUrl, job)
        }
        job.stats.documentsProcessed++
      } catch (error) {
        this.addLog(job, 'warning', `Failed to process document: ${error}`, docUrl)
      }
    }
  }

  private async processPdfDocument(url: string, job: CrawlJob) {
    const result = await this.firecrawl.scrapeUrl(url, {
      formats: ['markdown']
    } as any)

    if (result.success && (result as any).data) {
      // Additional grant analysis on PDF content
      const additionalGrants = await this.grantAnalysis.extractGrantsFromDocument(
        (result as any).data.markdown || (result as any).data.content || '',
        url,
        'pdf'
      )
      this.addLog(job, 'info', `Extracted ${additionalGrants.length} grants from PDF`, url)
    }
  }

  private async processDocxDocument(url: string, job: CrawlJob) {
    // Similar to PDF processing but for DOCX files
    this.addLog(job, 'info', 'Processing DOCX document', url)
    // Implementation would depend on Firecrawl's DOCX support
  }

  private async saveDiscoveredGrants(grants: DiscoveredGrant[], source: GrantSource) {
    // TODO: Implement database saving logic
    logger.info(`Saving ${grants.length} discovered grants for source ${source.name}`)
    
    // This would integrate with your database service
    // For now, just log the grants
    for (const grant of grants) {
      logger.info('Discovered grant', {
        title: grant.title,
        provider: grant.provider,
        amount: grant.amount,
        deadline: grant.deadline,
        source: source.name
      })
    }
  }

  private addLog(job: CrawlJob, level: 'info' | 'warning' | 'error', message: string, url?: string) {
    const log: CrawlLog = {
      timestamp: new Date(),
      level,
      message,
      url
    }
    job.logs.push(log)
    logger[level](message, { jobId: job.id, url })
  }

  private generateJobId(): string {
    return `crawl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isPdfUrl(url: string): boolean {
    return url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('pdf')
  }

  private isDocxUrl(url: string): boolean {
    return url.toLowerCase().includes('.docx') || url.toLowerCase().includes('.doc')
  }

  // Method to test Firecrawl connection
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.firecrawl.scrapeUrl('https://www.example.com', {
        formats: ['markdown']
      } as any)
      return result.success
    } catch (error) {
      logger.error('Firecrawl connection test failed', { error })
      return false
    }
  }

  // Method to get crawl job status
  async getCrawlStatus(jobId: string): Promise<any> {
    // This would typically query your database for job status
    // For now, return a placeholder
    return {
      id: jobId,
      status: 'completed',
      progress: 100
    }
  }
}