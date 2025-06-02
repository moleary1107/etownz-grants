import { logger } from './logger'

// Multi-currency banking configuration for Ireland
export interface BankingProvider {
  id: string
  name: string
  type: 'traditional' | 'digital'
  supportedCurrencies: string[]
  fees: {
    monthlyMaintenance?: number
    transactionFees?: number
    internationalWire?: number
    fxMarkup?: number
  }
  features: {
    multiCurrency: boolean
    apiAccess: boolean
    bulkPayments: boolean
    realTimeNotifications: boolean
    teamCards: boolean
  }
  businessSupport: {
    startupBenefits?: boolean
    feeWaiverPeriod?: string
    dedicatedSupport?: boolean
  }
}

// Banking provider configurations
export const BANKING_PROVIDERS: BankingProvider[] = [
  {
    id: 'aib_startup',
    name: 'AIB Business Banking (Startup)',
    type: 'traditional',
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF'],
    fees: {
      monthlyMaintenance: 0, // Waived for 24 months
      transactionFees: 0, // Waived for startups
      internationalWire: 25,
      fxMarkup: 2.5
    },
    features: {
      multiCurrency: true,
      apiAccess: false,
      bulkPayments: true,
      realTimeNotifications: true,
      teamCards: false
    },
    businessSupport: {
      startupBenefits: true,
      feeWaiverPeriod: '24_months',
      dedicatedSupport: true
    }
  },
  {
    id: 'wise_business',
    name: 'Wise Business Account',
    type: 'digital',
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'AUD', 'NZD', 'CAD', 'SGD', 'RON', 'HUF', 'PLN', 'CZK', 'SEK', 'NOK', 'DKK'],
    fees: {
      monthlyMaintenance: 0,
      transactionFees: 0,
      internationalWire: 3.69, // Maximum
      fxMarkup: 0.33 // Minimum, up to 2.85%
    },
    features: {
      multiCurrency: true,
      apiAccess: true,
      bulkPayments: true,
      realTimeNotifications: true,
      teamCards: true
    },
    businessSupport: {
      startupBenefits: true,
      dedicatedSupport: false
    }
  },
  {
    id: 'revolut_business',
    name: 'Revolut Business',
    type: 'digital',
    supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF', 'PLN', 'RON', 'SEK', 'NOK', 'DKK', 'CZK', 'HUF'],
    fees: {
      monthlyMaintenance: 29, // Grow plan
      transactionFees: 0, // 100 free transfers on Grow plan
      internationalWire: 5,
      fxMarkup: 0.5 // Weekdays, 1% weekends
    },
    features: {
      multiCurrency: true,
      apiAccess: true,
      bulkPayments: true,
      realTimeNotifications: true,
      teamCards: true
    },
    businessSupport: {
      startupBenefits: false,
      dedicatedSupport: true
    }
  },
  {
    id: 'fire_business',
    name: 'Fire Business Account',
    type: 'digital',
    supportedCurrencies: ['EUR', 'GBP'],
    fees: {
      monthlyMaintenance: 0,
      transactionFees: 0,
      internationalWire: 15,
      fxMarkup: 1.0
    },
    features: {
      multiCurrency: true,
      apiAccess: true,
      bulkPayments: false,
      realTimeNotifications: true,
      teamCards: true
    },
    businessSupport: {
      startupBenefits: true,
      dedicatedSupport: true
    }
  }
]

// SEPA payment configuration
export interface SEPAConfig {
  enabled: boolean
  instantPayments: {
    available: boolean
    processingTime: string
    availability: string
  }
  directDebit: {
    enabled: boolean
    schemes: string[]
  }
  ibanFormat: {
    ireland: string
    validation: RegExp
  }
}

export const SEPA_CONFIG: SEPAConfig = {
  enabled: true,
  instantPayments: {
    available: true,
    processingTime: '10_seconds',
    availability: '24/7'
  },
  directDebit: {
    enabled: true,
    schemes: ['core', 'b2b']
  },
  ibanFormat: {
    ireland: 'IE[0-9]{2}[A-Z]{4}[0-9]{14}',
    validation: /^IE[0-9]{2}[A-Z]{4}[0-9]{14}$/
  }
}

// Currency exchange and multi-currency strategy
export interface CurrencyStrategy {
  baseCurrency: string
  supportedCurrencies: string[]
  exchangeProviders: {
    primary: string
    backup: string[]
  }
  riskManagement: {
    naturalHedging: boolean
    forwardContracts: boolean
    markupStrategy: string
  }
  settlementOptimization: {
    holdLocalCurrencies: boolean
    batchConversions: string
    thresholdTriggers: number
  }
}

