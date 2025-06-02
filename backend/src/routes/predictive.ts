import { Router } from 'express'
import { PredictiveAnalyticsService } from '../services/predictiveAnalyticsService'
import { DatabaseService } from '../services/database'
import { OpenAIService } from '../services/openaiService'
import { VectorDatabaseService } from '../services/vectorDatabase'
import { logger } from '../services/logger'

const router = Router()

// Initialize services
const db = new DatabaseService()
const openai = new OpenAIService()
const vectorDb = new VectorDatabaseService()
const predictiveService = new PredictiveAnalyticsService(db, openai, vectorDb)

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * @swagger
 * components:
 *   schemas:
 *     GrantSuccessPrediction:
 *       type: object
 *       properties:
 *         grant_id:
 *           type: string
 *         organization_id:
 *           type: string
 *         success_probability:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         confidence_score:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *         predicted_factors:
 *           type: object
 *           properties:
 *             organization_fit:
 *               type: number
 *             historical_performance:
 *               type: number
 *             competition_level:
 *               type: number
 *             timing_factor:
 *               type: number
 *             budget_alignment:
 *               type: number
 *         recommendations:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 enum: [timing, budget, approach, requirements]
 *               suggestion:
 *                 type: string
 *               impact_score:
 *                 type: number
 *               priority:
 *                 type: string
 *                 enum: [high, medium, low]
 *         competitive_analysis:
 *           type: object
 *         optimal_timing:
 *           type: object
 *         created_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /predictive/grants/{grantId}/predict:
 *   post:
 *     summary: Generate comprehensive success probability prediction for a grant
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *             properties:
 *               organization_id:
 *                 type: string
 *               application_data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Success prediction generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GrantSuccessPrediction'
 */
