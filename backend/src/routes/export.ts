import { Router } from 'express'
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth'
import { ExportService } from '../services/exportService'
import { db } from '../services/database'
import { logger } from '../services/logger'
import asyncHandler from 'express-async-handler'

const router = Router()
const exportService = new ExportService(db)

/**
 * @route POST /api/export/application/:id
 * @desc Export application to specified format
 * @access Private
 */
router.post('/application/:id', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { id } = req.params
  const { format = 'word', includeComments = true, includeMetadata = true } = req.body
  const userId = req.user!.id

  if (!['google_docs', 'word', 'pdf'].includes(format)) {
    res.status(400).json({ error: 'Invalid export format' })
    return
  }

  try {
    const result = await exportService.exportApplication(id, userId, {
      format,
      includeComments,
      includeMetadata
    })

    if (format === 'google_docs' && result.url) {
      // For Google Docs, return the URL
      res.json({
        success: true,
        url: result.url,
        filename: result.filename,
        format
      })
    } else if (result.data) {
      // For Word/PDF, send the file
      const contentType = format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      
      res.setHeader('Content-Type', contentType)
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
      res.send(result.data)
    } else {
      res.status(500).json({ error: 'Export failed' })
    }
  } catch (error) {
    logger.error('Export failed', { error, applicationId: id, format })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Export failed' 
    })
  }
}))

/**
 * @route POST /api/export/batch
 * @desc Export multiple applications
 * @access Private
 */
router.post('/batch', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { applicationIds, format = 'pdf' } = req.body
  const userId = req.user!.id

  if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
    res.status(400).json({ error: 'No applications selected' })
    return
  }

  if (!['word', 'pdf'].includes(format)) {
    res.status(400).json({ error: 'Invalid export format for batch' })
    return
  }

  try {
    const result = await exportService.exportBatch(applicationIds, userId, format)
    
    const contentType = format === 'pdf' 
      ? 'application/pdf' 
      : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    
    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`)
    res.send(result.data)
  } catch (error) {
    logger.error('Batch export failed', { error, applicationIds, format })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Batch export failed' 
    })
  }
}))

/**
 * @route GET /api/export/formats
 * @desc Get available export formats
 * @access Private
 */
router.get('/formats', authenticateToken, (req: AuthenticatedRequest, res) => {
  const formats = [
    {
      id: 'word',
      name: 'Microsoft Word',
      extension: 'docx',
      description: 'Export as Word document for offline editing',
      available: true
    },
    {
      id: 'google_docs',
      name: 'Google Docs',
      extension: 'gdoc',
      description: 'Create Google Doc for collaborative editing',
      available: !!process.env.GOOGLE_CLIENT_ID
    },
    {
      id: 'pdf',
      name: 'PDF',
      extension: 'pdf',
      description: 'Export as PDF for printing or sharing',
      available: true
    }
  ]

  res.json({ formats })
})

/**
 * @route POST /api/export/template
 * @desc Create custom export template
 * @access Private (Admin only)
 */
router.post('/template', authenticateToken, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { name, content, format = 'word' } = req.body
  
  // Check if user is admin
  if (!req.user!.is_admin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }

  if (!name || !content) {
    res.status(400).json({ error: 'Name and content required' })
    return
  }

  try {
    const result = await exportService.createTemplate(name, content, format)
    res.json({
      success: true,
      templateId: result.templateId,
      message: 'Template created successfully'
    })
  } catch (error) {
    logger.error('Failed to create template', { error, name })
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to create template' 
    })
  }
}))

export default router