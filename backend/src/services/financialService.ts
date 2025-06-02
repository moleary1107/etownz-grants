import Stripe from 'stripe'
import { logger } from './logger'

// Ireland Financial Infrastructure Configuration
export interface IrelandFinancialConfig {
  stripe: {
    entity: string
    regulation: {
      authority: string
      license: string
      reference: string
      compliance: string[]
    }
    baseCurrency: string
    supportedCurrencies: string[]
    feeStructure: {
      domesticCards: { rate: string; fixedFee: string }
      europeanCards: { rate: string; fixedFee: string }
      internationalCards: { rate: string; fixedFee: string }
      sepaTransfers: { rate: string; cap: string }
    }
  }
  vat: {
    standardRate: number
    reducedRates: { rate1: number; rate2: number; zeroRated: number }
    saasClassification: {
      vatRate: number
      type: string
      b2bReverseCharge: boolean
      b2cVatRequired: boolean
    }
    registration: {
      thresholdResidents: string
      thresholdNonResidents: string
      immediateRegistration: boolean
      vatNumberFormat: string
    }
  }
}

export const IRELAND_FINANCIAL_CONFIG: IrelandFinancialConfig = {
  stripe: {
    entity: 'Stripe Technology Europe Limited',
    regulation: {
      authority: 'Central Bank of Ireland',
      license: 'E-Money Institution',
      reference: 'C187865',
      compliance: ['PSD2', 'GDPR', 'AML5']
    },
    baseCurrency: 'EUR',
    supportedCurrencies: ['EUR', 'GBP', 'USD', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK'],
    feeStructure: {
      domesticCards: { rate: '1.5%', fixedFee: '€0.25' },
      europeanCards: { rate: '1.5%', fixedFee: '€0.25' },
      internationalCards: { rate: '3.25%', fixedFee: '€0.25' },
      sepaTransfers: { rate: '0.8%', cap: '€5.00' }
    }
  },
  vat: {
    standardRate: 23,
    reducedRates: { rate1: 13.5, rate2: 9, zeroRated: 0 },
    saasClassification: {
      vatRate: 23,
      type: 'electronically_supplied_service',
      b2bReverseCharge: true,
      b2cVatRequired: true
    },
    registration: {
      thresholdResidents: '€37,500',
      thresholdNonResidents: '€0',
      immediateRegistration: true,
      vatNumberFormat: 'IE[0-9]{7}[A-Z]{1,2}'
    }
  }
}

// Subscription Tier Configuration
export interface SubscriptionTier {
  id: string
  name: string
  monthlyPriceEur: number
  annualPriceEur: number
  features: {
    grantApplications: number | 'unlimited'
    users: number | 'unlimited'
    aiCredits: number | 'unlimited'
    documentStorage: number // GB
    prioritySupport: boolean
    customIntegrations: boolean
  }
}

export const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPriceEur: 99,
    annualPriceEur: 990,
    features: {
      grantApplications: 10,
      users: 3,
      aiCredits: 100,
      documentStorage: 10,
      prioritySupport: false,
      customIntegrations: false
    }
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPriceEur: 299,
    annualPriceEur: 2990,
    features: {
      grantApplications: 50,
      users: 10,
      aiCredits: 500,
      documentStorage: 100,
      prioritySupport: true,
      customIntegrations: false
    }
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPriceEur: 999,
    annualPriceEur: 9990,
    features: {
      grantApplications: 'unlimited',
      users: 'unlimited',
      aiCredits: 'unlimited',
      documentStorage: 1000,
      prioritySupport: true,
      customIntegrations: true
    }
  }
]

// Usage-based pricing components
export interface UsageComponent {
  id: string
  name: string
  unit: string
  pricePerUnit: number
  currency: string
}

export const USAGE_COMPONENTS: UsageComponent[] = [
  {
    id: 'ai_processing',
    name: 'AI Processing Credits',
    unit: 'credit',
    pricePerUnit: 0.25, // €0.25 per credit
    currency: 'EUR'
  },
  {
    id: 'additional_users',
    name: 'Additional Users',
    unit: 'user_per_month',
    pricePerUnit: 15,
    currency: 'EUR'
  },
  {
    id: 'document_storage',
    name: 'Document Storage',
    unit: 'gb_per_month',
    pricePerUnit: 0.50,
    currency: 'EUR'
  }
]

