import express from 'express';
import { CronJob } from 'cron';
import dotenv from 'dotenv';
import { DeadlineReminderJob } from './jobs/deadlineReminders';
import { CrawlSchedulerJob } from './jobs/crawlScheduler';
import { UsageReportJob } from './jobs/usageReport';
import { logger } from './services/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9001;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'mcp-automation',
    timestamp: new Date().toISOString()
  });
});

// Manual job triggers
app.post('/jobs/deadline-reminders/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering deadline reminders...');
    await DeadlineReminderJob.execute();
    res.json({ message: 'Deadline reminders sent' });
  } catch (error) {
    logger.error('Deadline reminder job failed:', error);
    res.status(500).json({ error: 'Job failed' });
  }
});

app.post('/jobs/crawl/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering crawl scheduler...');
    await CrawlSchedulerJob.execute();
    res.json({ message: 'Crawl jobs scheduled' });
  } catch (error) {
    logger.error('Crawl scheduler job failed:', error);
    res.status(500).json({ error: 'Job failed' });
  }
});

app.post('/jobs/usage-report/trigger', async (req, res) => {
  try {
    logger.info('Manually triggering usage report...');
    await UsageReportJob.execute();
    res.json({ message: 'Usage reports generated' });
  } catch (error) {
    logger.error('Usage report job failed:', error);
    res.status(500).json({ error: 'Job failed' });
  }
});

// Job status
app.get('/jobs/status', (req, res) => {
  res.json({
    jobs: [
      {
        name: 'deadline-reminders',
        schedule: '0 9 * * *', // Daily at 9 AM
        lastRun: null,
        nextRun: deadlineReminderJob.nextDate()
      },
      {
        name: 'crawl-scheduler', 
        schedule: '0 2 * * *', // Daily at 2 AM
        lastRun: null,
        nextRun: crawlSchedulerJob.nextDate()
      },
      {
        name: 'usage-report',
        schedule: '0 0 1 * *', // Monthly on 1st
        lastRun: null,
        nextRun: usageReportJob.nextDate()
      }
    ]
  });
});

// Scheduled Jobs
const deadlineReminderJob = new CronJob('0 9 * * *', async () => {
  logger.info('Running scheduled deadline reminders...');
  try {
    await DeadlineReminderJob.execute();
  } catch (error) {
    logger.error('Scheduled deadline reminder job failed:', error);
  }
});

const crawlSchedulerJob = new CronJob('0 2 * * *', async () => {
  logger.info('Running scheduled crawl scheduler...');
  try {
    await CrawlSchedulerJob.execute();
  } catch (error) {
    logger.error('Scheduled crawl job failed:', error);
  }
});

const usageReportJob = new CronJob('0 0 1 * *', async () => {
  logger.info('Running scheduled usage report...');
  try {
    await UsageReportJob.execute();
  } catch (error) {
    logger.error('Scheduled usage report job failed:', error);
  }
});

// Start scheduled jobs
if (process.env.MCP_AUTOMATION_ENABLED === 'true') {
  deadlineReminderJob.start();
  crawlSchedulerJob.start();
  usageReportJob.start();
  
  logger.info('🤖 Automation jobs started');
} else {
  logger.info('🤖 Automation disabled (set MCP_AUTOMATION_ENABLED=true to enable)');
}

app.listen(PORT, () => {
  logger.info(`🤖 MCP Automation Server running on port ${PORT}`);
  logger.info(`⏰ Scheduled jobs: ${process.env.MCP_AUTOMATION_ENABLED === 'true' ? 'ENABLED' : 'DISABLED'}`);
});

export default app;