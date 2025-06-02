import { Router } from 'express'
import { GrantMonitoringService } from '../services/grantMonitoringService'
import { DatabaseService } from '../services/database'
import { OpenAIService } from '../services/openaiService'
import { UserPreferencesService } from '../services/userPreferencesService'
import { VectorDatabaseService } from '../services/vectorDatabase'
import { logger } from '../services/logger'

const router = Router()

// Initialize services
const db = new DatabaseService()
const openai = new OpenAIService()
const vectorDb = new VectorDatabaseService()
const userPreferences = new UserPreferencesService(db, vectorDb, openai)
const monitoringService = new GrantMonitoringService(db, openai, userPreferences, vectorDb)

// Async handler wrapper
const asyncHandler = (fn: Function) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

/**
 * @swagger
 * components:
 *   schemas:
 *     MonitoringRule:
 *       type: object
 *       required:
 *         - user_id
 *         - name
 *         - rule_type
 *         - criteria
 *         - notification_settings
 *       properties:
 *         id:
 *           type: string
 *         user_id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         rule_type:
 *           type: string
 *           enum: [keyword_match, category_filter, amount_range, deadline_proximity, ai_similarity, custom_criteria]
 *         criteria:
 *           type: object
 *         notification_settings:
 *           type: object
 *         is_active:
 *           type: boolean
 *         last_triggered:
 *           type: string
 *           format: date-time
 *         trigger_count:
 *           type: integer
 *     GrantAlert:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         user_id:
 *           type: string
 *         rule_id:
 *           type: string
 *         grant_id:
 *           type: string
 *         alert_type:
 *           type: string
 *           enum: [new_grant, deadline_reminder, criteria_match, ai_recommendation]
 *         match_score:
 *           type: number
 *         match_reasons:
 *           type: array
 *           items:
 *             type: string
 *         user_action:
 *           type: string
 *           enum: [dismissed, saved, applied, viewed]
 *         expires_at:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /monitoring/rules:
 *   post:
 *     summary: Create a new monitoring rule
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *               - name
 *               - rule_type
 *               - criteria
 *               - notification_settings
 *             properties:
 *               user_id:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               rule_type:
 *                 type: string
 *                 enum: [keyword_match, category_filter, amount_range, deadline_proximity, ai_similarity, custom_criteria]
 *               criteria:
 *                 type: object
 *                 properties:
 *                   keywords:
 *                     type: array
 *                     items:
 *                       type: string
 *                   categories:
 *                     type: array
 *                     items:
 *                       type: string
 *                   amount_min:
 *                     type: number
 *                   amount_max:
 *                     type: number
 *                   deadline_days:
 *                     type: integer
 *                   similarity_threshold:
 *                     type: number
 *               notification_settings:
 *                 type: object
 *                 properties:
 *                   email:
 *                     type: boolean
 *                   in_app:
 *                     type: boolean
 *                   push:
 *                     type: boolean
 *                   frequency:
 *                     type: string
 *                     enum: [immediate, daily, weekly]
 *               is_active:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Monitoring rule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonitoringRule'
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/rules', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { user_id, name, description, rule_type, criteria, notification_settings, is_active = true } = req.body

    if (!user_id || !name || !rule_type || !criteria || !notification_settings) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'user_id, name, rule_type, criteria, and notification_settings are required'
      })
    }

    logger.info('Creating monitoring rule', { user_id, name, rule_type })

    const rule = await monitoringService.createMonitoringRule({
      user_id,
      name,
      description: description || '',
      rule_type,
      criteria,
      notification_settings,
      is_active
    })

    const processingTime = Date.now() - startTime

    logger.info('Monitoring rule created successfully', { 
      ruleId: rule.id, 
      user_id, 
      processingTime 
    })

    res.status(201).json({
      ...rule,
      processingTime,
      metadata: {
        createdAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to create monitoring rule', {
      error: error instanceof Error ? error.message : String(error),
      processingTime
    })

    res.status(500).json({
      error: 'Monitoring rule creation failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    })
  }
}))

/**
 * @swagger
 * /monitoring/rules/{userId}:
 *   get:
 *     summary: Get monitoring rules for a user
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: active_only
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: User monitoring rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rules:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/MonitoringRule'
 *                 total:
 *                   type: integer
 */
