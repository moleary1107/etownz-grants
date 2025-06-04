import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { logger } from './logger'

export interface AIInteraction {
  id?: string
  userId: string
  applicationId?: string
  interactionType: string
  promptText?: string
  responseText?: string
  modelUsed: string
  confidenceScore?: number
  tokensUsed?: number
  processingTimeMs?: number
  userRating?: number
  userFeedback?: string
  status?: 'pending' | 'processing' | 'completed' | 'failed'
  metadata?: Record<string, any>
  createdAt?: Date
  updatedAt?: Date
}

export interface AIGeneratedContent {
  id?: string
  interactionId: string
  applicationId?: string
  sectionName: string
  contentText: string
  contentType: string
  confidenceScore: number
  reasoning?: string
  sources?: string[]
  humanEdited?: boolean
  humanApproved?: boolean
  version?: number
}

export interface ComplianceCheckResult {
  id?: string
  applicationId: string
  grantSchemeId?: string
  checkType: string
  overallScore?: number
  issues: any[]
  recommendations: any[]
  aiModelUsed?: string
  confidenceScore?: number
  status?: 'pending' | 'completed' | 'failed'
}

export interface DocumentAnalysisResult {
  id?: string
  applicationId?: string
  documentName: string
  documentType?: string
  filePath?: string
  fileSize?: number
  analysisType: string
  extractedText?: string
  keyRequirements?: any[]
  complianceScore?: number
  summary?: string
  insights?: Record<string, any>
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  aiModelUsed?: string
  confidenceScore?: number
}

export class AITransparencyService {
  private db: Pool

  constructor(db: Pool) {
    this.db = db
  }

