import express from 'express'
import { authenticateToken } from '../middleware/auth'
import { bankingService, exchangeRateService, BANKING_PROVIDERS, SEPA_CONFIG } from '../services/bankingService'
import { logger } from '../services/logger'

const router = express.Router()

/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentMethod:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           enum: [card, sepa_debit, bank_transfer, digital_wallet]
 *         details:
 *           type: object
 *     ExchangeRate:
 *       type: object
 *       properties:
 *         fromCurrency:
 *           type: string
 *         toCurrency:
 *           type: string
 *         rate:
 *           type: number
 *         timestamp:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: Get supported payment methods for a country
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Country code (ISO 3166-1 alpha-2)
 *         required: true
 *     responses:
 *       200:
 *         description: Supported payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cards:
 *                   type: array
 *                   items:
 *                     type: string
 *                 bankTransfers:
 *                   type: array
 *                   items:
 *                     type: string
 *                 digitalWallets:
 *                   type: array
 *                   items:
 *                     type: string
 *                 localMethods:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.get('/methods', async (req, res) => {
  try {
    const countryCode = req.query.country as string
    
    if (!countryCode) {
      return res.status(400).json({
        success: false,
        error: 'Country code is required'
      })
    }

    const paymentMethods = bankingService.getSupportedPaymentMethods(countryCode.toUpperCase())
    
    res.json({
      success: true,
      data: paymentMethods,
      metadata: {
        countryCode: countryCode.toUpperCase(),
        sepaEnabled: SEPA_CONFIG.enabled,
        instantPayments: SEPA_CONFIG.instantPayments.available
      }
    })
  } catch (error) {
    logger.error('Failed to get payment methods', { error, query: req.query })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve payment methods'
    })
  }
})

/**
 * @swagger
 * /api/payments/exchange-rate:
 *   get:
 *     summary: Get exchange rate between currencies
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: From currency code
 *         required: true
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: To currency code
 *         required: true
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         description: Amount to convert (optional)
 *     responses:
 *       200:
 *         description: Exchange rate information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ExchangeRate'
 */
router.get('/exchange-rate', async (req, res) => {
  try {
    const { from, to, amount } = req.query
    
    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: 'Both from and to currency codes are required'
      })
    }

    const fromCurrency = (from as string).toUpperCase()
    const toCurrency = (to as string).toUpperCase()
    
    if (amount) {
      const amountNum = parseFloat(amount as string)
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Amount must be a positive number'
        })
      }

      const conversion = await exchangeRateService.convertAmount(amountNum, fromCurrency, toCurrency)
      res.json({
        success: true,
        data: conversion
      })
    } else {
      const rate = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency)
      res.json({
        success: true,
        data: {
          fromCurrency,
          toCurrency,
          rate,
          timestamp: new Date().toISOString()
        }
      })
    }
  } catch (error) {
    logger.error('Failed to get exchange rate', { error, query: req.query })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve exchange rate'
    })
  }
})

/**
 * @swagger
 * /api/payments/banking-providers:
 *   get:
 *     summary: Get available banking providers
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: List of banking providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 providers:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/banking-providers', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        providers: BANKING_PROVIDERS,
        sepaConfig: SEPA_CONFIG
      },
      metadata: {
        baseCurrency: 'EUR',
        jurisdiction: 'Ireland'
      }
    })
  } catch (error) {
    logger.error('Failed to get banking providers', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve banking providers'
    })
  }
})

/**
 * @swagger
 * /api/payments/recommend-provider:
 *   post:
 *     summary: Get recommended banking provider
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isStartup
 *               - monthlyVolume
 *               - primaryCurrencies
 *               - needsAPI
 *             properties:
 *               isStartup:
 *                 type: boolean
 *               monthlyVolume:
 *                 type: number
 *               primaryCurrencies:
 *                 type: array
 *                 items:
 *                   type: string
 *               needsAPI:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Recommended banking provider
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/recommend-provider', authenticateToken, async (req, res) => {
  try {
    const { isStartup, monthlyVolume, primaryCurrencies, needsAPI } = req.body
    
    // Validate required fields
    if (typeof isStartup !== 'boolean' || typeof needsAPI !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isStartup and needsAPI must be boolean values'
      })
    }

    if (typeof monthlyVolume !== 'number' || monthlyVolume < 0) {
      return res.status(400).json({
        success: false,
        error: 'monthlyVolume must be a non-negative number'
      })
    }

    if (!Array.isArray(primaryCurrencies) || primaryCurrencies.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'primaryCurrencies must be a non-empty array'
      })
    }

    const recommendation = bankingService.getRecommendedProvider({
      isStartup,
      monthlyVolume,
      primaryCurrencies,
      needsAPI
    })

    res.json({
      success: true,
      data: {
        recommendedProvider: recommendation,
        reasoning: {
          startupFriendly: recommendation.businessSupport.startupBenefits,
          currencySupport: recommendation.supportedCurrencies,
          apiAccess: recommendation.features.apiAccess,
          estimatedMonthlyCost: recommendation.fees.monthlyMaintenance || 0
        }
      }
    })
  } catch (error) {
    logger.error('Failed to recommend banking provider', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to recommend banking provider'
    })
  }
})

/**
 * @swagger
 * /api/payments/banking-costs:
 *   post:
 *     summary: Calculate banking costs for a provider
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - monthlyTransactions
 *               - averageTransactionAmount
 *               - internationalWires
 *             properties:
 *               providerId:
 *                 type: string
 *               monthlyTransactions:
 *                 type: number
 *               averageTransactionAmount:
 *                 type: number
 *               internationalWires:
 *                 type: number
 *     responses:
 *       200:
 *         description: Banking cost calculation
 *       400:
 *         description: Invalid request data
 *       401:
 *         description: Unauthorized
 */
