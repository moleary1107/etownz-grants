import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { financialService, SUBSCRIPTION_TIERS, USAGE_COMPONENTS } from '../services/financialService'
import { logger } from '../services/logger'

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     SubscriptionTier:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         monthlyPriceEur:
 *           type: number
 *         annualPriceEur:
 *           type: number
 *         features:
 *           type: object
 *     BillingAddress:
 *       type: object
 *       properties:
 *         line1:
 *           type: string
 *         city:
 *           type: string
 *         postal_code:
 *           type: string
 *         country:
 *           type: string
 */

/**
 * @swagger
 * /api/billing/pricing:
 *   get:
 *     summary: Get pricing information for a specific country
 *     tags: [Billing]
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country code (ISO 3166-1 alpha-2)
 *     responses:
 *       200:
 *         description: Pricing information with VAT calculations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tiers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionTier'
 *                 usageComponents:
 *                   type: array
 *                 vatRate:
 *                   type: number
 */
router.get('/pricing', async (req, res) => {
  try {
    const countryCode = (req.query.country as string) || 'IE'
    
    const pricing = await financialService.getPricingForCountry(countryCode.toUpperCase())
    
    res.json({
      success: true,
      data: pricing,
      metadata: {
        baseCurrency: 'EUR',
        countryCode: countryCode.toUpperCase(),
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Failed to get pricing', { error, query: req.query })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing information'
    })
  }
})

/**
 * @swagger
 * /api/billing/customer:
 *   post:
 *     summary: Create a new customer
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - organizationName
 *               - address
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               organizationName:
 *                 type: string
 *               address:
 *                 $ref: '#/components/schemas/BillingAddress'
 *               vatNumber:
 *                 type: string
 *     responses:
 *       201:
 *         description: Customer created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/customer', authenticateToken, async (req, res) => {
  try {
    const { email, name, organizationName, address, vatNumber } = req.body
    
    // Validate required fields
    if (!email || !name || !organizationName || !address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, name, organizationName, address'
      })
    }

    // Validate address structure
    if (!address.line1 || !address.city || !address.postal_code || !address.country) {
      return res.status(400).json({
        success: false,
        error: 'Incomplete address information'
      })
    }

    const customer = await financialService.createCustomer({
      email,
      name,
      organizationName,
      address,
      vatNumber
    })

    res.status(201).json({
      success: true,
      data: {
        customerId: customer.id,
        email: customer.email,
        name: customer.name
      }
    })
  } catch (error) {
    logger.error('Failed to create customer', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    })
  }
})

/**
 * @swagger
 * /api/billing/subscription:
 *   post:
 *     summary: Create a new subscription
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - tierId
 *               - billingPeriod
 *             properties:
 *               customerId:
 *                 type: string
 *               tierId:
 *                 type: string
 *                 enum: [starter, professional, enterprise]
 *               billingPeriod:
 *                 type: string
 *                 enum: [monthly, annual]
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/subscription', authenticateToken, async (req, res) => {
  try {
    const { customerId, tierId, billingPeriod } = req.body
    
    // Validate required fields
    if (!customerId || !tierId || !billingPeriod) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId, tierId, billingPeriod'
      })
    }

    // Validate tier and billing period
    const validTiers = SUBSCRIPTION_TIERS.map(t => t.id)
    const validPeriods = ['monthly', 'annual']
    
    if (!validTiers.includes(tierId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid tier. Must be one of: ${validTiers.join(', ')}`
      })
    }

    if (!validPeriods.includes(billingPeriod)) {
      return res.status(400).json({
        success: false,
        error: `Invalid billing period. Must be one of: ${validPeriods.join(', ')}`
      })
    }

    const subscription = await financialService.createSubscription(customerId, tierId, billingPeriod as 'monthly' | 'annual')

    res.status(201).json({
      success: true,
      data: {
        subscriptionId: subscription.id,
        status: subscription.status,
        clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
      }
    })
  } catch (error) {
    logger.error('Failed to create subscription', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription'
    })
  }
})

/**
 * @swagger
 * /api/billing/usage:
 *   post:
 *     summary: Record usage for billing
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - componentId
 *               - quantity
 *             properties:
 *               subscriptionId:
 *                 type: string
 *               componentId:
 *                 type: string
 *                 enum: [ai_processing, additional_users, document_storage]
 *               quantity:
 *                 type: number
 *     responses:
 *       200:
 *         description: Usage recorded successfully
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/usage', authenticateToken, async (req, res) => {
  try {
    const { subscriptionId, componentId, quantity } = req.body
    
    // Validate required fields
    if (!subscriptionId || !componentId || quantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: subscriptionId, componentId, quantity'
      })
    }

    // Validate component ID
    const validComponents = USAGE_COMPONENTS.map(c => c.id)
    if (!validComponents.includes(componentId)) {
      return res.status(400).json({
        success: false,
        error: `Invalid component. Must be one of: ${validComponents.join(', ')}`
      })
    }

    // Validate quantity
    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a non-negative number'
      })
    }

    const usageRecord = await financialService.recordUsage(subscriptionId, componentId, quantity)

    res.json({
      success: true,
      data: {
        usageRecordId: usageRecord.id,
        quantity: usageRecord.quantity,
        timestamp: usageRecord.timestamp
      }
    })
  } catch (error) {
    logger.error('Failed to record usage', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to record usage'
    })
  }
})

/**
 * @swagger
 * /api/billing/dashboard:
 *   get:
 *     summary: Get billing dashboard data
 *     tags: [Billing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalCustomers:
 *                   type: number
 *                 activeSubscriptions:
 *                   type: number
 *                 totalRevenue:
 *                   type: number
 *                 monthlyRecurringRevenue:
 *                   type: number
 *                 averageRevenuePerUser:
 *                   type: number
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Check if user has admin permissions
    const user = (req as any).user
    if (!user || !['super_admin', 'organization_admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to access billing dashboard'
      })
    }

    const dashboardData = await financialService.getDashboardData()

    res.json({
      success: true,
      data: dashboardData,
      metadata: {
        currency: 'EUR',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Failed to get billing dashboard data', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data'
    })
  }
})

/**
 * @swagger
 * /api/billing/tiers:
 *   get:
 *     summary: Get available subscription tiers
 *     tags: [Billing]
 *     responses:
 *       200:
 *         description: Subscription tiers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tiers:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/SubscriptionTier'
 *                 usageComponents:
 *                   type: array
 */
router.get('/tiers', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        tiers: SUBSCRIPTION_TIERS,
        usageComponents: USAGE_COMPONENTS
      },
      metadata: {
        baseCurrency: 'EUR',
        timestamp: new Date().toISOString()
      }
    })
  } catch (error) {
    logger.error('Failed to get subscription tiers', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve subscription tiers'
    })
  }
})

