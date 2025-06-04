import { Pool } from 'pg'
import { v4 as uuidv4 } from 'uuid'
import { logger } from './logger'
import { OpenAIService } from './openaiService'
import { AITransparencyService } from './aiTransparencyService'

export interface FormSession {
  id?: string
  userId: string
  grantId?: string
  applicationId?: string
  sessionType?: string
  startedAt?: Date
  completedAt?: Date
  abandonedAt?: Date
  completionPercentage?: number
  timeSpentSeconds?: number
  fieldsCompleted?: number
  fieldsTotal?: number
  userAgent?: string
  metadata?: Record<string, any>
}

export interface FieldInteraction {
  id?: string
  sessionId: string
  fieldName: string
  fieldType: string
  interactionType: 'focus' | 'blur' | 'change' | 'submit' | 'validation_error' | 'ai_assist'
  fieldValue?: string
  timeSpentSeconds?: number
  validationErrors?: string[]
  aiSuggestionsShown?: boolean
  aiAssistanceUsed?: boolean
  interactionOrder?: number
  metadata?: Record<string, any>
}

export interface DisclosureRule {
  id?: string
  grantSchemeId?: string
  ruleName: string
  triggerField: string
  triggerCondition: {
    operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in_array'
    value: any
    logic?: 'and' | 'or'
  }
  targetFields: string[]
  action: 'show' | 'hide' | 'require' | 'optional'
  priority?: number
  isActive?: boolean
  metadata?: Record<string, any>
}

export interface FieldRecommendation {
  id?: string
  sessionId: string
  fieldName: string
  recommendationType: 'show_next' | 'skip_optional' | 'provide_help' | 'suggest_value' | 'validate_input'
  recommendationText?: string
  confidenceScore?: number
  aiModelUsed?: string
  userAction?: 'accepted' | 'rejected' | 'ignored'
  metadata?: Record<string, any>
}

export interface FieldVisibility {
  fieldName: string
  isVisible: boolean
  isRequired: boolean
  visibilityReason: string
  ruleId?: string
  recommendationId?: string
}

export interface FormAnalysis {
  recommendedFields: string[]
  optionalFields: string[]
  fieldVisibility: Record<string, FieldVisibility>
  nextSuggestedField?: string
  completionEstimate: number
  recommendations: FieldRecommendation[]
}

export class ProgressiveFormService {
  private db: Pool
  private openaiService: OpenAIService
  private aiTransparencyService: AITransparencyService

  constructor(db: Pool, openaiService: OpenAIService, aiTransparencyService: AITransparencyService) {
    this.db = db
    this.openaiService = openaiService
    this.aiTransparencyService = aiTransparencyService
  }

  // Form Session Management
  async createFormSession(session: FormSession): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO form_sessions (
        id, user_id, grant_id, application_id, session_type, 
        fields_total, user_agent, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    try {
      const result = await this.db.query(query, [
        id,
        session.userId,
        session.grantId,
        session.applicationId,
        session.sessionType || 'application_form',
        session.fieldsTotal || 0,
        session.userAgent,
        JSON.stringify(session.metadata || {})
      ])

      logger.info('Form session created', { sessionId: id, userId: session.userId })
      return id
    } catch (error) {
      logger.error('Failed to create form session', { error, session })
      throw new Error('Failed to create form session')
    }
  }

  async updateFormSession(sessionId: string, updates: Partial<FormSession>): Promise<void> {
    const fields: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (updates.completedAt !== undefined) {
      fields.push(`completed_at = $${paramCount++}`)
      values.push(updates.completedAt)
    }
    if (updates.abandonedAt !== undefined) {
      fields.push(`abandoned_at = $${paramCount++}`)
      values.push(updates.abandonedAt)
    }
    if (updates.completionPercentage !== undefined) {
      fields.push(`completion_percentage = $${paramCount++}`)
      values.push(updates.completionPercentage)
    }
    if (updates.timeSpentSeconds !== undefined) {
      fields.push(`time_spent_seconds = $${paramCount++}`)
      values.push(updates.timeSpentSeconds)
    }
    if (updates.fieldsCompleted !== undefined) {
      fields.push(`fields_completed = $${paramCount++}`)
      values.push(updates.fieldsCompleted)
    }
    if (updates.metadata !== undefined) {
      fields.push(`metadata = $${paramCount++}`)
      values.push(JSON.stringify(updates.metadata))
    }

    if (fields.length === 0) return

    values.push(sessionId)
    const query = `UPDATE form_sessions SET ${fields.join(', ')} WHERE id = $${paramCount}`

    try {
      await this.db.query(query, values)
      logger.info('Form session updated', { sessionId, updates })
    } catch (error) {
      logger.error('Failed to update form session', { error, sessionId })
      throw error
    }
  }

