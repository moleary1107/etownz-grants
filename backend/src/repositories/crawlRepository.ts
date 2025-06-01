import { BaseRepository } from '../services/database'

export interface GrantSource {
  id: string
  name: string
  url: string
  description?: string
  source_type?: string
  country?: string
  language?: string
  crawl_frequency?: string
  last_crawled_at?: Date
  next_crawl_at?: Date
  is_active?: boolean
  crawl_settings?: {
    depth: number
    includePatterns: string[]
    excludePatterns: string[]
    followPdfs: boolean
    followDocx: boolean
    respectRobotsTxt: boolean
  }
  created_at?: Date
  updated_at?: Date
}

export interface CrawlJob {
  id: string
  source_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  started_at?: Date
  completed_at?: Date
  error_message?: string
  stats: {
    pagesProcessed: number
    grantsDiscovered: number
    grantsUpdated: number
    documentsProcessed: number
  }
  created_at?: Date
  updated_at?: Date
}

export interface CrawlLog {
  id: string
  job_id: string
  level: 'info' | 'warning' | 'error'
  message: string
  url?: string
  metadata?: Record<string, any>
  timestamp: Date
}

export class CrawlRepository extends BaseRepository {

  // Grant Sources
  async findGrantSources(isActive?: boolean): Promise<GrantSource[]> {
    const conditions = isActive !== undefined ? { is_active: isActive } : {}
    return this.findMany<GrantSource>('grant_sources', conditions, 'name ASC')
  }

  async findGrantSourceById(id: string): Promise<GrantSource | null> {
    return this.findById<GrantSource>('grant_sources', id)
  }

  async findGrantSourceByUrl(url: string): Promise<GrantSource | null> {
    const result = await this.db.query(
      'SELECT * FROM grant_sources WHERE url = $1',
      [url]
    )
    return result.rows[0] || null
  }

  async createGrantSource(source: Omit<GrantSource, 'id' | 'created_at' | 'updated_at'>): Promise<GrantSource> {
    return this.create<GrantSource>('grant_sources', source)
  }

  async updateGrantSource(id: string, source: Partial<GrantSource>): Promise<GrantSource | null> {
    return this.update<GrantSource>('grant_sources', id, source)
  }

  async deleteGrantSource(id: string): Promise<boolean> {
    return this.delete('grant_sources', id)
  }

  async getSourcesDueForCrawling(): Promise<GrantSource[]> {
    const result = await this.db.query(`
      SELECT * FROM grant_sources 
      WHERE is_active = true 
      AND (next_crawl_at IS NULL OR next_crawl_at <= NOW())
      ORDER BY COALESCE(last_crawled_at, '1970-01-01'::timestamp) ASC
    `)
    return result.rows
  }

  async updateLastCrawled(sourceId: string, nextCrawlAt?: Date): Promise<void> {
    const query = nextCrawlAt
      ? 'UPDATE grant_sources SET last_crawled_at = NOW(), next_crawl_at = $2 WHERE id = $1'
      : 'UPDATE grant_sources SET last_crawled_at = NOW() WHERE id = $1'
    
    const params = nextCrawlAt ? [sourceId, nextCrawlAt] : [sourceId]
    await this.db.query(query, params)
  }

  // Crawl Jobs
  async findCrawlJobs(
    sourceId?: string,
    status?: string,
    limit?: number
  ): Promise<CrawlJob[]> {
    let query = 'SELECT * FROM crawl_jobs WHERE 1=1'
    const params: any[] = []
    let paramIndex = 1

    if (sourceId) {
      query += ` AND source_id = $${paramIndex}`
      params.push(sourceId)
      paramIndex++
    }

    if (status) {
      query += ` AND status = $${paramIndex}`
      params.push(status)
      paramIndex++
    }

    query += ' ORDER BY created_at DESC'

    if (limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(limit)
    }

    const result = await this.db.query(query, params)
    return result.rows
  }

  async findCrawlJobById(id: string): Promise<CrawlJob | null> {
    return this.findById<CrawlJob>('crawl_jobs', id)
  }

  async createCrawlJob(job: Omit<CrawlJob, 'created_at' | 'updated_at'>): Promise<CrawlJob> {
    return this.create<CrawlJob>('crawl_jobs', job)
  }

  async updateCrawlJob(id: string, job: Partial<CrawlJob>): Promise<CrawlJob | null> {
    return this.update<CrawlJob>('crawl_jobs', id, job)
  }

  async deleteCrawlJob(id: string): Promise<boolean> {
    return this.delete('crawl_jobs', id)
  }

  async updateJobProgress(id: string, progress: number, stats?: CrawlJob['stats']): Promise<void> {
    const updateData: any = { progress }
    if (stats) {
      updateData.stats = JSON.stringify(stats)
    }

    await this.update<CrawlJob>('crawl_jobs', id, updateData)
  }

