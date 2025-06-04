import express from 'express'
import { asyncHandler } from '../middleware/errorHandler'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import { AITransparencyService } from '../services/aiTransparencyService'
import { db } from '../services/database'
import { logger } from '../services/logger'
import rateLimit from 'express-rate-limit'

const router = express.Router()
const aiTransparencyService = new AITransparencyService(db as any)

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many AI requests from this IP, please try again later.'
})

/**
 * @swagger
 * /api/ai/interactions:
 *   post:
 *     summary: Create a new AI interaction record
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interactionType
 *               - modelUsed
 *             properties:
 *               interactionType:
 *                 type: string
 *                 enum: [content_generation, document_analysis, compliance_check, budget_optimization]
 *               applicationId:
 *                 type: string
 *                 format: uuid
 *               promptText:
 *                 type: string
 *               responseText:
 *                 type: string
 *               modelUsed:
 *                 type: string
 *               confidenceScore:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *               tokensUsed:
 *                 type: integer
 *               processingTimeMs:
 *                 type: integer
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: AI interaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 interactionId:
 *                   type: string
 *                   format: uuid
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/interactions', authenticateToken, aiRateLimit, asyncHandler(async (req, res) => {
  const { 
    interactionType, 
    applicationId, 
    promptText, 
    responseText, 
    modelUsed, 
    confidenceScore, 
    tokensUsed, 
    processingTimeMs, 
    metadata 
  } = req.body

  // Validate required fields
  if (!interactionType || !modelUsed) {
    return res.status(400).json({ 
      error: 'Missing required fields: interactionType, modelUsed' 
    })
  }

  // Validate confidence score if provided
  if (confidenceScore !== undefined && (confidenceScore < 0 || confidenceScore > 1)) {
    return res.status(400).json({ 
      error: 'Confidence score must be between 0 and 1' 
    })
  }

  try {
    const interactionId = await aiTransparencyService.createInteraction({
      userId: req.user!.id,
      applicationId,
      interactionType,
      promptText,
      responseText,
      modelUsed,
      confidenceScore,
      tokensUsed,
      processingTimeMs,
      metadata
    })

    res.status(201).json({ interactionId })
  } catch (error) {
    logger.error('Failed to create AI interaction', { error, userId: req.user!.id })
    res.status(500).json({ error: 'Failed to create AI interaction' })
  }
}))

/**
 * @swagger
 * /api/ai/interactions/{interactionId}:
 *   put:
 *     summary: Update an AI interaction
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: interactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               responseText:
 *                 type: string
 *               confidenceScore:
 *                 type: number
 *               tokensUsed:
 *                 type: integer
 *               processingTimeMs:
 *                 type: integer
 *               status:
 *                 type: string
 *                 enum: [pending, processing, completed, failed]
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: AI interaction updated successfully
 *       404:
 *         description: Interaction not found
 *       401:
 *         description: Unauthorized
 */
router.put('/interactions/:interactionId', authenticateToken, asyncHandler(async (req, res) => {
  const { interactionId } = req.params
  const updates = req.body

  try {
    // Verify the interaction belongs to the user
    const interaction = await aiTransparencyService.getInteraction(interactionId)
    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' })
    }

    if (interaction.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await aiTransparencyService.updateInteraction(interactionId, updates)
    res.json({ message: 'Interaction updated successfully' })
  } catch (error) {
    logger.error('Failed to update AI interaction', { error, interactionId })
    res.status(500).json({ error: 'Failed to update AI interaction' })
  }
}))

/**
 * @swagger
 * /api/ai/interactions/{interactionId}/rating:
 *   post:
 *     summary: Submit user rating for AI interaction
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: interactionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Rating submitted successfully
 *       400:
 *         description: Invalid rating value
 *       404:
 *         description: Interaction not found
 */
