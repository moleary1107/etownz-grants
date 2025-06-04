import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { ProgressiveFormService } from '../services/progressiveFormService';
import { DatabaseService } from '../services/database';
import { OpenAIService } from '../services/openaiService';
import { AITransparencyService } from '../services/aiTransparencyService';
import { logger } from '../services/logger';

const router = express.Router();

// Initialize services
const dbService = DatabaseService.getInstance();
const openaiService = new OpenAIService();
const aiTransparencyService = new AITransparencyService(dbService.getPool());
const progressiveFormService = new ProgressiveFormService(
  dbService.getPool(),
  openaiService,
  aiTransparencyService
);

/**
 * @swagger
 * /progressive-form/session:
 *   post:
 *     summary: Create a new form session
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               grantId:
 *                 type: string
 *               applicatio
 *               sessionType:
 *                 type: string
 *               fieldsTotal:
 *                 type: integer
 *               userAgent:
 *                 type: string
 *     responses:
 *       201:
 *         description: Form session created successfully
 */
router.post('/session', authenticateToken, asyncHandler(async (req, res) => {
  const { grantId, applicationId, sessionType, fieldsTotal, userAgent, metadata } = req.body;

  try {
    const sessionId = await progressiveFormService.createFormSession({
      userId: req.user.id,
      grantId,
      applicationId,
      sessionType: sessionType || 'application_form',
      fieldsTotal: fieldsTotal || 0,
      userAgent: userAgent || req.headers['user-agent'],
      metadata: metadata || {}
    });

    res.status(201).json({
      sessionId,
      message: 'Form session created successfully'
    });
  } catch (error) {
    logger.error('Failed to create form session', { error, userId: req.user.id });
    res.status(500).json({ error: 'Failed to create form session' });
  }
}));

/**
 * @swagger
 * /progressive-form/session/{sessionId}:
 *   get:
 *     summary: Get form session details
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Form session retrieved successfully
 */
router.get('/session/:sessionId', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    const session = await progressiveFormService.getFormSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Form session not found' });
    }

    // Verify user owns this session
    if (session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(session);
  } catch (error) {
    logger.error('Failed to get form session', { error, sessionId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get form session' });
  }
}));

/**
 * @swagger
 * /progressive-form/session/{sessionId}:
 *   patch:
 *     summary: Update form session
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               completionPercentage:
 *                 type: integer
 *               timeSpentSeconds:
 *                 type: integer
 *               fieldsCompleted:
 *                 type: integer
 *               completed:
 *                 type: boolean
 *               abandoned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Form session updated successfully
 */
