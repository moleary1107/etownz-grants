import express from 'express'
import { GrantSource, CrawlSettings } from '../types/grants'
import { FirecrawlService } from '../services/firecrawlService'
import { logger } from '../utils/logger'

const router = express.Router()
const firecrawlService = new FirecrawlService()

// In-memory storage for demo (replace with database in production)
const grantSources: GrantSource[] = [
  {
    id: 'source-1',
    name: 'Local Government Grants and Funding',
    url: 'https://www.localgov.ie/grants-and-funding',
    description: 'Irish local government grants and funding opportunities directory',
    category: 'government',
    location: 'Ireland',
    isActive: true,
    crawlSettings: {
      depth: 2,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*grant*', '*funding*', '*scheme*'],
      excludePatterns: ['*contact*', '*about*'],
      scheduleType: 'weekly'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'source-2',
    name: 'Enterprise Ireland',
    url: 'https://www.enterprise-ireland.com/en/funding-supports/',
    description: 'Enterprise Ireland funding supports and grants',
    category: 'government',
    location: 'Ireland',
    isActive: true,
    crawlSettings: {
      depth: 3,
      followPdfs: true,
      followDocx: true,
      includePatterns: ['*funding*', '*grant*', '*support*'],
      excludePatterns: ['*news*', '*events*'],
      scheduleType: 'daily'
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// Get all grant sources
router.get('/', (req, res) => {
  try {
    res.json({
      success: true,
      data: grantSources,
      total: grantSources.length
    })
  } catch (error) {
    logger.error('Error fetching grant sources', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grant sources'
    })
  }
})

// Get single grant source
router.get('/:id', (req, res) => {
  try {
    const source = grantSources.find(s => s.id === req.params.id)
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      })
    }
    res.json({
      success: true,
      data: source
    })
  } catch (error) {
    logger.error('Error fetching grant source', { error, id: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grant source'
    })
  }
})

// Create new grant source
router.post('/', async (req, res) => {
  try {
    const { name, url, description, category, location, crawlSettings } = req.body

    if (!name || !url || !category || !location) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, url, category, location'
      })
    }

    const newSource: GrantSource = {
      id: `source-${Date.now()}`,
      name,
      url,
      description,
      category,
      location,
      isActive: true,
      crawlSettings: crawlSettings || {
        depth: 2,
        followPdfs: true,
        followDocx: true,
        includePatterns: ['*grant*', '*funding*'],
        excludePatterns: [],
        scheduleType: 'manual'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    grantSources.push(newSource)

    logger.info('Created new grant source', { sourceId: newSource.id, name, url })

    res.status(201).json({
      success: true,
      data: newSource
    })
  } catch (error) {
    logger.error('Error creating grant source', { error })
    res.status(500).json({
      success: false,
      error: 'Failed to create grant source'
    })
  }
})

// Update grant source
router.put('/:id', (req, res) => {
  try {
    const sourceIndex = grantSources.findIndex(s => s.id === req.params.id)
    if (sourceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      })
    }

    const updatedSource = {
      ...grantSources[sourceIndex],
      ...req.body,
      updatedAt: new Date()
    }

    grantSources[sourceIndex] = updatedSource

    logger.info('Updated grant source', { sourceId: req.params.id })

    res.json({
      success: true,
      data: updatedSource
    })
  } catch (error) {
    logger.error('Error updating grant source', { error, id: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to update grant source'
    })
  }
})

// Delete grant source
router.delete('/:id', (req, res) => {
  try {
    const sourceIndex = grantSources.findIndex(s => s.id === req.params.id)
    if (sourceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      })
    }

    const deletedSource = grantSources.splice(sourceIndex, 1)[0]

    logger.info('Deleted grant source', { sourceId: req.params.id })

    res.json({
      success: true,
      data: deletedSource
    })
  } catch (error) {
    logger.error('Error deleting grant source', { error, id: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to delete grant source'
    })
  }
})

// Start crawl for a specific source
router.post('/:id/crawl', async (req, res) => {
  try {
    const source = grantSources.find(s => s.id === req.params.id)
    if (!source) {
      return res.status(404).json({
        success: false,
        error: 'Grant source not found'
      })
    }

    if (!source.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Cannot crawl inactive source'
      })
    }

    logger.info('Starting crawl job', { sourceId: source.id, sourceName: source.name })

    // Start the crawl job (this will run asynchronously)
    const job = await firecrawlService.crawlGrantSource(source)

    // Update last crawled timestamp
    source.lastCrawled = new Date()
    source.updatedAt = new Date()

    res.json({
      success: true,
      data: {
        jobId: job.id,
        status: job.status,
        message: 'Crawl job started successfully'
      }
    })
  } catch (error) {
    logger.error('Error starting crawl job', { error, sourceId: req.params.id })
    res.status(500).json({
      success: false,
      error: 'Failed to start crawl job'
    })
  }
})

// Test connection to a URL before adding as source
router.post('/test-url', async (req, res) => {
  try {
    const { url } = req.body

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      })
    }

    // Test if we can access the URL
    const testResult = await firecrawlService.testConnection()

    res.json({
      success: true,
      data: {
        accessible: testResult,
        url,
        message: testResult ? 'URL is accessible' : 'URL is not accessible'
      }
    })
  } catch (error) {
    logger.error('Error testing URL', { error, url: req.body.url })
    res.status(500).json({
      success: false,
      error: 'Failed to test URL'
    })
  }
})

export default router