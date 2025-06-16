import { DatabaseService } from './database';
import { logger } from './logger';

export interface GrantSource {
  id: string;
  name: string;
  url: string;
  description?: string;
  category?: 'government' | 'private' | 'eu' | 'international' | 'academic' | 'foundation' | 'other';
  location?: string;
  isActive: boolean;
  lastCrawled?: Date;
  crawlSettings: {
    depth?: number;
    followPdfs?: boolean;
    followDocx?: boolean;
    includePatterns?: string[];
    excludePatterns?: string[];
  };
  crawlSchedule: 'manual' | 'daily' | 'weekly' | 'monthly';
  successCount: number;
  failureCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CrawlMonitoringRecord {
  id: string;
  sourceId: string;
  jobId?: string;
  status: 'started' | 'completed' | 'failed' | 'timeout';
  grantsFound: number;
  pagesCrawled: number;
  durationSeconds?: number;
  errorType?: string;
  errorMessage?: string;
  startedAt: Date;
  completedAt?: Date;
}

class GrantSourcesService {
  private db = DatabaseService.getInstance();

  async getAllSources(): Promise<GrantSource[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          id, name, url,
          is_active as "isActive", last_crawled as "lastCrawled",
          crawl_settings as "crawlSettings", crawl_schedule as "crawlSchedule",
          success_count as "successCount", failure_count as "failureCount",
          last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
        FROM grant_sources 
        ORDER BY created_at DESC
      `);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch grant sources', { error });
      throw error;
    }
  }

  async getActiveSourcesForSchedule(schedule: string): Promise<GrantSource[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          id, name, url,
          is_active as "isActive", last_crawled as "lastCrawled",
          crawl_settings as "crawlSettings", crawl_schedule as "crawlSchedule",
          success_count as "successCount", failure_count as "failureCount",
          last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
        FROM grant_sources 
        WHERE is_active = true AND crawl_schedule = $1
        ORDER BY last_crawled ASC NULLS FIRST
      `, [schedule]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch active sources for schedule', { schedule, error });
      throw error;
    }
  }

  async getSourceById(id: string): Promise<GrantSource | null> {
    try {
      const result = await this.db.query(`
        SELECT 
          id, name, url,
          is_active as "isActive", last_crawled as "lastCrawled",
          crawl_settings as "crawlSettings", crawl_schedule as "crawlSchedule",
          success_count as "successCount", failure_count as "failureCount",
          last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
        FROM grant_sources 
        WHERE id = $1
      `, [id]);
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch grant source by ID', { id, error });
      throw error;
    }
  }

