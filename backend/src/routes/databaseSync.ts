import { Router, Response } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { databaseSyncService } from '../services/databaseSyncService';
import { logger } from '../services/logger';
import { param, query, validationResult } from 'express-validator';

const router = Router();

/**
 * @swagger
 * /database-sync/status:
 *   get:
 *     summary: Get database synchronization status
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Sync status retrieved successfully
 */
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await databaseSyncService.getSyncStatistics();
    
    res.json({
      success: true,
      data: {
        ...stats,
        syncHealthy: stats.failedRecords < (stats.totalRecords * 0.1), // Less than 10% failure rate
        lastSyncTimeFormatted: stats.lastSyncTime ? stats.lastSyncTime.toISOString() : null
      }
    });
  } catch (error) {
    logger.error('Failed to get sync status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status'
    });
  }
});

/**
 * @swagger
 * /database-sync/sync-grants:
 *   post:
 *     summary: Sync grants table to vector database
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grants sync completed successfully
 */
router.post('/sync-grants', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Manual grants sync initiated', { userId: req.user?.id });
    
    const result = await databaseSyncService.syncGrantsToVector();
    
    res.json({
      success: true,
      data: {
        message: 'Grants sync completed',
        ...result
      }
    });
  } catch (error) {
    logger.error('Failed to sync grants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync grants to vector database'
    });
  }
});

/**
 * @swagger
 * /database-sync/sync-organizations:
 *   post:
 *     summary: Sync organizations table to vector database
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organizations sync completed successfully
 */
router.post('/sync-organizations', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Manual organizations sync initiated', { userId: req.user?.id });
    
    const result = await databaseSyncService.syncOrganizationsToVector();
    
    res.json({
      success: true,
      data: {
        message: 'Organizations sync completed',
        ...result
      }
    });
  } catch (error) {
    logger.error('Failed to sync organizations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync organizations to vector database'
    });
  }
});

/**
 * @swagger
 * /database-sync/sync-requirements:
 *   post:
 *     summary: Sync grant requirements to vector database
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Grant requirements sync completed successfully
 */
router.post('/sync-requirements', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Manual requirements sync initiated', { userId: req.user?.id });
    
    const result = await databaseSyncService.syncGrantRequirementsToVector();
    
    res.json({
      success: true,
      data: {
        message: 'Grant requirements sync completed',
        ...result
      }
    });
  } catch (error) {
    logger.error('Failed to sync grant requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync grant requirements to vector database'
    });
  }
});

/**
 * @swagger
 * /database-sync/sync-all:
 *   post:
 *     summary: Sync all tables to vector database
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Full database sync completed successfully
 */
router.post('/sync-all', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    logger.info('Full database sync initiated', { userId: req.user?.id });
    
    const results = await databaseSyncService.syncAllTablesToVector();
    
    const totalSynced = results.grants.synced + results.organizations.synced + results.requirements.synced;
    const totalFailed = results.grants.failed + results.organizations.failed + results.requirements.failed;
    
    res.json({
      success: true,
      data: {
        message: 'Full database sync completed',
        summary: {
          totalSynced,
          totalFailed,
          successRate: totalSynced + totalFailed > 0 ? (totalSynced / (totalSynced + totalFailed)) * 100 : 0
        },
        details: results
      }
    });
  } catch (error) {
    logger.error('Failed to sync all tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync all tables to vector database'
    });
  }
});

/**
 * @swagger
 * /database-sync/record/{table}/{id}:
 *   get:
 *     summary: Get sync status for a specific record
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: table
 *         required: true
 *         schema:
 *           type: string
 *           enum: [grants, organizations, grant_requirements]
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Record sync status retrieved successfully
 */
router.get('/record/:table/:id', 
  authenticateToken,
  [
    param('table').isIn(['grants', 'organizations', 'grant_requirements']).withMessage('Invalid table name'),
    param('id').isUUID().withMessage('Valid record ID required')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { table, id } = req.params;
      
      const syncRecord = await databaseSyncService.getSyncStatus(table, id);
      
      res.json({
        success: true,
        data: {
          table,
          recordId: id,
          syncRecord,
          isSynced: syncRecord?.sync_status === 'synced'
        }
      });
    } catch (error) {
      logger.error('Failed to get record sync status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get record sync status'
      });
    }
  }
);

/**
 * @swagger
 * /database-sync/pending:
 *   get:
 *     summary: Get pending sync records
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 100
 *     responses:
 *       200:
 *         description: Pending sync records retrieved successfully
 */
router.get('/pending',
  authenticateToken,
  [
    query('limit').optional().isInt({ min: 1, max: 500 }).withMessage('Limit must be between 1 and 500')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      
      const pendingRecords = await databaseSyncService.getPendingSyncRecords(limit);
      
      res.json({
        success: true,
        data: {
          pendingRecords,
          count: pendingRecords.length,
          hasMore: pendingRecords.length === limit
        }
      });
    } catch (error) {
      logger.error('Failed to get pending sync records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get pending sync records'
      });
    }
  }
);

/**
 * @swagger
 * /database-sync/cleanup:
 *   post:
 *     summary: Cleanup old sync records
 *     tags: [Database Sync]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysOld
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 30
 *     responses:
 *       200:
 *         description: Cleanup completed successfully
 */
router.post('/cleanup',
  authenticateToken,
  [
    query('daysOld').optional().isInt({ min: 1, max: 365 }).withMessage('Days old must be between 1 and 365')
  ],
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const daysOld = parseInt(req.query.daysOld as string) || 30;
      
      logger.info('Cleanup old sync records initiated', { userId: req.user?.id, daysOld });
      
      const cleanedCount = await databaseSyncService.cleanupOldSyncRecords(daysOld);
      
      res.json({
        success: true,
        data: {
          message: 'Cleanup completed successfully',
          recordsCleaned: cleanedCount,
          daysOld
        }
      });
    } catch (error) {
      logger.error('Failed to cleanup old sync records:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup old sync records'
      });
    }
  }
);

export default router;