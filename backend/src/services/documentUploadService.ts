import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { promises as fs } from 'fs'
import path from 'path'
import { logger } from './logger'
import { OpenAIService } from './openaiService'
import { AITransparencyService } from './aiTransparencyService'

export interface DocumentUpload {
  id?: string
  userId: string
  applicationId?: string
  originalName: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  uploadStatus?: 'uploading' | 'uploaded' | 'processing' | 'completed' | 'failed'
  processingProgress?: number
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface ProcessingJob {
  id?: string
  documentId: string
  jobType: 'text_extraction' | 'ai_analysis' | 'compliance_check' | 'requirement_extraction'
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress?: number
  errorMessage?: string
  resultData?: Record<string, any>
  aiModelUsed?: string
  processingTimeMs?: number
  startedAt?: Date
  completedAt?: Date
}

export interface DocumentRequirement {
  id?: string
  documentId: string
  requirementType: string
  requirementText: string
  confidenceScore: number
  importanceLevel: 'low' | 'medium' | 'high' | 'critical'
  sectionReference?: string
  aiExtracted: boolean
  humanVerified: boolean
}

export interface ComplianceGap {
  id?: string
  documentId: string
  requirementId?: string
  gapType: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestedAction?: string
  aiConfidence: number
  status: 'identified' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed'
}

export interface DocumentAnalysisResult {
  textContent: string
  requirements: DocumentRequirement[]
  complianceGaps: ComplianceGap[]
  summary: string
  keyInsights: string[]
  processingTime: number
}

export class DocumentUploadService {
  private db: Pool
  private openaiService: OpenAIService
  private aiTransparencyService: AITransparencyService
  private uploadDir: string

