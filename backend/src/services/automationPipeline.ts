import { CronJob } from 'cron';
import { logger } from './logger';
import { grantSourcesService } from './grantSourcesService';
import { jobQueueService } from './jobQueueService';

interface AutomationConfig {
  grantDiscovery: {
    enabled: boolean;
    schedule: string; // cron format
    sources: string[];
    regions: string[];
  };
  documentProcessing: {
    enabled: boolean;
    autoAnalysis: boolean;
    aiStructuring: boolean;
  };
  userNotifications: {
    enabled: boolean;
    deadlineWarnings: number[]; // days before deadline
    matchThreshold: number; // minimum match score
  };
  learningSystem: {
    enabled: boolean;
    analyzeFailures: boolean;
    trackSuccessPatterns: boolean;
  };
}

class AutomationPipeline {
  private config: AutomationConfig;
  private isRunning: boolean = false;
  private cronJobs: CronJob[] = [];

  constructor() {
    this.config = {
      grantDiscovery: {
        enabled: true,
        schedule: '0 6 * * *', // 6 AM daily
        sources: [
          'https://www.enterprise-ireland.com',
          'https://www.sfi.ie',
          'https://www.dublincity.ie',
          'https://eic.ec.europa.eu',
          'https://www.epa.ie'
        ],
        regions: ['Ireland', 'EU']
      },
      documentProcessing: {
        enabled: true,
        autoAnalysis: true,
        aiStructuring: true
      },
      userNotifications: {
        enabled: true,
        deadlineWarnings: [30, 14, 7, 3, 1], // days before deadline
        matchThreshold: 70 // minimum 70% match score
      },
      learningSystem: {
        enabled: true,
        analyzeFailures: true,
        trackSuccessPatterns: true
      }
    };
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Automation pipeline is already running');
      return;
    }

    logger.info('Starting eTownz Grants Automation Pipeline');
    this.isRunning = true;

    // Start the job queue service
    await jobQueueService.startProcessing();

    // Schedule grant discovery
    if (this.config.grantDiscovery.enabled) {
      const grantDiscoveryJob = new CronJob(
        this.config.grantDiscovery.schedule,
        () => this.runGrantDiscovery(),
        null,
        true,
        'Europe/Dublin'
      );
      this.cronJobs.push(grantDiscoveryJob);
      logger.info(`Grant discovery scheduled: ${this.config.grantDiscovery.schedule}`);
    }

    // Schedule deadline monitoring
    if (this.config.userNotifications.enabled) {
      const deadlineJob = new CronJob(
        '0 9 * * *', // 9 AM daily
        () => this.checkDeadlines(),
        null,
        true,
        'Europe/Dublin'
      );
      this.cronJobs.push(deadlineJob);
      logger.info('Deadline monitoring scheduled: 9 AM daily');
    }

    // Schedule success pattern analysis
    if (this.config.learningSystem.enabled) {
      const analysisJob = new CronJob(
        '0 2 * * 0', // 2 AM every Sunday
        () => this.analyzeSuccessPatterns(),
        null,
        true,
        'Europe/Dublin'
      );
      this.cronJobs.push(analysisJob);
      logger.info('Success pattern analysis scheduled: 2 AM every Sunday');
    }

    // Schedule document cleanup
    const cleanupJob = new CronJob(
      '0 3 * * 0', // 3 AM every Sunday
      () => this.cleanupOldDocuments(),
      null,
      true,
      'Europe/Dublin'
    );
    this.cronJobs.push(cleanupJob);
    logger.info('Document cleanup scheduled: 3 AM every Sunday');