// EU VAT rates by country
export const EU_VAT_RATES: Record<string, number> = {
  IE: 23, // Ireland
  DE: 19, // Germany
  FR: 20, // France
  ES: 21, // Spain
  IT: 22, // Italy
  NL: 21, // Netherlands
  BE: 21, // Belgium
  PL: 23, // Poland
  PT: 23, // Portugal
  SE: 25, // Sweden
  DK: 25, // Denmark
  FI: 24, // Finland
  AT: 20, // Austria
  CZ: 21, // Czech Republic
  HU: 27, // Hungary
  RO: 19, // Romania
  BG: 20, // Bulgaria
  HR: 25, // Croatia
  SI: 22, // Slovenia
  SK: 20, // Slovakia
  LT: 21, // Lithuania
  LV: 21, // Latvia
  EE: 20, // Estonia
  LU: 17, // Luxembourg
  MT: 18, // Malta
  CY: 19  // Cyprus
}

// Financial Service Class
export class FinancialService {
  private stripe: Stripe
  private vatService: VATService
  private billingService: BillingService

  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required for financial services')
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      appInfo: {
        name: 'eTownz Grants',
        version: '1.0.0'
      }
    })

    this.vatService = new VATService()
    this.billingService = new BillingService(this.stripe, this.vatService)
  }

  // Create customer with Irish compliance
  async createCustomer(customerData: {
    email: string
    name: string
    organizationName: string
    address: {
      line1: string
      city: string
      postal_code: string
      country: string
    }
    vatNumber?: string
  }) {
    try {
      const customer = await this.stripe.customers.create({
        email: customerData.email,
        name: customerData.name,
        address: customerData.address,
        metadata: {
          organization_name: customerData.organizationName,
          vat_number: customerData.vatNumber || '',
          country: customerData.address.country
        },
        tax: {
          validate_location: 'immediately'
        }
      })

      logger.info('Customer created successfully', {
        customerId: customer.id,
        email: customerData.email,
        country: customerData.address.country
      })

      return customer
    } catch (error) {
      logger.error('Failed to create customer', { error, customerData })
      throw error
    }
  }

  // Create subscription with Irish VAT
  async createSubscription(customerId: string, tierId: string, billingPeriod: 'monthly' | 'annual') {
    try {
      const tier = SUBSCRIPTION_TIERS.find(t => t.id === tierId)
      if (!tier) {
        throw new Error(`Invalid subscription tier: ${tierId}`)
      }

      const price = billingPeriod === 'monthly' ? tier.monthlyPriceEur : tier.annualPriceEur
      const interval = billingPeriod === 'monthly' ? 'month' : 'year'

      // Create price object
      const priceObject = await this.stripe.prices.create({
        unit_amount: Math.round(price * 100), // Convert to cents
        currency: 'eur',
        recurring: {
          interval: interval
        },
        product_data: {
          name: `${tier.name} Plan`,
          metadata: {
            tier_id: tierId,
            features: JSON.stringify(tier.features)
          }
        },
        tax_behavior: 'exclusive' // VAT will be added on top
      })

      // Create subscription
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [{
          price: priceObject.id
        }],
        payment_behavior: 'default_incomplete',
        payment_settings: {
          save_default_payment_method: 'on_subscription'
        },
        expand: ['latest_invoice.payment_intent'],
        automatic_tax: {
          enabled: true
        },
        metadata: {
          tier_id: tierId,
          billing_period: billingPeriod
        }
      })

      logger.info('Subscription created successfully', {
        subscriptionId: subscription.id,
        customerId,
        tierId,
        billingPeriod
      })

      return subscription
    } catch (error) {
      logger.error('Failed to create subscription', { error, customerId, tierId })
      throw error
    }
  }

  // Get pricing for display (with VAT calculation)
  async getPricingForCountry(countryCode: string): Promise<{
    tiers: (SubscriptionTier & { 
      monthlyPriceWithVat: number
      annualPriceWithVat: number
      vatRate: number
    })[]
    usageComponents: (UsageComponent & { priceWithVat: number; vatRate: number })[]
  }> {
    const vatRate = await this.vatService.getVATRate(countryCode)

    const tiersWithVat = SUBSCRIPTION_TIERS.map(tier => ({
      ...tier,
      monthlyPriceWithVat: tier.monthlyPriceEur * (1 + vatRate / 100),
      annualPriceWithVat: tier.annualPriceEur * (1 + vatRate / 100),
      vatRate
    }))

    const usageWithVat = USAGE_COMPONENTS.map(component => ({
      ...component,
      priceWithVat: component.pricePerUnit * (1 + vatRate / 100),
      vatRate
    }))

    return {
      tiers: tiersWithVat,
      usageComponents: usageWithVat
    }
  }

  // Handle usage-based billing
  async recordUsage(subscriptionId: string, componentId: string, quantity: number) {
    try {
      const component = USAGE_COMPONENTS.find(c => c.id === componentId)
      if (!component) {
        throw new Error(`Invalid usage component: ${componentId}`)
      }

      // This would typically integrate with a usage tracking system
      // For now, we'll create a usage record that can be billed later
      const usageRecord = await this.stripe.subscriptionItems.createUsageRecord(
        'si_subscription_item_id', // This would be the actual subscription item ID
        {
          quantity,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment'
        }
      )

      logger.info('Usage recorded successfully', {
        subscriptionId,
        componentId,
        quantity,
        usageRecordId: usageRecord.id
      })

      return usageRecord
    } catch (error) {
      logger.error('Failed to record usage', { error, subscriptionId, componentId })
      throw error
    }
  }

  // Get financial dashboard data
  async getDashboardData() {
    try {
      const [customers, subscriptions, invoices] = await Promise.all([
        this.stripe.customers.list({ limit: 100 }),
        this.stripe.subscriptions.list({ status: 'active', limit: 100 }),
        this.stripe.invoices.list({ status: 'paid', limit: 100 })
      ])

      const totalRevenue = invoices.data.reduce((sum, invoice) => sum + (invoice.amount_paid || 0), 0) / 100
      const monthlyRecurringRevenue = subscriptions.data.reduce((sum, sub) => {
        const item = sub.items.data[0]
        if (item?.price) {
          const amount = item.price.unit_amount || 0
          const interval = item.price.recurring?.interval
          if (interval === 'month') {
            return sum + amount / 100
          } else if (interval === 'year') {
            return sum + (amount / 100) / 12
          }
        }
        return sum
      }, 0)

      return {
        totalCustomers: customers.data.length,
        activeSubscriptions: subscriptions.data.length,
        totalRevenue,
        monthlyRecurringRevenue,
        averageRevenuePerUser: totalRevenue / customers.data.length || 0
      }
    } catch (error) {
      logger.error('Failed to get dashboard data', { error })
      throw error
    }
  }
}

