import { pool } from '../config/database';
import { logger } from './logger';
import { EventEmitter } from 'events';

export interface Job {
  id: string;
  jobType: string;
  jobData: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retry';
  priority: number;
  scheduledAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  updatedAt: Date;
}

export type JobHandler = (job: Job) => Promise<void>;

class JobQueueService extends EventEmitter {
  private handlers: Map<string, JobHandler> = new Map();
  private isProcessing: boolean = false;
  private processingInterval?: NodeJS.Timeout;
  private readonly PROCESSING_INTERVAL = 5000; // 5 seconds
  private readonly BATCH_SIZE = 10;

  constructor() {
    super();
    this.setupJobTypes();
  }

  private setupJobTypes(): void {
    // Register default job handlers
    this.registerHandler('crawl_grant_source', this.handleCrawlGrantSource.bind(this));
    this.registerHandler('send_deadline_notification', this.handleDeadlineNotification.bind(this));
    this.registerHandler('sync_to_vector_db', this.handleVectorDbSync.bind(this));
    this.registerHandler('cleanup_old_data', this.handleDataCleanup.bind(this));
  }

  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    logger.info(`Registered job handler for type: ${jobType}`);
  }

  async enqueueJob(
    jobType: string, 
    jobData: Record<string, any>, 
    options: {
      priority?: number;
      scheduledAt?: Date;
      maxRetries?: number;
    } = {}
  ): Promise<string> {
    try {
      const {
        priority = 5,
        scheduledAt = new Date(),
        maxRetries = 3
      } = options;

      const result = await pool.query(`
        INSERT INTO job_queue (
          job_type, job_data, priority, scheduled_at, max_retries
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `, [jobType, JSON.stringify(jobData), priority, scheduledAt, maxRetries]);

      const jobId = result.rows[0].id;
      logger.info('Enqueued job', { jobId, jobType, priority, scheduledAt });
      
      this.emit('jobEnqueued', { jobId, jobType, jobData });
      return jobId;
    } catch (error) {
      logger.error('Failed to enqueue job', { jobType, jobData, error });
      throw error;
    }
  }

  async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      logger.warn('Job queue processing is already running');
      return;
    }

    this.isProcessing = true;
    logger.info('Starting job queue processing');

    this.processingInterval = setInterval(() => {
      this.processJobs().catch(error => {
        logger.error('Error in job processing cycle', { error });
      });
    }, this.PROCESSING_INTERVAL);

    // Process immediately
    this.processJobs().catch(error => {
      logger.error('Error in initial job processing', { error });
    });
  }

  async stopProcessing(): Promise<void> {
    if (!this.isProcessing) {
      logger.warn('Job queue processing is not running');
      return;
    }

    this.isProcessing = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }

    logger.info('Stopped job queue processing');
  }

  private async processJobs(): Promise<void> {
    try {
      // Get pending jobs ordered by priority and scheduled time
      const result = await pool.query(`
        SELECT 
          id, job_type as "jobType", job_data as "jobData",
          status, priority, scheduled_at as "scheduledAt",
          started_at as "startedAt", completed_at as "completedAt",
          error_message as "errorMessage", retry_count as "retryCount",
          max_retries as "maxRetries", created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM job_queue
        WHERE status = 'pending' 
          AND scheduled_at <= NOW()
        ORDER BY priority DESC, scheduled_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `, [this.BATCH_SIZE]);

      const jobs: Job[] = result.rows;

      for (const job of jobs) {
        await this.processJob(job);
      }
    } catch (error) {
      logger.error('Error processing job batch', { error });
    }
  }

  private async processJob(job: Job): Promise<void> {
    const handler = this.handlers.get(job.jobType);
    if (!handler) {
      logger.error('No handler found for job type', { 
        jobId: job.id, 
        jobType: job.jobType 
      });
      await this.markJobFailed(job.id, 'No handler found for job type');
      return;
    }

    try {
      // Mark job as processing
      await this.updateJobStatus(job.id, 'processing');
      
      logger.info('Processing job', { 
        jobId: job.id, 
        jobType: job.jobType 
      });

      // Execute the job handler
      await handler(job);

      // Mark job as completed
      await this.updateJobStatus(job.id, 'completed');
      
      logger.info('Job completed successfully', { 
        jobId: job.id, 
        jobType: job.jobType 
      });

      this.emit('jobCompleted', job);
    } catch (error) {
      logger.error('Job failed', { 
        jobId: job.id, 
        jobType: job.jobType, 
        error 
      });

      // Check if we should retry
      if (job.retryCount < job.maxRetries) {
        await this.scheduleRetry(job);
      } else {
        await this.markJobFailed(job.id, error.message);
      }

      this.emit('jobFailed', { job, error });
    }
  }

  private async updateJobStatus(
    jobId: string, 
    status: Job['status'], 
    errorMessage?: string
  ): Promise<void> {
    try {
      let query = `
        UPDATE job_queue 
        SET status = $1, updated_at = NOW()
      `;
      const params = [status];

      if (status === 'processing') {
        query += `, started_at = NOW()`;
      } else if (status === 'completed') {
        query += `, completed_at = NOW()`;
      }

      if (errorMessage) {
        query += `, error_message = $${params.length + 1}`;
        params.push(errorMessage);
      }

      query += ` WHERE id = $${params.length + 1}`;
      params.push(jobId);

      await pool.query(query, params);
    } catch (error) {
      logger.error('Failed to update job status', { jobId, status, error });
    }
  }

  private async scheduleRetry(job: Job): Promise<void> {
    try {
      // Exponential backoff: 1 min, 5 min, 15 min
      const retryDelays = [60, 300, 900]; // seconds
      const delaySeconds = retryDelays[job.retryCount] || 900;
      const retryAt = new Date(Date.now() + delaySeconds * 1000);

      await pool.query(`
        UPDATE job_queue 
        SET 
          status = 'retry',
          retry_count = retry_count + 1,
          scheduled_at = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [retryAt, job.id]);

      logger.info('Scheduled job retry', { 
        jobId: job.id, 
        retryCount: job.retryCount + 1,
        retryAt 
      });
    } catch (error) {
      logger.error('Failed to schedule job retry', { jobId: job.id, error });
    }
  }

  private async markJobFailed(jobId: string, errorMessage: string): Promise<void> {
    await this.updateJobStatus(jobId, 'failed', errorMessage);
  }

  // Job handlers
  private async handleCrawlGrantSource(job: Job): Promise<void> {
    const { sourceId } = job.jobData;
    
    // This would integrate with the crawler service
    logger.info('Processing crawl job', { sourceId });
    
    // Import crawler service dynamically to avoid circular dependencies
    const { grantSourcesService } = await import('./grantSourcesService');
    const source = await grantSourcesService.getSourceById(sourceId);
    
    if (!source) {
      throw new Error(`Grant source not found: ${sourceId}`);
    }

    // Start monitoring
    const monitoringId = await grantSourcesService.recordCrawlStart(sourceId, job.id);
    
    try {
      // Here you would call the actual crawler
      // For now, we'll simulate the crawl
      await this.simulateCrawl(source.url);
      
      // Record successful completion
      await grantSourcesService.recordCrawlCompletion(monitoringId, 'completed', {
        grantsFound: 5, // This would be actual data from crawler
        pagesCrawled: 10,
        durationSeconds: 30
      });
    } catch (error) {
      // Record failure
      await grantSourcesService.recordCrawlCompletion(monitoringId, 'failed', {
        grantsFound: 0,
        pagesCrawled: 0,
        errorMessage: error.message
      });
      throw error;
    }
  }

  private async handleDeadlineNotification(job: Job): Promise<void> {
    const { userId, grantId, daysUntilDeadline } = job.jobData;
    
    logger.info('Processing deadline notification', { 
      userId, 
      grantId, 
      daysUntilDeadline 
    });
    
    // This would integrate with the notification service
    // For now, we'll just log it
    logger.info('Deadline notification sent', { userId, grantId });
  }

  private async handleVectorDbSync(job: Job): Promise<void> {
    const { entity, entityId } = job.jobData;
    
    logger.info('Processing vector DB sync', { entity, entityId });
    
    // This would integrate with the vector database service
    // Implementation would depend on what needs to be synced
  }

  private async handleDataCleanup(job: Job): Promise<void> {
    const { dataType, olderThanDays } = job.jobData;
    
    logger.info('Processing data cleanup', { dataType, olderThanDays });
    
    // This would clean up old data based on retention policies
  }

  private async simulateCrawl(url: string): Promise<void> {
    // Simulate crawl time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Randomly simulate success/failure for demo
    if (Math.random() < 0.1) {
      throw new Error('Simulated crawl failure');
    }
  }

  // Public methods for job management
  async getJobById(jobId: string): Promise<Job | null> {
    try {
      const result = await pool.query(`
        SELECT 
          id, job_type as "jobType", job_data as "jobData",
          status, priority, scheduled_at as "scheduledAt",
          started_at as "startedAt", completed_at as "completedAt",
          error_message as "errorMessage", retry_count as "retryCount",
          max_retries as "maxRetries", created_at as "createdAt", 
          updated_at as "updatedAt"
        FROM job_queue
        WHERE id = $1
      `, [jobId]);

      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to fetch job by ID', { jobId, error });
      throw error;
    }
  }

  async getJobStats(): Promise<any> {
    try {
      const result = await pool.query(`
        SELECT 
          status,
          COUNT(*) as count,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
        FROM job_queue
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY status
      `);

      return result.rows.reduce((stats, row) => {
        stats[row.status] = {
          count: parseInt(row.count),
          avgDurationSeconds: row.avg_duration_seconds ? parseFloat(row.avg_duration_seconds) : null
        };
        return stats;
      }, {});
    } catch (error) {
      logger.error('Failed to fetch job stats', { error });
      throw error;
    }
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const result = await pool.query(`
        UPDATE job_queue 
        SET status = 'failed', error_message = 'Cancelled by user', updated_at = NOW()
        WHERE id = $1 AND status = 'pending'
      `, [jobId]);

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to cancel job', { jobId, error });
      throw error;
    }
  }

  isRunning(): boolean {
    return this.isProcessing;
  }
}

export const jobQueueService = new JobQueueService();
export default JobQueueService;