  async markJobCompleted(id: string, stats: CrawlJob['stats']): Promise<void> {
    await this.db.query(`
      UPDATE crawl_jobs SET
        status = 'completed',
        progress = 100,
        completed_at = NOW(),
        stats = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [id, JSON.stringify(stats)])
  }

  async markJobFailed(id: string, errorMessage: string): Promise<void> {
    await this.db.query(`
      UPDATE crawl_jobs SET
        status = 'failed',
        completed_at = NOW(),
        error_message = $2,
        updated_at = NOW()
      WHERE id = $1
    `, [id, errorMessage])
  }

  async getRunningJobs(): Promise<CrawlJob[]> {
    return this.findMany<CrawlJob>('crawl_jobs', { status: 'running' })
  }

  async getJobsWithTimeout(timeoutMinutes: number = 30): Promise<CrawlJob[]> {
    const result = await this.db.query(`
      SELECT * FROM crawl_jobs 
      WHERE status = 'running' 
      AND started_at < NOW() - INTERVAL '${timeoutMinutes} minutes'
    `)
    return result.rows
  }

  // Crawl Logs
  async findCrawlLogs(
    jobId: string,
    level?: string,
    limit?: number
  ): Promise<CrawlLog[]> {
    let query = 'SELECT * FROM crawl_logs WHERE job_id = $1'
    const params: any[] = [jobId]
    let paramIndex = 2

    if (level) {
      query += ` AND level = $${paramIndex}`
      params.push(level)
      paramIndex++
    }

    query += ' ORDER BY timestamp DESC'

    if (limit) {
      query += ` LIMIT $${paramIndex}`
      params.push(limit)
    }

    const result = await this.db.query(query, params)
    return result.rows
  }

  async createCrawlLog(log: Omit<CrawlLog, 'id' | 'timestamp'>): Promise<CrawlLog> {
    return this.create<CrawlLog>('crawl_logs', log)
  }

  async addJobLog(
    jobId: string,
    level: 'info' | 'warning' | 'error',
    message: string,
    url?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.createCrawlLog({
      job_id: jobId,
      level,
      message,
      url,
      metadata
    })
  }

  async deleteOldLogs(daysOld: number = 30): Promise<number> {
    const result = await this.db.query(
      'DELETE FROM crawl_logs WHERE timestamp < NOW() - INTERVAL $1',
      [`${daysOld} days`]
    )
    return result.rowCount || 0
  }

  // Statistics and Analytics
  async getCrawlStats(): Promise<{
    totalSources: number
    activeSources: number
    totalJobs: number
    completedJobs: number
    failedJobs: number
    avgJobDuration: number
  }> {
    const result = await this.db.query(`
      SELECT 
        (SELECT COUNT(*) FROM grant_sources) as total_sources,
        (SELECT COUNT(*) FROM grant_sources WHERE is_active = true) as active_sources,
        (SELECT COUNT(*) FROM crawl_jobs) as total_jobs,
        (SELECT COUNT(*) FROM crawl_jobs WHERE status = 'completed') as completed_jobs,
        (SELECT COUNT(*) FROM crawl_jobs WHERE status = 'failed') as failed_jobs,
        (SELECT AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) 
         FROM crawl_jobs 
         WHERE status = 'completed' AND started_at IS NOT NULL AND completed_at IS NOT NULL
        ) as avg_job_duration
    `)

    return result.rows[0]
  }

  async getSourcePerformance(sourceId: string, days: number = 30): Promise<{
    total_jobs: number
    successful_jobs: number
    failed_jobs: number
    avg_grants_discovered: number
    last_successful_crawl: Date | null
  }> {
    const result = await this.db.query(`
      SELECT 
        COUNT(*) as total_jobs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_jobs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_jobs,
        AVG((stats->>'grantsDiscovered')::int) FILTER (WHERE status = 'completed') as avg_grants_discovered,
        MAX(completed_at) FILTER (WHERE status = 'completed') as last_successful_crawl
      FROM crawl_jobs 
      WHERE source_id = $1 
      AND created_at >= NOW() - INTERVAL '${days} days'
    `, [sourceId])

    return result.rows[0]
  }

  async getRecentJobActivity(hours: number = 24): Promise<CrawlJob[]> {
    const result = await this.db.query(`
      SELECT cj.*, gs.name as source_name
      FROM crawl_jobs cj
      JOIN grant_sources gs ON cj.source_id = gs.id
      WHERE cj.created_at >= NOW() - INTERVAL '${hours} hours'
      ORDER BY cj.created_at DESC
    `)

    return result.rows.map(row => ({
      ...row,
      source_name: row.source_name
    }))
  }
}