/**
 * @swagger
 * /api/billing/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Billing]
 *     description: Endpoint for Stripe webhook events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const sig = req.headers['stripe-signature'] as string
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

    if (!endpointSecret) {
      logger.error('Stripe webhook secret not configured')
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    let event
    try {
      event = require('stripe').webhooks.constructEvent(req.body, sig, endpointSecret)
    } catch (err) {
      logger.error('Webhook signature verification failed', { error: err })
      return res.status(400).json({ error: 'Invalid signature' })
    }

    // Handle the webhook event
    switch (event.type) {
      case 'payment_intent.succeeded':
        logger.info('Payment succeeded', { paymentIntentId: event.data.object.id })
        // Handle successful payment
        break
      
      case 'payment_intent.payment_failed':
        logger.warn('Payment failed', { paymentIntentId: event.data.object.id })
        // Handle failed payment
        break
      
      case 'customer.subscription.created':
        logger.info('Subscription created', { subscriptionId: event.data.object.id })
        // Handle new subscription
        break
      
      case 'customer.subscription.updated':
        logger.info('Subscription updated', { subscriptionId: event.data.object.id })
        // Handle subscription changes
        break
      
      case 'customer.subscription.deleted':
        logger.info('Subscription cancelled', { subscriptionId: event.data.object.id })
        // Handle subscription cancellation
        break
      
      case 'invoice.payment_succeeded':
        logger.info('Invoice payment succeeded', { invoiceId: event.data.object.id })
        // Handle successful invoice payment
        break
      
      case 'invoice.payment_failed':
        logger.warn('Invoice payment failed', { invoiceId: event.data.object.id })
        // Handle failed invoice payment
        break

      default:
        logger.info('Unhandled webhook event', { type: event.type })
    }

    res.json({ received: true })
  } catch (error) {
    logger.error('Webhook processing failed', { error })
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})

export default router