  // Field Interaction Tracking
  async trackFieldInteraction(interaction: FieldInteraction): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO form_field_interactions (
        id, session_id, field_name, field_type, interaction_type,
        field_value, time_spent_seconds, validation_errors,
        ai_suggestions_shown, ai_assistance_used, interaction_order, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `

    try {
      const result = await this.db.query(query, [
        id,
        interaction.sessionId,
        interaction.fieldName,
        interaction.fieldType,
        interaction.interactionType,
        interaction.fieldValue,
        interaction.timeSpentSeconds || 0,
        interaction.validationErrors || [],
        interaction.aiSuggestionsShown || false,
        interaction.aiAssistanceUsed || false,
        interaction.interactionOrder || 0,
        JSON.stringify(interaction.metadata || {})
      ])

      return id
    } catch (error) {
      logger.error('Failed to track field interaction', { error, interaction })
      throw error
    }
  }

  // Progressive Disclosure Logic
  async analyzeFormProgress(
    sessionId: string,
    formData: Record<string, any>,
    grantSchemeId?: string
  ): Promise<FormAnalysis> {
    try {
      // Get applicable disclosure rules
      const rules = await this.getDisclosureRules(grantSchemeId)
      
      // Calculate field visibility based on current data and rules
      const fieldVisibility = await this.calculateFieldVisibility(formData, rules)
      
      // Get AI recommendations for next fields
      const aiRecommendations = await this.generateAIFieldRecommendations(
        sessionId, 
        formData, 
        fieldVisibility
      )
      
      // Calculate completion percentage
      const completionEstimate = this.calculateCompletionEstimate(formData, fieldVisibility)
      
      // Determine recommended and optional fields
      const recommendedFields = Object.entries(fieldVisibility)
        .filter(([_, visibility]) => visibility.isVisible && visibility.isRequired)
        .map(([fieldName]) => fieldName)
      
      const optionalFields = Object.entries(fieldVisibility)
        .filter(([_, visibility]) => visibility.isVisible && !visibility.isRequired)
        .map(([fieldName]) => fieldName)

      // Store visibility state
      await this.updateFieldVisibility(sessionId, fieldVisibility)

      return {
        recommendedFields,
        optionalFields,
        fieldVisibility,
        nextSuggestedField: aiRecommendations.length > 0 ? aiRecommendations[0].fieldName : undefined,
        completionEstimate,
        recommendations: aiRecommendations
      }
    } catch (error) {
      logger.error('Failed to analyze form progress', { error, sessionId })
      throw error
    }
  }

  private async getDisclosureRules(grantSchemeId?: string): Promise<DisclosureRule[]> {
    const query = `
      SELECT * FROM form_disclosure_rules 
      WHERE (grant_scheme_id = $1 OR grant_scheme_id IS NULL) 
        AND is_active = true 
      ORDER BY priority DESC
    `
    
    try {
      const result = await this.db.query(query, [grantSchemeId])
      return result.rows.map(row => ({
        id: row.id,
        grantSchemeId: row.grant_scheme_id,
        ruleName: row.rule_name,
        triggerField: row.trigger_field,
        triggerCondition: row.trigger_condition,
        targetFields: row.target_fields,
        action: row.action,
        priority: row.priority,
        isActive: row.is_active,
        metadata: row.metadata
      }))
    } catch (error) {
      logger.error('Failed to get disclosure rules', { error })
      return []
    }
  }

  private async calculateFieldVisibility(
    formData: Record<string, any>,
    rules: DisclosureRule[]
  ): Promise<Record<string, FieldVisibility>> {
    const visibility: Record<string, FieldVisibility> = {}
    
    // Start with default field visibility
    const defaultFields = [
      'project_title', 'project_description', 'requested_amount', 
      'project_duration', 'organization_info'
    ]
    
    defaultFields.forEach(field => {
      visibility[field] = {
        fieldName: field,
        isVisible: true,
        isRequired: true,
        visibilityReason: 'default'
      }
    })

    // Apply disclosure rules
    for (const rule of rules) {
      const triggerValue = this.getNestedValue(formData, rule.triggerField)
      const conditionMet = this.evaluateCondition(triggerValue, rule.triggerCondition)
      
      if (conditionMet) {
        rule.targetFields.forEach(fieldName => {
          visibility[fieldName] = {
            fieldName,
            isVisible: rule.action === 'show' || rule.action === 'require',
            isRequired: rule.action === 'require',
            visibilityReason: 'rule_triggered',
            ruleId: rule.id
          }
        })
      }
    }

    return visibility
  }

  private evaluateCondition(value: any, condition: DisclosureRule['triggerCondition']): boolean {
    switch (condition.operator) {
      case 'equals':
        return value === condition.value
      case 'not_equals':
        return value !== condition.value
      case 'greater_than':
        return Number(value) > Number(condition.value)
      case 'less_than':
        return Number(value) < Number(condition.value)
      case 'contains':
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase())
      case 'in_array':
        return Array.isArray(condition.value) && condition.value.includes(value)
      default:
        return false
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private async generateAIFieldRecommendations(
    sessionId: string,
    formData: Record<string, any>,
    fieldVisibility: Record<string, FieldVisibility>
  ): Promise<FieldRecommendation[]> {
    try {
      // Create AI transparency record
      const interactionId = await this.aiTransparencyService.createInteraction({
        userId: 'system', // We'll need to pass userId from the calling context
        interactionType: 'form_field_recommendation',
        promptText: `Analyze form progress for session ${sessionId}`,
        modelUsed: 'gpt-4o-mini',
        status: 'processing'
      })

      const visibleFields = Object.keys(fieldVisibility).filter(field => fieldVisibility[field].isVisible)
      const completedFields = Object.keys(formData).filter(key => formData[key] && formData[key] !== '')
      const pendingFields = visibleFields.filter(field => !completedFields.includes(field))

      const prompt = `
Analyze this grant application form progress and recommend the next best fields to complete:

Completed fields: ${completedFields.join(', ')}
Pending visible fields: ${pendingFields.join(', ')}
Current form data: ${JSON.stringify(formData, null, 2)}

Please suggest:
1. The next most logical field to complete
2. Fields that can be skipped for now
3. Fields that need help/guidance
4. Any validation suggestions

Respond in JSON format:
{
  "recommendations": [
    {
      "fieldName": "field_name",
      "type": "show_next|skip_optional|provide_help|suggest_value|validate_input",
      "text": "recommendation text",
      "confidence": 0.85
    }
  ]
}
`

      const response = await this.openaiService.chatCompletion(prompt, {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        responseFormat: 'json_object'
      })

      const aiResponse = JSON.parse(response)
      const recommendations: FieldRecommendation[] = []

      if (aiResponse.recommendations && Array.isArray(aiResponse.recommendations)) {
        for (const rec of aiResponse.recommendations) {
          const recommendationId = await this.storeFieldRecommendation({
            sessionId,
            fieldName: rec.fieldName,
            recommendationType: rec.type,
            recommendationText: rec.text,
            confidenceScore: rec.confidence,
            aiModelUsed: 'gpt-4o-mini'
          })

          recommendations.push({
            id: recommendationId,
            sessionId,
            fieldName: rec.fieldName,
            recommendationType: rec.type,
            recommendationText: rec.text,
            confidenceScore: rec.confidence,
            aiModelUsed: 'gpt-4o-mini'
          })
        }
      }

      // Update AI transparency record
      await this.aiTransparencyService.updateInteraction(interactionId, {
        responseText: response,
        status: 'completed',
        confidenceScore: 0.8
      })

      return recommendations
    } catch (error) {
      logger.error('Failed to generate AI field recommendations', { error, sessionId })
      return []
    }
  }

  private async storeFieldRecommendation(recommendation: FieldRecommendation): Promise<string> {
    const id = uuidv4()
    const query = `
      INSERT INTO form_field_recommendations (
        id, session_id, field_name, recommendation_type, recommendation_text,
        confidence_score, ai_model_used, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `

    try {
      await this.db.query(query, [
        id,
        recommendation.sessionId,
        recommendation.fieldName,
        recommendation.recommendationType,
        recommendation.recommendationText,
        recommendation.confidenceScore,
        recommendation.aiModelUsed,
        JSON.stringify(recommendation.metadata || {})
      ])
      return id
    } catch (error) {
      logger.error('Failed to store field recommendation', { error })
      throw error
    }
  }

  private calculateCompletionEstimate(
    formData: Record<string, any>,
    fieldVisibility: Record<string, FieldVisibility>
  ): number {
    const visibleRequiredFields = Object.values(fieldVisibility)
      .filter(field => field.isVisible && field.isRequired)
    
    const completedRequiredFields = visibleRequiredFields
      .filter(field => formData[field.fieldName] && formData[field.fieldName] !== '')
    
    if (visibleRequiredFields.length === 0) return 100
    
    return Math.round((completedRequiredFields.length / visibleRequiredFields.length) * 100)
  }

  private async updateFieldVisibility(
    sessionId: string,
    fieldVisibility: Record<string, FieldVisibility>
  ): Promise<void> {
    try {
      // Clear existing visibility records for this session
      await this.db.query('DELETE FROM form_field_visibility WHERE session_id = $1', [sessionId])
      
      // Insert new visibility records
      for (const [fieldName, visibility] of Object.entries(fieldVisibility)) {
        await this.db.query(`
          INSERT INTO form_field_visibility (
            session_id, field_name, is_visible, is_required,
            visibility_reason, rule_id, recommendation_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          sessionId,
          fieldName,
          visibility.isVisible,
          visibility.isRequired,
          visibility.visibilityReason,
          visibility.ruleId,
          visibility.recommendationId
        ])
      }
    } catch (error) {
      logger.error('Failed to update field visibility', { error, sessionId })
    }
  }

  // Public API methods
  async getFormSession(sessionId: string): Promise<FormSession | null> {
    const query = 'SELECT * FROM form_sessions WHERE id = $1'
    
    try {
      const result = await this.db.query(query, [sessionId])
      if (result.rows.length === 0) return null
      
      const row = result.rows[0]
      return {
        id: row.id,
        userId: row.user_id,
        grantId: row.grant_id,
        applicationId: row.application_id,
        sessionType: row.session_type,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        abandonedAt: row.abandoned_at,
        completionPercentage: row.completion_percentage,
        timeSpentSeconds: row.time_spent_seconds,
        fieldsCompleted: row.fields_completed,
        fieldsTotal: row.fields_total,
        userAgent: row.user_agent,
        metadata: row.metadata
      }
    } catch (error) {
      logger.error('Failed to get form session', { error, sessionId })
      throw error
    }
  }

  async getSessionRecommendations(sessionId: string): Promise<FieldRecommendation[]> {
    const query = `
      SELECT * FROM form_field_recommendations 
      WHERE session_id = $1 AND user_action IS NULL
      ORDER BY shown_at DESC
    `
    
    try {
      const result = await this.db.query(query, [sessionId])
      return result.rows.map(row => ({
        id: row.id,
        sessionId: row.session_id,
        fieldName: row.field_name,
        recommendationType: row.recommendation_type,
        recommendationText: row.recommendation_text,
        confidenceScore: row.confidence_score,
        aiModelUsed: row.ai_model_used,
        userAction: row.user_action,
        metadata: row.metadata
      }))
    } catch (error) {
      logger.error('Failed to get session recommendations', { error, sessionId })
      return []
    }
  }

  async recordRecommendationAction(
    recommendationId: string,
    action: 'accepted' | 'rejected' | 'ignored'
  ): Promise<void> {
    const query = `
      UPDATE form_field_recommendations 
      SET user_action = $1, acted_at = NOW() 
      WHERE id = $2
    `
    
    try {
      await this.db.query(query, [action, recommendationId])
    } catch (error) {
      logger.error('Failed to record recommendation action', { error, recommendationId })
    }
  }
}