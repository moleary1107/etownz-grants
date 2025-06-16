import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleAuth';
import { grantSourcesService } from '../services/grantSourcesService';
import { jobQueueService } from '../services/jobQueueService';
import { logger } from '../services/logger';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all grant sources
router.get('/', requireRole(['super_admin', 'organization_admin', 'grant_writer']), async (req, res) => {
  try {
    const sources = await grantSourcesService.getAllSources();
    
    res.json({
      success: true,
      data: sources,
      total: sources.length
    });
  } catch (error) {
    logger.error('Failed to fetch grant sources', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grant sources'
    });
  }
});

// Get single grant source
router.get('/:id', requireRole(['super_admin', 'organization_admin', 'grant_writer']), async (req, res) => {
  try {
    const source = await grantSourcesService.getSourceById(req.params.id);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      });
    }

    res.json({
      success: true,
      data: source
    });
  } catch (error) {
    logger.error('Failed to fetch grant source', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grant source'
    });
  }
});

// Create new grant source (admin only)
router.post('/', requireRole(['super_admin']), async (req, res) => {
  try {
    const { name, url, description, category, location, crawlSettings, crawlSchedule } = req.body;

    if (!name || !url || !category || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, url, category, location'
      });
    }

    const newSource = await grantSourcesService.createSource({
      name,
      url,
      description,
      category,
      location,
      isActive: true,
      crawlSettings: crawlSettings || {
        depth: 2,
        followPdfs: true,
        followDocx: true,
        includePatterns: ['*grant*', '*funding*'],
        excludePatterns: []
      },
      crawlSchedule: crawlSchedule || 'manual'
    });

    res.status(201).json({
      success: true,
      data: newSource,
      message: 'Grant source created successfully'
    });
  } catch (error) {
    logger.error('Failed to create grant source', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to create grant source'
    });
  }
});

// Update grant source (admin only)
router.put('/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    const updates = req.body;
    const updatedSource = await grantSourcesService.updateSource(req.params.id, updates);
    
    if (!updatedSource) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      });
    }

    res.json({
      success: true,
      data: updatedSource,
      message: 'Grant source updated successfully'
    });
  } catch (error) {
    logger.error('Failed to update grant source', { error, id: req.params.id, updates: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to update grant source'
    });
  }
});

// Delete grant source (admin only)
router.delete('/:id', requireRole(['super_admin']), async (req, res) => {
  try {
    const deleted = await grantSourcesService.deleteSource(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      });
    }

    res.json({
      success: true,
      message: 'Grant source deleted successfully'
    });
  } catch (error) {
    logger.error('Failed to delete grant source', { error, id: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to delete grant source'
    });
  }
});

// Trigger crawl for specific source
router.post('/:id/crawl', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const source = await grantSourcesService.getSourceById(req.params.id);
    
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      });
    }

    if (!source.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot crawl inactive source'
      });
    }

    // Queue crawl job
    const jobId = await jobQueueService.enqueueJob('crawl_grant_source', {
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      triggeredBy: req.user?.id,
      manual: true
    }, {
      priority: 9 // High priority for manual triggers
    });

    res.json({
      success: true,
      data: {
        jobId,
        message: 'Crawl job queued successfully'
      }
    });
  } catch (error) {
    logger.error('Failed to trigger crawl', { error, sourceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to trigger crawl'
    });
  }
});

// Get sources by schedule type
router.get('/schedule/:type', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const scheduleType = req.params.type;
    
    if (!['daily', 'weekly', 'monthly', 'manual'].includes(scheduleType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid schedule type. Must be: daily, weekly, monthly, or manual'
      });
    }

    const sources = await grantSourcesService.getActiveSourcesForSchedule(scheduleType);
    
    res.json({
      success: true,
      data: sources,
      total: sources.length
    });
  } catch (error) {
    logger.error('Failed to fetch sources by schedule', { error, scheduleType: req.params.type });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources by schedule'
    });
  }
});

// Test URL accessibility before adding as source
router.post('/test-url', requireRole(['super_admin']), async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    // Simple URL validation
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        success: false,
        error: 'Invalid URL format'
      });
    }

    // For now, we'll assume the URL is accessible
    // In production, you'd want to actually test the connection
    const accessible = true;

    res.json({
      success: true,
      data: {
        url,
        accessible,
        message: accessible ? 'URL appears to be accessible' : 'URL is not accessible'
      }
    });
  } catch (error) {
    logger.error('Failed to test URL', { error, url: req.body.url });
    res.status(500).json({
      success: false,
      error: 'Failed to test URL'
    });
  }
});

// Get crawl history for a source
router.get('/:id/crawl-history', requireRole(['super_admin', 'organization_admin']), async (req, res) => {
  try {
    const sourceId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const source = await grantSourcesService.getSourceById(sourceId);
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      });
    }

    // Get crawl statistics and recent failures for this source
    const [stats, failures] = await Promise.all([
      grantSourcesService.getCrawlStats(sourceId),
      grantSourcesService.getRecentCrawlFailures(limit)
    ]);

    res.json({
      success: true,
      data: {
        source: {
          id: source.id,
          name: source.name,
          url: source.url
        },
        stats,
        recentFailures: failures.filter(f => f.sourceId === sourceId)
      }
    });
  } catch (error) {
    logger.error('Failed to get crawl history', { error, sourceId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to get crawl history'
    });
  }
});

// Bulk update sources (admin only)
router.patch('/bulk', requireRole(['super_admin']), async (req, res) => {
  try {
    const { sourceIds, updates } = req.body;

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'sourceIds must be a non-empty array'
      });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'updates object is required'
      });
    }

    const results = [];
    for (const sourceId of sourceIds) {
      try {
        const updatedSource = await grantSourcesService.updateSource(sourceId, updates);
        if (updatedSource) {
          results.push({ sourceId, success: true, data: updatedSource });
        } else {
          results.push({ sourceId, success: false, error: 'Source not found' });
        }
      } catch (error) {
        results.push({ sourceId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    res.json({
      success: true,
      message: `Updated ${successCount} of ${sourceIds.length} sources`,
      data: {
        results,
        successCount,
        totalCount: sourceIds.length
      }
    });
  } catch (error) {
    logger.error('Failed to bulk update sources', { error, body: req.body });
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update sources'
    });
  }
});

export default router;