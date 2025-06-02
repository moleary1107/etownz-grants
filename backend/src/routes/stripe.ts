import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { stripeService } from '../services/stripeService'
import { logger } from '../services/logger'

const router = express.Router()

/**
 * @swagger
 * /api/stripe/create-checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Stripe Price ID
 *               successUrl:
 *                 type: string
 *                 default: https://grants.etownz.com/dashboard?payment=success
 *               cancelUrl:
 *                 type: string
 *                 default: https://grants.etownz.com/pricing?payment=cancelled
 *     responses:
 *       201:
 *         description: Checkout session created
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/create-checkout', authenticateToken, async (req, res) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body
    const user = (req as any).user

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'priceId is required'
      })
    }

    // Create customer if they don't exist
    let customerId = user.stripeCustomerId
    if (!customerId) {
      const customer = await stripeService.createCustomer({
        email: user.email,
        name: user.name || user.email,
        organizationName: user.organizationName || 'Default Organization'
      })
      customerId = customer.id
      // TODO: Save customerId to user record in database
    }

    const session = await stripeService.createCheckoutSession({
      customerId,
      priceId,
      successUrl: successUrl || 'https://grants.etownz.com/dashboard?payment=success',
      cancelUrl: cancelUrl || 'https://grants.etownz.com/pricing?payment=cancelled',
      metadata: {
        userId: user.id,
        organizationId: user.organizationId || ''
      }
    })

    res.status(201).json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url
      }
    })
  } catch (error) {
    logger.error('Failed to create checkout session', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to create checkout session'
    })
  }
})

/**
 * @swagger
 * /api/stripe/create-portal:
 *   post:
 *     summary: Create customer portal session
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               returnUrl:
 *                 type: string
 *                 default: https://grants.etownz.com/dashboard
 *     responses:
 *       201:
 *         description: Portal session created
 *       400:
 *         description: User has no Stripe customer ID
 *       401:
 *         description: Unauthorized
 */
router.post('/create-portal', authenticateToken, async (req, res) => {
  try {
    const { returnUrl } = req.body
    const user = (req as any).user

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No subscription found. Please subscribe first.'
      })
    }

    const session = await stripeService.createPortalSession(
      user.stripeCustomerId,
      returnUrl || 'https://grants.etownz.com/dashboard'
    )

    res.status(201).json({
      success: true,
      data: {
        url: session.url
      }
    })
  } catch (error) {
    logger.error('Failed to create portal session', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to create portal session'
    })
  }
})

/**
 * @swagger
 * /api/stripe/customer:
 *   get:
 *     summary: Get customer subscription info
 *     tags: [Stripe]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Customer information retrieved
 *       400:
 *         description: User has no Stripe customer ID
 *       401:
 *         description: Unauthorized
 */
router.get('/customer', authenticateToken, async (req, res) => {
  try {
    const user = (req as any).user

    if (!user.stripeCustomerId) {
      return res.status(400).json({
        success: false,
        error: 'No Stripe customer found'
      })
    }

    const customer = await stripeService.getCustomer(user.stripeCustomerId)

    res.json({
      success: true,
      data: {
        id: customer.id,
        email: (customer as any).email,
        subscriptions: (customer as any).subscriptions?.data || []
      }
    })
  } catch (error) {
    logger.error('Failed to get customer', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve customer information'
    })
  }
})

/**
 * @swagger
 * /api/stripe/webhook:
 *   post:
 *     summary: Handle Stripe webhooks
 *     tags: [Stripe]
 *     description: Endpoint for Stripe webhook events
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Invalid webhook signature
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'] as string
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' })
    }

    const result = await stripeService.handleWebhook(req.body, signature)
    
    res.json(result)
  } catch (error) {
    logger.error('Webhook processing failed', { error })
    res.status(400).json({ error: 'Webhook processing failed' })
  }
})

/**
 * @swagger
 * /api/stripe/pricing:
 *   get:
 *     summary: Get available pricing tiers
 *     tags: [Stripe]
 *     responses:
 *       200:
 *         description: Pricing information
 */
router.get('/pricing', async (req, res) => {
  try {
    // Simple pricing structure - these would be created as Products in Stripe Dashboard
    const pricing = {
      starter: {
        name: 'Starter',
        description: 'Perfect for small organizations getting started',
        monthlyPrice: 99,
        yearlyPrice: 990,
        currency: 'EUR',
        features: [
          '10 grant applications',
          '3 team members',
          '100 AI credits',
          'Email support'
        ],
        // These would be actual Stripe Price IDs from your dashboard
        monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID || 'price_starter_monthly',
        yearlyPriceId: process.env.STRIPE_STARTER_YEARLY_PRICE_ID || 'price_starter_yearly'
      },
      professional: {
        name: 'Professional',
        description: 'For growing organizations with more needs',
        monthlyPrice: 299,
        yearlyPrice: 2990,
        currency: 'EUR',
        features: [
          '50 grant applications',
          '10 team members',
          '500 AI credits',
          'Priority support',
          'Advanced analytics'
        ],
        monthlyPriceId: process.env.STRIPE_PROFESSIONAL_MONTHLY_PRICE_ID || 'price_professional_monthly',
        yearlyPriceId: process.env.STRIPE_PROFESSIONAL_YEARLY_PRICE_ID || 'price_professional_yearly'
      },
      enterprise: {
        name: 'Enterprise',
        description: 'For large organizations with custom needs',
        monthlyPrice: 999,
        yearlyPrice: 9990,
        currency: 'EUR',
        features: [
          'Unlimited grant applications',
          'Unlimited team members',
          'Unlimited AI credits',
          'Dedicated support',
          'Custom integrations',
          'SLA guarantee'
        ],
        monthlyPriceId: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly',
        yearlyPriceId: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly'
      }
    }

    res.json({
      success: true,
      data: pricing,
      metadata: {
        currency: 'EUR',
        vatIncluded: false,
        vatNote: 'VAT will be calculated at checkout based on your location'
      }
    })
  } catch (error) {
    logger.error('Failed to get pricing', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve pricing information'
    })
  }
})

export default router