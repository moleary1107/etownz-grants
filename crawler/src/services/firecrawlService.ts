import FirecrawlApp from '@mendable/firecrawl-js'
import { GrantSource, DiscoveredGrant, CrawlSettings, CrawlJob, CrawlLog } from '../types/grants'
import { GrantAnalysisService } from './grantAnalysisService'
import { logger } from '../utils/logger'
import { db } from './databaseService'

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
    const jobId = this.generateJobId()
    
    // Create job in database
    const job = await this.createCrawlJob({
      id: jobId,
      source_id: source.id,
      status: 'running',
      progress: 0,
      started_at: new Date(),
      stats: {
        pagesProcessed: 0,
        grantsDiscovered: 0,
        grantsUpdated: 0,
        documentsProcessed: 0
      }
    })

    try {
      await this.addLog(job.id, 'info', `Starting crawl for ${source.name}`, source.url)

      // Configure crawl options based on settings
      const crawlOptions = this.buildCrawlOptions(source.crawlSettings)
      
      // Start the crawl
      const crawlResult = await this.firecrawl.crawlUrl(source.url, crawlOptions as any)
      
      if (!crawlResult.success) {
        throw new Error(`Crawl failed: ${crawlResult.error}`)
      }

      await this.addLog(job.id, 'info', `Crawl completed. Processing ${crawlResult.data?.length || 0} pages`)
      await this.updateCrawlJobProgress(job.id, 30, job.stats)

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
              await this.addLog(job.id, 'info', `Found ${grants.length} grants`, (page as any).url)
            }

          } catch (error) {
            await this.addLog(job.id, 'error', `Error processing page: ${error}`, (page as any).url)
          }

          const newProgress = 30 + (i / crawlResult.data.length) * 50
          await this.updateCrawlJobProgress(job.id, newProgress, job.stats)
        }
      }

      // Process documents (PDFs, DOCX) if enabled
      if (source.crawlSettings.followPdfs || source.crawlSettings.followDocx) {
        await this.processDocuments(job, source, discoveredGrants)
      }

      // Save discovered grants to database
      await this.saveDiscoveredGrants(discoveredGrants, source, job)
      
      // Update job as completed
      await this.updateCrawlJob(job.id, {
        status: 'completed',
        completed_at: new Date(),
        progress: 100,
        stats: job.stats
      })
      
      await this.addLog(job.id, 'info', `Crawl completed successfully. Discovered ${job.stats.grantsDiscovered} grants`)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Update job as failed
      await this.updateCrawlJob(job.id, {
        status: 'failed',
        completed_at: new Date(),
        error_message: errorMessage
      })
      
      await this.addLog(job.id, 'error', `Crawl failed: ${errorMessage}`)
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
    await this.addLog(job.id, 'info', 'Processing documents (PDFs, DOCX)')
    
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
        await this.addLog(job.id, 'warning', `Failed to process document: ${error}`, docUrl)
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
      await this.addLog(job.id, 'info', `Extracted ${additionalGrants.length} grants from PDF`, url)
    }
  }

  private async processDocxDocument(url: string, job: CrawlJob) {
    // Similar to PDF processing but for DOCX files
    await this.addLog(job.id, 'info', 'Processing DOCX document', url)
    // Implementation would depend on Firecrawl's DOCX support
  }

  private async saveDiscoveredGrants(grants: DiscoveredGrant[], source: GrantSource, job: CrawlJob) {
    logger.info(`Saving ${grants.length} discovered grants for source ${source.name}`)
    
    for (const grant of grants) {
      try {
        await db.query(`
          INSERT INTO discovered_grants (
            source_id, job_id, external_id, title, description, provider, url,
            amount_text, amount_min, amount_max, currency, deadline, deadline_text,
            categories, location_restrictions, document_urls, eligibility_text,
            eligibility_criteria, confidence_score, processing_status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          ON CONFLICT (source_id, external_id) 
          DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            deadline = EXCLUDED.deadline,
            amount_min = EXCLUDED.amount_min,
            amount_max = EXCLUDED.amount_max,
            updated_at = NOW()
        `, [
          source.id,
          job.id,
          grant.id || grant.sourceUrl || grant.title,
          grant.title,
          grant.description,
          grant.provider,
          grant.sourceUrl,
          grant.amount?.description || '',
          grant.amount?.min,
          grant.amount?.max,
          grant.amount?.currency || 'EUR',
          grant.deadline,
          grant.deadline ? grant.deadline.toISOString() : null,
          grant.category ? [grant.category] : [],
          grant.location ? [grant.location] : [],
          grant.documentUrls || [],
          grant.eligibility?.map(e => e.description).join('; ') || '',
          JSON.stringify(grant.eligibility || []),
          grant.eligibilityScore || 0.5,
          'pending'
        ])
        
        logger.debug('Saved discovered grant', {
          title: grant.title,
          provider: grant.provider,
          source: source.name
        })
      } catch (error) {
        logger.error('Failed to save discovered grant', {
          title: grant.title,
          error,
          source: source.name
        })
      }
    }
  }

  private async addLog(jobId: string, level: 'info' | 'warning' | 'error', message: string, url?: string) {
    try {
      await db.query(`
        INSERT INTO crawl_logs (job_id, level, message, url)
        VALUES ($1, $2, $3, $4)
      `, [jobId, level, message, url])
      
      logger[level](message, { jobId, url })
    } catch (error) {
      logger.error('Failed to save crawl log', { jobId, level, message, error })
    }
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

  // Database operations
  private async createCrawlJob(jobData: any): Promise<CrawlJob> {
    const result = await db.query(`
      INSERT INTO crawl_jobs (id, source_id, status, progress, started_at, stats)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      jobData.id,
      jobData.source_id,
      jobData.status,
      jobData.progress,
      jobData.started_at,
      JSON.stringify(jobData.stats)
    ])
    
    return result.rows[0]
  }

  private async updateCrawlJob(jobId: string, updates: any): Promise<void> {
    const updateFields = []
    const values = [jobId]
    let paramIndex = 2

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'stats') {
        updateFields.push(`${key} = $${paramIndex}`)
        values.push(JSON.stringify(value))
      } else {
        updateFields.push(`${key} = $${paramIndex}`)
        values.push(value as string)
      }
      paramIndex++
    }

    if (updateFields.length > 0) {
      updateFields.push(`updated_at = NOW()`)
      const query = `UPDATE crawl_jobs SET ${updateFields.join(', ')} WHERE id = $1`
      await db.query(query, values)
    }
  }

  private async updateCrawlJobProgress(jobId: string, progress: number, stats: any): Promise<void> {
    await db.query(`
      UPDATE crawl_jobs SET progress = $2, stats = $3, updated_at = NOW()
      WHERE id = $1
    `, [jobId, progress, JSON.stringify(stats)])
  }

  // Public methods for external access
  async getCrawlJob(jobId: string): Promise<CrawlJob | null> {
    const result = await db.query('SELECT * FROM crawl_jobs WHERE id = $1', [jobId])
    return result.rows[0] || null
  }

  async getCrawlLogs(jobId: string): Promise<CrawlLog[]> {
    const result = await db.query(
      'SELECT * FROM crawl_logs WHERE job_id = $1 ORDER BY timestamp ASC',
      [jobId]
    )
    return result.rows
  }

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

  async getGrantSources(): Promise<GrantSource[]> {
    const result = await db.query(
      'SELECT * FROM grant_sources WHERE is_active = true ORDER BY name'
    )
    return result.rows
  }

  async getGrantSourceById(id: string): Promise<GrantSource | null> {
    const result = await db.query('SELECT * FROM grant_sources WHERE id = $1', [id])
    return result.rows[0] || null
  }
}