// VAT Service for Irish and EU compliance
export class VATService {
  async getVATRate(countryCode: string): Promise<number> {
    // Check if it's an EU country
    if (EU_VAT_RATES[countryCode]) {
      return EU_VAT_RATES[countryCode]
    }
    
    // Non-EU countries don't charge VAT
    return 0
  }

  async validateVATNumber(vatNumber: string, countryCode: string): Promise<boolean> {
    try {
      // This would integrate with the EU VIES system for real VAT validation
      // For now, we'll do basic format validation
      const patterns: Record<string, RegExp> = {
        IE: /^IE[0-9]{7}[A-Z]{1,2}$/,
        DE: /^DE[0-9]{9}$/,
        FR: /^FR[A-Z0-9]{2}[0-9]{9}$/,
        // Add more patterns as needed
      }

      const pattern = patterns[countryCode]
      if (!pattern) {
        return false
      }

      return pattern.test(vatNumber)
    } catch (error) {
      logger.error('VAT validation failed', { error, vatNumber, countryCode })
      return false
    }
  }

  async isReverseChargeApplicable(customerCountry: string, vatNumber?: string): Promise<boolean> {
    // B2B reverse charge applies for EU customers with valid VAT numbers (except Ireland)
    if (customerCountry === 'IE') {
      return false // Domestic sales
    }

    if (EU_VAT_RATES[customerCountry] && vatNumber) {
      const isValid = await this.validateVATNumber(vatNumber, customerCountry)
      return isValid
    }

    return false
  }
}

// Billing Service for subscription management
export class BillingService {
  constructor(
    private stripe: Stripe,
    private vatService: VATService
  ) {}

  async createCheckoutSession(options: {
    customerId: string
    priceId: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }) {
    try {
      const session = await this.stripe.checkout.sessions.create({
        customer: options.customerId,
        payment_method_types: ['card', 'sepa_debit'],
        line_items: [{
          price: options.priceId,
          quantity: 1
        }],
        mode: 'subscription',
        success_url: options.successUrl,
        cancel_url: options.cancelUrl,
        automatic_tax: {
          enabled: true
        },
        metadata: options.metadata || {},
        allow_promotion_codes: true
      })

      return session
    } catch (error) {
      logger.error('Failed to create checkout session', { error, options })
      throw error
    }
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    try {
      const session = await this.stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl
      })

      return session
    } catch (error) {
      logger.error('Failed to create customer portal session', { error, customerId })
      throw error
    }
  }
}

// Export the main service instance
export const financialService = new FinancialService()