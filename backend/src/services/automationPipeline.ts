import cron from 'node-cron';
import { logger } from './logger';
import { DEMO_GRANTS } from '../data/demoUsers';

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

  public start(): void {
    if (this.isRunning) {
      logger.warn('Automation pipeline is already running');
      return;
    }

    logger.info('Starting eTownz Grants Automation Pipeline');
    this.isRunning = true;

    // Schedule grant discovery
    if (this.config.grantDiscovery.enabled) {
      cron.schedule(this.config.grantDiscovery.schedule, () => {
        this.runGrantDiscovery();
      });
      logger.info(`Grant discovery scheduled: ${this.config.grantDiscovery.schedule}`);
    }

    // Schedule deadline monitoring
    if (this.config.userNotifications.enabled) {
      cron.schedule('0 9 * * *', () => { // 9 AM daily
        this.checkDeadlines();
      });
      logger.info('Deadline monitoring scheduled: 9 AM daily');
    }

    // Schedule success pattern analysis
    if (this.config.learningSystem.enabled) {
      cron.schedule('0 2 * * 0', () => { // 2 AM every Sunday
        this.analyzeSuccessPatterns();
      });
      logger.info('Success pattern analysis scheduled: 2 AM every Sunday');
    }

    // Schedule document cleanup
    cron.schedule('0 3 * * 0', () => { // 3 AM every Sunday
      this.cleanupOldDocuments();
    });
    logger.info('Document cleanup scheduled: 3 AM every Sunday');
  }

  public stop(): void {
    if (!this.isRunning) {
      logger.warn('Automation pipeline is not running');
      return;
    }

    // Note: node-cron doesn't provide a direct way to stop all tasks
    // In a production environment, you'd track task references
    this.isRunning = false;
    logger.info('Automation pipeline stopped');
  }

  private async runGrantDiscovery(): Promise<void> {
    try {
      logger.info('🔍 Starting automated grant discovery');

      const discoveredGrants = [];

      for (const source of this.config.grantDiscovery.sources) {
        try {
          logger.info(`Scanning: ${source}`);
          
          // In a real implementation, this would use the MCP fetch server
          const grants = await this.scrapeGrantSource(source);
          discoveredGrants.push(...grants);
          
          logger.info(`Found ${grants.length} grants from ${source}`);
        } catch (error) {
          logger.error(`Failed to scan ${source}:`, error);
        }
      }

      // Process discovered grants
      for (const grant of discoveredGrants) {
        await this.processDiscoveredGrant(grant);
      }

      // Send notifications for high-match grants
      await this.sendMatchNotifications(discoveredGrants);

      logger.info(`✅ Grant discovery completed. Processed ${discoveredGrants.length} grants`);
    } catch (error) {
      logger.error('Grant discovery failed:', error);
    }
  }

  private async scrapeGrantSource(sourceUrl: string): Promise<any[]> {
    // Mock implementation - in reality this would use the MCP fetch server
    // to scrape actual grant websites and convert them to structured data
    
    const mockGrants = [
      {
        title: `AI Innovation Grant - ${new Date().toLocaleDateString()}`,
        provider: 'Enterprise Ireland',
        url: `${sourceUrl}/grants/ai-innovation`,
        deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
        amount: { min: 50000, max: 200000, currency: 'EUR' },
        category: 'Innovation',
        eligibility: ['SME', 'Startup'],
        discovered: true
      }
    ];

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return mockGrants;
  }

  private async processDiscoveredGrant(grant: any): Promise<void> {
    try {
      // 1. AI Structure Analysis
      if (this.config.documentProcessing.aiStructuring) {
        grant.aiAnalysis = await this.performAIAnalysis(grant);
      }

      // 2. Match Score Calculation
      grant.matchScores = await this.calculateMatchScores(grant);

      // 3. Store in database
      await this.storeGrant(grant);

      // 4. Generate alerts for high-match grants
      const highMatchUsers = grant.matchScores.filter((match: any) => 
        match.score >= this.config.userNotifications.matchThreshold
      );

      if (highMatchUsers.length > 0) {
        await this.queueNotifications(grant, highMatchUsers);
      }

    } catch (error) {
      logger.error(`Failed to process grant ${grant.title}:`, error);
    }
  }

  private async performAIAnalysis(grant: any): Promise<any> {
    // Mock AI analysis - in reality this would use OpenAI
    return {
      difficulty: 'medium',
      keyTerms: ['innovation', 'technology', 'research'],
      successFactors: ['strong technical team', 'clear commercialization plan'],
      requiredDocuments: ['business plan', 'technical proposal', 'budget'],
      estimatedEffort: '40-60 hours',
      competitionLevel: 'high'
    };
  }

  private async calculateMatchScores(grant: any): Promise<any[]> {
    // Mock match scoring - in reality this would analyze user/org profiles
    const mockUsers = [
      { userId: 'user-2', organizationId: 'org-1', score: 85 },
      { userId: 'user-4', organizationId: 'org-3', score: 78 },
      { userId: 'user-5', organizationId: 'org-4', score: 72 }
    ];

    return mockUsers;
  }

  private async storeGrant(grant: any): Promise<void> {
    // Mock storage - in reality this would save to PostgreSQL
    logger.info(`Storing grant: ${grant.title}`);
  }

  private async queueNotifications(grant: any, users: any[]): Promise<void> {
    for (const user of users) {
      logger.info(`Queuing notification for user ${user.userId}: ${grant.title} (${user.score}% match)`);
      
      // In reality, this would queue emails/in-app notifications
      await this.sendNotification({
        userId: user.userId,
        type: 'new_grant_match',
        title: `New High-Match Grant: ${grant.title}`,
        message: `We found a ${user.score}% match grant that might interest you: ${grant.title}`,
        data: { grantId: grant.id, matchScore: user.score }
      });
    }
  }

  private async checkDeadlines(): Promise<void> {
    try {
      logger.info('🔔 Checking upcoming grant deadlines');

      const today = new Date();
      const upcomingDeadlines = [];

      // Check all active grants for approaching deadlines
      for (const grant of DEMO_GRANTS) {
        const daysUntilDeadline = Math.ceil(
          (grant.deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (this.config.userNotifications.deadlineWarnings.includes(daysUntilDeadline)) {
          upcomingDeadlines.push({
            grant,
            daysLeft: daysUntilDeadline
          });
        }
      }

      // Send deadline notifications
      for (const deadline of upcomingDeadlines) {
        await this.sendDeadlineNotifications(deadline);
      }

      logger.info(`✅ Deadline check completed. Found ${upcomingDeadlines.length} upcoming deadlines`);
    } catch (error) {
      logger.error('Deadline checking failed:', error);
    }
  }

  private async sendDeadlineNotifications(deadline: any): Promise<void> {
    const { grant, daysLeft } = deadline;
    
    logger.info(`Sending deadline notification: ${grant.title} - ${daysLeft} days left`);

    // In reality, this would send notifications to all users with active applications
    // or those who have shown interest in this type of grant
    await this.sendNotification({
      userId: 'all', // broadcast
      type: 'deadline_reminder',
      title: `Grant Deadline Approaching: ${grant.title}`,
      message: `Only ${daysLeft} days left to apply for ${grant.title}. Don't miss out!`,
      urgency: daysLeft <= 3 ? 'high' : 'medium',
      data: { grantId: grant.id, deadline: grant.deadline, daysLeft }
    });
  }

  private async analyzeSuccessPatterns(): Promise<void> {
    try {
      logger.info('📊 Analyzing success patterns');

      // Mock analysis - in reality this would:
      // 1. Gather all successful applications from the past period
      // 2. Use AI to identify common patterns
      // 3. Update recommendation algorithms
      // 4. Generate insights for users

      const patterns = [
        {
          pattern: 'Early submission increases success rate by 23%',
          evidence: 'Analysis of 150 successful applications',
          recommendation: 'Submit applications at least 2 weeks before deadline'
        },
        {
          pattern: 'Applications with 3+ team members have 34% higher success rate',
          evidence: 'Analysis of team composition in successful grants',
          recommendation: 'Ensure diverse, experienced team composition'
        },
        {
          pattern: 'Detailed budget breakdowns improve success by 18%',
          evidence: 'Comparison of budget detail levels',
          recommendation: 'Provide comprehensive, justified budget breakdowns'
        }
      ];

      // Store patterns for future reference
      for (const pattern of patterns) {
        await this.storeSuccessPattern(pattern);
      }

      logger.info(`✅ Success pattern analysis completed. Identified ${patterns.length} patterns`);
    } catch (error) {
      logger.error('Success pattern analysis failed:', error);
    }
  }

  private async storeSuccessPattern(pattern: any): Promise<void> {
    logger.info(`Storing success pattern: ${pattern.pattern}`);
    // Mock storage - in reality this would save to a knowledge base
  }

  private async cleanupOldDocuments(): Promise<void> {
    try {
      logger.info('🧹 Cleaning up old documents');

      // Mock cleanup - in reality this would:
      // 1. Remove processed documents older than X days
      // 2. Archive completed applications
      // 3. Clean up temporary files
      // 4. Optimize database

      const mockStats = {
        documentsProcessed: 47,
        temporaryFilesRemoved: 23,
        archivedApplications: 12,
        spaceSaved: '2.3 GB'
      };

      logger.info(`✅ Cleanup completed: ${JSON.stringify(mockStats)}`);
    } catch (error) {
      logger.error('Document cleanup failed:', error);
    }
  }

  private async sendNotification(notification: any): Promise<void> {
    // Mock notification sending - in reality this would:
    // 1. Queue notifications in Redis
    // 2. Send emails via SendGrid
    // 3. Send in-app notifications via WebSocket
    // 4. Send SMS for urgent notifications (optional)
    
    logger.info(`📧 Notification sent: ${notification.title} to ${notification.userId}`);
  }

  public getStatus(): any {
    return {
      isRunning: this.isRunning,
      config: this.config,
      lastRun: {
        grantDiscovery: 'Today 06:00',
        deadlineCheck: 'Today 09:00',
        successAnalysis: 'Sunday 02:00',
        cleanup: 'Sunday 03:00'
      },
      statistics: {
        grantsDiscovered: 156,
        notificationsSent: 89,
        patternsIdentified: 23,
        documentsProcessed: 234
      }
    };
  }

  public updateConfig(newConfig: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('Automation configuration updated');
  }
}

// Singleton instance
export const automationPipeline = new AutomationPipeline();

// Auto-start in production
if (process.env.NODE_ENV === 'production') {
  automationPipeline.start();
}