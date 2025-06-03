import { Router } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import { NewsletterService } from '../services/newsletterService'
import { db } from '../services/database'
import { logger } from '../services/logger'
import asyncHandler from 'express-async-handler'

const router = Router()
const newsletterService = new NewsletterService(db)

/**
 * @route POST /api/newsletter/subscribe
 * @desc Subscribe to newsletter
 * @access Public
 */
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { 
    email, 
    frequency = 'weekly',
    categories,
    amountMin,
    amountMax,
    locations
  } = req.body

  if (!email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    res.status(400).json({ error: 'Invalid email format' })
    return
  }

  try {
    const subscription = await newsletterService.subscribe({
      email,
      frequency,
      categories,
      amountMin,
      amountMax,
      locations
    })

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      subscription: {
        id: subscription.id,
        email: subscription.email,
        frequency: subscription.frequency
      }
    })
  } catch (error) {
    logger.error('Failed to subscribe to newsletter', { error, email })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to subscribe' 
    })
  }
}))

/**
 * @route POST /api/newsletter/subscribe-authenticated
 * @desc Subscribe authenticated user to newsletter
 * @access Private
 */
router.post('/subscribe-authenticated', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userId = req.user!.id
  const userEmail = req.user!.email
  const { 
    frequency = 'weekly',
    categories,
    amountMin,
    amountMax,
    locations
  } = req.body

  try {
    const subscription = await newsletterService.subscribe({
      email: userEmail,
      userId,
      frequency,
      categories,
      amountMin,
      amountMax,
      locations
    })

    res.json({
      success: true,
      message: 'Successfully subscribed to newsletter',
      subscription: {
        id: subscription.id,
        email: subscription.email,
        frequency: subscription.frequency,
        categories_filter: subscription.categories_filter,
        amount_min: subscription.amount_min,
        amount_max: subscription.amount_max,
        locations_filter: subscription.locations_filter
      }
    })
  } catch (error) {
    logger.error('Failed to subscribe user to newsletter', { error, userId })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to subscribe' 
    })
  }
}))

/**
 * @route DELETE /api/newsletter/unsubscribe
 * @desc Unsubscribe from newsletter
 * @access Public
 */
router.delete('/unsubscribe', asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    res.status(400).json({ error: 'Email is required' })
    return
  }

  try {
    const success = await newsletterService.unsubscribe(email)
    
    if (success) {
      res.json({
        success: true,
        message: 'Successfully unsubscribed from newsletter'
      })
    } else {
      res.status(404).json({ error: 'Subscription not found' })
    }
  } catch (error) {
    logger.error('Failed to unsubscribe from newsletter', { error, email })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to unsubscribe' 
    })
  }
}))

/**
 * @route GET /api/newsletter/subscription
 * @desc Get user's subscription details
 * @access Private
 */
router.get('/subscription', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userEmail = req.user!.email

  try {
    const result = await db.query(
      'SELECT * FROM newsletter_subscriptions WHERE email = $1',
      [userEmail]
    )

    if (result.rows.length === 0) {
      res.json({ subscribed: false })
      return
    }

    const subscription = result.rows[0]
    res.json({
      subscribed: subscription.is_active,
      subscription: {
        id: subscription.id,
        frequency: subscription.frequency,
        categories_filter: subscription.categories_filter,
        amount_min: subscription.amount_min,
        amount_max: subscription.amount_max,
        locations_filter: subscription.locations_filter,
        last_sent_at: subscription.last_sent_at
      }
    })
  } catch (error) {
    logger.error('Failed to get subscription', { error, email: userEmail })
    res.status(500).json({ error: 'Failed to get subscription details' })
  }
}))

/**
 * @route PUT /api/newsletter/preferences
 * @desc Update newsletter preferences
 * @access Private
 */
router.put('/preferences', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const userEmail = req.user!.email
  const { 
    frequency,
    categories,
    amountMin,
    amountMax,
    locations
  } = req.body

  try {
    const result = await db.query(`
      UPDATE newsletter_subscriptions 
      SET 
        frequency = COALESCE($2, frequency),
        categories_filter = COALESCE($3, categories_filter),
        amount_min = COALESCE($4, amount_min),
        amount_max = COALESCE($5, amount_max),
        locations_filter = COALESCE($6, locations_filter),
        updated_at = NOW()
      WHERE email = $1
      RETURNING *
    `, [
      userEmail,
      frequency,
      categories,
      amountMin,
      amountMax,
      locations
    ])

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Subscription not found' })
      return
    }

    const subscription = result.rows[0]
    res.json({
      success: true,
      message: 'Preferences updated successfully',
      subscription: {
        frequency: subscription.frequency,
        categories_filter: subscription.categories_filter,
        amount_min: subscription.amount_min,
        amount_max: subscription.amount_max,
        locations_filter: subscription.locations_filter
      }
    })
  } catch (error) {
    logger.error('Failed to update preferences', { error, email: userEmail })
    res.status(500).json({ error: 'Failed to update preferences' })
  }
}))

/**
 * @route POST /api/newsletter/send
 * @desc Send newsletter manually (Admin only)
 * @access Private (Admin)
 */
router.post('/send', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Check if user is admin
  if (!req.user!.is_admin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const { emails, categories, preview = false } = req.body

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    res.status(400).json({ error: 'Email list is required' })
    return
  }

  try {
    const content = await newsletterService.sendNewsletter(emails, {
      categories,
      preview
    })

    res.json({
      success: true,
      message: preview ? 'Newsletter preview generated' : 'Newsletter sent successfully',
      content,
      recipientCount: emails.length
    })
  } catch (error) {
    logger.error('Failed to send newsletter', { error, emailCount: emails.length })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send newsletter' 
    })
  }
}))

/**
 * @route POST /api/newsletter/send-scheduled
 * @desc Trigger scheduled newsletter send (Admin only)
 * @access Private (Admin)
 */
router.post('/send-scheduled', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Check if user is admin
  if (!req.user!.is_admin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  const { frequency } = req.body

  if (!frequency || !['daily', 'weekly', 'monthly'].includes(frequency)) {
    res.status(400).json({ error: 'Valid frequency required (daily, weekly, monthly)' })
    return
  }

  try {
    await newsletterService.sendScheduledNewsletters(frequency)

    res.json({
      success: true,
      message: `${frequency} newsletter send triggered`,
      frequency
    })
  } catch (error) {
    logger.error('Failed to send scheduled newsletter', { error, frequency })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send scheduled newsletter' 
    })
  }
}))

/**
 * @route GET /api/newsletter/stats
 * @desc Get newsletter statistics (Admin only)
 * @access Private (Admin)
 */
router.get('/stats', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  // Check if user is admin
  if (!req.user!.is_admin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  try {
    const stats = await newsletterService.getStats()

    res.json({
      success: true,
      stats
    })
  } catch (error) {
    logger.error('Failed to get newsletter stats', { error })
    res.status(500).json({ error: 'Failed to get statistics' })
  }
}))

export default router