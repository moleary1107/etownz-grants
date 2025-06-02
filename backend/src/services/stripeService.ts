import Stripe from 'stripe'
import { logger } from './logger'

// Simple Stripe service for eTownz Grants
export class StripeService {
  private stripe: Stripe

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required')
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16'
    })
  }

  // Create customer
  async createCustomer(data: {
    email: string
    name: string
    organizationName: string
  }) {
    try {
      const customer = await this.stripe.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          organization_name: data.organizationName
        }
      })

      logger.info('Stripe customer created', { customerId: customer.id, email: data.email })
      return customer
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, data })
      throw error
    }
  }

  // Create checkout session
  async createCheckoutSession(options: {
    customerId?: string
    priceId: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: options.customerId,
        payment_method_types: ['card'],
        line_items: [{
          price: options.priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        automatic_tax: { enabled: true },
        metadata: options.metadata || {}
      })

      logger.info('Checkout session created', { sessionId: session.id, customerId: options.customerId })
      return session
    } catch (error) {
      logger.error('Failed to create checkout session', { error, options })
      throw error
    }
  }

  // Create customer portal session
  async createPortalSession(customerId: string, returnUrl: string) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      })

      logger.info('Portal session created', { sessionId: session.id, customerId })
      return session
    } catch (error) {
      logger.error('Failed to create portal session', { error, customerId })
      throw error
    }
  }

  // Get customer with subscriptions
  async getCustomer(customerId: string) {
    try {
      const customer = await this.stripe.customers.retrieve(customerId, {
        expand: ['subscriptions']
      })

      return customer
    } catch (error) {
      logger.error('Failed to retrieve customer', { error, customerId })
      throw error
    }
  }

  // Handle webhook events
  async handleWebhook(body: Buffer, signature: string) {
    try {
      const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET
      if (!endpointSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET not configured')
      }

      const event = this.stripe.webhooks.constructEvent(body, signature, endpointSecret)
      
      logger.info('Stripe webhook received', { type: event.type, id: event.id })

      // Handle different event types
      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice)
          break
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object as Stripe.Invoice)
          break
        default:
          logger.info('Unhandled webhook event', { type: event.type })
      }

      return { received: true }
    } catch (error) {
      logger.error('Webhook processing failed', { error })
      throw error
    }
  }

  private async handleSubscriptionCreated(subscription: Stripe.Subscription) {
    // Update user's subscription status in database
    logger.info('Subscription created', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    })
    // TODO: Update user record in database
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    logger.info('Subscription updated', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer,
      status: subscription.status
    })
    // TODO: Update user record in database
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    logger.info('Subscription cancelled', { 
      subscriptionId: subscription.id,
      customerId: subscription.customer
    })
    // TODO: Update user record in database
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    logger.info('Payment succeeded', { 
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid
    })
    // TODO: Update payment record in database
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    logger.warn('Payment failed', { 
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due
    })
    // TODO: Handle failed payment (email notification, etc.)
  }
}

// Export singleton instance
export const stripeService = new StripeService()