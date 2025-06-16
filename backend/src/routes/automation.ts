import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { automationPipeline } from '../services/automationPipeline';
import { jobQueueService } from '../services/jobQueueService';
import { grantSourcesService } from '../services/grantSourcesService';
import { crawlMonitoringService } from '../services/crawlMonitoringService';
import { logger } from '../services/logger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get automation pipeline status
router.get('/status', async (req, res) => {
  try {
    const automationStatus = automationPipeline.getStatus();
    const jobQueueStatus = {
      isRunning: jobQueueService.isRunning(),
      stats: await jobQueueService.getJobStats()
    };

    res.json({
      success: true,
      data: {
        automation: automationStatus,
        jobQueue: jobQueueStatus
      }
    });
  } catch (error) {
    logger.error('Failed to get automation status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get automation status'
    });
  }
});

// Start automation pipeline (admin only)
router.post('/start', requireRole(['super_admin']), async (req, res) => {
  try {
    await automationPipeline.start();
    
    res.json({
      success: true,
      message: 'Automation pipeline started successfully'
    });
  } catch (error) {
    logger.error('Failed to start automation pipeline', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to start automation pipeline'
    });
  }
});

// Stop automation pipeline (admin only)
router.post('/stop', requireRole(['super_admin']), async (req, res) => {
  try {
    await automationPipeline.stop();
    
    res.json({
      success: true,
      message: 'Automation pipeline stopped successfully'
    });
  } catch (error) {
    logger.error('Failed to stop automation pipeline', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to stop automation pipeline'
    });
  }
});

// Update automation configuration (admin only)
router.put('/config', requireRole(['super_admin']), async (req, res) => {
  try {
    const config = req.body;
    automationPipeline.updateConfig(config);
    
    res.json({
      success: true,
      message: 'Automation configuration updated',
      data: automationPipeline.getConfig()
    });
  } catch (error) {
    logger.error('Failed to update automation config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to update automation configuration'
    });
  }
});

// Get automation configuration
router.get('/config', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const config = automationPipeline.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    logger.error('Failed to get automation config', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get automation configuration'
    });
  }
});

// Manual trigger for grant discovery (admin only)
router.post('/trigger/discovery', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const { sourceIds } = req.body;
    let sources;

    if (sourceIds && Array.isArray(sourceIds)) {
      // Trigger specific sources
      sources = [];
      for (const sourceId of sourceIds) {
        const source = await grantSourcesService.getSourceById(sourceId);
        if (source) sources.push(source);
      }
    } else {
      // Trigger all active sources
      sources = await grantSourcesService.getAllSources();
      sources = sources.filter(source => source.isActive);
    }

    const jobIds = [];
    for (const source of sources) {
      const jobId = await jobQueueService.enqueueJob('crawl_grant_source', {
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.url,
        triggeredBy: req.user?.id,
        manual: true
      }, {
        priority: 9 // High priority for manual triggers
      });
      jobIds.push(jobId);
    }

    res.json({
      success: true,
      message: `Queued crawl jobs for ${sources.length} sources`,
      data: {
        jobIds,
        sourcesQueued: sources.length
      }
    });
  } catch (error) {
    logger.error('Failed to trigger manual discovery', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to trigger manual discovery'
    });
  }
});

// Get job queue status and recent jobs
router.get('/jobs', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const stats = await jobQueueService.getJobStats();
    
    res.json({
      success: true,
      data: {
        isRunning: jobQueueService.isRunning(),
        stats
      }
    });
  } catch (error) {
    logger.error('Failed to get job queue status', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get job queue status'
    });
  }
});

// Get specific job details
router.get('/jobs/:id', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const job = await jobQueueService.getJobById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job not found'
      });
    }

    res.json({
      success: true,
      data: job
    });
  } catch (error) {
    logger.error('Failed to get job details', { error, jobId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get job details'
    });
  }
});

// Cancel a job
router.post('/jobs/:id/cancel', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const cancelled = await jobQueueService.cancelJob(req.params.id);
    
    if (!cancelled) {
      return res.status(404).json({
        success: false,
        error: 'Job not found or cannot be cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Job cancelled successfully'
    });
  } catch (error) {
    logger.error('Failed to cancel job', { error, jobId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to cancel job'
    });
  }
});

// Get monitoring alerts
router.get('/monitoring/alerts', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const alerts = await crawlMonitoringService.getRecentAlerts(limit);
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    logger.error('Failed to get monitoring alerts', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring alerts'
    });
  }
});

// Acknowledge an alert
router.post('/monitoring/alerts/:id/acknowledge', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    await crawlMonitoringService.acknowledgeAlert(req.params.id, req.user?.id || 'unknown');
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    logger.error('Failed to acknowledge alert', { error, alertId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

// Run monitoring checks manually
router.post('/monitoring/check', requireRole(['super_admin']), async (req, res) => {
  try {
    const alerts = await crawlMonitoringService.checkAllSources();
    
    res.json({
      success: true,
      message: 'Monitoring check completed',
      data: {
        alertsGenerated: alerts.length,
        alerts
      }
    });
  } catch (error) {
    logger.error('Failed to run monitoring check', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to run monitoring check'
    });
  }
});

// Get monitoring dashboard metrics
router.get('/monitoring/metrics', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const metrics = await crawlMonitoringService.getDashboardMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get monitoring metrics', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get monitoring metrics'
    });
  }
});

// Get crawl statistics
router.get('/crawl/stats', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const sourceId = req.query.sourceId as string;
    const stats = await grantSourcesService.getCrawlStats(sourceId);
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get crawl stats', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get crawl statistics'
    });
  }
});

// Get recent crawl failures
router.get('/crawl/failures', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const failures = await grantSourcesService.getRecentCrawlFailures(limit);
    
    res.json({
      success: true,
      data: failures
    });
  } catch (error) {
    logger.error('Failed to get crawl failures', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to get crawl failures'
    });
  }
});

export default router;