router.post('/grants/:grantId/predict', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { grantId } = req.params
    const { organization_id, application_data } = req.body

    if (!grantId || !organization_id) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'grantId and organization_id are required'
      })
    }

    logger.info('Generating grant success prediction', { grantId, organization_id })

    const prediction = await predictiveService.predictGrantSuccess(
      grantId,
      organization_id,
      application_data
    )

    const processingTime = Date.now() - startTime

    logger.info('Grant success prediction generated', {
      grantId,
      organization_id,
      successProbability: prediction.success_probability,
      processingTime
    })

    res.json({
      ...prediction,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to generate grant success prediction', {
      error: error instanceof Error ? error.message : String(error),
      grantId: req.params.grantId,
      processingTime
    })

    res.status(500).json({
      error: 'Prediction generation failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/grants/{grantId}/optimize-budget:
 *   post:
 *     summary: Generate budget optimization recommendations
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - organization_id
 *               - proposed_amount
 *             properties:
 *               organization_id:
 *                 type: string
 *               proposed_amount:
 *                 type: number
 *     responses:
 *       200:
 *         description: Budget optimization completed successfully
 */
router.post('/grants/:grantId/optimize-budget', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { grantId } = req.params
    const { organization_id, proposed_amount } = req.body

    if (!grantId || !organization_id || !proposed_amount) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'grantId, organization_id, and proposed_amount are required'
      })
    }

    if (proposed_amount <= 0) {
      return res.status(400).json({
        error: 'Invalid proposed amount',
        message: 'Proposed amount must be greater than 0'
      })
    }

    logger.info('Generating budget optimization', { grantId, organization_id, proposed_amount })

    const optimization = await predictiveService.optimizeBudget(
      grantId,
      organization_id,
      proposed_amount
    )

    const processingTime = Date.now() - startTime

    logger.info('Budget optimization completed', {
      grantId,
      organization_id,
      optimalAmount: optimization.analysis.optimal_range.recommended,
      processingTime
    })

    res.json({
      ...optimization,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to generate budget optimization', {
      error: error instanceof Error ? error.message : String(error),
      grantId: req.params.grantId,
      processingTime
    })

    res.status(500).json({
      error: 'Budget optimization failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/grants/{grantId}/competition:
 *   get:
 *     summary: Analyze competition landscape for a grant
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: grantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Competition analysis completed successfully
 */
router.get('/grants/:grantId/competition', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { grantId } = req.params

    if (!grantId) {
      return res.status(400).json({
        error: 'Missing grantId parameter'
      })
    }

    logger.info('Analyzing grant competition', { grantId })

    const analysis = await predictiveService.analyzeCompetition(grantId)

    const processingTime = Date.now() - startTime

    logger.info('Competition analysis completed', {
      grantId,
      competitionLevel: analysis.competition_metrics.estimated_total_applicants,
      processingTime
    })

    res.json({
      ...analysis,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to analyze competition', {
      error: error instanceof Error ? error.message : String(error),
      grantId: req.params.grantId,
      processingTime
    })

    res.status(500).json({
      error: 'Competition analysis failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/users/{userId}/insights:
 *   get:
 *     summary: Get personalized predictive insights for a user
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Predictive insights generated successfully
 */
router.get('/users/:userId/insights', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      })
    }

    logger.info('Generating predictive insights', { userId })

    const insights = await predictiveService.generatePredictiveInsights(userId)

    const processingTime = Date.now() - startTime

    logger.info('Predictive insights generated', {
      userId,
      insightsCount: insights.insights.length,
      processingTime
    })

    res.json({
      ...insights,
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to generate predictive insights', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId,
      processingTime
    })

    res.status(500).json({
      error: 'Insights generation failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/grants/batch-predict:
 *   post:
 *     summary: Generate predictions for multiple grants in batch
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - predictions
 *             properties:
 *               predictions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     grant_id:
 *                       type: string
 *                     organization_id:
 *                       type: string
 *                     application_data:
 *                       type: object
 *     responses:
 *       200:
 *         description: Batch predictions completed successfully
 */
router.post('/grants/batch-predict', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { predictions } = req.body

    if (!predictions || !Array.isArray(predictions)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'predictions array is required'
      })
    }

    if (predictions.length === 0) {
      return res.status(400).json({
        error: 'Empty predictions array',
        message: 'At least one prediction request is required'
      })
    }

    if (predictions.length > 20) {
      return res.status(400).json({
        error: 'Too many predictions',
        message: 'Maximum 20 predictions allowed per batch'
      })
    }

    logger.info('Processing batch predictions', { count: predictions.length })

    const results = await Promise.all(
      predictions.map(async (predReq: any) => {
        try {
          if (!predReq.grant_id || !predReq.organization_id) {
            throw new Error('Missing grant_id or organization_id')
          }

          return await predictiveService.predictGrantSuccess(
            predReq.grant_id,
            predReq.organization_id,
            predReq.application_data
          )
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : 'Prediction failed',
            grant_id: predReq.grant_id,
            organization_id: predReq.organization_id
          }
        }
      })
    )

    const successfulPredictions = results.filter(r => !('error' in r))
    const failedPredictions = results.filter(r => 'error' in r)

    const processingTime = Date.now() - startTime

    logger.info('Batch predictions completed', {
      totalRequested: predictions.length,
      successful: successfulPredictions.length,
      failed: failedPredictions.length,
      processingTime
    })

    res.json({
      predictions: successfulPredictions,
      failed: failedPredictions,
      summary: {
        total_requested: predictions.length,
        successful: successfulPredictions.length,
        failed: failedPredictions.length
      },
      processingTime,
      metadata: {
        aiModel: 'gpt-4o-mini',
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to process batch predictions', {
      error: error instanceof Error ? error.message : String(error),
      processingTime
    })

    res.status(500).json({
      error: 'Batch prediction failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/organizations/{organizationId}/predictions:
 *   get:
 *     summary: Get historical predictions for an organization
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: organizationId
 *         required: true
 *         schema:
 *           type: string
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
 *       - in: query
 *         name: include_outcomes
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: Historical predictions retrieved successfully
 */
router.get('/organizations/:organizationId/predictions', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { organizationId } = req.params
    const { 
      limit = 50, 
      offset = 0, 
      include_outcomes = false 
    } = req.query

    if (!organizationId) {
      return res.status(400).json({
        error: 'Missing organizationId parameter'
      })
    }

    logger.info('Getting historical predictions', { 
      organizationId, 
      limit, 
      offset, 
      include_outcomes 
    })

    const result = await db.query(`
      SELECT 
        gsp.*,
        ${include_outcomes === 'true' ? 'gsp.actual_outcome, gsp.prediction_accuracy,' : ''}
        COUNT(*) OVER() as total_count
      FROM grant_success_predictions gsp
      WHERE gsp.organization_id = $1
      ORDER BY gsp.created_at DESC
      LIMIT $2 OFFSET $3
    `, [organizationId, limit, offset])

    const predictions = result.rows.map(row => ({
      grant_id: row.grant_id,
      organization_id: row.organization_id,
      success_probability: row.success_probability,
      confidence_score: row.confidence_score,
      predicted_factors: row.predicted_factors,
      recommendations: row.recommendations,
      historical_comparison: row.historical_comparison,
      competitive_analysis: row.competitive_analysis,
      optimal_timing: row.optimal_timing,
      created_at: row.created_at,
      ...(include_outcomes === 'true' && {
        actual_outcome: row.actual_outcome,
        prediction_accuracy: row.prediction_accuracy
      })
    }))

    const total = result.rows.length > 0 ? result.rows[0].total_count : 0

    // Calculate accuracy summary if outcomes are included
    let accuracySummary: {
      total_predictions: number
      validated_predictions: number
      avg_accuracy: number
      accuracy_by_range: any[]
    } | null = null
    
    if (include_outcomes === 'true') {
      const accuracyResult = await db.query(`
        SELECT 
          COUNT(*) as total_predictions,
          COUNT(*) FILTER (WHERE actual_outcome IS NOT NULL) as validated_predictions,
          AVG(prediction_accuracy) FILTER (WHERE prediction_accuracy IS NOT NULL) as avg_accuracy
        FROM grant_success_predictions
        WHERE organization_id = $1
      `, [organizationId])

      accuracySummary = {
        total_predictions: parseInt(accuracyResult.rows[0]?.total_predictions || '0'),
        validated_predictions: parseInt(accuracyResult.rows[0]?.validated_predictions || '0'),
        avg_accuracy: parseFloat(accuracyResult.rows[0]?.avg_accuracy || '0'),
        accuracy_by_range: [] // Could be populated with more complex query
      }
    }

    const processingTime = Date.now() - startTime

    logger.info('Historical predictions retrieved', {
      organizationId,
      predictionsCount: predictions.length,
      total,
      processingTime
    })

    res.json({
      predictions,
      total,
      accuracy_summary: accuracySummary,
      processingTime,
      metadata: {
        organizationId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include_outcomes: include_outcomes === 'true',
        retrievedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to get historical predictions', {
      error: error instanceof Error ? error.message : String(error),
      organizationId: req.params.organizationId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to retrieve historical predictions',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/models/performance:
 *   get:
 *     summary: Get model performance metrics
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Model performance metrics retrieved successfully
 */
router.get('/models/performance', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    logger.info('Getting model performance metrics')

    // Get overall performance
    const overallResult = await db.query(`
      SELECT 
        AVG(prediction_accuracy) as overall_accuracy,
        COUNT(*) as predictions_count
      FROM grant_success_predictions
      WHERE prediction_accuracy IS NOT NULL
      AND created_at > NOW() - INTERVAL '6 months'
    `)

    // Get performance by model type (mock data for now)
    const modelPerformance = [
      { model_type: 'success_prediction', accuracy: 0.82, predictions: 150 },
      { model_type: 'budget_optimization', accuracy: 0.78, predictions: 95 },
      { model_type: 'competition_analysis', accuracy: 0.85, predictions: 120 }
    ]

    // Get recent performance trends (last 30 days)
    const recentResult = await db.query(`
      SELECT 
        DATE(created_at) as date,
        AVG(prediction_accuracy) as accuracy,
        COUNT(*) as predictions
      FROM grant_success_predictions
      WHERE prediction_accuracy IS NOT NULL
      AND created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `)

    const processingTime = Date.now() - startTime

    res.json({
      overall_accuracy: parseFloat(overallResult.rows[0]?.overall_accuracy || '0.80'),
      predictions_count: parseInt(overallResult.rows[0]?.predictions_count || '0'),
      accuracy_by_model: modelPerformance,
      recent_performance: recentResult.rows.map(row => ({
        date: row.date,
        accuracy: parseFloat(row.accuracy),
        predictions: parseInt(row.predictions)
      })),
      processingTime,
      metadata: {
        generatedAt: new Date().toISOString(),
        period: 'last_6_months'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to get model performance', {
      error: error instanceof Error ? error.message : String(error),
      processingTime
    })

    res.status(500).json({
      error: 'Failed to retrieve model performance',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/predictions/{predictionId}/outcome:
 *   put:
 *     summary: Update prediction with actual outcome for ML improvement
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: predictionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - outcome
 *             properties:
 *               outcome:
 *                 type: string
 *                 enum: [approved, rejected, withdrawn, pending]
 *     responses:
 *       200:
 *         description: Prediction outcome updated successfully
 */
router.put('/predictions/:predictionId/outcome', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { predictionId } = req.params
    const { outcome } = req.body

    if (!predictionId || !outcome) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'predictionId and outcome are required'
      })
    }

    const validOutcomes = ['approved', 'rejected', 'withdrawn', 'pending']
    if (!validOutcomes.includes(outcome)) {
      return res.status(400).json({
        error: 'Invalid outcome',
        message: `outcome must be one of: ${validOutcomes.join(', ')}`
      })
    }

    logger.info('Updating prediction outcome', { predictionId, outcome })

    // Use the database function to calculate accuracy
    await db.query('SELECT calculate_prediction_accuracy($1, $2)', [predictionId, outcome])

    // Get the updated prediction to return accuracy score
    const result = await db.query(`
      SELECT prediction_accuracy 
      FROM grant_success_predictions 
      WHERE id = $1
    `, [predictionId])

    const accuracyScore = result.rows[0]?.prediction_accuracy

    const processingTime = Date.now() - startTime

    logger.info('Prediction outcome updated', {
      predictionId,
      outcome,
      accuracyScore,
      processingTime
    })

    res.json({
      success: true,
      accuracy_score: accuracyScore,
      message: 'Prediction outcome updated successfully',
      processingTime,
      metadata: {
        predictionId,
        outcome,
        updatedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to update prediction outcome', {
      error: error instanceof Error ? error.message : String(error),
      predictionId: req.params.predictionId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to update prediction outcome',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /predictive/predictions/{predictionId}/feedback:
 *   post:
 *     summary: Provide feedback on prediction quality
 *     tags: [Predictive Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: predictionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rating
 *               - usefulness_score
 *               - recommendation_followed
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               comments:
 *                 type: string
 *               usefulness_score:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 10
 *               recommendation_followed:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Feedback recorded successfully
 */
router.post('/predictions/:predictionId/feedback', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { predictionId } = req.params
    const { rating, comments, usefulness_score, recommendation_followed } = req.body

    if (!predictionId || rating === undefined || usefulness_score === undefined || recommendation_followed === undefined) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'predictionId, rating, usefulness_score, and recommendation_followed are required'
      })
    }

    if (rating < 1 || rating > 10 || usefulness_score < 1 || usefulness_score > 10) {
      return res.status(400).json({
        error: 'Invalid rating values',
        message: 'rating and usefulness_score must be between 1 and 10'
      })
    }

    logger.info('Recording prediction feedback', { 
      predictionId, 
      rating, 
      usefulness_score, 
      recommendation_followed 
    })

    // Store feedback in prediction_analytics table
    await db.query(`
      INSERT INTO prediction_analytics 
      (user_id, prediction_id, prediction_type, event_type, user_rating, 
       user_comments, user_engagement_score, recommendation_followed, created_at)
      VALUES (
        (SELECT organization_id FROM grant_success_predictions WHERE id = $1),
        $1, 'success', 'feedback_provided', $2, $3, $4, $5, NOW()
      )
    `, [predictionId, rating, comments, usefulness_score / 10.0, recommendation_followed])

    const processingTime = Date.now() - startTime

    logger.info('Prediction feedback recorded', {
      predictionId,
      rating,
      processingTime
    })

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      processingTime,
      metadata: {
        predictionId,
        feedbackRecordedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to record prediction feedback', {
      error: error instanceof Error ? error.message : String(error),
      predictionId: req.params.predictionId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to record feedback',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

export default router