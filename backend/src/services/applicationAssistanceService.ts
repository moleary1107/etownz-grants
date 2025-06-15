import { logger } from './logger'
import { DatabaseService } from './database'
import { OpenAIService } from './openaiService'
import { UserPreferencesService } from './userPreferencesService'

export interface ApplicationTemplate {
  id: string
  grant_id: string
  template_type: 'form' | 'narrative' | 'budget' | 'technical'
  title: string
  description: string
  sections: ApplicationSection[]
  required_fields: string[]
  optional_fields: string[]
  validation_rules: ValidationRule[]
  ai_guidance: AIGuidance[]
  created_at: Date
  updated_at: Date
}

export interface ApplicationSection {
  id: string
  title: string
  description: string
  section_type: 'text' | 'number' | 'date' | 'file' | 'selection' | 'table' | 'narrative'
  required: boolean
  max_length?: number
  min_length?: number
  validation_pattern?: string
  ai_suggestions?: string[]
  help_text?: string
  order_index: number
}

export interface ValidationRule {
  field_name: string
  rule_type: 'required' | 'min_length' | 'max_length' | 'pattern' | 'range' | 'dependency'
  parameters: Record<string, any>
  error_message: string
  severity: 'error' | 'warning' | 'info'
}

export interface AIGuidance {
  section_id: string
  guidance_type: 'writing_tips' | 'examples' | 'common_mistakes' | 'best_practices' | 'auto_fill'
  content: string
  priority: number
  context_sensitive: boolean
}

export interface ApplicationDraft {
  id: string
  user_id: string
  grant_id: string
  template_id: string
  title: string
  status: 'draft' | 'in_review' | 'submitted' | 'approved' | 'rejected'
  completion_percentage: number
  form_data: Record<string, any>
  ai_suggestions: AISuggestion[]
  validation_results: ValidationResult[]
  last_ai_review: Date | null
  created_at: Date
  updated_at: Date
}

export interface AISuggestion {
  section_id: string
  field_name: string
  suggestion_type: 'content' | 'structure' | 'improvement' | 'error_fix' | 'auto_complete'
  original_text?: string
  suggested_text: string
  reasoning: string
  confidence: number
  implemented: boolean
  user_feedback?: 'accepted' | 'rejected' | 'modified'
  created_at: Date
}

export interface ValidationResult {
  field_name: string
  rule_type: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  suggestions?: string[]
  auto_fix_available: boolean
}

export interface SmartFormRequest {
  user_id: string
  grant_id: string
  organization_profile: any
  previous_applications?: string[]
  draft_id?: string
}

export interface SmartFormResponse {
  template: ApplicationTemplate
  pre_filled_data: Record<string, any>
  ai_suggestions: AISuggestion[]
  estimated_completion_time: number
  success_probability: number
  next_recommended_sections: string[]
}

export interface ContentGenerationRequest {
  user_id: string
  grant_id: string
  section_type: string
  user_input?: string
  context_data: Record<string, any>
  target_length?: number
  tone?: 'professional' | 'academic' | 'persuasive' | 'technical'
}

export interface ContentGenerationResponse {
  generated_content: string
  alternative_versions: string[]
  writing_tips: string[]
  estimated_score: number
  improvement_suggestions: string[]
  word_count: number
  readability_score: number
}

export class ApplicationAssistanceService {
  private db: DatabaseService
  private openai: OpenAIService
  private userPreferences: UserPreferencesService

  constructor(
    db: DatabaseService,
    openai: OpenAIService,
    userPreferences: UserPreferencesService
  ) {
    this.db = db
    this.openai = openai
    this.userPreferences = userPreferences
  }