export const CURRENCY_STRATEGY: CurrencyStrategy = {
  baseCurrency: 'EUR',
  supportedCurrencies: ['EUR', 'USD', 'GBP', 'CAD', 'AUD', 'NZD', 'CHF', 'SEK', 'NOK', 'DKK'],
  exchangeProviders: {
    primary: 'wise',
    backup: ['revolut', 'xe_money', 'currencies_direct']
  },
  riskManagement: {
    naturalHedging: true,
    forwardContracts: true,
    markupStrategy: 'transparent_fx_fees'
  },
  settlementOptimization: {
    holdLocalCurrencies: true,
    batchConversions: 'weekly',
    thresholdTriggers: 10000 // EUR equivalent
  }
}

// Exchange rates service
export class ExchangeRateService {
  private cachedRates: Map<string, { rate: number; timestamp: Date }> = new Map()
  private cacheValidityMinutes = 15

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      if (fromCurrency === toCurrency) {
        return 1.0
      }

      const cacheKey = `${fromCurrency}_${toCurrency}`
      const cached = this.cachedRates.get(cacheKey)
      
      if (cached && this.isRateValid(cached.timestamp)) {
        return cached.rate
      }

      // In a real implementation, this would call a real exchange rate API
      // For now, we'll use mock rates based on approximate current rates
      const rate = await this.fetchLiveRate(fromCurrency, toCurrency)
      
      this.cachedRates.set(cacheKey, {
        rate,
        timestamp: new Date()
      })

      return rate
    } catch (error) {
      logger.error('Failed to get exchange rate', { error, fromCurrency, toCurrency })
      throw new Error(`Failed to get exchange rate for ${fromCurrency} to ${toCurrency}`)
    }
  }

  private async fetchLiveRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // Mock exchange rates - in production, integrate with:
    // - ECB API for EUR rates
    // - Wise API for real-time rates
    // - XE API or similar for backup
    
    const mockRates: Record<string, Record<string, number>> = {
      EUR: {
        USD: 1.08,
        GBP: 0.84,
        CHF: 0.95,
        CAD: 1.47,
        AUD: 1.65,
        NZD: 1.78,
        SEK: 11.45,
        NOK: 11.85,
        DKK: 7.46
      },
      USD: {
        EUR: 0.93,
        GBP: 0.78,
        CAD: 1.36,
        AUD: 1.53
      },
      GBP: {
        EUR: 1.19,
        USD: 1.28
      }
    }

    const rate = mockRates[fromCurrency]?.[toCurrency]
    if (!rate) {
      // Calculate inverse rate if available
      const inverseRate = mockRates[toCurrency]?.[fromCurrency]
      if (inverseRate) {
        return 1 / inverseRate
      }
      throw new Error(`Exchange rate not available for ${fromCurrency} to ${toCurrency}`)
    }

    return rate
  }

  private isRateValid(timestamp: Date): boolean {
    const now = new Date()
    const diffMinutes = (now.getTime() - timestamp.getTime()) / (1000 * 60)
    return diffMinutes < this.cacheValidityMinutes
  }

  async convertAmount(amount: number, fromCurrency: string, toCurrency: string): Promise<{
    originalAmount: number
    convertedAmount: number
    exchangeRate: number
    fromCurrency: string
    toCurrency: string
    timestamp: Date
  }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency)
    const convertedAmount = amount * rate

    return {
      originalAmount: amount,
      convertedAmount: Math.round(convertedAmount * 100) / 100, // Round to 2 decimal places
      exchangeRate: rate,
      fromCurrency,
      toCurrency,
      timestamp: new Date()
    }
  }
}

// Banking service for managing financial operations
export class BankingService {
  private exchangeRateService: ExchangeRateService

  constructor() {
    this.exchangeRateService = new ExchangeRateService()
  }