  async createSource(source: Omit<GrantSource, 'id' | 'createdAt' | 'updatedAt' | 'successCount' | 'failureCount' | 'lastError' | 'description' | 'category' | 'location'>): Promise<string> {
    try {
      const result = await this.db.query(`
        INSERT INTO grant_sources (
          name, url, is_active, crawl_settings, crawl_schedule
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [
        source.name, source.url, source.isActive, 
        JSON.stringify(source.crawlSettings), source.crawlSchedule
      ]);
      
      logger.info('Created new grant source', { 
        sourceId: result.rows[0].id, 
        name: source.name, 
        url: source.url 
      });
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to create grant source', { source, error });
      throw error;
    }
  }

  async updateSource(id: string, updates: Partial<GrantSource>): Promise<GrantSource | null> {
    try {
      const setParts: string[] = [];
      const values: any[] = [];
      let valueIndex = 1;

      if (updates.name !== undefined) {
        setParts.push(`name = $${valueIndex++}`);
        values.push(updates.name);
      }
      if (updates.url !== undefined) {
        setParts.push(`url = $${valueIndex++}`);
        values.push(updates.url);
      }
      // Skip description, category, location as they don't exist in current schema
      if (updates.isActive !== undefined) {
        setParts.push(`is_active = $${valueIndex++}`);
        values.push(updates.isActive);
      }
      if (updates.crawlSettings !== undefined) {
        setParts.push(`crawl_settings = $${valueIndex++}`);
        values.push(JSON.stringify(updates.crawlSettings));
      }
      if (updates.crawlSchedule !== undefined) {
        setParts.push(`crawl_schedule = $${valueIndex++}`);
        values.push(updates.crawlSchedule);
      }

      if (setParts.length === 0) {
        return this.getSourceById(id);
      }

      values.push(id);
      
      const result = await this.db.query(`
        UPDATE grant_sources 
        SET ${setParts.join(', ')}
        WHERE id = $${valueIndex}
        RETURNING 
          id, name, url,
          is_active as "isActive", last_crawled as "lastCrawled",
          crawl_settings as "crawlSettings", crawl_schedule as "crawlSchedule",
          success_count as "successCount", failure_count as "failureCount",
          last_error as "lastError", created_at as "createdAt", updated_at as "updatedAt"
      `, values);
      
      if (result.rows[0]) {
        logger.info('Updated grant source', { sourceId: id, updates });
      }
      
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to update grant source', { id, updates, error });
      throw error;
    }
  }

  async deleteSource(id: string): Promise<boolean> {
    try {
      const result = await this.db.query(`
        DELETE FROM grant_sources WHERE id = $1
      `, [id]);
      
      const deleted = (result.rowCount || 0) > 0;
      if (deleted) {
        logger.info('Deleted grant source', { sourceId: id });
      }
      
      return deleted;
    } catch (error) {
      logger.error('Failed to delete grant source', { id, error });
      throw error;
    }
  }

  async recordCrawlStart(sourceId: string, jobId?: string): Promise<string> {
    try {
      const result = await this.db.query(`
        INSERT INTO crawl_monitoring (source_id, job_id, status, started_at)
        VALUES ($1, $2, 'started', NOW())
        RETURNING id
      `, [sourceId, jobId]);
      
      return result.rows[0].id;
    } catch (error) {
      logger.error('Failed to record crawl start', { sourceId, jobId, error });
      throw error;
    }
  }

  async recordCrawlCompletion(
    monitoringId: string, 
    status: 'completed' | 'failed' | 'timeout',
    stats: {
      grantsFound?: number;
      pagesCrawled?: number;
      durationSeconds?: number;
      errorType?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      await this.db.query(`
        UPDATE crawl_monitoring 
        SET 
          status = $1,
          grants_found = $2,
          pages_crawled = $3,
          duration_seconds = $4,
          error_type = $5,
          error_message = $6,
          completed_at = NOW()
        WHERE id = $7
      `, [
        status,
        stats.grantsFound || 0,
        stats.pagesCrawled || 0,
        stats.durationSeconds,
        stats.errorType,
        stats.errorMessage,
        monitoringId
      ]);

      // Update source success/failure counts
      if (status === 'completed') {
        await this.db.query(`
          UPDATE grant_sources 
          SET 
            success_count = success_count + 1,
            last_crawled = NOW(),
            last_error = NULL
          WHERE id = (
            SELECT source_id FROM crawl_monitoring WHERE id = $1
          )
        `, [monitoringId]);
      } else {
        await this.db.query(`
          UPDATE grant_sources 
          SET 
            failure_count = failure_count + 1,
            last_error = $2
          WHERE id = (
            SELECT source_id FROM crawl_monitoring WHERE id = $1
          )
        `, [monitoringId, stats.errorMessage || 'Unknown error']);
      }

      logger.info('Recorded crawl completion', { 
        monitoringId, 
        status, 
        stats 
      });
    } catch (error) {
      logger.error('Failed to record crawl completion', { 
        monitoringId, 
        status, 
        stats, 
        error 
      });
      throw error;
    }
  }

  async getRecentCrawlFailures(limit: number = 10): Promise<CrawlMonitoringRecord[]> {
    try {
      const result = await this.db.query(`
        SELECT 
          cm.id, cm.source_id as "sourceId", cm.job_id as "jobId",
          cm.status, cm.grants_found as "grantsFound", 
          cm.pages_crawled as "pagesCrawled", cm.duration_seconds as "durationSeconds",
          cm.error_type as "errorType", cm.error_message as "errorMessage",
          cm.started_at as "startedAt", cm.completed_at as "completedAt",
          gs.name as "sourceName", gs.url as "sourceUrl"
        FROM crawl_monitoring cm
        JOIN grant_sources gs ON cm.source_id = gs.id
        WHERE cm.status IN ('failed', 'timeout')
        ORDER BY cm.started_at DESC
        LIMIT $1
      `, [limit]);
      
      return result.rows;
    } catch (error) {
      logger.error('Failed to fetch recent crawl failures', { limit, error });
      throw error;
    }
  }

  async getCrawlStats(sourceId?: string): Promise<any> {
    try {
      const whereClause = sourceId ? 'WHERE cm.source_id = $1' : '';
      const params = sourceId ? [sourceId] : [];
      
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total_crawls,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_crawls,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_crawls,
          COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_crawls,
          AVG(duration_seconds) as avg_duration_seconds,
          SUM(grants_found) as total_grants_found
        FROM crawl_monitoring cm
        ${whereClause}
      `, params);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch crawl stats', { sourceId, error });
      throw error;
    }
  }

  async getSourceMetrics(): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active,
          COUNT(CASE WHEN crawl_schedule != 'manual' THEN 1 END) as scheduled,
          COUNT(CASE WHEN crawl_schedule = 'manual' THEN 1 END) as manual
        FROM grant_sources
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch source metrics', { error });
      throw error;
    }
  }

  async getPerformanceMetrics(): Promise<any> {
    try {
      const result = await this.db.query(`
        SELECT 
          COALESCE(
            CAST(COUNT(CASE WHEN cm.status = 'completed' THEN 1 END) AS FLOAT) / 
            NULLIF(COUNT(*), 0) * 100, 0
          ) as success_rate,
          COALESCE(AVG(cm.duration_seconds), 0) as avg_crawl_duration,
          COALESCE(SUM(cm.grants_found), 0) as total_grants_found,
          COUNT(DISTINCT CASE 
            WHEN gs.failure_count > gs.success_count 
            OR gs.last_error IS NOT NULL 
            THEN gs.id 
          END) as sources_needing_attention
        FROM grant_sources gs
        LEFT JOIN crawl_monitoring cm ON gs.id = cm.source_id
        WHERE cm.started_at > NOW() - INTERVAL '7 days' OR cm.started_at IS NULL
      `);
      
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to fetch performance metrics', { error });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1 FROM grant_sources LIMIT 1');
      return true;
    } catch (error) {
      logger.error('Grant sources health check failed', { error });
      return false;
    }
  }
}

export const grantSourcesService = new GrantSourcesService();
export default GrantSourcesService;