  /**
   * Create a smart form with AI-powered pre-filling and suggestions
   */
  async createSmartForm(request: SmartFormRequest): Promise<SmartFormResponse> {
    try {
      logger.info('Creating smart form', {
        userId: request.user_id,
        grantId: request.grant_id,
        hasDraft: !!request.draft_id
      })

      // Get grant details and application template
      const [grant, template] = await Promise.all([
        this.getGrantDetails(request.grant_id),
        this.getApplicationTemplate(request.grant_id)
      ])

      if (!grant || !template) {
        throw new Error('Grant or application template not found')
      }

      // Get user profile and previous applications for context
      const [userProfile, previousApps] = await Promise.all([
        this.userPreferences.getUserProfile(request.user_id),
        this.getPreviousApplications(request.user_id, request.previous_applications)
      ])

      // Generate pre-filled data using AI
      const preFilledData = await this.generatePreFilledData({
        grant,
        template,
        organizationProfile: request.organization_profile,
        userProfile,
        previousApps
      })

      // Generate AI suggestions for each section
      const aiSuggestions = await this.generateSectionSuggestions({
        template,
        grant,
        organizationProfile: request.organization_profile,
        userProfile,
        preFilledData
      })

      // Calculate estimated completion time
      const estimatedTime = this.calculateCompletionTime(template, preFilledData)

      // Calculate success probability based on AI analysis
      const successProbability = await this.calculateSuccessProbability({
        grant,
        organizationProfile: request.organization_profile,
        userProfile,
        template
      })

      // Determine next recommended sections
      const nextSections = this.getNextRecommendedSections(template, preFilledData)

      logger.info('Smart form created successfully', {
        userId: request.user_id,
        grantId: request.grant_id,
        preFilledFields: Object.keys(preFilledData).length,
        suggestionsCount: aiSuggestions.length,
        estimatedTime,
        successProbability
      })

      return {
        template,
        pre_filled_data: preFilledData,
        ai_suggestions: aiSuggestions,
        estimated_completion_time: estimatedTime,
        success_probability: successProbability,
        next_recommended_sections: nextSections
      }
    } catch (error) {
      logger.error('Failed to create smart form', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.user_id,
        grantId: request.grant_id
      })
      throw error
    }
  }

  /**
   * Generate content for specific application sections using AI
   */
  async generateSectionContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    try {
      logger.info('Generating section content', {
        userId: request.user_id,
        grantId: request.grant_id,
        sectionType: request.section_type,
        targetLength: request.target_length,
        tone: request.tone
      })

      // Get grant and user context
      const [grant, userProfile] = await Promise.all([
        this.getGrantDetails(request.grant_id),
        this.userPreferences.getUserProfile(request.user_id)
      ])

      if (!grant) {
        throw new Error('Grant not found')
      }

      // Build context for AI generation
      const generationContext = {
        grant,
        userProfile,
        sectionType: request.section_type,
        userInput: request.user_input || '',
        contextData: request.context_data,
        targetLength: request.target_length || 500,
        tone: request.tone || 'professional'
      }

      // Generate main content
      const generatedContent = await this.generateMainContent(generationContext)

      // Generate alternative versions
      const alternativeVersions = await this.generateAlternativeVersions(
        generationContext,
        generatedContent
      )

      // Get writing tips specific to this section type
      const writingTips = await this.getWritingTips(request.section_type, grant)

      // Estimate content quality score
      const estimatedScore = await this.scoreContent(generatedContent, grant, request.section_type)

      // Generate improvement suggestions
      const improvements = await this.generateImprovementSuggestions(
        generatedContent,
        grant,
        request.section_type
      )

      // Calculate metrics
      const wordCount = generatedContent.split(/\s+/).length
      const readabilityScore = this.calculateReadabilityScore(generatedContent)

      logger.info('Section content generated successfully', {
        userId: request.user_id,
        grantId: request.grant_id,
        sectionType: request.section_type,
        wordCount,
        estimatedScore,
        alternativeVersions: alternativeVersions.length
      })

      return {
        generated_content: generatedContent,
        alternative_versions: alternativeVersions,
        writing_tips: writingTips,
        estimated_score: estimatedScore,
        improvement_suggestions: improvements,
        word_count: wordCount,
        readability_score: readabilityScore
      }
    } catch (error) {
      logger.error('Failed to generate section content', {
        error: error instanceof Error ? error.message : String(error),
        userId: request.user_id,
        grantId: request.grant_id,
        sectionType: request.section_type
      })
      throw error
    }
  }

  /**
   * Validate application form with AI-powered suggestions
   */
  async validateApplication(draftId: string): Promise<{
    validation_results: ValidationResult[]
    overall_score: number
    completion_percentage: number
    ai_suggestions: AISuggestion[]
    critical_issues: string[]
    improvement_priority: string[]
  }> {
    try {
      logger.info('Validating application', { draftId })

      const draft = await this.getApplicationDraft(draftId)
      if (!draft) {
        throw new Error('Application draft not found')
      }

      const [grant, template] = await Promise.all([
        this.getGrantDetails(draft.grant_id),
        this.getApplicationTemplate(draft.grant_id)
      ])

      if (!grant || !template) {
        throw new Error('Grant or template not found')
      }

      // Run validation rules
      const validationResults = await this.runValidationRules(draft, template)

      // Calculate completion percentage
      const completionPercentage = this.calculateCompletionPercentage(draft, template)

      // Generate AI-powered suggestions
      const aiSuggestions = await this.generateValidationSuggestions(draft, grant, template)

      // Calculate overall score
      const overallScore = await this.calculateOverallScore(draft, grant, template, validationResults)

      // Identify critical issues
      const criticalIssues = validationResults
        .filter(result => result.status === 'fail' && result.message.includes('required'))
        .map(result => result.message)

      // Prioritize improvements
      const improvementPriority = this.prioritizeImprovements(validationResults, aiSuggestions)

      // Update draft with validation results
      await this.updateDraftValidation(draftId, {
        validation_results: validationResults,
        ai_suggestions: aiSuggestions,
        completion_percentage: completionPercentage,
        last_ai_review: new Date()
      })

      logger.info('Application validation completed', {
        draftId,
        overallScore,
        completionPercentage,
        criticalIssuesCount: criticalIssues.length,
        suggestionsCount: aiSuggestions.length
      })

      return {
        validation_results: validationResults,
        overall_score: overallScore,
        completion_percentage: completionPercentage,
        ai_suggestions: aiSuggestions,
        critical_issues: criticalIssues,
        improvement_priority: improvementPriority
      }
    } catch (error) {
      logger.error('Failed to validate application', {
        error: error instanceof Error ? error.message : String(error),
        draftId
      })
      throw error
    }
  }

  /**
   * Auto-complete form fields using AI and previous applications
   */
  async autoCompleteFields(
    draftId: string,
    fieldNames: string[]
  ): Promise<Record<string, { value: any; confidence: number; reasoning: string }>> {
    try {
      logger.info('Auto-completing fields', { draftId, fieldCount: fieldNames.length })

      const draft = await this.getApplicationDraft(draftId)
      if (!draft) {
        throw new Error('Application draft not found')
      }

      const [grant, template, userProfile, previousApps] = await Promise.all([
        this.getGrantDetails(draft.grant_id),
        this.getApplicationTemplate(draft.grant_id),
        this.userPreferences.getUserProfile(draft.user_id),
        this.getPreviousApplications(draft.user_id)
      ])

      if (!template) {
        throw new Error('Application template not found')
      }

      const autoCompletedFields: Record<string, { value: any; confidence: number; reasoning: string }> = {}

      for (const fieldName of fieldNames) {
        const section = template.sections.find(s => 
          s.id === fieldName || s.title.toLowerCase().includes(fieldName.toLowerCase())
        )

        if (!section) {
          logger.warn('Section not found for auto-completion', { fieldName, draftId })
          continue
        }

        // Generate field value using AI
        const fieldCompletion = await this.generateFieldCompletion({
          fieldName,
          section,
          grant,
          userProfile,
          previousApps,
          currentData: draft.form_data
        })

        autoCompletedFields[fieldName] = fieldCompletion

        logger.debug('Field auto-completed', {
          fieldName,
          confidence: fieldCompletion.confidence,
          hasValue: !!fieldCompletion.value
        })
      }

      // Update draft with auto-completed fields
      const updatedFormData = { ...draft.form_data }
      Object.entries(autoCompletedFields).forEach(([fieldName, completion]) => {
        if (completion.confidence > 0.7) { // Only auto-fill high confidence completions
          updatedFormData[fieldName] = completion.value
        }
      })

      await this.updateDraftFormData(draftId, updatedFormData)

      logger.info('Auto-completion completed', {
        draftId,
        fieldsProcessed: fieldNames.length,
        fieldsCompleted: Object.keys(autoCompletedFields).length,
        highConfidenceFields: Object.values(autoCompletedFields).filter(f => f.confidence > 0.7).length
      })

      return autoCompletedFields
    } catch (error) {
      logger.error('Failed to auto-complete fields', {
        error: error instanceof Error ? error.message : String(error),
        draftId,
        fieldNames
      })
      throw error
    }
  }

  /**
   * Get writing suggestions for improving application content
   */
  async getWritingSuggestions(
    draftId: string,
    sectionId: string
  ): Promise<{
    suggestions: AISuggestion[]
    tone_analysis: { current_tone: string; recommended_tone: string; adjustments: string[] }
    readability: { score: number; grade_level: string; improvements: string[] }
    keyword_optimization: { missing_keywords: string[]; keyword_density: Record<string, number> }
  }> {
    try {
      logger.info('Getting writing suggestions', { draftId, sectionId })

      const draft = await this.getApplicationDraft(draftId)
      if (!draft) {
        throw new Error('Application draft not found')
      }

      const [grant, template] = await Promise.all([
        this.getGrantDetails(draft.grant_id),
        this.getApplicationTemplate(draft.grant_id)
      ])

      if (!template) {
        throw new Error('Application template not found')
      }

      const section = template.sections.find(s => s.id === sectionId)
      if (!section) {
        throw new Error('Section not found')
      }

      const currentContent = draft.form_data[sectionId] || ''

      // Generate AI-powered writing suggestions
      const suggestions = await this.generateWritingSuggestions(currentContent, grant, section)

      // Analyze tone
      const toneAnalysis = await this.analyzeTone(currentContent, grant, section)

      // Calculate readability
      const readability = this.analyzeReadability(currentContent)

      // Analyze keyword optimization
      const keywordOptimization = await this.analyzeKeywords(currentContent, grant)

      logger.info('Writing suggestions generated', {
        draftId,
        sectionId,
        suggestionsCount: suggestions.length,
        readabilityScore: readability.score,
        missingKeywords: keywordOptimization.missing_keywords.length
      })

      return {
        suggestions,
        tone_analysis: toneAnalysis,
        readability,
        keyword_optimization: keywordOptimization
      }
    } catch (error) {
      logger.error('Failed to get writing suggestions', {
        error: error instanceof Error ? error.message : String(error),
        draftId,
        sectionId
      })
      throw error
    }
  }

  // Private helper methods

  private async getGrantDetails(grantId: string): Promise<any> {
    const result = await this.db.query('SELECT * FROM grants WHERE id = $1', [grantId])
    return result.rows[0] || null
  }

  private async getApplicationTemplate(grantId: string): Promise<ApplicationTemplate | null> {
    const result = await this.db.query(
      'SELECT * FROM application_templates WHERE grant_id = $1 ORDER BY created_at DESC LIMIT 1',
      [grantId]
    )
    
    if (result.rows.length === 0) {
      // Generate a default template based on grant requirements
      return this.generateDefaultTemplate(grantId)
    }

    const templateRow = result.rows[0]
    return {
      ...templateRow,
      sections: JSON.parse(templateRow.sections || '[]'),
      required_fields: JSON.parse(templateRow.required_fields || '[]'),
      optional_fields: JSON.parse(templateRow.optional_fields || '[]'),
      validation_rules: JSON.parse(templateRow.validation_rules || '[]'),
      ai_guidance: JSON.parse(templateRow.ai_guidance || '[]')
    }
  }

  private async generateDefaultTemplate(grantId: string): Promise<ApplicationTemplate> {
    // This would generate a default application template based on common grant requirements
    // For now, return a basic template
    return {
      id: `template-${grantId}`,
      grant_id: grantId,
      template_type: 'form',
      title: 'Standard Grant Application',
      description: 'Standard grant application form',
      sections: [
        {
          id: 'project_title',
          title: 'Project Title',
          description: 'Brief, descriptive title for your project',
          section_type: 'text',
          required: true,
          max_length: 200,
          order_index: 1
        },
        {
          id: 'project_summary',
          title: 'Project Summary',
          description: 'Executive summary of your project',
          section_type: 'narrative',
          required: true,
          max_length: 1000,
          order_index: 2
        },
        {
          id: 'budget_total',
          title: 'Total Budget',
          description: 'Total project budget requested',
          section_type: 'number',
          required: true,
          order_index: 3
        }
      ],
      required_fields: ['project_title', 'project_summary', 'budget_total'],
      optional_fields: [],
      validation_rules: [],
      ai_guidance: [],
      created_at: new Date(),
      updated_at: new Date()
    }
  }

  private async getPreviousApplications(userId: string, applicationIds?: string[]): Promise<any[]> {
    let query = 'SELECT * FROM application_drafts WHERE user_id = $1 AND status = $2'
    const params: any[] = [userId, 'submitted']

    if (applicationIds && applicationIds.length > 0) {
      query += ` AND id IN (${applicationIds.map((_, i) => `$${i + 3}`).join(',')})`
      params.push(...applicationIds)
    }

    query += ' ORDER BY created_at DESC LIMIT 5'

    const result = await this.db.query(query, params)
    return result.rows.map(row => ({
      ...row,
      form_data: JSON.parse(row.form_data || '{}'),
      ai_suggestions: JSON.parse(row.ai_suggestions || '[]'),
      validation_results: JSON.parse(row.validation_results || '[]')
    }))
  }

  private async generatePreFilledData(context: any): Promise<Record<string, any>> {
    // Use AI to generate pre-filled form data based on organization profile and previous applications
    const prompt = `
      Based on the following context, generate pre-filled form data for a grant application:
      
      Grant: ${JSON.stringify(context.grant, null, 2)}
      Organization: ${JSON.stringify(context.organizationProfile, null, 2)}
      Template: ${JSON.stringify(context.template, null, 2)}
      
      Generate realistic, relevant pre-filled values for form fields.
      Focus on fields that can be reasonably inferred from the organization profile.
      Return as JSON object with field names as keys.
    `

    try {
      const response = await this.openai.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.3,
        maxTokens: 1500
      })

      const content = response.content?.trim()
      if (!content) return {}

      return JSON.parse(content)
    } catch (error) {
      logger.warn('Failed to generate pre-filled data', { error })
      return {}
    }
  }

  private async generateSectionSuggestions(context: any): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = []

    for (const section of context.template.sections) {
      const suggestion: AISuggestion = {
        section_id: section.id,
        field_name: section.id,
        suggestion_type: 'content',
        suggested_text: `AI-generated suggestion for ${section.title}`,
        reasoning: `Based on grant requirements and your organization profile`,
        confidence: 0.8,
        implemented: false,
        created_at: new Date()
      }

      suggestions.push(suggestion)
    }

    return suggestions
  }

  private calculateCompletionTime(template: ApplicationTemplate, preFilledData: Record<string, any>): number {
    // Estimate completion time based on template complexity and pre-filled data
    const totalSections = template.sections.length
    const preFilledSections = Object.keys(preFilledData).length
    const remainingSections = totalSections - preFilledSections

    // Base time per section (in minutes)
    const timePerSection = {
      'text': 5,
      'number': 2,
      'date': 1,
      'file': 10,
      'selection': 3,
      'table': 15,
      'narrative': 30
    }

    let totalTime = 0
    template.sections.forEach(section => {
      if (!preFilledData[section.id]) {
        totalTime += timePerSection[section.section_type] || 10
      }
    })

    return Math.max(15, totalTime) // Minimum 15 minutes
  }

  private async calculateSuccessProbability(context: any): Promise<number> {
    // Use AI to calculate success probability based on organization profile and grant fit
    try {
      const prompt = `
        Analyze the probability of success for this grant application:
        
        Grant: ${JSON.stringify(context.grant, null, 2)}
        Organization: ${JSON.stringify(context.organizationProfile, null, 2)}
        
        Consider:
        - Organization eligibility and fit
        - Grant requirements alignment
        - Organization capabilities and track record
        - Competition level
        
        Return a probability score between 0 and 1 (0.0 to 1.0).
        Only return the numeric value.
      `

      const response = await this.openai.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.1,
        maxTokens: 10
      })

      const content = response.content?.trim()
      const probability = parseFloat(content || '0.5')
      
      return Math.max(0.1, Math.min(0.9, probability)) // Clamp between 0.1 and 0.9
    } catch (error) {
      logger.warn('Failed to calculate success probability', { error })
      return 0.5 // Default probability
    }
  }

  private getNextRecommendedSections(template: ApplicationTemplate, preFilledData: Record<string, any>): string[] {
    const unfilledSections = template.sections
      .filter(section => !preFilledData[section.id])
      .sort((a, b) => {
        // Prioritize required sections
        if (a.required && !b.required) return -1
        if (!a.required && b.required) return 1
        // Then by order index
        return a.order_index - b.order_index
      })

    return unfilledSections.slice(0, 3).map(section => section.id)
  }

  private async generateMainContent(context: any): Promise<string> {
    const prompt = `
      Generate ${context.targetLength} words of ${context.tone} content for a grant application section.
      
      Section Type: ${context.sectionType}
      Grant: ${context.grant.title}
      User Input: ${context.userInput}
      Context: ${JSON.stringify(context.contextData)}
      
      Generate compelling, relevant content that addresses the grant requirements.
      Use the specified tone and target length.
    `

    try {
      const response = await this.openai.chatCompletion([
        { role: 'user', content: prompt }
      ], {
        model: 'gpt-4o-mini',
        temperature: 0.7,
        maxTokens: Math.min(2000, Math.ceil(context.targetLength * 1.5))
      })

      return response.content?.trim() || ''
    } catch (error) {
      logger.error('Failed to generate main content', { error })
      throw error
    }
  }

  private async generateAlternativeVersions(context: any, originalContent: string): Promise<string[]> {
    // Generate 2-3 alternative versions with different approaches
    const alternatives: string[] = []

    const tones = ['professional', 'persuasive', 'technical'].filter(t => t !== context.tone)
    
    for (const tone of tones.slice(0, 2)) {
      try {
        const prompt = `
          Rewrite the following content in a ${tone} tone while maintaining the same key information:
          
          Original: ${originalContent}
          
          Make it approximately the same length but with a ${tone} approach.
        `

        const response = await this.openai.chatCompletion([
          { role: 'user', content: prompt }
        ], {
          model: 'gpt-4o-mini',
          temperature: 0.6,
          maxTokens: 1000
        })

        const alternative = response.content?.trim()
        if (alternative) alternatives.push(alternative)
      } catch (error) {
        logger.warn('Failed to generate alternative version', { tone, error })
      }
    }

    return alternatives
  }

  private async getWritingTips(sectionType: string, grant: any): Promise<string[]> {
    const tipsBySection: Record<string, string[]> = {
      'narrative': [
        'Use clear, concise language',
        'Start with a compelling opening',
        'Support claims with specific examples',
        'Address all grant criteria systematically'
      ],
      'budget': [
        'Justify all budget items',
        'Ensure budget aligns with project activities',
        'Include contingency planning',
        'Show cost-effectiveness'
      ],
      'technical': [
        'Use appropriate technical terminology',
        'Include methodology details',
        'Address feasibility concerns',
        'Provide timeline and milestones'
      ]
    }

    return tipsBySection[sectionType] || [
      'Be specific and detailed',
      'Use active voice',
      'Proofread carefully',
      'Follow grant guidelines exactly'
    ]
  }

  private async scoreContent(content: string, grant: any, sectionType: string): Promise<number> {
    // Simple content scoring based on length, keywords, and structure
    let score = 0.5

    // Length appropriateness
    const wordCount = content.split(/\s+/).length
    if (wordCount > 100) score += 0.1
    if (wordCount > 300) score += 0.1

    // Keyword presence (simplified)
    const grantKeywords = (grant.title + ' ' + grant.description).toLowerCase()
    const contentLower = content.toLowerCase()
    
    let keywordMatches = 0
    const importantWords = grantKeywords.split(/\s+/).filter(w => w.length > 3)
    importantWords.forEach(word => {
      if (contentLower.includes(word)) keywordMatches++
    })

    score += Math.min(0.3, keywordMatches / importantWords.length * 0.3)

    return Math.min(1.0, Math.max(0.1, score))
  }

  private async generateImprovementSuggestions(content: string, grant: any, sectionType: string): Promise<string[]> {
    const suggestions: string[] = []

    // Basic improvement suggestions
    const wordCount = content.split(/\s+/).length
    if (wordCount < 100) {
      suggestions.push('Consider expanding with more detail and examples')
    }

    if (!content.includes(grant.title.split(' ')[0])) {
      suggestions.push('Reference the specific grant program name')
    }

    if (content.split('.').length < 3) {
      suggestions.push('Break content into more sentences for better readability')
    }

    return suggestions
  }

  private calculateReadabilityScore(content: string): number {
    // Simplified Flesch Reading Ease calculation
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length
    const words = content.split(/\s+/).length
    const syllables = this.countSyllables(content)

    if (sentences === 0 || words === 0) return 0

    const avgSentenceLength = words / sentences
    const avgSyllablesPerWord = syllables / words

    const score = 206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord)
    
    return Math.max(0, Math.min(100, score))
  }

  private countSyllables(text: string): number {
    // Simplified syllable counting
    return text.toLowerCase()
      .replace(/[^a-z]/g, '')
      .replace(/[aeiou]+/g, 'a')
      .length || 1
  }

  private async getApplicationDraft(draftId: string): Promise<ApplicationDraft | null> {
    const result = await this.db.query('SELECT * FROM application_drafts WHERE id = $1', [draftId])
    
    if (result.rows.length === 0) return null

    const row = result.rows[0]
    return {
      ...row,
      form_data: JSON.parse(row.form_data || '{}'),
      ai_suggestions: JSON.parse(row.ai_suggestions || '[]'),
      validation_results: JSON.parse(row.validation_results || '[]')
    }
  }

  private async runValidationRules(draft: ApplicationDraft, template: ApplicationTemplate): Promise<ValidationResult[]> {
    const results: ValidationResult[] = []

    // Check required fields
    for (const fieldName of template.required_fields) {
      const value = draft.form_data[fieldName]
      
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        results.push({
          field_name: fieldName,
          rule_type: 'required',
          status: 'fail',
          message: `${fieldName} is required`,
          auto_fix_available: false
        })
      } else {
        results.push({
          field_name: fieldName,
          rule_type: 'required',
          status: 'pass',
          message: `${fieldName} is provided`,
          auto_fix_available: false
        })
      }
    }

    // Run custom validation rules
    for (const rule of template.validation_rules) {
      const value = draft.form_data[rule.field_name]
      const result = this.validateField(value, rule)
      results.push(result)
    }

    return results
  }

  private validateField(value: any, rule: ValidationRule): ValidationResult {
    switch (rule.rule_type) {
      case 'min_length': {
        const minLength = rule.parameters.min_length || 0
        const isValid = value && value.toString().length >= minLength
        return {
          field_name: rule.field_name,
          rule_type: rule.rule_type,
          status: isValid ? 'pass' : 'fail',
          message: isValid ? 'Minimum length met' : rule.error_message,
          auto_fix_available: false
        }
      }
      
      case 'max_length': {
        const maxLength = rule.parameters.max_length || Infinity
        const isValidMax = !value || value.toString().length <= maxLength
        return {
          field_name: rule.field_name,
          rule_type: rule.rule_type,
          status: isValidMax ? 'pass' : 'fail',
          message: isValidMax ? 'Maximum length respected' : rule.error_message,
          auto_fix_available: true
        }
      }

      default:
        return {
          field_name: rule.field_name,
          rule_type: rule.rule_type,
          status: 'pass',
          message: 'Validation passed',
          auto_fix_available: false
        }
    }
  }

  private calculateCompletionPercentage(draft: ApplicationDraft, template: ApplicationTemplate): number {
    const totalFields = template.required_fields.length + template.optional_fields.length
    if (totalFields === 0) return 100

    const completedFields = [...template.required_fields, ...template.optional_fields]
      .filter(fieldName => {
        const value = draft.form_data[fieldName]
        return value && (typeof value !== 'string' || value.trim() !== '')
      }).length

    return Math.round((completedFields / totalFields) * 100)
  }

  private async generateValidationSuggestions(
    draft: ApplicationDraft,
    grant: any,
    template: ApplicationTemplate
  ): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = []

    // Generate suggestions for incomplete required fields
    for (const fieldName of template.required_fields) {
      if (!draft.form_data[fieldName]) {
        suggestions.push({
          section_id: fieldName,
          field_name: fieldName,
          suggestion_type: 'auto_complete',
          suggested_text: `Complete the ${fieldName} field`,
          reasoning: 'This field is required for application submission',
          confidence: 0.9,
          implemented: false,
          created_at: new Date()
        })
      }
    }

    return suggestions
  }

  private async calculateOverallScore(
    draft: ApplicationDraft,
    grant: any,
    template: ApplicationTemplate,
    validationResults: ValidationResult[]
  ): Promise<number> {
    let score = 0

    // Completion score (40%)
    const completionPercentage = this.calculateCompletionPercentage(draft, template)
    score += (completionPercentage / 100) * 0.4

    // Validation score (30%)
    const passedValidations = validationResults.filter(r => r.status === 'pass').length
    const totalValidations = validationResults.length
    if (totalValidations > 0) {
      score += (passedValidations / totalValidations) * 0.3
    }

    // Content quality score (30%)
    let contentScore = 0
    let contentCount = 0
    
    for (const fieldName of template.required_fields) {
      const content = draft.form_data[fieldName]
      if (content && typeof content === 'string') {
        contentScore += await this.scoreContent(content, grant, 'narrative')
        contentCount++
      }
    }
    
    if (contentCount > 0) {
      score += (contentScore / contentCount) * 0.3
    }

    return Math.round(score * 100) / 100
  }

  private prioritizeImprovements(validationResults: ValidationResult[], aiSuggestions: AISuggestion[]): string[] {
    const improvements: { text: string; priority: number }[] = []

    // Critical validation failures
    validationResults
      .filter(r => r.status === 'fail' && r.message.includes('required'))
      .forEach(r => improvements.push({ text: r.message, priority: 1 }))

    // High-confidence AI suggestions
    aiSuggestions
      .filter(s => s.confidence > 0.8)
      .forEach(s => improvements.push({ text: s.suggested_text, priority: 2 }))

    // Other validation issues
    validationResults
      .filter(r => r.status === 'fail' && !r.message.includes('required'))
      .forEach(r => improvements.push({ text: r.message, priority: 3 }))

    return improvements
      .sort((a, b) => a.priority - b.priority)
      .map(i => i.text)
      .slice(0, 10) // Top 10 priorities
  }

  private async updateDraftValidation(draftId: string, updates: any): Promise<void> {
    await this.db.query(
      `UPDATE application_drafts 
       SET validation_results = $1, ai_suggestions = $2, completion_percentage = $3, last_ai_review = $4, updated_at = NOW()
       WHERE id = $5`,
      [
        JSON.stringify(updates.validation_results),
        JSON.stringify(updates.ai_suggestions),
        updates.completion_percentage,
        updates.last_ai_review,
        draftId
      ]
    )
  }

  private async updateDraftFormData(draftId: string, formData: Record<string, any>): Promise<void> {
    await this.db.query(
      'UPDATE application_drafts SET form_data = $1, updated_at = NOW() WHERE id = $2',
      [JSON.stringify(formData), draftId]
    )
  }

  private async generateFieldCompletion(context: any): Promise<{ value: any; confidence: number; reasoning: string }> {
    // Generate field completion based on context
    // This is a simplified version - in practice, this would use more sophisticated AI
    
    return {
      value: `AI-generated value for ${context.fieldName}`,
      confidence: 0.7,
      reasoning: `Generated based on ${context.section.title} requirements and user profile`
    }
  }

  private async generateWritingSuggestions(content: string, grant: any, section: ApplicationSection): Promise<AISuggestion[]> {
    const suggestions: AISuggestion[] = []

    if (content.length < 100) {
      suggestions.push({
        section_id: section.id,
        field_name: section.id,
        suggestion_type: 'improvement',
        original_text: content,
        suggested_text: content + ' [Expand with more detail and specific examples]',
        reasoning: 'Content appears too brief for this section type',
        confidence: 0.8,
        implemented: false,
        created_at: new Date()
      })
    }

    return suggestions
  }

  private async analyzeTone(content: string, grant: any, section: ApplicationSection): Promise<{
    current_tone: string
    recommended_tone: string
    adjustments: string[]
  }> {
    // Simplified tone analysis
    const wordCount = content.split(/\s+/).length
    const hasFirstPerson = /\b(I|we|our|us)\b/i.test(content)
    const hasTechnicalTerms = /\b(methodology|implementation|framework|analysis)\b/i.test(content)

    let currentTone = 'neutral'
    if (hasTechnicalTerms) currentTone = 'technical'
    else if (hasFirstPerson) currentTone = 'personal'

    return {
      current_tone: currentTone,
      recommended_tone: 'professional',
      adjustments: [
        'Use active voice where possible',
        'Be specific with examples',
        'Maintain professional language'
      ]
    }
  }

  private analyzeReadability(content: string): {
    score: number
    grade_level: string
    improvements: string[]
  } {
    const score = this.calculateReadabilityScore(content)
    
    let gradeLevel = 'Graduate'
    if (score > 90) gradeLevel = 'Elementary'
    else if (score > 80) gradeLevel = 'Middle School'
    else if (score > 70) gradeLevel = 'High School'
    else if (score > 60) gradeLevel = 'College'

    const improvements: string[] = []
    if (score < 60) {
      improvements.push('Use shorter sentences')
      improvements.push('Simplify complex words where possible')
      improvements.push('Break up long paragraphs')
    }

    return {
      score: Math.round(score),
      grade_level: gradeLevel,
      improvements
    }
  }

  private async analyzeKeywords(content: string, grant: any): Promise<{
    missing_keywords: string[]
    keyword_density: Record<string, number>
  }> {
    // Extract important keywords from grant description
    const grantText = (grant.title + ' ' + grant.description).toLowerCase()
    const importantWords = grantText
      .split(/\s+/)
      .filter(word => word.length > 4)
      .filter(word => !['that', 'this', 'with', 'from', 'they', 'have', 'will', 'been'].includes(word))

    const contentLower = content.toLowerCase()
    const contentWords = contentLower.split(/\s+/)

    const keywordDensity: Record<string, number> = {}
    const missingKeywords: string[] = []

    importantWords.forEach(word => {
      const count = contentWords.filter(w => w.includes(word)).length
      const density = count / contentWords.length

      if (density > 0) {
        keywordDensity[word] = Math.round(density * 1000) / 10 // Percentage with 1 decimal
      } else {
        missingKeywords.push(word)
      }
    })

    return {
      missing_keywords: missingKeywords.slice(0, 10), // Top 10 missing
      keyword_density: keywordDensity
    }
  }
}