  // AI Interactions
  async createInteraction(interaction: AIInteraction): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO ai_interactions (
        id, user_id, application_id, interaction_type, prompt_text, 
        response_text, model_used, confidence_score, tokens_used, 
        processing_time_ms, status, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `
    
    try {
      const result = await this.db.query(query, [
        id,
        interaction.userId,
        interaction.applicationId,
        interaction.interactionType,
        interaction.promptText,
        interaction.responseText,
        interaction.modelUsed,
        interaction.confidenceScore,
        interaction.tokensUsed,
        interaction.processingTimeMs,
        interaction.status || 'completed',
        JSON.stringify(interaction.metadata || {})
      ])
      
      logger.info('AI interaction created', { interactionId: id, type: interaction.interactionType })
      return id
    } catch (error) {
      logger.error('Failed to create AI interaction', { error, interaction })
      throw new Error('Failed to create AI interaction')
    }
  }

  async updateInteraction(id: string, updates: Partial<AIInteraction>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.responseText !== undefined) {
      fields.push(`response_text = $${paramCount++}`)
      values.push(updates.responseText)
    }
    if (updates.confidenceScore !== undefined) {
      fields.push(`confidence_score = $${paramCount++}`)
      values.push(updates.confidenceScore)
    }
    if (updates.tokensUsed !== undefined) {
      fields.push(`tokens_used = $${paramCount++}`)
      values.push(updates.tokensUsed)
    }
    if (updates.processingTimeMs !== undefined) {
      fields.push(`processing_time_ms = $${paramCount++}`)
      values.push(updates.processingTimeMs)
    }
    if (updates.userRating !== undefined) {
      fields.push(`user_rating = $${paramCount++}`)
      values.push(updates.userRating)
    }
    if (updates.userFeedback !== undefined) {
      fields.push(`user_feedback = $${paramCount++}`)
      values.push(updates.userFeedback)
    }
    if (updates.status !== undefined) {
      fields.push(`status = $${paramCount++}`)
      values.push(updates.status)
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`)
      values.push(JSON.stringify(updates.metadata))
    }

    if (fields.length === 0) return

    fields.push(`updated_at = NOW()`)
    values.push(id)

    const query = `
      UPDATE ai_interactions 
      SET ${fields.join(', ')}
      WHERE id = $${paramCount}
    `

    try {
      await this.db.query(query, values)
      logger.info('AI interaction updated', { interactionId: id })
    } catch (error) {
      logger.error('Failed to update AI interaction', { error, interactionId: id })
      throw new Error('Failed to update AI interaction')
    }
  }

  async getInteraction(id: string): Promise<AIInteraction | null> {
    const query = `
      SELECT * FROM ai_interactions WHERE id = $1
    `
    
    try {
      const result = await this.db.query(query, [id])
      return result.rows[0] || null
    } catch (error) {
      logger.error('Failed to get AI interaction', { error, interactionId: id })
      throw new Error('Failed to get AI interaction')
    }
  }

  async getUserInteractions(userId: string, limit = 50, offset = 0): Promise<AIInteraction[]> {
    const query = `
      SELECT * FROM ai_interactions 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `
    
    try {
      const result = await this.db.query(query, [userId, limit, offset])
      return result.rows
    } catch (error) {
      logger.error('Failed to get user interactions', { error, userId })
      throw new Error('Failed to get user interactions')
    }
  }

  // AI Generated Content
  async saveGeneratedContent(content: AIGeneratedContent): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO ai_generated_content (
        id, interaction_id, application_id, section_name, content_text, 
        content_type, confidence_score, reasoning, sources, human_edited, 
        human_approved, version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `
    
    try {
      const result = await this.db.query(query, [
        id,
        content.interactionId,
        content.applicationId,
        content.sectionName,
        content.contentText,
        content.contentType,
        content.confidenceScore,
        content.reasoning,
        content.sources ? JSON.stringify(content.sources) : null,
        content.humanEdited || false,
        content.humanApproved || false,
        content.version || 1
      ])
      
      logger.info('AI generated content saved', { contentId: id, section: content.sectionName })
      return id
    } catch (error) {
      logger.error('Failed to save AI generated content', { error, content })
      throw new Error('Failed to save AI generated content')
    }
  }

  async getGeneratedContent(applicationId: string, sectionName?: string): Promise<AIGeneratedContent[]> {
    let query = `
      SELECT * FROM ai_generated_content 
      WHERE application_id = $1
    `
    const params = [applicationId]

    if (sectionName) {
      query += ` AND section_name = $2`
      params.push(sectionName)
    }

    query += ` ORDER BY version DESC, created_at DESC`
    
    try {
      const result = await this.db.query(query, params)
      return result.rows.map(row => ({
        ...row,
        sources: row.sources ? JSON.parse(row.sources) : []
      }))
    } catch (error) {
      logger.error('Failed to get generated content', { error, applicationId, sectionName })
      throw new Error('Failed to get generated content')
    }
  }

  // Compliance Checks
  async saveComplianceCheck(check: ComplianceCheckResult): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO compliance_checks (
        id, application_id, grant_scheme_id, check_type, overall_score,
        issues, recommendations, ai_model_used, confidence_score, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `
    
    try {
      const result = await this.db.query(query, [
        id,
        check.applicationId,
        check.grantSchemeId,
        check.checkType,
        check.overallScore,
        JSON.stringify(check.issues),
        JSON.stringify(check.recommendations),
        check.aiModelUsed,
        check.confidenceScore,
        check.status || 'completed'
      ])
      
      logger.info('Compliance check saved', { checkId: id, type: check.checkType })
      return id
    } catch (error) {
      logger.error('Failed to save compliance check', { error, check })
      throw new Error('Failed to save compliance check')
    }
  }

  async getComplianceChecks(applicationId: string): Promise<ComplianceCheckResult[]> {
    const query = `
      SELECT * FROM compliance_checks 
      WHERE application_id = $1 
      ORDER BY checked_at DESC
    `
    
    try {
      const result = await this.db.query(query, [applicationId])
      return result.rows.map(row => ({
        ...row,
        issues: JSON.parse(row.issues),
        recommendations: JSON.parse(row.recommendations)
      }))
    } catch (error) {
      logger.error('Failed to get compliance checks', { error, applicationId })
      throw new Error('Failed to get compliance checks')
    }
  }

  // Document Analysis
  async saveDocumentAnalysis(analysis: DocumentAnalysisResult): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO document_analysis (
        id, application_id, document_name, document_type, file_path, file_size,
        analysis_type, extracted_text, key_requirements, compliance_score,
        summary, insights, processing_status, ai_model_used, confidence_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `
    
    try {
      const result = await this.db.query(query, [
        id,
        analysis.applicationId,
        analysis.documentName,
        analysis.documentType,
        analysis.filePath,
        analysis.fileSize,
        analysis.analysisType,
        analysis.extractedText,
        analysis.keyRequirements ? JSON.stringify(analysis.keyRequirements) : null,
        analysis.complianceScore,
        analysis.summary,
        analysis.insights ? JSON.stringify(analysis.insights) : null,
        analysis.processingStatus || 'completed',
        analysis.aiModelUsed,
        analysis.confidenceScore
      ])
      
      logger.info('Document analysis saved', { analysisId: id, type: analysis.analysisType })
      return id
    } catch (error) {
      logger.error('Failed to save document analysis', { error, analysis })
      throw new Error('Failed to save document analysis')
    }
  }

  async getDocumentAnalysis(applicationId: string): Promise<DocumentAnalysisResult[]> {
    const query = `
      SELECT * FROM document_analysis 
      WHERE application_id = $1 
      ORDER BY created_at DESC
    `
    
    try {
      const result = await this.db.query(query, [applicationId])
      return result.rows.map(row => ({
        ...row,
        keyRequirements: row.key_requirements ? JSON.parse(row.key_requirements) : [],
        insights: row.insights ? JSON.parse(row.insights) : {}
      }))
    } catch (error) {
      logger.error('Failed to get document analysis', { error, applicationId })
      throw new Error('Failed to get document analysis')
    }
  }

  // Analytics and Reporting
  async getAIUsageStats(userId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    let query = `
      SELECT 
        interaction_type,
        COUNT(*) as count,
        AVG(confidence_score) as avg_confidence,
        AVG(user_rating) as avg_rating,
        SUM(tokens_used) as total_tokens,
        AVG(processing_time_ms) as avg_processing_time
      FROM ai_interactions 
      WHERE status = 'completed'
    `
    const params: any[] = []
    let paramCount = 1

    if (userId) {
      query += ` AND user_id = $${paramCount++}`
      params.push(userId)
    }

    if (startDate) {
      query += ` AND created_at >= $${paramCount++}`
      params.push(startDate)
    }

    if (endDate) {
      query += ` AND created_at <= $${paramCount++}`
      params.push(endDate)
    }

    query += ` GROUP BY interaction_type ORDER BY count DESC`

    try {
      const result = await this.db.query(query, params)
      return result.rows
    } catch (error) {
      logger.error('Failed to get AI usage stats', { error })
      throw new Error('Failed to get AI usage stats')
    }
  }

  async submitUserRating(interactionId: string, rating: number, feedback?: string): Promise<void> {
    const query = `
      UPDATE ai_interactions 
      SET user_rating = $1, user_feedback = $2, updated_at = NOW()
      WHERE id = $3
    `
    
    try {
      await this.db.query(query, [rating, feedback, interactionId])
      logger.info('User rating submitted', { interactionId, rating })
    } catch (error) {
      logger.error('Failed to submit user rating', { error, interactionId })
      throw new Error('Failed to submit user rating')
    }
  }
}