  // Get recommended banking provider based on business needs
  getRecommendedProvider(criteria: {
    isStartup: boolean
    monthlyVolume: number
    primaryCurrencies: string[]
    needsAPI: boolean
  }): BankingProvider {
    const providers = BANKING_PROVIDERS.filter(provider => {
      // Filter by currency support
      const supportsCurrencies = criteria.primaryCurrencies.every(
        currency => provider.supportedCurrencies.includes(currency)
      )
      
      // Filter by API needs
      const hasAPI = !criteria.needsAPI || provider.features.apiAccess
      
      return supportsCurrencies && hasAPI
    })

    if (criteria.isStartup) {
      // Prefer providers with startup benefits
      const startupFriendly = providers.filter(p => p.businessSupport.startupBenefits)
      if (startupFriendly.length > 0) {
        // Return Wise for startups due to no fees and excellent API
        return startupFriendly.find(p => p.id === 'wise_business') || startupFriendly[0]
      }
    }

    if (criteria.monthlyVolume > 100000) {
      // For high volume, prefer traditional banks with better rates
      const traditional = providers.filter(p => p.type === 'traditional')
      if (traditional.length > 0) {
        return traditional[0]
      }
    }

    // Default to Wise for most cases
    return providers.find(p => p.id === 'wise_business') || providers[0]
  }

  // Calculate total banking costs for different providers
  async calculateBankingCosts(
    provider: BankingProvider,
    monthlyTransactions: number,
    averageTransactionAmount: number,
    internationalWires: number
  ): Promise<{
    monthlyMaintenance: number
    transactionCosts: number
    internationalWireCosts: number
    totalMonthlyCost: number
  }> {
    const monthlyMaintenance = provider.fees.monthlyMaintenance || 0
    const transactionCosts = monthlyTransactions * (provider.fees.transactionFees || 0)
    const internationalWireCosts = internationalWires * (provider.fees.internationalWire || 0)
    const totalMonthlyCost = monthlyMaintenance + transactionCosts + internationalWireCosts

    return {
      monthlyMaintenance,
      transactionCosts,
      internationalWireCosts,
      totalMonthlyCost
    }
  }

  // Validate IBAN format
  validateIBAN(iban: string, countryCode: string = 'IE'): boolean {
    try {
      // Remove spaces and convert to uppercase
      const cleanIBAN = iban.replace(/\s/g, '').toUpperCase()
      
      if (countryCode === 'IE') {
        return SEPA_CONFIG.ibanFormat.validation.test(cleanIBAN)
      }
      
      // Basic IBAN validation for other countries
      // This would be expanded for production use
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(cleanIBAN) && cleanIBAN.length >= 15
    } catch (error) {
      logger.error('IBAN validation failed', { error, iban, countryCode })
      return false
    }
  }

  // Get currency display format for different locales
  formatCurrency(amount: number, currency: string, locale: string = 'en-IE'): string {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount)
    } catch (error) {
      logger.error('Currency formatting failed', { error, amount, currency, locale })
      return `${currency} ${amount.toFixed(2)}`
    }
  }

  // Get supported payment methods for a country
  getSupportedPaymentMethods(countryCode: string): {
    cards: string[]
    bankTransfers: string[]
    digitalWallets: string[]
    localMethods: string[]
  } {
    const euCountries = [
      'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
      'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
      'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
    ]

    const basePaymentMethods = {
      cards: ['visa', 'mastercard'] as string[],
      bankTransfers: [] as string[],
      digitalWallets: ['apple_pay', 'google_pay'] as string[],
      localMethods: [] as string[]
    }

    if (euCountries.includes(countryCode)) {
      basePaymentMethods.bankTransfers.push('sepa_credit_transfer', 'sepa_direct_debit')
      if (SEPA_CONFIG.instantPayments.available) {
        basePaymentMethods.bankTransfers.push('sepa_instant')
      }
    }

    // Add country-specific methods
    switch (countryCode) {
      case 'IE':
        basePaymentMethods.cards.push('maestro')
        basePaymentMethods.localMethods.push('paypal')
        break
      case 'GB':
        basePaymentMethods.bankTransfers.push('faster_payments', 'bacs')
        basePaymentMethods.localMethods.push('paypal')
        break
      case 'US':
        basePaymentMethods.bankTransfers.push('ach')
        basePaymentMethods.cards.push('amex', 'discover')
        break
      case 'DE':
        basePaymentMethods.localMethods.push('giropay', 'sofort')
        break
      case 'NL':
        basePaymentMethods.localMethods.push('ideal')
        break
    }

    return basePaymentMethods
  }

  // Exchange rate service access
  getExchangeRateService(): ExchangeRateService {
    return this.exchangeRateService
  }
}

// Export services
export const bankingService = new BankingService()
export const exchangeRateService = new ExchangeRateService()