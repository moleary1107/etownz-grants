import express from 'express'
import { GrantAnalysisService } from '../services/grantAnalysisService'
import { DiscoveredGrant, OrganizationProfile } from '../types/grants'
import { logger } from '../utils/logger'

const router = express.Router()
const grantAnalysis = new GrantAnalysisService()

// Demo organizations (replace with database in production)
const demoOrganizations: OrganizationProfile[] = [
  {
    id: 'org-1',
    name: 'TechStart Ireland',
    sector: 'Technology',
    location: 'Dublin',
    size: '11-50',
    yearEstablished: 2020,
    annualRevenue: 500000,
    employeeCount: 25,
    description: 'Innovative technology startup focused on AI solutions for healthcare',
    keywords: ['AI', 'healthcare', 'technology', 'innovation', 'startup'],
    preferences: {
      categories: ['Technology', 'Innovation', 'Research & Development'],
      minAmount: 10000,
      maxAmount: 500000,
      locations: ['Ireland', 'EU'],
      sectors: ['Technology', 'Healthcare'],
      alertSettings: {
        email: true,
        inApp: true,
        frequency: 'daily'
      }
    }
  },
  {
    id: 'org-2',
    name: 'Dublin Community Center',
    sector: 'Non-Profit',
    location: 'Dublin',
    size: '1-10',
    yearEstablished: 2015,
    employeeCount: 8,
    description: 'Non-profit organization providing community services and education programs',
    keywords: ['community', 'education', 'non-profit', 'social services'],
    preferences: {
      categories: ['Community Development', 'Education', 'Social Services'],
      minAmount: 1000,
      maxAmount: 50000,
      locations: ['Dublin', 'Ireland'],
      sectors: ['Non-Profit', 'Education'],
      alertSettings: {
        email: true,
        inApp: true,
        frequency: 'weekly'
      }
    }
  }
]

// Demo grants (these would come from crawled data)
const demoGrants: DiscoveredGrant[] = [
  {
    id: 'grant-1',
    sourceId: 'source-1',
    sourceUrl: 'https://www.enterprise-ireland.com/rd-fund',
    title: 'Enterprise Ireland R&D Fund',
    description: 'Funding for research and development projects that have clear commercial potential',
    provider: 'Enterprise Ireland',
    providerType: 'government',
    amount: {
      min: 25000,
      max: 250000,
      currency: 'EUR'
    },
    deadline: new Date('2024-03-15'),
    location: 'Ireland',
    eligibility: [
      {
        type: 'sector',
        condition: 'in',
        value: ['Technology', 'Healthcare', 'Manufacturing'],
        description: 'Must be in eligible sectors'
      },
      {
        type: 'size',
        condition: 'in',
        value: ['1-10', '11-50', '51-200'],
        description: 'SME companies only'
      },
      {
        type: 'location',
        condition: 'equals',
        value: 'Ireland',
        description: 'Must be based in Ireland'
      }
    ],
    category: 'Research & Development',
    tags: ['innovation', 'R&D', 'technology'],
    applicationUrl: 'https://www.enterprise-ireland.com/apply',
    documentUrls: ['https://www.enterprise-ireland.com/guidelines.pdf'],
    extractedContent: 'Full grant details...',
    isActive: true,
    discoveredAt: new Date(),
    lastUpdated: new Date()
  }
]

// Check eligibility for a specific grant and organization
router.post('/check', async (req, res) => {
  try {
    const { grantId, organizationId } = req.body

    if (!grantId || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Grant ID and Organization ID are required'
      })
    }

    const grant = demoGrants.find(g => g.id === grantId)
    const organization = demoOrganizations.find(o => o.id === organizationId)

    if (!grant) {
      return res.status(404).json({
        success: false,
        error: 'Grant not found'
      })
    }

    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      })
    }

    logger.info('Starting eligibility check', { grantId, organizationId })

    const eligibilityMatch = await grantAnalysis.checkEligibility(grant, organization)

    res.json({
      success: true,
      data: eligibilityMatch
    })

  } catch (error) {
    logger.error('Error checking eligibility', { error, grantId: req.body.grantId, organizationId: req.body.organizationId })
    res.status(500).json({
      success: false,
      error: 'Failed to check eligibility'
    })
  }
})