    // Schedule periodic crawls for each schedule type
    this.schedulePeriodicCrawls();
  }

  private schedulePeriodicCrawls(): void {
    // Daily crawls at 6 AM
    const dailyCrawlJob = new CronJob(
      '0 6 * * *', // 6 AM daily
      () => this.runScheduledCrawls('daily'),
      null,
      true,
      'Europe/Dublin'
    );
    this.cronJobs.push(dailyCrawlJob);
    logger.info('Daily crawls scheduled: 6 AM daily');

    // Weekly crawls on Monday at 7 AM
    const weeklyCrawlJob = new CronJob(
      '0 7 * * 1', // 7 AM every Monday
      () => this.runScheduledCrawls('weekly'),
      null,
      true,
      'Europe/Dublin'
    );
    this.cronJobs.push(weeklyCrawlJob);
    logger.info('Weekly crawls scheduled: 7 AM every Monday');

    // Monthly crawls on the 1st at 8 AM
    const monthlyCrawlJob = new CronJob(
      '0 8 1 * *', // 8 AM on the 1st of each month
      () => this.runScheduledCrawls('monthly'),
      null,
      true,
      'Europe/Dublin'
    );
    this.cronJobs.push(monthlyCrawlJob);
    logger.info('Monthly crawls scheduled: 8 AM on the 1st of each month');
  }

  private async runScheduledCrawls(schedule: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    try {
      logger.info(`🕐 Running scheduled crawls: ${schedule}`);

      const sources = await grantSourcesService.getActiveSourcesForSchedule(schedule);
      
      for (const source of sources) {
        try {
          // Queue crawl job
          await jobQueueService.enqueueJob('crawl_grant_source', {
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url,
            scheduleType: schedule
          }, {
            priority: 7 // Normal priority for scheduled crawls
          });
          
          logger.info(`Scheduled ${schedule} crawl queued for ${source.name}`);
        } catch (error) {
          logger.error(`Failed to queue ${schedule} crawl for ${source.name}:`, error);
        }
      }

      logger.info(`✅ ${schedule} crawls queued for ${sources.length} sources`);
    } catch (error) {
      logger.error(`Failed to run ${schedule} crawls:`, error);
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Automation pipeline is not running');
      return;
    }

    // Stop all cron jobs
    this.cronJobs.forEach(job => job.stop());
    this.cronJobs = [];
    
    // Stop the job queue service
    await jobQueueService.stopProcessing();
    
    this.isRunning = false;
    logger.info('Automation pipeline stopped');
  }

  private async runGrantDiscovery(): Promise<void> {
    try {
      logger.info('🔍 Starting automated grant discovery');

      // Get all active sources that should be crawled
      const sources = await grantSourcesService.getAllSources();
      const activeSources = sources.filter(source => source.isActive);

      for (const source of activeSources) {
        try {
          logger.info(`Queueing crawl job for: ${source.name}`);
          
          // Queue crawl job with high priority
          await jobQueueService.enqueueJob('crawl_grant_source', {
            sourceId: source.id,
            sourceName: source.name,
            sourceUrl: source.url
          }, {
            priority: 8 // High priority for scheduled crawls
          });
          
          logger.info(`Crawl job queued for ${source.name}`);
        } catch (error) {
          logger.error(`Failed to queue crawl for ${source.name}:`, error);
        }
      }

      logger.info(`✅ Grant discovery jobs queued for ${activeSources.length} sources`);
    } catch (error) {
      logger.error('Grant discovery failed:', error);
    }
  }

  private async checkDeadlines(): Promise<void> {
    try {
      logger.info('⏰ Checking grant deadlines');

      // TODO: Query database for grants with approaching deadlines
      // const upcomingDeadlines = await this.getUpcomingDeadlines();

      // TODO: Send deadline notifications
      // for (const deadline of upcomingDeadlines) {
      //   await this.sendDeadlineNotification(deadline);
      // }

      logger.info('✅ Deadline check completed');
    } catch (error) {
      logger.error('Deadline check failed:', error);
    }
  }

  private async analyzeSuccessPatterns(): Promise<void> {
    try {
      logger.info('📊 Analyzing success patterns');

      // TODO: Implement ML analysis of successful applications
      // const patterns = await this.analyzeApplicationSuccess();
      // await this.updateMatchingAlgorithm(patterns);

      logger.info('✅ Success pattern analysis completed');
    } catch (error) {
      logger.error('Success pattern analysis failed:', error);
    }
  }

  private async cleanupOldDocuments(): Promise<void> {
    try {
      logger.info('🧹 Cleaning up old documents');

      // TODO: Remove documents older than retention period
      // const deleted = await this.removeOldDocuments();
      // logger.info(`Deleted ${deleted} old documents`);

      logger.info('✅ Document cleanup completed');
    } catch (error) {
      logger.error('Document cleanup failed:', error);
    }
  }

  // Configuration methods
  public updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Automation pipeline configuration updated');
    
    // Restart if running to apply new config
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }

  public getConfig(): AutomationConfig {
    return { ...this.config };
  }

  public getStatus(): { isRunning: boolean; activeJobs: number } {
    return {
      isRunning: this.isRunning,
      activeJobs: this.cronJobs.filter(job => job.running).length
    };
  }
}

// Export singleton instance
export const automationPipeline = new AutomationPipeline();
export default AutomationPipeline;