import express from 'express';
import { body, query, validationResult } from 'express-validator';
import AILoadBalancerService from '../services/aiLoadBalancerService';
import { logger } from '../services/logger';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const loadBalancerService = new AILoadBalancerService();

/**
 * @swagger
 * /api/ai-load-balancer/providers:
 *   get:
 *     summary: Get all AI providers
 *     tags: [AI Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Providers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [openai, anthropic, custom]
 *                       models:
 *                         type: array
 *                         items:
 *                           type: string
 *                       healthStatus:
 *                         type: object
 *                       priority:
 *                         type: number
 *                       isActive:
 *                         type: boolean
 */
router.get('/providers', authenticateToken, async (req, res) => {
  try {
    const metrics = await loadBalancerService.getLoadBalancingMetrics();
    
    res.json({
      success: true,
      data: {
        metrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Failed to get providers:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve providers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /api/ai-load-balancer/providers:
 *   post:
 *     summary: Add a new AI provider
 *     tags: [AI Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - endpoint
 *               - apiKey
 *               - models
 *               - rateLimit
 *               - cost
 *             properties:
 *               name:
 *                 type: string
 *                 description: Provider name
 *               type:
 *                 type: string
 *                 enum: [openai, anthropic, custom]
 *                 description: Provider type
 *               endpoint:
 *                 type: string
 *                 description: API endpoint URL
 *               apiKey:
 *                 type: string
 *                 description: API key for authentication
 *               models:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Supported models
 *               rateLimit:
 *                 type: object
 *                 properties:
 *                   requestsPerMinute:
 *                     type: number
 *                   tokensPerMinute:
 *                     type: number
 *               cost:
 *                 type: object
 *                 properties:
 *                   inputCostPer1MTokens:
 *                     type: number
 *                   outputCostPer1MTokens:
 *                     type: number
 *               priority:
 *                 type: number
 *                 default: 5
 *                 description: Provider priority (1-10)
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Provider added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providerId:
 *                   type: string
 */
router.post('/providers', 
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Provider name is required'),
    body('type').isIn(['openai', 'anthropic', 'custom']).withMessage('Valid provider type is required'),
    body('endpoint').isURL().withMessage('Valid endpoint URL is required'),
    body('apiKey').notEmpty().withMessage('API key is required'),
    body('models').isArray({ min: 1 }).withMessage('At least one model must be specified'),
    body('rateLimit').isObject().withMessage('Rate limit configuration is required'),
    body('rateLimit.requestsPerMinute').isNumeric().withMessage('Requests per minute must be numeric'),
    body('rateLimit.tokensPerMinute').isNumeric().withMessage('Tokens per minute must be numeric'),
    body('cost').isObject().withMessage('Cost configuration is required'),
    body('cost.inputCostPer1MTokens').isNumeric().withMessage('Input cost must be numeric'),
    body('cost.outputCostPer1MTokens').isNumeric().withMessage('Output cost must be numeric'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be between 1 and 10'),
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

      const provider = {
        name: req.body.name,
        type: req.body.type,
        endpoint: req.body.endpoint,
        apiKey: req.body.apiKey,
        models: req.body.models,
        rateLimit: {
          ...req.body.rateLimit,
          currentRequests: 0,
          currentTokens: 0,
          lastReset: new Date()
        },
        healthStatus: {
          isHealthy: true,
          lastCheck: new Date(),
          responseTime: 0,
          errorRate: 0,
          uptime: 100
        },
        cost: req.body.cost,
        priority: req.body.priority || 5,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };

      const providerId = await loadBalancerService.addProvider(provider);

      res.status(201).json({
        success: true,
        data: {
          providerId,
          message: 'Provider added successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to add provider:', error);
      res.status(500).json({ 
        error: 'Failed to add provider',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-load-balancer/route:
 *   post:
 *     summary: Route an AI request to the best provider
 *     tags: [AI Load Balancing]
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
 *               - model
 *               - inputTokens
 *               - estimatedOutputTokens
 *               - userId
 *             properties:
 *               operation:
 *                 type: string
 *                 description: Operation type
 *               model:
 *                 type: string
 *                 description: AI model to use
 *               inputTokens:
 *                 type: number
 *                 description: Number of input tokens
 *               estimatedOutputTokens:
 *                 type: number
 *                 description: Estimated output tokens
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               maxRetries:
 *                 type: number
 *                 default: 3
 *               timeout:
 *                 type: number
 *                 default: 30000
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Request routed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   type: object
 *                 reason:
 *                   type: string
 *                 estimatedCost:
 *                   type: number
 *                 estimatedLatency:
 *                   type: number
 */
router.post('/route', 
  authenticateToken,
  [
    body('operation').notEmpty().withMessage('Operation is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('inputTokens').isNumeric().withMessage('Input tokens must be numeric'),
    body('estimatedOutputTokens').isNumeric().withMessage('Estimated output tokens must be numeric'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority'),
    body('maxRetries').optional().isInt({ min: 0, max: 10 }).withMessage('Max retries must be between 0 and 10'),
    body('timeout').optional().isInt({ min: 1000, max: 300000 }).withMessage('Timeout must be between 1s and 5min')
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

      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: req.body.operation,
        model: req.body.model,
        inputTokens: req.body.inputTokens,
        estimatedOutputTokens: req.body.estimatedOutputTokens,
        priority: req.body.priority || 'medium',
        maxRetries: req.body.maxRetries || 3,
        timeout: req.body.timeout || 30000,
        userId: req.body.userId,
        organizationId: req.body.organizationId,
        metadata: req.body.metadata || {}
      };

      const selection = await loadBalancerService.routeRequest(request);

      res.json({
        success: true,
        data: {
          requestId: request.id,
          provider: {
            id: selection.provider.id,
            name: selection.provider.name,
            type: selection.provider.type,
            endpoint: selection.provider.endpoint
          },
          reason: selection.reason,
          estimatedCost: selection.estimatedCost,
          estimatedLatency: selection.estimatedLatency
        }
      });
    } catch (error) {
      logger.error('Failed to route request:', error);
      res.status(500).json({ 
        error: 'Failed to route request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-load-balancer/queue:
 *   post:
 *     summary: Add a request to the processing queue
 *     tags: [AI Load Balancing]
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
 *               - model
 *               - inputTokens
 *               - estimatedOutputTokens
 *               - userId
 *             properties:
 *               operation:
 *                 type: string
 *               model:
 *                 type: string
 *               inputTokens:
 *                 type: number
 *               estimatedOutputTokens:
 *                 type: number
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, critical]
 *                 default: medium
 *               userId:
 *                 type: string
 *               organizationId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Request queued successfully
 */
router.post('/queue', 
  authenticateToken,
  [
    body('operation').notEmpty().withMessage('Operation is required'),
    body('model').notEmpty().withMessage('Model is required'),
    body('inputTokens').isNumeric().withMessage('Input tokens must be numeric'),
    body('estimatedOutputTokens').isNumeric().withMessage('Estimated output tokens must be numeric'),
    body('userId').notEmpty().withMessage('User ID is required'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid priority')
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

      const request = {
        id: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        operation: req.body.operation,
        model: req.body.model,
        inputTokens: req.body.inputTokens,
        estimatedOutputTokens: req.body.estimatedOutputTokens,
        priority: req.body.priority || 'medium',
        maxRetries: 3,
        timeout: 30000,
        userId: req.body.userId,
        organizationId: req.body.organizationId,
        metadata: {}
      };

      await loadBalancerService.queueRequest(request);

      res.status(201).json({
        success: true,
        data: {
          requestId: request.id,
          message: 'Request queued successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to queue request:', error);
      res.status(500).json({ 
        error: 'Failed to queue request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-load-balancer/strategy:
 *   put:
 *     summary: Set load balancing strategy
 *     tags: [AI Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [round-robin, least-cost, least-latency, weighted, failover]
 *               config:
 *                 type: object
 *                 properties:
 *                   weights:
 *                     type: object
 *                   failoverOrder:
 *                     type: array
 *                     items:
 *                       type: string
 *                   costThreshold:
 *                     type: number
 *                   latencyThreshold:
 *                     type: number
 *     responses:
 *       200:
 *         description: Strategy updated successfully
 */
router.put('/strategy', 
  authenticateToken,
  [
    body('type').isIn(['round-robin', 'least-cost', 'least-latency', 'weighted', 'failover']).withMessage('Valid strategy type is required'),
    body('config').optional().isObject().withMessage('Config must be an object')
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

      const strategy = {
        type: req.body.type,
        config: req.body.config || {}
      };

      loadBalancerService.setLoadBalancingStrategy(strategy);

      res.json({
        success: true,
        data: {
          strategy,
          message: 'Load balancing strategy updated successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to set strategy:', error);
      res.status(500).json({ 
        error: 'Failed to set load balancing strategy',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-load-balancer/scaling-policies:
 *   post:
 *     summary: Add a scaling policy
 *     tags: [AI Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - triggerMetric
 *               - threshold
 *               - scaleAction
 *             properties:
 *               name:
 *                 type: string
 *               triggerMetric:
 *                 type: string
 *                 enum: [request_rate, error_rate, response_time, cost, queue_depth]
 *               threshold:
 *                 type: number
 *               scaleAction:
 *                 type: string
 *                 enum: [scale_up, scale_down, switch_provider, throttle]
 *               cooldownPeriod:
 *                 type: number
 *                 default: 300
 *               isActive:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Scaling policy added successfully
 */
router.post('/scaling-policies', 
  authenticateToken,
  [
    body('name').notEmpty().withMessage('Policy name is required'),
    body('triggerMetric').isIn(['request_rate', 'error_rate', 'response_time', 'cost', 'queue_depth']).withMessage('Valid trigger metric is required'),
    body('threshold').isNumeric().withMessage('Threshold must be numeric'),
    body('scaleAction').isIn(['scale_up', 'scale_down', 'switch_provider', 'throttle']).withMessage('Valid scale action is required'),
    body('cooldownPeriod').optional().isInt({ min: 0 }).withMessage('Cooldown period must be non-negative'),
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

      const policy = {
        name: req.body.name,
        triggerMetric: req.body.triggerMetric,
        threshold: req.body.threshold,
        scaleAction: req.body.scaleAction,
        cooldownPeriod: req.body.cooldownPeriod || 300,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true
      };

      const policyId = await loadBalancerService.addScalingPolicy(policy);

      res.status(201).json({
        success: true,
        data: {
          policyId,
          message: 'Scaling policy added successfully'
        }
      });
    } catch (error) {
      logger.error('Failed to add scaling policy:', error);
      res.status(500).json({ 
        error: 'Failed to add scaling policy',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/ai-load-balancer/metrics:
 *   get:
 *     summary: Get load balancing metrics and status
 *     tags: [AI Load Balancing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalProviders:
 *                   type: number
 *                 activeProviders:
 *                   type: number
 *                 healthyProviders:
 *                   type: number
 *                 totalRequests:
 *                   type: number
 *                 queueDepth:
 *                   type: number
 *                 averageResponseTime:
 *                   type: number
 *                 errorRate:
 *                   type: number
 *                 providerUtilization:
 *                   type: object
 *                 costBreakdown:
 *                   type: object
 */
router.get('/metrics', authenticateToken, async (req, res) => {
  try {
    const metrics = await loadBalancerService.getLoadBalancingMetrics();

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Failed to get load balancing metrics:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve load balancing metrics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;