router.get('/rules/:userId', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { userId } = req.params
    const { active_only = false } = req.query

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      })
    }

    logger.info('Getting monitoring rules', { userId, active_only })

    const rules = await monitoringService.getUserMonitoringRules(userId, active_only === 'true')

    const processingTime = Date.now() - startTime

    logger.info('Monitoring rules retrieved successfully', { 
      userId, 
      rulesCount: rules.length,
      processingTime 
    })

    res.json({
      rules,
      total: rules.length,
      processingTime,
      metadata: {
        activeOnly: active_only === 'true',
        retrievedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to get monitoring rules', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to retrieve monitoring rules',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * @swagger
 * /monitoring/rules/{ruleId}:
 *   put:
 *     summary: Update a monitoring rule
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
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
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               criteria:
 *                 type: object
 *               notification_settings:
 *                 type: object
 *               is_active:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Monitoring rule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MonitoringRule'
 */
router.put('/rules/:ruleId', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { ruleId } = req.params
    const updates = req.body

    if (!ruleId) {
      return res.status(400).json({
        error: 'Missing ruleId parameter'
      })
    }

    logger.info('Updating monitoring rule', { ruleId, updates: Object.keys(updates) })

    const updatedRule = await monitoringService.updateMonitoringRule(ruleId, updates)

    const processingTime = Date.now() - startTime

    logger.info('Monitoring rule updated successfully', { 
      ruleId, 
      processingTime 
    })

    res.json({
      ...updatedRule,
      processingTime,
      metadata: {
        updatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to update monitoring rule', {
      error: error instanceof Error ? error.message : String(error),
      ruleId: req.params.ruleId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to update monitoring rule',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * @swagger
 * /monitoring/rules/{ruleId}:
 *   delete:
 *     summary: Delete a monitoring rule
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Monitoring rule deleted successfully
 *       404:
 *         description: Monitoring rule not found
 */
router.delete('/rules/:ruleId', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { ruleId } = req.params

    if (!ruleId) {
      return res.status(400).json({
        error: 'Missing ruleId parameter'
      })
    }

    logger.info('Deleting monitoring rule', { ruleId })

    await monitoringService.deleteMonitoringRule(ruleId)

    const processingTime = Date.now() - startTime

    logger.info('Monitoring rule deleted successfully', { 
      ruleId, 
      processingTime 
    })

    res.json({
      success: true,
      message: 'Monitoring rule deleted successfully',
      processingTime,
      metadata: {
        deletedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to delete monitoring rule', {
      error: error instanceof Error ? error.message : String(error),
      ruleId: req.params.ruleId,
      processingTime
    })

    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({
        error: 'Monitoring rule not found',
        message: error.message
      })
    } else {
      res.status(500).json({
        error: 'Failed to delete monitoring rule',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      })
    }
  }
}))

/**
 * @swagger
 * /monitoring/alerts/{userId}:
 *   get:
 *     summary: Get alerts for a user
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
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
 *         name: alert_type
 *         schema:
 *           type: string
 *           enum: [new_grant, deadline_reminder, criteria_match, ai_recommendation]
 *       - in: query
 *         name: unread_only
 *         schema:
 *           type: boolean
 *           default: false
 *     responses:
 *       200:
 *         description: User alerts retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/GrantAlert'
 *                 total:
 *                   type: integer
 */
router.get('/alerts/:userId', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { userId } = req.params
    const { 
      limit = 50, 
      offset = 0, 
      alert_type, 
      unread_only = false,
      start_date,
      end_date
    } = req.query

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      })
    }

    logger.info('Getting user alerts', { 
      userId, 
      limit, 
      offset, 
      alert_type, 
      unread_only 
    })

    const options: any = {
      limit: parseInt(limit),
      offset: parseInt(offset),
      alertType: alert_type,
      unreadOnly: unread_only === 'true'
    }

    if (start_date) options.startDate = new Date(start_date)
    if (end_date) options.endDate = new Date(end_date)

    const result = await monitoringService.getUserAlerts(userId, options)

    const processingTime = Date.now() - startTime

    logger.info('User alerts retrieved successfully', { 
      userId, 
      alertsCount: result.alerts.length,
      total: result.total,
      processingTime 
    })

    res.json({
      ...result,
      processingTime,
      metadata: {
        filters: options,
        retrievedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to get user alerts', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to retrieve user alerts',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * @swagger
 * /monitoring/alerts/{alertId}/action:
 *   post:
 *     summary: Mark alert action (dismissed, saved, applied, viewed)
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
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
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [dismissed, saved, applied, viewed]
 *     responses:
 *       200:
 *         description: Alert action recorded successfully
 */
router.post('/alerts/:alertId/action', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { alertId } = req.params
    const { action } = req.body

    if (!alertId || !action) {
      return res.status(400).json({
        error: 'Missing required parameters',
        message: 'alertId and action are required'
      })
    }

    if (!['dismissed', 'saved', 'applied', 'viewed'].includes(action)) {
      return res.status(400).json({
        error: 'Invalid action',
        message: 'action must be one of: dismissed, saved, applied, viewed'
      })
    }

    logger.info('Recording alert action', { alertId, action })

    await monitoringService.updateAlertAction(alertId, action)

    const processingTime = Date.now() - startTime

    logger.info('Alert action recorded successfully', { 
      alertId, 
      action,
      processingTime 
    })

    res.json({
      success: true,
      message: `Alert marked as ${action}`,
      processingTime,
      metadata: {
        alertId,
        action,
        recordedAt: new Date().toISOString()
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to record alert action', {
      error: error instanceof Error ? error.message : String(error),
      alertId: req.params.alertId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to record alert action',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * @swagger
 * /monitoring/stats/{userId}:
 *   get:
 *     summary: Get monitoring statistics for a user
 *     tags: [Monitoring]
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
 *         description: Monitoring statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 active_rules:
 *                   type: integer
 *                 total_alerts_today:
 *                   type: integer
 *                 avg_response_time:
 *                   type: number
 *                 top_performing_rules:
 *                   type: array
 *                   items:
 *                     type: string
 *                 alert_success_rate:
 *                   type: number
 *                 user_engagement_score:
 *                   type: number
 */
router.get('/stats/:userId', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { userId } = req.params

    if (!userId) {
      return res.status(400).json({
        error: 'Missing userId parameter'
      })
    }

    logger.info('Getting monitoring statistics', { userId })

    const stats = await monitoringService.getMonitoringStats(userId)

    const processingTime = Date.now() - startTime

    logger.info('Monitoring statistics retrieved successfully', { 
      userId, 
      processingTime 
    })

    res.json({
      ...stats,
      processingTime,
      metadata: {
        userId,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to get monitoring statistics', {
      error: error instanceof Error ? error.message : String(error),
      userId: req.params.userId,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to retrieve monitoring statistics',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

/**
 * @swagger
 * /monitoring/jobs/run:
 *   post:
 *     summary: Manually trigger monitoring jobs
 *     tags: [Monitoring]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - job_type
 *             properties:
 *               job_type:
 *                 type: string
 *                 enum: [new_grants_check, deadline_reminder, ai_similarity_scan]
 *     responses:
 *       200:
 *         description: Monitoring job executed successfully
 */
router.post('/jobs/run', asyncHandler(async (req: any, res: any) => {
  const startTime = Date.now()
  
  try {
    const { job_type } = req.body

    if (!job_type) {
      return res.status(400).json({
        error: 'Missing job_type parameter'
      })
    }

    if (!['new_grants_check', 'deadline_reminder', 'ai_similarity_scan'].includes(job_type)) {
      return res.status(400).json({
        error: 'Invalid job_type',
        message: 'job_type must be one of: new_grants_check, deadline_reminder, ai_similarity_scan'
      })
    }

    logger.info('Running monitoring job', { job_type })

    let job
    switch (job_type) {
      case 'new_grants_check':
        job = await monitoringService.runNewGrantsMonitoring()
        break
      case 'deadline_reminder':
        job = await monitoringService.runDeadlineReminders()
        break
      case 'ai_similarity_scan':
        job = await monitoringService.runAISimilarityMonitoring()
        break
    }

    const processingTime = Date.now() - startTime

    logger.info('Monitoring job completed successfully', { 
      job_type,
      jobId: job.id,
      processingTime 
    })

    res.json({
      ...job,
      processingTime,
      metadata: {
        jobType: job_type,
        executedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    })
  } catch (error) {
    const processingTime = Date.now() - startTime
    logger.error('Failed to run monitoring job', {
      error: error instanceof Error ? error.message : String(error),
      job_type: req.body.job_type,
      processingTime
    })

    res.status(500).json({
      error: 'Failed to run monitoring job',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    })
  }
}))

export default router