router.post('/banking-costs', authenticateToken, async (req, res) => {
  try {
    const { providerId, monthlyTransactions, averageTransactionAmount, internationalWires } = req.body
    
    // Validate required fields
    if (!providerId) {
      return res.status(400).json({
        success: false,
        error: 'providerId is required'
      })
    }

    const numericFields = { monthlyTransactions, averageTransactionAmount, internationalWires }
    for (const [field, value] of Object.entries(numericFields)) {
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          error: `${field} must be a non-negative number`
        })
      }
    }

    const provider = BANKING_PROVIDERS.find(p => p.id === providerId)
    if (!provider) {
      return res.status(400).json({
        success: false,
        error: `Invalid provider ID: ${providerId}`
      })
    }

    const costs = await bankingService.calculateBankingCosts(
      provider,
      monthlyTransactions,
      averageTransactionAmount,
      internationalWires
    )

    res.json({
      success: true,
      data: {
        provider: provider.name,
        costs,
        currency: 'EUR'
      }
    })
  } catch (error) {
    logger.error('Failed to calculate banking costs', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to calculate banking costs'
    })
  }
})

/**
 * @swagger
 * /api/payments/validate-iban:
 *   post:
 *     summary: Validate IBAN format
 *     tags: [Payments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - iban
 *             properties:
 *               iban:
 *                 type: string
 *               countryCode:
 *                 type: string
 *                 default: IE
 *     responses:
 *       200:
 *         description: IBAN validation result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 valid:
 *                   type: boolean
 *                 iban:
 *                   type: string
 *                 countryCode:
 *                   type: string
 */
router.post('/validate-iban', async (req, res) => {
  try {
    const { iban, countryCode = 'IE' } = req.body
    
    if (!iban) {
      return res.status(400).json({
        success: false,
        error: 'IBAN is required'
      })
    }

    const isValid = bankingService.validateIBAN(iban, countryCode)
    
    res.json({
      success: true,
      data: {
        valid: isValid,
        iban: iban.replace(/\s/g, '').toUpperCase(),
        countryCode: countryCode.toUpperCase(),
        format: countryCode === 'IE' ? SEPA_CONFIG.ibanFormat.ireland : 'Generic IBAN format'
      }
    })
  } catch (error) {
    logger.error('Failed to validate IBAN', { error, body: req.body })
    res.status(500).json({
      success: false,
      error: 'Failed to validate IBAN'
    })
  }
})

/**
 * @swagger
 * /api/payments/format-currency:
 *   get:
 *     summary: Format currency amount for display
 *     tags: [Payments]
 *     parameters:
 *       - in: query
 *         name: amount
 *         schema:
 *           type: number
 *         required: true
 *       - in: query
 *         name: currency
 *         schema:
 *           type: string
 *         required: true
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *         default: en-IE
 *     responses:
 *       200:
 *         description: Formatted currency string
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 formatted:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 locale:
 *                   type: string
 */
router.get('/format-currency', async (req, res) => {
  try {
    const { amount, currency, locale = 'en-IE' } = req.query
    
    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Amount and currency are required'
      })
    }

    const amountNum = parseFloat(amount as string)
    if (isNaN(amountNum)) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a valid number'
      })
    }

    const formatted = bankingService.formatCurrency(amountNum, currency as string, locale as string)
    
    res.json({
      success: true,
      data: {
        formatted,
        amount: amountNum,
        currency: (currency as string).toUpperCase(),
        locale: locale as string
      }
    })
  } catch (error) {
    logger.error('Failed to format currency', { error, query: req.query })
    res.status(500).json({
      success: false,
      error: 'Failed to format currency'
    })
  }
})

/**
 * @swagger
 * /api/payments/sepa-info:
 *   get:
 *     summary: Get SEPA payment information
 *     tags: [Payments]
 *     responses:
 *       200:
 *         description: SEPA configuration and capabilities
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 enabled:
 *                   type: boolean
 *                 instantPayments:
 *                   type: object
 *                 directDebit:
 *                   type: object
 *                 ibanFormat:
 *                   type: object
 */
router.get('/sepa-info', async (req, res) => {
  try {
    res.json({
      success: true,
      data: SEPA_CONFIG,
      metadata: {
        jurisdiction: 'EU',
        baseCurrency: 'EUR',
        regulatorInfo: {
          authority: 'European Central Bank',
          scheme: 'SEPA Credit Transfer (SCT) and SEPA Instant Credit Transfer (SCT Inst)'
        }
      }
    })
  } catch (error) {
    logger.error('Failed to get SEPA info', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve SEPA information'
    })
  }
})

export default router