router.post('/interactions/:interactionId/rating', authenticateToken, asyncHandler(async (req, res) => {
  const { interactionId } = req.params
  const { rating, feedback } = req.body

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' })
  }

  try {
    // Verify the interaction belongs to the user
    const interaction = await aiTransparencyService.getInteraction(interactionId)
    if (!interaction) {
      return res.status(404).json({ error: 'Interaction not found' })
    }

    if (interaction.userId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    await aiTransparencyService.submitUserRating(interactionId, rating, feedback)
    res.json({ message: 'Rating submitted successfully' })
  } catch (error) {
    logger.error('Failed to submit rating', { error, interactionId })
    res.status(500).json({ error: 'Failed to submit rating' })
  }
}))

/**
 * @swagger
 * /api/ai/content:
 *   post:
 *     summary: Save AI generated content
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - interactionId
 *               - sectionName
 *               - contentText
 *               - contentType
 *               - confidenceScore
 *             properties:
 *               interactionId:
 *                 type: string
 *                 format: uuid
 *               applicationId:
 *                 type: string
 *                 format: uuid
 *               sectionName:
 *                 type: string
 *               contentText:
 *                 type: string
 *               contentType:
 *                 type: string
 *               confidenceScore:
 *                 type: number
 *               reasoning:
 *                 type: string
 *               sources:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Content saved successfully
 *       400:
 *         description: Invalid request data
 */
router.post('/content', authenticateToken, asyncHandler(async (req, res) => {
  const contentData = req.body

  // Validate required fields
  const required = ['interactionId', 'sectionName', 'contentText', 'contentType', 'confidenceScore']
  const missing = required.filter(field => !contentData[field])
  
  if (missing.length > 0) {
    return res.status(400).json({ 
      error: `Missing required fields: ${missing.join(', ')}` 
    })
  }

  try {
    const contentId = await aiTransparencyService.saveGeneratedContent(contentData)
    res.status(201).json({ contentId })
  } catch (error) {
    logger.error('Failed to save AI content', { error, userId: req.user!.id })
    res.status(500).json({ error: 'Failed to save AI content' })
  }
}))

/**
 * @swagger
 * /api/ai/content/{applicationId}:
 *   get:
 *     summary: Get AI generated content for application
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: sectionName
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI generated content retrieved successfully
 *       404:
 *         description: Application not found
 */
router.get('/content/:applicationId', authenticateToken, asyncHandler(async (req, res) => {
  const { applicationId } = req.params
  const { sectionName } = req.query

  try {
    const content = await aiTransparencyService.getGeneratedContent(
      applicationId, 
      sectionName as string
    )
    res.json(content)
  } catch (error) {
    logger.error('Failed to get AI content', { error, applicationId })
    res.status(500).json({ error: 'Failed to get AI content' })
  }
}))

/**
 * @swagger
 * /api/ai/compliance/{applicationId}:
 *   get:
 *     summary: Get compliance checks for application
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: applicationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Compliance checks retrieved successfully
 */
router.get('/compliance/:applicationId', authenticateToken, asyncHandler(async (req, res) => {
  const { applicationId } = req.params

  try {
    const checks = await aiTransparencyService.getComplianceChecks(applicationId)
    res.json(checks)
  } catch (error) {
    logger.error('Failed to get compliance checks', { error, applicationId })
    res.status(500).json({ error: 'Failed to get compliance checks' })
  }
}))

/**
 * @swagger
 * /api/ai/analytics/usage:
 *   get:
 *     summary: Get AI usage analytics
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Usage statistics retrieved successfully
 */
router.get('/analytics/usage', authenticateToken, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query

  try {
    const stats = await aiTransparencyService.getAIUsageStats(
      req.user!.id,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    )
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get AI usage stats', { error, userId: req.user!.id })
    res.status(500).json({ error: 'Failed to get AI usage stats' })
  }
}))

/**
 * @swagger
 * /api/ai/interactions:
 *   get:
 *     summary: Get user's AI interactions
 *     tags: [AI Transparency]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Interactions retrieved successfully
 */
router.get('/interactions', authenticateToken, asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50
  const offset = parseInt(req.query.offset as string) || 0

  try {
    const interactions = await aiTransparencyService.getUserInteractions(
      req.user!.id, 
      limit, 
      offset
    )
    res.json(interactions)
  } catch (error) {
    logger.error('Failed to get user interactions', { error, userId: req.user!.id })
    res.status(500).json({ error: 'Failed to get user interactions' })
  }
}))

export default router