router.patch('/session/:sessionId', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;
  const { completionPercentage, timeSpentSeconds, fieldsCompleted, completed, abandoned, metadata } = req.body;

  try {
    // Verify session ownership
    const session = await progressiveFormService.getFormSession(sessionId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updates: any = {};
    
    if (completionPercentage !== undefined) updates.completionPercentage = completionPercentage;
    if (timeSpentSeconds !== undefined) updates.timeSpentSeconds = timeSpentSeconds;
    if (fieldsCompleted !== undefined) updates.fieldsCompleted = fieldsCompleted;
    if (metadata !== undefined) updates.metadata = metadata;
    
    if (completed) {
      updates.completedAt = new Date();
    }
    if (abandoned) {
      updates.abandonedAt = new Date();
    }

    await progressiveFormService.updateFormSession(sessionId, updates);

    res.json({ message: 'Form session updated successfully' });
  } catch (error) {
    logger.error('Failed to update form session', { error, sessionId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to update form session' });
  }
}));

/**
 * @swagger
 * /progressive-form/analyze:
 *   post:
 *     summary: Analyze form progress and get field recommendations
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               formData:
 *                 type: object
 *               grantSchemeId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Form analysis completed successfully
 */
router.post('/analyze', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId, formData, grantSchemeId } = req.body;

  if (!sessionId || !formData) {
    return res.status(400).json({ error: 'Session ID and form data are required' });
  }

  try {
    // Verify session ownership
    const session = await progressiveFormService.getFormSession(sessionId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const analysis = await progressiveFormService.analyzeFormProgress(
      sessionId,
      formData,
      grantSchemeId
    );

    // Update session with current progress
    const completionPercentage = analysis.completionEstimate;
    const fieldsCompleted = Object.keys(formData).filter(key => 
      formData[key] && formData[key] !== '' && formData[key] !== 0
    ).length;

    await progressiveFormService.updateFormSession(sessionId, {
      completionPercentage,
      fieldsCompleted
    });

    res.json({
      analysis,
      sessionProgress: {
        completionPercentage,
        fieldsCompleted
      }
    });
  } catch (error) {
    logger.error('Failed to analyze form progress', { error, sessionId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to analyze form progress' });
  }
}));

/**
 * @swagger
 * /progressive-form/interaction:
 *   post:
 *     summary: Track field interaction
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               fieldName:
 *                 type: string
 *               fieldType:
 *                 type: string
 *               interactionType:
 *                 type: string
 *               fieldValue:
 *                 type: string
 *               timeSpentSeconds:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Field interaction tracked successfully
 */
router.post('/interaction', authenticateToken, asyncHandler(async (req, res) => {
  const {
    sessionId,
    fieldName,
    fieldType,
    interactionType,
    fieldValue,
    timeSpentSeconds,
    validationErrors,
    aiSuggestionsShown,
    aiAssistanceUsed,
    interactionOrder,
    metadata
  } = req.body;

  if (!sessionId || !fieldName || !interactionType) {
    return res.status(400).json({ 
      error: 'Session ID, field name, and interaction type are required' 
    });
  }

  try {
    // Verify session ownership
    const session = await progressiveFormService.getFormSession(sessionId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const interactionId = await progressiveFormService.trackFieldInteraction({
      sessionId,
      fieldName,
      fieldType: fieldType || 'text',
      interactionType,
      fieldValue,
      timeSpentSeconds: timeSpentSeconds || 0,
      validationErrors: validationErrors || [],
      aiSuggestionsShown: aiSuggestionsShown || false,
      aiAssistanceUsed: aiAssistanceUsed || false,
      interactionOrder: interactionOrder || 0,
      metadata: metadata || {}
    });

    res.status(201).json({
      interactionId,
      message: 'Field interaction tracked successfully'
    });
  } catch (error) {
    logger.error('Failed to track field interaction', { error, sessionId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to track field interaction' });
  }
}));

/**
 * @swagger
 * /progressive-form/recommendations/{sessionId}:
 *   get:
 *     summary: Get AI recommendations for form session
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 */
router.get('/recommendations/:sessionId', authenticateToken, asyncHandler(async (req, res) => {
  const { sessionId } = req.params;

  try {
    // Verify session ownership
    const session = await progressiveFormService.getFormSession(sessionId);
    if (!session || session.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const recommendations = await progressiveFormService.getSessionRecommendations(sessionId);

    res.json({ recommendations });
  } catch (error) {
    logger.error('Failed to get recommendations', { error, sessionId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
}));

/**
 * @swagger
 * /progressive-form/recommendation/{recommendationId}/action:
 *   post:
 *     summary: Record user action on recommendation
 *     tags: [Progressive Form]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recommendationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [accepted, rejected, ignored]
 *     responses:
 *       200:
 *         description: Recommendation action recorded successfully
 */
router.post('/recommendation/:recommendationId/action', authenticateToken, asyncHandler(async (req, res) => {
  const { recommendationId } = req.params;
  const { action } = req.body;

  if (!action || !['accepted', 'rejected', 'ignored'].includes(action)) {
    return res.status(400).json({ error: 'Valid action required (accepted, rejected, ignored)' });
  }

  try {
    await progressiveFormService.recordRecommendationAction(recommendationId, action);
    res.json({ message: 'Recommendation action recorded successfully' });
  } catch (error) {
    logger.error('Failed to record recommendation action', { error, recommendationId, userId: req.user.id });
    res.status(500).json({ error: 'Failed to record recommendation action' });
  }
}));

export default router;