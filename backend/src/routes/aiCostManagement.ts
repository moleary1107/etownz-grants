import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AICostManagementService from '../services/aiCostManagementService';
import { logger } from '../services/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const costManagementService = new AICostManagementService();

/**
 * @swagger
 * /api/ai-cost/usage/analytics:
 *   get:
 *     summary: Get AI usage analytics for an organization
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *       - in: query
 *         name: startDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for analytics period
 *       - in: query
 *         name: endDate
 *         required: true
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for analytics period
 *     responses:
 *       200:
 *         description: Usage analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCost:
 *                   type: number
 *                   description: Total cost in cents
 *                 totalTokens:
 *                   type: number
 *                   description: Total tokens used
 *                 requestCount:
 *                   type: number
 *                   description: Total number of requests
 *                 averageCostPerRequest:
 *                   type: number
 *                   description: Average cost per request
 *                 usageByService:
 *                   type: object
 *                   description: Usage breakdown by service
 *                 performanceMetrics:
 *                   type: object
 *                   description: Performance metrics
 *                 trends:
 *                   type: object
 *                   description: Usage trends
 */
router.get('/usage/analytics', 
  authenticateToken,
  [
    query('organizationId').notEmpty().withMessage('Organization ID is required'),
    query('startDate').isISO8601().withMessage('Valid start date is required'),
    query('endDate').isISO8601().withMessage('Valid end date is required')
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

      const { organizationId, startDate, endDate } = req.query as {
        organizationId: string;
        startDate: string;
        endDate: string;
      };

      const analytics = await costManagementService.getUsageAnalytics(
        organizationId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Failed to get usage analytics:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve usage analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-cost/optimization/suggestions:
 *   get:
 *     summary: Get optimization suggestions for an organization
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Optimization suggestions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 suggestions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         enum: [model_switch, prompt_optimization, caching, batching, rate_limiting]
 *                       priority:
 *                         type: string
 *                         enum: [low, medium, high, critical]
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       potentialSavings:
 *                         type: number
 *                       implementationEffort:
 *                         type: string
 *                         enum: [low, medium, high]
 *                       actionItems:
 *                         type: array
 *                         items:
 *                           type: string
 */
router.get('/optimization/suggestions', 
  authenticateToken,
  [
    query('organizationId').notEmpty().withMessage('Organization ID is required')
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

      const { organizationId } = req.query as { organizationId: string };

      const suggestions = await costManagementService.generateOptimizationSuggestions(organizationId);

      res.json({
        success: true,
        data: {
          suggestions,
          generatedAt: new Date().toISOString(),
          totalPotentialSavings: suggestions.reduce((sum, s) => sum + s.potentialSavings, 0)
        }
      });
    } catch (error) {
      logger.error('Failed to get optimization suggestions:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve optimization suggestions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-cost/thresholds:
 *   post:
 *     summary: Set cost threshold for an organization or user
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organizationId
 *               - type
 *               - limit
 *               - resetDate
 *             properties:
 *               organizationId:
 *                 type: string
 *                 description: Organization ID
 *               userId:
 *                 type: string
 *                 description: User ID (optional, for user-specific thresholds)
 *               type:
 *                 type: string
 *                 enum: [daily, weekly, monthly, per_request]
 *                 description: Threshold type
 *               limit:
 *                 type: number
 *                 description: Cost limit in cents
 *               resetDate:
 *                 type: string
 *                 format: date-time
 *                 description: Date when threshold resets
 *               alertThreshold:
 *                 type: number
 *                 default: 80
 *                 description: Alert percentage (0-100)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *                 description: Whether threshold is active
 *     responses:
 *       201:
 *         description: Cost threshold created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 thresholdId:
 *                   type: string
 *                   description: Created threshold ID
 */
router.post('/thresholds', 
  authenticateToken,
  [
    body('organizationId').notEmpty().withMessage('Organization ID is required'),
    body('type').isIn(['daily', 'weekly', 'monthly', 'per_request']).withMessage('Valid threshold type is required'),
    body('limit').isNumeric().withMessage('Valid cost limit is required'),
    body('resetDate').isISO8601().withMessage('Valid reset date is required'),
    body('alertThreshold').optional().isInt({ min: 0, max: 100 }).withMessage('Alert threshold must be between 0 and 100'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
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

      const {
        organizationId,
        userId,
        type,
        limit,
        resetDate,
        alertThreshold = 80,
        isActive = true
      } = req.body;

      const threshold = {
        organizationId,
        userId,
        type,
        limit,
        resetDate: new Date(resetDate),
        alertThreshold,
        isActive,
        notificationSent: false
      };

      const thresholdId = await costManagementService.setCostThreshold(threshold);

      res.status(201).json({
        success: true,
        data: {
          thresholdId,
          message: 'Cost threshold created successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to set cost threshold:', error);
      res.status(500).json({ 
        error: 'Failed to set cost threshold',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-cost/usage/record:
 *   post:
 *     summary: Record AI usage metrics (internal use)
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - service
 *               - operation
 *               - model
 *               - totalTokens
 *               - cost
 *               - duration
 *               - endpoint
 *               - requestId
 *               - status
 *             properties:
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *               service:
 *                 type: string
 *                 enum: [openai, anthropic, vector_db, custom]
 *               operation:
 *                 type: string
 *               model:
 *                 type: string
 *               inputTokens:
 *                 type: number
 *                 default: 0
 *               outputTokens:
 *                 type: number
 *                 default: 0
 *               totalTokens:
 *                 type: number
 *               cost:
 *                 type: number
 *                 description: Cost in cents
 *               duration:
 *                 type: number
 *                 description: Duration in milliseconds
 *               endpoint:
 *                 type: string
 *               requestId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [success, error, timeout]
 *               errorMessage:
 *                 type: string
 *     responses:
 *       201:
 *         description: Usage recorded successfully
 */
router.post('/usage/record', 
  authenticateToken,
  [
    body('userId').notEmpty().withMessage('User ID is required'),
    body('service').isIn(['openai', 'anthropic', 'vector_db', 'custom']).withMessage('Valid service is required'),
    body('operation').notEmpty().withMessage('Operation is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('totalTokens').isNumeric().withMessage('Total tokens must be numeric'),
    body('cost').isNumeric().withMessage('Cost must be numeric'),
    body('duration').isNumeric().withMessage('Duration must be numeric'),
    body('endpoint').notEmpty().withMessage('Endpoint is required'),
    body('requestId').notEmpty().withMessage('Request ID is required'),
    body('status').isIn(['success', 'error', 'timeout']).withMessage('Valid status is required')
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

      const metrics = {
        userId: req.body.userId,
        organizationId: req.body.organizationId,
        service: req.body.service,
        operation: req.body.operation,
        model: req.body.model,
        inputTokens: req.body.inputTokens || 0,
        outputTokens: req.body.outputTokens || 0,
        totalTokens: req.body.totalTokens,
        cost: req.body.cost,
        duration: req.body.duration,
        endpoint: req.body.endpoint,
        requestId: req.body.requestId,
        status: req.body.status,
        errorMessage: req.body.errorMessage
      };

      await costManagementService.recordUsage(metrics);

      res.status(201).json({
        success: true,
        message: 'Usage recorded successfully'
      });
    } catch (error) {
      logger.error('Failed to record usage:', error);
      res.status(500).json({ 
        error: 'Failed to record usage',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-cost/optimization/apply:
 *   post:
 *     summary: Apply automatic optimizations to a request
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - operation
 *               - prompt
 *               - options
 *             properties:
 *               operation:
 *                 type: string
 *                 description: Operation type
 *               prompt:
 *                 type: string
 *                 description: AI prompt
 *               options:
 *                 type: object
 *                 description: Request options
 *     responses:
 *       200:
 *         description: Optimizations applied successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 optimizedModel:
 *                   type: string
 *                 optimizedPrompt:
 *                   type: string
 *                 optimizedOptions:
 *                   type: object
 *                 optimizationsApplied:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/optimization/apply', 
  authenticateToken,
  [
    body('operation').notEmpty().withMessage('Operation is required'),
    body('prompt').notEmpty().withMessage('Prompt is required'),
    body('options').isObject().withMessage('Options must be an object')
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

      const { operation, prompt, options } = req.body;

      const optimizations = await costManagementService.applyAutomaticOptimizations(
        operation,
        prompt,
        options
      );

      res.json({
        success: true,
        data: optimizations
      });
    } catch (error) {
      logger.error('Failed to apply optimizations:', error);
      res.status(500).json({ 
        error: 'Failed to apply optimizations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-cost/dashboard:
 *   get:
 *     summary: Get cost management dashboard data
 *     tags: [AI Cost Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Organization ID
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 currentMonthCost:
 *                   type: number
 *                 todayCost:
 *                   type: number
 *                 weeklyTrend:
 *                   type: array
 *                 monthlyTrend:
 *                   type: array
 *                 topCostlyOperations:
 *                   type: array
 *                 thresholdStatus:
 *                   type: object
 *                 suggestions:
 *                   type: array
 */
router.get('/dashboard', 
  authenticateToken,
  [
    query('organizationId').notEmpty().withMessage('Organization ID is required')
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

      const { organizationId } = req.query as { organizationId: string };

      // Get current month analytics
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyAnalytics = await costManagementService.getUsageAnalytics(
        organizationId,
        startOfMonth,
        now
      );

      // Get today's analytics
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const todayAnalytics = await costManagementService.getUsageAnalytics(
        organizationId,
        startOfDay,
        now
      );

      // Get optimization suggestions
      const suggestions = await costManagementService.generateOptimizationSuggestions(organizationId);

      const dashboard = {
        currentMonthCost: monthlyAnalytics.totalCost,
        todayCost: todayAnalytics.totalCost,
        monthlyTokens: monthlyAnalytics.totalTokens,
        todayTokens: todayAnalytics.totalTokens,
        requestsToday: todayAnalytics.requestCount,
        requestsThisMonth: monthlyAnalytics.requestCount,
        averageCostPerRequest: monthlyAnalytics.averageCostPerRequest,
        performanceMetrics: monthlyAnalytics.performanceMetrics,
        weeklyTrend: monthlyAnalytics.trends.dailyCosts.slice(-7),
        monthlyTrend: monthlyAnalytics.trends.dailyCosts,
        topModels: monthlyAnalytics.trends.modelUsage,
        usageByService: monthlyAnalytics.usageByService,
        usageByOperation: monthlyAnalytics.usageByOperation,
        suggestions: suggestions.slice(0, 5), // Top 5 suggestions
        totalPotentialSavings: suggestions.reduce((sum, s) => sum + s.potentialSavings, 0),
        lastUpdated: new Date().toISOString()
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve dashboard data',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

export default router;