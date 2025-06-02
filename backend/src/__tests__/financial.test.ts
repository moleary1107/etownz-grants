import { describe, test, expect, beforeEach, jest } from '@jest/globals'
import { FinancialService, VATService, BillingService } from '../services/financialService'
import { BankingService, ExchangeRateService } from '../services/bankingService'
import { SUBSCRIPTION_TIERS, USAGE_COMPONENTS, EU_VAT_RATES } from '../services/financialService'

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn().mockResolvedValue({ 
        id: 'cus_test123', 
        email: 'test@example.com',
        name: 'Test Customer'
      }),
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    prices: {
      create: jest.fn().mockResolvedValue({ id: 'price_test123' })
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ 
        id: 'sub_test123',
        status: 'active',
        latest_invoice: {
          payment_intent: { client_secret: 'pi_test_secret' }
        }
      }),
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    invoices: {
      list: jest.fn().mockResolvedValue({ data: [] })
    },
    subscriptionItems: {
      createUsageRecord: jest.fn().mockResolvedValue({ id: 'usage_test123' })
    }
  }))
})

describe('Financial Infrastructure', () => {
  describe('FinancialService', () => {
    let financialService: FinancialService

    beforeEach(() => {
      // Mock environment variable
      process.env.STRIPE_SECRET_KEY = 'sk_test_123'
      financialService = new FinancialService()
    })

    test('should create customer with Irish compliance', async () => {
      const customerData = {
        email: 'test@techinnovation.ie',
        name: 'John O\'Sullivan',
        organizationName: 'Tech Innovation Ltd',
        address: {
          line1: '123 Grafton Street',
          city: 'Dublin',
          postal_code: 'D02 ABC123',
          country: 'IE'
        },
        vatNumber: 'IE1234567A'
      }

      const customer = await financialService.createCustomer(customerData)
      
      expect(customer).toBeDefined()
      expect(customer.id).toBe('cus_test123')
      expect(customer.email).toBe('test@example.com')
    })

    test('should create subscription with correct pricing', async () => {
      const subscription = await financialService.createSubscription('cus_test123', 'professional', 'monthly')
      
      expect(subscription).toBeDefined()
      expect(subscription.id).toBe('sub_test123')
      expect(subscription.status).toBe('active')
    })

    test('should get pricing for Ireland with VAT', async () => {
      const pricing = await financialService.getPricingForCountry('IE')
      
      expect(pricing.tiers).toHaveLength(SUBSCRIPTION_TIERS.length)
      expect(pricing.usageComponents).toHaveLength(USAGE_COMPONENTS.length)
      
      // Check VAT is applied (23% for Ireland)
      const professionalTier = pricing.tiers.find(t => t.id === 'professional')
      expect(professionalTier?.vatRate).toBe(23)
      expect(professionalTier?.monthlyPriceWithVat).toBe(299 * 1.23)
    })

    test('should record usage for billing', async () => {
      const usageRecord = await financialService.recordUsage('sub_test123', 'ai_processing', 50)
      
      expect(usageRecord).toBeDefined()
      expect(usageRecord.id).toBe('usage_test123')
    })

    test('should get dashboard data', async () => {
      const dashboard = await financialService.getDashboardData()
      
      expect(dashboard).toBeDefined()
      expect(dashboard.totalCustomers).toBeDefined()
      expect(dashboard.activeSubscriptions).toBeDefined()
      expect(dashboard.totalRevenue).toBeDefined()
      expect(dashboard.monthlyRecurringRevenue).toBeDefined()
    })
  })

  describe('VATService', () => {
    let vatService: VATService

    beforeEach(() => {
      vatService = new VATService()
    })

    test('should return correct VAT rate for Ireland', async () => {
      const rate = await vatService.getVATRate('IE')
      expect(rate).toBe(23)
    })

    test('should return correct VAT rate for Germany', async () => {
      const rate = await vatService.getVATRate('DE')
      expect(rate).toBe(19)
    })

    test('should return 0% VAT for non-EU countries', async () => {
      const rate = await vatService.getVATRate('US')
      expect(rate).toBe(0)
    })

    test('should validate Irish VAT number format', async () => {
      const validIrishVat = 'IE1234567A'
      const isValid = await vatService.validateVATNumber(validIrishVat, 'IE')
      expect(isValid).toBe(true)

      const invalidIrishVat = 'IE123'
      const isInvalid = await vatService.validateVATNumber(invalidIrishVat, 'IE')
      expect(isInvalid).toBe(false)
    })

    test('should determine reverse charge applicability', async () => {
      // Irish customer - no reverse charge
      const irishReverseCharge = await vatService.isReverseChargeApplicable('IE', 'IE1234567A')
      expect(irishReverseCharge).toBe(false)

      // German B2B customer - reverse charge applies
      const germanReverseCharge = await vatService.isReverseChargeApplicable('DE', 'DE123456789')
      expect(germanReverseCharge).toBe(true)

      // German B2C customer - no reverse charge
      const germanB2C = await vatService.isReverseChargeApplicable('DE')
      expect(germanB2C).toBe(false)
    })
  })

  describe('BankingService', () => {
    let bankingService: BankingService

    beforeEach(() => {
      bankingService = new BankingService()
    })

    test('should recommend Wise for startups', () => {
      const recommendation = bankingService.getRecommendedProvider({
        isStartup: true,
        monthlyVolume: 10000,
        primaryCurrencies: ['EUR', 'USD', 'GBP'],
        needsAPI: true
      })

      expect(recommendation.id).toBe('wise_business')
      expect(recommendation.businessSupport.startupBenefits).toBe(true)
      expect(recommendation.features.apiAccess).toBe(true)
    })

    test('should calculate banking costs correctly', async () => {
      const wiseProvider = bankingService.getRecommendedProvider({
        isStartup: true,
        monthlyVolume: 10000,
        primaryCurrencies: ['EUR'],
        needsAPI: false
      })

      const costs = await bankingService.calculateBankingCosts(
        wiseProvider,
        100, // transactions
        500, // average amount
        5    // international wires
      )

      expect(costs.monthlyMaintenance).toBe(0) // Wise has no monthly fees
      expect(costs.transactionCosts).toBe(0)   // Wise has no transaction fees
      expect(costs.internationalWireCosts).toBe(5 * 3.69) // 5 wires * €3.69 max
    })

    test('should validate Irish IBAN format', () => {
      const validIBAN = 'IE29AIBK93115212345678'
      const isValid = bankingService.validateIBAN(validIBAN, 'IE')
      expect(isValid).toBe(true)

      const invalidIBAN = 'IE123'
      const isInvalid = bankingService.validateIBAN(invalidIBAN, 'IE')
      expect(isInvalid).toBe(false)
    })

    test('should format currency correctly for Irish locale', () => {
      const formatted = bankingService.formatCurrency(1234.56, 'EUR', 'en-IE')
      expect(formatted).toMatch(/€1,234\.56|€ 1,234\.56/)
    })

    test('should return correct payment methods for Ireland', () => {
      const methods = bankingService.getSupportedPaymentMethods('IE')
      
      expect(methods.cards).toContain('visa')
      expect(methods.cards).toContain('mastercard')
      expect(methods.cards).toContain('maestro')
      expect(methods.bankTransfers).toContain('sepa_credit_transfer')
      expect(methods.bankTransfers).toContain('sepa_direct_debit')
      expect(methods.digitalWallets).toContain('apple_pay')
      expect(methods.digitalWallets).toContain('google_pay')
    })
  })

  describe('ExchangeRateService', () => {
    let exchangeRateService: ExchangeRateService

    beforeEach(() => {
      exchangeRateService = new ExchangeRateService()
    })

    test('should return 1.0 for same currency conversion', async () => {
      const rate = await exchangeRateService.getExchangeRate('EUR', 'EUR')
      expect(rate).toBe(1.0)
    })

    test('should return exchange rate for EUR to USD', async () => {
      const rate = await exchangeRateService.getExchangeRate('EUR', 'USD')
      expect(rate).toBeGreaterThan(0)
      expect(rate).toBeLessThan(10) // Sanity check
    })

    test('should convert amount with exchange rate', async () => {
      const conversion = await exchangeRateService.convertAmount(100, 'EUR', 'USD')
      
      expect(conversion.originalAmount).toBe(100)
      expect(conversion.fromCurrency).toBe('EUR')
      expect(conversion.toCurrency).toBe('USD')
      expect(conversion.convertedAmount).toBeGreaterThan(0)
      expect(conversion.exchangeRate).toBeGreaterThan(0)
      expect(conversion.timestamp).toBeInstanceOf(Date)
    })

    test('should cache exchange rates', async () => {
      // First call
      const rate1 = await exchangeRateService.getExchangeRate('EUR', 'USD')
      
      // Second call (should use cache)
      const rate2 = await exchangeRateService.getExchangeRate('EUR', 'USD')
      
      expect(rate1).toBe(rate2)
    })
  })

  describe('Subscription Tiers Configuration', () => {
    test('should have correct tier structure', () => {
      expect(SUBSCRIPTION_TIERS).toHaveLength(3)
      
      const starter = SUBSCRIPTION_TIERS.find(t => t.id === 'starter')
      expect(starter?.monthlyPriceEur).toBe(99)
      expect(starter?.features.grantApplications).toBe(10)
      
      const professional = SUBSCRIPTION_TIERS.find(t => t.id === 'professional')
      expect(professional?.monthlyPriceEur).toBe(299)
      expect(professional?.features.grantApplications).toBe(50)
      
      const enterprise = SUBSCRIPTION_TIERS.find(t => t.id === 'enterprise')
      expect(enterprise?.monthlyPriceEur).toBe(999)
      expect(enterprise?.features.grantApplications).toBe('unlimited')
    })

    test('should have usage components configured', () => {
      expect(USAGE_COMPONENTS).toHaveLength(3)
      
      const aiProcessing = USAGE_COMPONENTS.find(c => c.id === 'ai_processing')
      expect(aiProcessing?.pricePerUnit).toBe(0.25)
      expect(aiProcessing?.currency).toBe('EUR')
      
      const additionalUsers = USAGE_COMPONENTS.find(c => c.id === 'additional_users')
      expect(additionalUsers?.pricePerUnit).toBe(15)
      
      const documentStorage = USAGE_COMPONENTS.find(c => c.id === 'document_storage')
      expect(documentStorage?.pricePerUnit).toBe(0.50)
    })
  })

  describe('EU VAT Rates Configuration', () => {
    test('should have correct VAT rates for major EU countries', () => {
      expect(EU_VAT_RATES.IE).toBe(23) // Ireland
      expect(EU_VAT_RATES.DE).toBe(19) // Germany
      expect(EU_VAT_RATES.FR).toBe(20) // France
      expect(EU_VAT_RATES.ES).toBe(21) // Spain
      expect(EU_VAT_RATES.IT).toBe(22) // Italy
      expect(EU_VAT_RATES.NL).toBe(21) // Netherlands
      expect(EU_VAT_RATES.SE).toBe(25) // Sweden
    })

    test('should have VAT rates for all EU countries', () => {
      const euCountries = [
        'IE', 'DE', 'FR', 'ES', 'IT', 'NL', 'BE', 'PL', 'PT', 'SE',
        'DK', 'FI', 'AT', 'CZ', 'HU', 'RO', 'BG', 'HR', 'SI', 'SK',
        'LT', 'LV', 'EE', 'LU', 'MT', 'CY'
      ]
      
      euCountries.forEach(country => {
        expect(EU_VAT_RATES[country]).toBeDefined()
        expect(EU_VAT_RATES[country]).toBeGreaterThan(0)
        expect(EU_VAT_RATES[country]).toBeLessThan(30)
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle invalid currency codes gracefully', async () => {
      const exchangeRateService = new ExchangeRateService()
      
      await expect(exchangeRateService.getExchangeRate('INVALID', 'EUR'))
        .rejects.toThrow('Failed to get exchange rate')
    })

    test('should handle invalid subscription tier', async () => {
      const financialService = new FinancialService()
      
      await expect(financialService.createSubscription('cus_test', 'invalid_tier', 'monthly'))
        .rejects.toThrow('Invalid subscription tier')
    })

    test('should handle invalid usage component', async () => {
      const financialService = new FinancialService()
      
      await expect(financialService.recordUsage('sub_test', 'invalid_component', 10))
        .rejects.toThrow('Invalid usage component')
    })
  })
})