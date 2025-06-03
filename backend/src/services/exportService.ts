import { logger } from './logger'
import { DatabaseService } from './database'
import { ApplicationAssistanceService } from './applicationAssistanceService'
import * as fs from 'fs/promises'
import * as path from 'path'
import { OAuth2Client } from 'google-auth-library'
import { google } from 'googleapis'
import Docxtemplater from 'docxtemplater'
import PizZip from 'pizzip'
import { jsPDF } from 'jspdf'

export interface ExportOptions {
  format: 'google_docs' | 'word' | 'pdf'
  includeComments?: boolean
  includeMetadata?: boolean
  templateId?: string
}

export interface ApplicationExport {
  applicationId: string
  grantId: string
  title: string
  sections: ExportSection[]
  metadata?: {
    createdAt: Date
    lastModified: Date
    completionPercentage: number
    aiSuggestions?: number
  }
}

export interface ExportSection {
  title: string
  content: string
  required: boolean
  completed: boolean
  comments?: string[]
  suggestions?: string[]
}

export class ExportService {
  private db: DatabaseService
  private googleAuth?: OAuth2Client
  private docsService?: any
  private driveService?: any

  constructor(db: DatabaseService) {
    this.db = db
    this.initializeGoogleServices()
  }

  private async initializeGoogleServices() {
    try {
      if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        this.googleAuth = new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/auth/google/callback'
        )

        // Initialize with service account if available
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
          const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: [
              'https://www.googleapis.com/auth/documents',
              'https://www.googleapis.com/auth/drive'
            ]
          })

          this.docsService = google.docs({ version: 'v1', auth })
          this.driveService = google.drive({ version: 'v3', auth })
        }
      }
    } catch (error) {
      logger.warn('Google services not initialized', { error })
    }
  }

  /**
   * Export application to specified format
   */
  async exportApplication(
    applicationId: string,
    userId: string,
    options: ExportOptions
  ): Promise<{ url?: string; data?: Buffer; filename: string }> {
    try {
      logger.info('Exporting application', { applicationId, userId, format: options.format })

      // Get application data
      const applicationData = await this.getApplicationData(applicationId, userId)
      if (!applicationData) {
        throw new Error('Application not found or access denied')
      }

      // Export based on format
      switch (options.format) {
        case 'google_docs':
          return await this.exportToGoogleDocs(applicationData, options)
        case 'word':
          return await this.exportToWord(applicationData, options)
        case 'pdf':
          return await this.exportToPDF(applicationData, options)
        default:
          throw new Error(`Unsupported export format: ${options.format}`)
      }
    } catch (error) {
      logger.error('Failed to export application', { error, applicationId, format: options.format })
      throw error
    }
  }

  /**
   * Export to Google Docs
   */
  private async exportToGoogleDocs(
    data: ApplicationExport,
    options: ExportOptions
  ): Promise<{ url: string; filename: string }> {
    if (!this.docsService || !this.driveService) {
      throw new Error('Google services not configured')
    }

    try {
      // Create document structure
      const requests: any[] = []
      let index = 1

      // Add title
      requests.push({
        insertText: {
          location: { index },
          text: `${data.title}\n\n`
        }
      })
      index += data.title.length + 2

      // Add metadata if requested
      if (options.includeMetadata && data.metadata) {
        const metadataText = `Application Information:\n` +
          `Created: ${data.metadata.createdAt.toLocaleDateString()}\n` +
          `Last Modified: ${data.metadata.lastModified.toLocaleDateString()}\n` +
          `Completion: ${data.metadata.completionPercentage}%\n\n`
        
        requests.push({
          insertText: {
            location: { index },
            text: metadataText
          }
        })
        index += metadataText.length
      }

      // Add sections
      for (const section of data.sections) {
        // Section title
        const sectionTitle = `${section.title}${section.required ? ' *' : ''}\n`
        requests.push({
          insertText: {
            location: { index },
            text: sectionTitle
          }
        })
        index += sectionTitle.length

        // Section content
        const content = section.content || '[No content provided]\n'
        requests.push({
          insertText: {
            location: { index },
            text: content + '\n'
          }
        })
        index += content.length + 1

        // Add comments if requested
        if (options.includeComments && section.comments?.length) {
          const commentsText = `Comments:\n${section.comments.join('\n')}\n\n`
          requests.push({
            insertText: {
              location: { index },
              text: commentsText
            }
          })
          index += commentsText.length
        }

        // Add suggestions if available
        if (section.suggestions?.length) {
          const suggestionsText = `AI Suggestions:\n${section.suggestions.join('\n')}\n\n`
          requests.push({
            insertText: {
              location: { index },
              text: suggestionsText
            }
          })
          index += suggestionsText.length
        }

        // Add spacing
        requests.push({
          insertText: {
            location: { index },
            text: '\n'
          }
        })
        index += 1
      }

      // Create the document
      const createResponse = await this.docsService.documents.create({
        requestBody: {
          title: `Grant Application - ${data.title}`
        }
      })

      const documentId = createResponse.data.documentId

      // Apply the content
      await this.docsService.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      })

      // Apply formatting
      await this.applyGoogleDocsFormatting(documentId, data)

      // Set permissions (make it accessible to the user)
      await this.driveService.permissions.create({
        fileId: documentId,
        requestBody: {
          type: 'anyone',
          role: 'writer'
        }
      })

      const url = `https://docs.google.com/document/d/${documentId}/edit`
      const filename = `grant_application_${data.applicationId}.gdoc`

      logger.info('Successfully exported to Google Docs', { documentId, applicationId: data.applicationId })

      return { url, filename }
    } catch (error) {
      logger.error('Failed to export to Google Docs', { error })
      throw new Error('Failed to create Google Doc')
    }
  }

  /**
   * Apply formatting to Google Docs
   */
  private async applyGoogleDocsFormatting(documentId: string, data: ApplicationExport) {
    const requests: any[] = []

    // Format title
    requests.push({
      updateParagraphStyle: {
        range: {
          startIndex: 1,
          endIndex: data.title.length + 1
        },
        paragraphStyle: {
          namedStyleType: 'HEADING_1',
          alignment: 'CENTER'
        },
        fields: 'namedStyleType,alignment'
      }
    })

    // Format section headers
    let currentIndex = data.title.length + 2
    if (data.metadata) {
      currentIndex += 100 // Approximate metadata length
    }

    for (const section of data.sections) {
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: currentIndex,
            endIndex: currentIndex + section.title.length
          },
          paragraphStyle: {
            namedStyleType: 'HEADING_2'
          },
          fields: 'namedStyleType'
        }
      })
      currentIndex += section.title.length + 1 + (section.content?.length || 20) + 2

      if (section.comments?.length) {
        currentIndex += section.comments.join('\n').length + 20
      }
      if (section.suggestions?.length) {
        currentIndex += section.suggestions.join('\n').length + 20
      }
    }

    if (requests.length > 0) {
      await this.docsService.documents.batchUpdate({
        documentId,
        requestBody: { requests }
      })
    }
  }

  /**
   * Export to Word document
   */
  private async exportToWord(
    data: ApplicationExport,
    options: ExportOptions
  ): Promise<{ data: Buffer; filename: string }> {
    try {
      // Load template or create new document
      const templatePath = options.templateId 
        ? path.join(__dirname, '../../templates', `${options.templateId}.docx`)
        : path.join(__dirname, '../../templates', 'default_application.docx')

      let zip: PizZip
      let doc: Docxtemplater

      try {
        const content = await fs.readFile(templatePath)
        zip = new PizZip(content)
        doc = new Docxtemplater(zip, {
          paragraphLoop: true,
          linebreaks: true
        })
      } catch (error) {
        // Create a simple document if template not found
        logger.warn('Template not found, creating basic document', { templatePath })
        return this.createBasicWordDocument(data, options)
      }

      // Prepare data for template
      const templateData = {
        title: data.title,
        applicationId: data.applicationId,
        grantId: data.grantId,
        createdAt: data.metadata?.createdAt?.toLocaleDateString(),
        lastModified: data.metadata?.lastModified?.toLocaleDateString(),
        completionPercentage: data.metadata?.completionPercentage,
        sections: data.sections.map(section => ({
          title: section.title,
          required: section.required ? 'Required' : 'Optional',
          content: section.content || '[No content provided]',
          completed: section.completed ? 'Yes' : 'No',
          comments: options.includeComments ? section.comments : [],
          suggestions: section.suggestions || []
        }))
      }

      // Render the document
      doc.render(templateData)

      const buffer = doc.getZip().generate({
        type: 'nodebuffer',
        compression: 'DEFLATE'
      })

      const filename = `grant_application_${data.applicationId}.docx`

      logger.info('Successfully exported to Word', { applicationId: data.applicationId })

      return { data: buffer, filename }
    } catch (error) {
      logger.error('Failed to export to Word', { error })
      throw new Error('Failed to create Word document')
    }
  }

  /**
   * Create basic Word document without template
   */
  private async createBasicWordDocument(
    data: ApplicationExport,
    options: ExportOptions
  ): Promise<{ data: Buffer; filename: string }> {
    // For now, create a simple text representation
    // In production, use a proper Word document library
    let content = `${data.title}\n\n`

    if (options.includeMetadata && data.metadata) {
      content += `Application Information:\n`
      content += `Created: ${data.metadata.createdAt.toLocaleDateString()}\n`
      content += `Last Modified: ${data.metadata.lastModified.toLocaleDateString()}\n`
      content += `Completion: ${data.metadata.completionPercentage}%\n\n`
    }

    for (const section of data.sections) {
      content += `${section.title}${section.required ? ' *' : ''}\n`
      content += `${section.content || '[No content provided]'}\n`

      if (options.includeComments && section.comments?.length) {
        content += `\nComments:\n${section.comments.join('\n')}\n`
      }

      if (section.suggestions?.length) {
        content += `\nAI Suggestions:\n${section.suggestions.join('\n')}\n`
      }

      content += '\n\n'
    }

    const buffer = Buffer.from(content, 'utf-8')
    const filename = `grant_application_${data.applicationId}.txt`

    return { data: buffer, filename }
  }

  /**
   * Export to PDF
   */
  private async exportToPDF(
    data: ApplicationExport,
    options: ExportOptions
  ): Promise<{ data: Buffer; filename: string }> {
    try {
      const doc = new jsPDF()
      let yPosition = 20

      // Add title
      doc.setFontSize(20)
      doc.text(data.title, 20, yPosition)
      yPosition += 15

      // Add metadata if requested
      if (options.includeMetadata && data.metadata) {
        doc.setFontSize(10)
        doc.text(`Created: ${data.metadata.createdAt.toLocaleDateString()}`, 20, yPosition)
        yPosition += 5
        doc.text(`Last Modified: ${data.metadata.lastModified.toLocaleDateString()}`, 20, yPosition)
        yPosition += 5
        doc.text(`Completion: ${data.metadata.completionPercentage}%`, 20, yPosition)
        yPosition += 10
      }

      // Add sections
      doc.setFontSize(12)
      for (const section of data.sections) {
        // Check if we need a new page
        if (yPosition > 250) {
          doc.addPage()
          yPosition = 20
        }

        // Section title
        doc.setFont('helvetica', 'bold')
        doc.text(`${section.title}${section.required ? ' *' : ''}`, 20, yPosition)
        yPosition += 7

        // Section content
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        const lines = doc.splitTextToSize(section.content || '[No content provided]', 170)
        for (const line of lines) {
          if (yPosition > 270) {
            doc.addPage()
            yPosition = 20
          }
          doc.text(line, 20, yPosition)
          yPosition += 5
        }

        yPosition += 5
      }

      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
      const filename = `grant_application_${data.applicationId}.pdf`

      logger.info('Successfully exported to PDF', { applicationId: data.applicationId })

      return { data: pdfBuffer, filename }
    } catch (error) {
      logger.error('Failed to export to PDF', { error })
      throw new Error('Failed to create PDF')
    }
  }

  /**
   * Get application data for export
   */
  private async getApplicationData(
    applicationId: string,
    userId: string
  ): Promise<ApplicationExport | null> {
    try {
      const result = await this.db.query(`
        SELECT 
          ad.*,
          g.title as grant_title,
          at.sections as template_sections
        FROM application_drafts ad
        JOIN grants g ON ad.grant_id = g.id
        LEFT JOIN application_templates at ON ad.template_id = at.id
        WHERE ad.id = $1 AND ad.user_id = $2
      `, [applicationId, userId])

      if (result.rows.length === 0) {
        return null
      }

      const application = result.rows[0]
      const formData = JSON.parse(application.form_data || '{}')
      const templateSections = JSON.parse(application.template_sections || '[]')
      const aiSuggestions = JSON.parse(application.ai_suggestions || '[]')

      // Build sections
      const sections: ExportSection[] = templateSections.map((section: any) => ({
        title: section.title,
        content: formData[section.id] || '',
        required: section.required,
        completed: !!formData[section.id],
        comments: [], // Could be enhanced to include user comments
        suggestions: aiSuggestions
          .filter((s: any) => s.section_id === section.id)
          .map((s: any) => s.suggested_text)
      }))

      return {
        applicationId: application.id,
        grantId: application.grant_id,
        title: application.grant_title || application.title,
        sections,
        metadata: {
          createdAt: application.created_at,
          lastModified: application.updated_at,
          completionPercentage: application.completion_percentage || 0,
          aiSuggestions: aiSuggestions.length
        }
      }
    } catch (error) {
      logger.error('Failed to get application data', { error, applicationId })
      return null
    }
  }

  /**
   * Export multiple applications as a batch
   */
  async exportBatch(
    applicationIds: string[],
    userId: string,
    format: 'word' | 'pdf'
  ): Promise<{ data: Buffer; filename: string }> {
    // Implementation for batch export
    // This would combine multiple applications into a single document
    throw new Error('Batch export not yet implemented')
  }

  /**
   * Create export template
   */
  async createTemplate(
    name: string,
    content: string,
    format: 'word'
  ): Promise<{ templateId: string }> {
    // Save template for future use
    const templateId = `template_${Date.now()}`
    const templatePath = path.join(__dirname, '../../templates', `${templateId}.${format}`)
    
    await fs.writeFile(templatePath, content)
    
    return { templateId }
  }
}