// Batch eligibility check for multiple grants against one organization
router.post('/check-batch', async (req, res) => {
  try {
    const { grantIds, organizationId } = req.body

    if (!grantIds || !Array.isArray(grantIds) || !organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Grant IDs array and Organization ID are required'
      })
    }

    const organization = demoOrganizations.find(o => o.id === organizationId)
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      })
    }

    const results = []

    for (const grantId of grantIds) {
      const grant = demoGrants.find(g => g.id === grantId)
      if (grant) {
        try {
          const eligibilityMatch = await grantAnalysis.checkEligibility(grant, organization)
          results.push({
            grantId,
            success: true,
            data: eligibilityMatch
          })
        } catch (error) {
          results.push({
            grantId,
            success: false,
            error: 'Failed to check eligibility for this grant'
          })
        }
      } else {
        results.push({
          grantId,
          success: false,
          error: 'Grant not found'
        })
      }
    }

    res.json({
      success: true,
      data: results,
      summary: {
        total: grantIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    })

  } catch (error) {
    logger.error('Error in batch eligibility check', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to perform batch eligibility check'
    })
  }
})

// Find matching grants for an organization
router.post('/find-matches', async (req, res) => {
  try {
    const { organizationId, filters } = req.body

    if (!organizationId) {
      return res.status(400).json({
        success: false,
        error: 'Organization ID is required'
      })
    }

    const organization = demoOrganizations.find(o => o.id === organizationId)
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      })
    }

    // Filter grants based on basic criteria first
    let relevantGrants = demoGrants.filter(grant => {
      // Basic filtering based on organization preferences
      const { preferences } = organization

      // Location filter
      if (!preferences.locations.includes(grant.location) && !preferences.locations.includes('EU')) {
        return false
      }

      // Category filter
      if (preferences.categories.length > 0 && !preferences.categories.includes(grant.category)) {
        return false
      }

      // Amount filter
      if (preferences.minAmount && grant.amount.max && grant.amount.max < preferences.minAmount) {
        return false
      }

      if (preferences.maxAmount && grant.amount.min && grant.amount.min > preferences.maxAmount) {
        return false
      }

      return true
    })

    // Apply additional filters if provided
    if (filters) {
      if (filters.category) {
        relevantGrants = relevantGrants.filter(g => g.category === filters.category)
      }
      if (filters.provider) {
        relevantGrants = relevantGrants.filter(g => g.provider.toLowerCase().includes(filters.provider.toLowerCase()))
      }
      if (filters.minAmount) {
        relevantGrants = relevantGrants.filter(g => !g.amount.max || g.amount.max >= filters.minAmount)
      }
      if (filters.maxAmount) {
        relevantGrants = relevantGrants.filter(g => !g.amount.min || g.amount.min <= filters.maxAmount)
      }
    }

    // Run AI eligibility check on relevant grants
    const matches = []
    for (const grant of relevantGrants.slice(0, 10)) { // Limit to 10 for performance
      try {
        const eligibilityMatch = await grantAnalysis.checkEligibility(grant, organization)
        if (eligibilityMatch.overallScore >= 30) { // Only include decent matches
          matches.push({
            grant,
            eligibility: eligibilityMatch
          })
        }
      } catch (error) {
        logger.warning('Failed eligibility check for grant', { grantId: grant.id, error })
      }
    }

    // Sort by eligibility score
    matches.sort((a, b) => b.eligibility.overallScore - a.eligibility.overallScore)

    res.json({
      success: true,
      data: matches,
      summary: {
        totalGrantsChecked: relevantGrants.length,
        matchingGrants: matches.length,
        averageScore: matches.length > 0 
          ? matches.reduce((sum, m) => sum + m.eligibility.overallScore, 0) / matches.length 
          : 0
      }
    })

  } catch (error) {
    logger.error('Error finding grant matches', { error, organizationId: req.body.organizationId })
    res.status(500).json({
      success: false,
      error: 'Failed to find grant matches'
    })
  }
})

// Get organization profile
router.get('/organizations/:id', (req, res) => {
  try {
    const organization = demoOrganizations.find(o => o.id === req.params.id)
    if (!organization) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      })
    }

    res.json({
      success: true,
      data: organization
    })
  } catch (error) {
    logger.error('Error fetching organization', { error, id: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch organization'
    })
  }
})

// Update organization profile
router.put('/organizations/:id', (req, res) => {
  try {
    const orgIndex = demoOrganizations.findIndex(o => o.id === req.params.id)
    if (orgIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Organization not found'
      })
    }

    const updatedOrg = {
      ...demoOrganizations[orgIndex],
      ...req.body
    }

    demoOrganizations[orgIndex] = updatedOrg

    res.json({
      success: true,
      data: updatedOrg
    })
  } catch (error) {
    logger.error('Error updating organization', { error, id: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to update organization'
    })
  }
})

export default router