  constructor(db: Pool, openaiService: OpenAIService, aiTransparencyService: AITransparencyService) {
    this.db = db
    this.openaiService = openaiService
    this.aiTransparencyService = aiTransparencyService
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads')
    this.ensureUploadDir()
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir)
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true })
      logger.info('Upload directory created', { path: this.uploadDir })
    }
  }

  // Document Upload Management
  async createDocumentUpload(upload: DocumentUpload): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO document_uploads (
        id, user_id, application_id, original_name, file_name, file_path,
        file_size, mime_type, upload_status, processing_progress, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `

    try {
      const result = await this.db.query(query, [
        id,
        upload.userId,
        upload.applicationId,
        upload.originalName,
        upload.fileName,
        upload.filePath,
        upload.fileSize,
        upload.mimeType,
        upload.uploadStatus || 'uploaded',
        upload.processingProgress || 0,
        JSON.stringify(upload.metadata || {})
      ])

      logger.info('Document upload record created', { 
        documentId: id, 
        fileName: upload.fileName, 
        userId: upload.userId 
      })
      return id
    } catch (error) {
      logger.error('Failed to create document upload record', { error, upload })
      throw new Error('Failed to create document upload record')
    }
  }

  async updateDocumentUpload(id: string, updates: Partial<DocumentUpload>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.uploadStatus !== undefined) {
      fields.push(`upload_status = $${paramCount++}`)
      values.push(updates.uploadStatus)
    }
    if (updates.processingProgress !== undefined) {
      fields.push(`processing_progress = $${paramCount++}`)
      values.push(updates.processingProgress)
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`)
      values.push(JSON.stringify(updates.metadata))
    }

    if (fields.length === 0) return

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE document_uploads 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `

    try {
      await this.db.query(query, values)
      logger.info('Document upload updated', { documentId: id, updates })
    } catch (error) {
      logger.error('Failed to update document upload', { error, documentId: id })
      throw new Error('Failed to update document upload')
    }
  }

  async getDocumentUpload(id: string): Promise<DocumentUpload | null> {
    const query = `SELECT * FROM document_uploads WHERE id = $1`
    
    try {
      const result = await this.db.query(query, [id])
      if (result.rows.length === 0) return null

      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        applicationId: row.application_id,
        originalName: row.original_name,
        fileName: row.file_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadStatus: row.upload_status,
        processingProgress: row.processing_progress,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }
    } catch (error) {
      logger.error('Failed to get document upload', { error, documentId: id })
      throw new Error('Failed to get document upload')
    }
  }

  async getUserDocuments(userId: string, limit = 50, offset = 0): Promise<DocumentUpload[]> {
    const query = `
      SELECT * FROM document_uploads 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `
    
    try {
      const result = await this.db.query(query, [userId, limit, offset])
      return result.rows.map(row => ({
        id: row.id,
        userId: row.user_id,
        applicationId: row.application_id,
        originalName: row.original_name,
        fileName: row.file_name,
        filePath: row.file_path,
        fileSize: row.file_size,
        mimeType: row.mime_type,
        uploadStatus: row.upload_status,
        processingProgress: row.processing_progress,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    } catch (error) {
      logger.error('Failed to get user documents', { error, userId })
      throw new Error('Failed to get user documents')
    }
  }

  // Processing Job Management
  async createProcessingJob(job: ProcessingJob): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO document_processing_jobs (
        id, document_id, job_type, status, progress, ai_model_used
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `

    try {
      const result = await this.db.query(query, [
        id,
        job.documentId,
        job.jobType,
        job.status || 'pending',
        job.progress || 0,
        job.aiModelUsed
      ])

      logger.info('Processing job created', { jobId: id, documentId: job.documentId, type: job.jobType })
      return id
    } catch (error) {
      logger.error('Failed to create processing job', { error, job })
      throw new Error('Failed to create processing job')
    }
  }

  async updateProcessingJob(id: string, updates: Partial<ProcessingJob>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`)
      values.push(updates.status)
    }
    if (updates.progress !== undefined) {
      fields.push(`progress = $${paramCount++}`)
      values.push(updates.progress)
    }
    if (updates.errorMessage !== undefined) {
      fields.push(`error_message = $${paramCount++}`)
      values.push(updates.errorMessage)
    }
    if (updates.resultData !== undefined) {
      fields.push(`result_data = $${paramCount++}`)
      values.push(JSON.stringify(updates.resultData))
    }
    if (updates.processingTimeMs !== undefined) {
      fields.push(`processing_time_ms = $${paramCount++}`)
      values.push(updates.processingTimeMs)
    }
    if (updates.status === 'processing' && !updates.startedAt) {
      fields.push(`started_at = NOW()`)
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push(`completed_at = NOW()`)
    }

    if (fields.length === 0) return

    values.push(id)

    const query = `
      UPDATE document_processing_jobs 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `

    try {
      await this.db.query(query, values)
      logger.info('Processing job updated', { jobId: id, updates })
    } catch (error) {
      logger.error('Failed to update processing job', { error, jobId: id })
      throw new Error('Failed to update processing job')
    }
  }

  async getDocumentJobs(documentId: string): Promise<ProcessingJob[]> {
    const query = `
      SELECT * FROM document_processing_jobs 
      WHERE document_id = $1 
      ORDER BY created_at DESC
    `
    
    try {
      const result = await this.db.query(query, [documentId])
      return result.rows.map(row => ({
        id: row.id,
        documentId: row.document_id,
        jobType: row.job_type,
        status: row.status,
        progress: row.progress,
        errorMessage: row.error_message,
        resultData: row.result_data,
        aiModelUsed: row.ai_model_used,
        processingTimeMs: row.processing_time_ms,
        startedAt: row.started_at,
        completedAt: row.completed_at
      }))
    } catch (error) {
      logger.error('Failed to get document jobs', { error, documentId })
      throw new Error('Failed to get document jobs')
    }
  }

  // AI-Powered Document Analysis
  async analyzeDocument(documentId: string): Promise<DocumentAnalysisResult> {
    const startTime = Date.now()
    
    try {
      const document = await this.getDocumentUpload(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      logger.info('Starting document analysis', { documentId, fileName: document.fileName })

      // Update document status
      await this.updateDocumentUpload(documentId, { 
        uploadStatus: 'processing', 
        processingProgress: 10 
      })

      // Create processing jobs
      const textExtractionJob = await this.createProcessingJob({
        documentId,
        jobType: 'text_extraction',
        aiModelUsed: 'text-extraction-service'
      })

      // Extract text content
      await this.updateProcessingJob(textExtractionJob, { status: 'processing', progress: 0 })
      const textContent = await this.extractTextFromDocument(document)
      await this.updateProcessingJob(textExtractionJob, { 
        status: 'completed', 
        progress: 100,
        resultData: { textLength: textContent.length },
        processingTimeMs: Date.now() - startTime
      })

      await this.updateDocumentUpload(documentId, { processingProgress: 30 })

      // AI Analysis Job
      const aiAnalysisJob = await this.createProcessingJob({
        documentId,
        jobType: 'ai_analysis',
        aiModelUsed: 'gpt-4o-mini'
      })

      await this.updateProcessingJob(aiAnalysisJob, { status: 'processing', progress: 0 })

      // Record AI interaction
      const interactionId = await this.aiTransparencyService.createInteraction({
        userId: document.userId,
        applicationId: document.applicationId,
        interactionType: 'document_analysis',
        promptText: `Analyze document: ${document.originalName}`,
        modelUsed: 'gpt-4o-mini',
        status: 'processing'
      })

      // Perform AI analysis
      const analysisResult = await this.performAIAnalysis(textContent, document.originalName)
      
      const processingTime = Date.now() - startTime
      await this.updateProcessingJob(aiAnalysisJob, { 
        status: 'completed', 
        progress: 100,
        resultData: analysisResult,
        processingTimeMs: processingTime
      })

      // Update AI interaction
      await this.aiTransparencyService.updateInteraction(interactionId, {
        responseText: JSON.stringify(analysisResult),
        status: 'completed',
        processingTimeMs: processingTime,
        confidenceScore: this.calculateOverallConfidence(analysisResult)
      })

      await this.updateDocumentUpload(documentId, { processingProgress: 70 })

      // Store requirements and gaps
      await this.storeAnalysisResults(documentId, analysisResult)

      await this.updateDocumentUpload(documentId, { 
        uploadStatus: 'completed', 
        processingProgress: 100 
      })

      logger.info('Document analysis completed', { 
        documentId, 
        processingTime,
        requirementsFound: analysisResult.requirements.length,
        gapsIdentified: analysisResult.complianceGaps.length
      })

      return {
        ...analysisResult,
        processingTime
      }

    } catch (error) {
      logger.error('Document analysis failed', { error, documentId })
      await this.updateDocumentUpload(documentId, { 
        uploadStatus: 'failed',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      })
      throw error
    }
  }

  private async extractTextFromDocument(document: DocumentUpload): Promise<string> {
    try {
      const content = await fs.readFile(document.filePath, 'utf8')
      return content
    } catch (error) {
      logger.error('Failed to extract text from document', { error, documentId: document.id })
      throw new Error('Failed to extract text from document')
    }
  }

  private async performAIAnalysis(textContent: string, fileName: string): Promise<Omit<DocumentAnalysisResult, 'processingTime'>> {
    const prompt = `
Analyze the following document for grant application requirements and compliance:

Document: ${fileName}
Content: ${textContent.substring(0, 4000)}...

Please provide:
1. A summary of the document
2. Key requirements extracted from the document
3. Potential compliance gaps or missing information
4. Key insights and recommendations

Format the response as JSON with the following structure:
{
  "summary": "Brief summary of the document",
  "keyInsights": ["insight1", "insight2", ...],
  "requirements": [
    {
      "requirementType": "type",
      "requirementText": "text",
      "confidenceScore": 0.95,
      "importanceLevel": "high",
      "sectionReference": "section"
    }
  ],
  "complianceGaps": [
    {
      "gapType": "type",
      "description": "description",
      "severity": "medium",
      "suggestedAction": "action",
      "aiConfidence": 0.85
    }
  ]
}
`

    try {
      const response = await this.openaiService.chatCompletion(prompt, {
        model: 'gpt-4o-mini',
        maxTokens: 2000,
        temperature: 0.3
      })

      const analysis = JSON.parse(response)
      
      return {
        textContent,
        summary: analysis.summary,
        keyInsights: analysis.keyInsights || [],
        requirements: analysis.requirements.map((req: any) => ({
          ...req,
          aiExtracted: true,
          humanVerified: false
        })),
        complianceGaps: analysis.complianceGaps.map((gap: any) => ({
          ...gap,
          status: 'identified'
        }))
      }
    } catch (error) {
      logger.error('AI analysis failed', { error })
      throw new Error('AI analysis failed')
    }
  }

  private calculateOverallConfidence(analysis: Omit<DocumentAnalysisResult, 'processingTime'>): number {
    if (analysis.requirements.length === 0) return 0.5
    
    const avgRequirementConfidence = analysis.requirements.reduce(
      (sum, req) => sum + req.confidenceScore, 0
    ) / analysis.requirements.length

    const avgGapConfidence = analysis.complianceGaps.length > 0 
      ? analysis.complianceGaps.reduce((sum, gap) => sum + gap.aiConfidence, 0) / analysis.complianceGaps.length
      : 0.8

    return (avgRequirementConfidence + avgGapConfidence) / 2
  }

  private async storeAnalysisResults(
    documentId: string, 
    analysis: Omit<DocumentAnalysisResult, 'processingTime'>
  ): Promise<void> {
    try {
      // Store requirements
      for (const requirement of analysis.requirements) {
        await this.storeRequirement(documentId, requirement)
      }

      // Store compliance gaps
      for (const gap of analysis.complianceGaps) {
        await this.storeComplianceGap(documentId, gap)
      }

      logger.info('Analysis results stored', { 
        documentId, 
        requirements: analysis.requirements.length,
        gaps: analysis.complianceGaps.length
      })
    } catch (error) {
      logger.error('Failed to store analysis results', { error, documentId })
      throw error
    }
  }

  private async storeRequirement(documentId: string, requirement: DocumentRequirement): Promise<void> {
    const query = `
      INSERT INTO document_requirements (
        document_id, requirement_type, requirement_text, confidence_score,
        importance_level, section_reference, ai_extracted, human_verified
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `

    await this.db.query(query, [
      documentId,
      requirement.requirementType,
      requirement.requirementText,
      requirement.confidenceScore,
      requirement.importanceLevel,
      requirement.sectionReference,
      requirement.aiExtracted,
      requirement.humanVerified
    ])
  }

  private async storeComplianceGap(documentId: string, gap: ComplianceGap): Promise<void> {
    const query = `
      INSERT INTO document_compliance_gaps (
        document_id, gap_type, description, severity, suggested_action,
        ai_confidence, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `

    await this.db.query(query, [
      documentId,
      gap.gapType,
      gap.description,
      gap.severity,
      gap.suggestedAction,
      gap.aiConfidence,
      gap.status
    ])
  }

  // Real-time status monitoring
  async getDocumentStatus(documentId: string): Promise<{
    document: DocumentUpload
    jobs: ProcessingJob[]
    overallProgress: number
  }> {
    try {
      const document = await this.getDocumentUpload(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      const jobs = await this.getDocumentJobs(documentId)
      
      // Calculate overall progress based on job completion
      const totalJobs = jobs.length
      const completedJobs = jobs.filter(job => job.status === 'completed').length
      const overallProgress = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : document.processingProgress || 0

      return {
        document,
        jobs,
        overallProgress: Math.round(overallProgress)
      }
    } catch (error) {
      logger.error('Failed to get document status', { error, documentId })
      throw error
    }
  }

  async deleteDocument(documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.getDocumentUpload(documentId)
      if (!document) {
        throw new Error('Document not found')
      }

      if (document.userId !== userId) {
        throw new Error('Access denied')
      }

      // Delete file from filesystem
      try {
        await fs.unlink(document.filePath)
      } catch (error) {
        logger.warn('Failed to delete file from filesystem', { error, filePath: document.filePath })
      }

      // Delete from database (cascade will handle related records)
      await this.db.query('DELETE FROM document_uploads WHERE id = $1', [documentId])

      logger.info('Document deleted', { documentId, userId })
    } catch (error) {
      logger.error('Failed to delete document', { error, documentId, userId })
      throw error
    }
  }
}