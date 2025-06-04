import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AIMonitoringService from '../services/aiMonitoringService';
import { logger } from '../services/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const monitoringService = new AIMonitoringService();

/**
 * @swagger
 * /api/ai-monitoring/dashboard:
 *   get:
 *     summary: Get AI performance dashboard
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1h, 6h, 24h, 7d, 30d]
 *           default: 24h
 *         description: Time range for dashboard data
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 overview:
 *                   type: object
 *                   properties:
 *                     totalRequests:
 *                       type: number
 *                     totalCost:
 *                       type: number
 *                     averageResponseTime:
 *                       type: number
 *                     errorRate:
 *                       type: number
 *                     uptime:
 *                       type: number
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                 trends:
 *                   type: object
 *                 alerts:
 *                   type: array
 *                   items:
 *                     type: object
 *                 recommendations:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/dashboard', 
  authenticateToken,
  [
    query('timeRange').optional().isIn(['1h', '6h', '24h', '7d', '30d']).withMessage('Invalid time range')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const timeRange = (req.query.timeRange as '1h' | '6h' | '24h' | '7d' | '30d') || '24h';
      
      const dashboard = await monitoringService.getPerformanceDashboard(timeRange);

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to get performance dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve performance dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-monitoring/health:
 *   get:
 *     summary: Get real-time system health status
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: System health retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, critical]
 *                 score:
 *                   type: number
 *                   description: Health score from 0-100
 *                 checks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       status:
 *                         type: string
 *                         enum: [pass, warn, fail]
 *                       value:
 *                         type: number
 *                       threshold:
 *                         type: number
 *                       message:
 *                         type: string
 *                 uptime:
 *                   type: number
 *                 lastUpdate:
 *                   type: string
 *                   format: date-time
 */
