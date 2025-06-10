import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { ReviewApprovalService } from '../services/reviewApprovalService';
import { DatabaseService } from '../services/database';
import logger from '../services/logger';

const router = express.Router();
const databaseService = new DatabaseService();
const reviewService = new ReviewApprovalService(databaseService.pool);

/**
 * @swagger
 * components:
 *   schemas:
 *     ReviewWorkflow:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *           enum: [application, document, budget, compliance]
 *         organizationId:
 *           type: integer
 *         isActive:
 *           type: boolean
 *         requiredApprovers:
 *           type: integer
 *         sequentialApproval:
 *           type: boolean
 *     ReviewRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         workflowId:
 *           type: integer
 *         entityType:
 *           type: string
 *         entityId:
 *           type: integer
 *         title:
 *           type: string
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         status:
 *           type: string
 *         submittedBy:
 *           type: integer
 */

/**
 * @swagger
 * /api/review-approval/workflows:
 *   get:
 *     summary: Get review workflows
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: organizationId
 *         schema:
 *           type: integer
 *         description: Filter by organization ID
 *     responses:
 *       200:
 *         description: List of review workflows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ReviewWorkflow'
 */
router.get('/workflows', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.query;
    const workflows = await reviewService.getWorkflows(
      organizationId ? parseInt(organizationId as string) : undefined
    );

    res.json({
      success: true,
      data: workflows
    });
  } catch (error) {
    logger.error('Error fetching workflows', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflows'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/workflows:
 *   post:
 *     summary: Create new review workflow
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewWorkflow'
 *     responses:
 *       201:
 *         description: Workflow created successfully
 */
router.post('/workflows', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const workflowData = {
      ...req.body,
      createdBy: userId
    };

    const workflow = await reviewService.createWorkflow(workflowData);

    res.status(201).json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('Error creating workflow', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to create workflow'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/workflows/{id}:
 *   get:
 *     summary: Get workflow by ID
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workflow details
 */
router.get('/workflows/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const workflow = await reviewService.getWorkflowById(parseInt(id));

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: workflow
    });
  } catch (error) {
    logger.error('Error fetching workflow', { error, workflowId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/workflows/{id}/stages:
 *   get:
 *     summary: Get workflow stages
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Workflow stages
 */
router.get('/workflows/:id/stages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const stages = await reviewService.getWorkflowStages(parseInt(id));

    res.json({
      success: true,
      data: stages
    });
  } catch (error) {
    logger.error('Error fetching workflow stages', { error, workflowId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch workflow stages'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/workflows/{id}/stages:
 *   post:
 *     summary: Create workflow stage
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               stageName:
 *                 type: string
 *               stageDescription:
 *                 type: string
 *               stageOrder:
 *                 type: integer
 *               requiredApprovers:
 *                 type: integer
 *               approverRoles:
 *                 type: array
 *                 items:
 *                   type: string
 *               timeoutHours:
 *                 type: integer
 *               isFinal:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Stage created successfully
 */
router.post('/workflows/:id/stages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const stageData = {
      ...req.body,
      workflowId: parseInt(id)
    };

    const stage = await reviewService.createStage(stageData);

    res.status(201).json({
      success: true,
      data: stage
    });
  } catch (error) {
    logger.error('Error creating stage', { error, workflowId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to create stage'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/requests:
 *   get:
 *     summary: Get review requests
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: entityType
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: List of review requests
 */
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const { status, entityType, limit, offset } = req.query;

    const filters: any = {};
    
    if (status) filters.status = status as string;
    if (entityType) filters.entityType = entityType as string;
    if (limit) filters.limit = parseInt(limit as string);
    if (offset) filters.offset = parseInt(offset as string);
    
    // Add organization filter if user has organization
    if (user.organization_id) {
      filters.organizationId = user.organization_id;
    }

    const result = await reviewService.getReviewRequests(filters);

    res.json({
      success: true,
      data: result.requests,
      pagination: {
        total: result.total,
        limit: filters.limit || 50,
        offset: filters.offset || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching review requests', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review requests'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/requests:
 *   post:
 *     summary: Create review request
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReviewRequest'
 *     responses:
 *       201:
 *         description: Review request created successfully
 */
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const requestData = {
      ...req.body,
      submittedBy: userId
    };

    const request = await reviewService.createReviewRequest(requestData);

    res.status(201).json({
      success: true,
      data: request
    });
  } catch (error) {
    logger.error('Error creating review request', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to create review request'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/requests/{id}:
 *   get:
 *     summary: Get review request by ID
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Review request details
 */
router.get('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const request = await reviewService.getReviewRequestById(parseInt(id));

    if (!request) {
      return res.status(404).json({
        success: false,
        error: 'Review request not found'
      });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    logger.error('Error fetching review request', { error, requestId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch review request'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/requests/{id}/comments:
 *   get:
 *     summary: Get request comments
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Request comments
 */
router.get('/requests/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const comments = await reviewService.getRequestComments(parseInt(id));

    res.json({
      success: true,
      data: comments
    });
  } catch (error) {
    logger.error('Error fetching request comments', { error, requestId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch comments'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/requests/{id}/comments:
 *   post:
 *     summary: Add comment to request
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               commentType:
 *                 type: string
 *                 enum: [comment, question, clarification]
 *               isInternal:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post('/requests/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    
    const commentData = {
      ...req.body,
      requestId: parseInt(id),
      userId
    };

    const comment = await reviewService.addComment(commentData);

    res.status(201).json({
      success: true,
      data: comment
    });
  } catch (error) {
    logger.error('Error adding comment', { error, requestId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to add comment'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/approvals/pending:
 *   get:
 *     summary: Get user's pending approvals
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of pending approvals
 */
router.get('/approvals/pending', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const pendingApprovals = await reviewService.getUserPendingApprovals(userId);

    res.json({
      success: true,
      data: pendingApprovals
    });
  } catch (error) {
    logger.error('Error fetching pending approvals', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/approvals/{id}/process:
 *   post:
 *     summary: Process approval decision
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               decision:
 *                 type: string
 *                 enum: [approve, reject, request_changes]
 *               comments:
 *                 type: string
 *     responses:
 *       200:
 *         description: Approval processed successfully
 */
router.post('/approvals/:id/process', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, comments } = req.body;
    const userId = (req as any).user.id;

    if (!['approve', 'reject', 'request_changes'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid decision value'
      });
    }

    await reviewService.processApproval(
      parseInt(id),
      decision,
      userId,
      comments
    );

    res.json({
      success: true,
      message: 'Approval processed successfully'
    });
  } catch (error) {
    logger.error('Error processing approval', { error, approvalId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to process approval'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/workflows/{id}/metrics:
 *   get:
 *     summary: Get workflow metrics
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Workflow metrics
 */
router.get('/workflows/:id/metrics', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
    const end = endDate ? new Date(endDate as string) : new Date(); // Default: now

    const metrics = await reviewService.generateWorkflowMetrics(
      parseInt(id),
      start,
      end
    );

    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Error fetching workflow metrics', { error, workflowId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

/**
 * @swagger
 * /api/review-approval/dashboard:
 *   get:
 *     summary: Get review dashboard data
 *     tags: [Review & Approval]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data including pending approvals, recent requests, and metrics
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user;
    const userId = user.id;

    // Get pending approvals
    const pendingApprovals = await reviewService.getUserPendingApprovals(userId);

    // Get recent requests for this user's organization
    const filters: any = { limit: 10, offset: 0 };
    if (user.organization_id) {
      filters.organizationId = user.organization_id;
    }
    const recentRequests = await reviewService.getReviewRequests(filters);

    // Get workflows for this organization
    const workflows = await reviewService.getWorkflows(user.organization_id);

    res.json({
      success: true,
      data: {
        pendingApprovals,
        recentRequests: recentRequests.requests,
        workflows,
        summary: {
          pendingCount: pendingApprovals.length,
          recentCount: recentRequests.total,
          workflowCount: workflows.length
        }
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard data', { error, userId: (req as any).user?.id });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard data'
    });
  }
});

export default router;