router.get('/health', authenticateToken, async (req, res) => {
  try {
    const health = await monitoringService.getSystemHealth();

    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    logger.error('Failed to get system health:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve system health',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/ai-monitoring/metrics:
 *   post:
 *     summary: Record a custom metric
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - metricName
 *               - metricType
 *               - value
 *               - source
 *             properties:
 *               metricName:
 *                 type: string
 *                 description: Name of the metric
 *               metricType:
 *                 type: string
 *                 enum: [counter, gauge, histogram, summary]
 *                 description: Type of metric
 *               value:
 *                 type: number
 *                 description: Metric value
 *               labels:
 *                 type: object
 *                 description: Labels for the metric
 *               source:
 *                 type: string
 *                 description: Source system or component
 *     responses:
 *       201:
 *         description: Metric recorded successfully
 */
router.post('/metrics', 
  authenticateToken,
  [
    body('metricName').notEmpty().withMessage('Metric name is required'),
    body('metricType').isIn(['counter', 'gauge', 'histogram', 'summary']).withMessage('Valid metric type is required'),
    body('value').isNumeric().withMessage('Metric value must be numeric'),
    body('source').notEmpty().withMessage('Source is required'),
    body('labels').optional().isObject().withMessage('Labels must be an object')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const metric = {
        metricName: req.body.metricName,
        metricType: req.body.metricType,
        value: req.body.value,
        labels: req.body.labels || {},
        source: req.body.source
      };

      await monitoringService.recordMetric(metric);

      res.status(201).json({
        success: true,
        message: 'Metric recorded successfully'
      });
    } catch (error) {
      logger.error('Failed to record metric:', error);
      res.status(500).json({ 
        error: 'Failed to record metric',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-monitoring/alerts:
 *   post:
 *     summary: Create a new alert rule
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - alertName
 *               - condition
 *               - threshold
 *               - severity
 *               - description
 *             properties:
 *               alertName:
 *                 type: string
 *                 description: Name of the alert
 *               condition:
 *                 type: string
 *                 description: Alert condition expression
 *               threshold:
 *                 type: number
 *                 description: Alert threshold value
 *               severity:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 description: Alert severity level
 *               description:
 *                 type: string
 *                 description: Alert description
 *               actions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Actions to take when alert fires
 *     responses:
 *       201:
 *         description: Alert created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alertId:
 *                   type: string
 */
router.post('/alerts', 
  authenticateToken,
  [
    body('alertName').notEmpty().withMessage('Alert name is required'),
    body('condition').notEmpty().withMessage('Alert condition is required'),
    body('threshold').isNumeric().withMessage('Threshold must be numeric'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Valid severity is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('actions').optional().isArray().withMessage('Actions must be an array')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const alert = {
        alertName: req.body.alertName,
        condition: req.body.condition,
        threshold: req.body.threshold,
        severity: req.body.severity,
        description: req.body.description,
        actions: req.body.actions || []
      };

      const alertId = await monitoringService.createAlert(alert);

      res.status(201).json({
        success: true,
        data: {
          alertId,
          message: 'Alert created successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to create alert:', error);
      res.status(500).json({ 
        error: 'Failed to create alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-monitoring/analytics:
 *   get:
 *     summary: Get advanced AI analytics
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         required: true
 *         schema:
 *           type: string
 *         description: Time range for analytics
 *       - in: query
 *         name: providers
 *         schema:
 *           type: string
 *         description: Comma-separated list of provider IDs
 *       - in: query
 *         name: models
 *         schema:
 *           type: string
 *         description: Comma-separated list of models
 *       - in: query
 *         name: operations
 *         schema:
 *           type: string
 *         description: Comma-separated list of operations
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [hour, day, week, month]
 *         description: Grouping interval
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 aggregatedMetrics:
 *                   type: object
 *                 timeSeries:
 *                   type: array
 *                 breakdown:
 *                   type: object
 *                 insights:
 *                   type: object
 */
router.get('/analytics', 
  authenticateToken,
  [
    query('timeRange').notEmpty().withMessage('Time range is required'),
    query('groupBy').optional().isIn(['hour', 'day', 'week', 'month']).withMessage('Invalid groupBy value')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const filters = {
        timeRange: req.query.timeRange as string,
        providers: req.query.providers ? (req.query.providers as string).split(',') : undefined,
        models: req.query.models ? (req.query.models as string).split(',') : undefined,
        operations: req.query.operations ? (req.query.operations as string).split(',') : undefined,
        groupBy: req.query.groupBy as 'hour' | 'day' | 'week' | 'month' | undefined,
        metrics: req.query.metrics ? (req.query.metrics as string).split(',') : undefined
      };

      const analytics = await monitoringService.getAdvancedAnalytics(filters);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get advanced analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve advanced analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-monitoring/export:
 *   get:
 *     summary: Export metrics data
 *     tags: [AI Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         required: true
 *         schema:
 *           type: string
 *           enum: [json, csv, prometheus]
 *         description: Export format
 *       - in: query
 *         name: timeRange
 *         required: true
 *         schema:
 *           type: string
 *         description: Time range for export
 *       - in: query
 *         name: metrics
 *         schema:
 *           type: string
 *         description: Comma-separated list of metrics to export
 *     responses:
 *       200:
 *         description: Metrics exported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: string
 *                   description: Exported data in requested format
 *           text/csv:
 *             schema:
 *               type: string
 *           text/plain:
 *             schema:
 *               type: string
 */
router.get('/export', 
  authenticateToken,
  [
    query('format').isIn(['json', 'csv', 'prometheus']).withMessage('Valid format is required'),
    query('timeRange').notEmpty().withMessage('Time range is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: errors.array() 
        });
      }

      const format = req.query.format as 'json' | 'csv' | 'prometheus';
      const timeRange = req.query.timeRange as string;
      const metrics = req.query.metrics ? (req.query.metrics as string).split(',') : undefined;

      const exportedData = await monitoringService.exportMetrics(format, timeRange, metrics);

      // Set appropriate content type and headers
      switch (format) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.json"`);
          break;
        case 'csv':
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.csv"`);
          break;
        case 'prometheus':
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Disposition', `attachment; filename="metrics-${Date.now()}.txt"`);
          break;
      }

      res.send(exportedData);
    } catch (error) {
      logger.error('Failed to export metrics:', error);
      res.status(500).json({ 
        error: 'Failed to export metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;