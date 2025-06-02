import { ApplicationAssistanceService, SmartFormRequest, ContentGenerationRequest } from '../services/applicationAssistanceService'
import { DatabaseService } from '../services/database'
import { OpenAIService } from '../services/openaiService'
import { UserPreferencesService } from '../services/userPreferencesService'

// Mock the dependencies
jest.mock('../services/database')
jest.mock('../services/openaiService')
jest.mock('../services/userPreferencesService')
jest.mock('../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}))

describe('ApplicationAssistanceService', () => {
  let service: ApplicationAssistanceService
  let mockDb: jest.Mocked<DatabaseService>
  let mockOpenAI: jest.Mocked<OpenAIService>
  let mockUserPreferences: jest.Mocked<UserPreferencesService>

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>
    mockOpenAI = new OpenAIService() as jest.Mocked<OpenAIService>
    mockUserPreferences = {} as jest.Mocked<UserPreferencesService>
    
    service = new ApplicationAssistanceService(mockDb, mockOpenAI, mockUserPreferences)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createSmartForm', () => {
    it('should create smart form with pre-filled data and AI suggestions', async () => {
      const request: SmartFormRequest = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        organization_profile: {
          id: 'org-1',
          name: 'Test Organization',
          sector: 'technology'
        }
      }

      // Mock grant details
      mockDb.query
        .mockResolvedValueOnce({ // Grant details
          rows: [{
            id: 'grant-1',
            title: 'Innovation Grant',
            description: 'Funding for innovative technology projects',
            deadline: new Date('2024-12-31'),
            amount_max: 100000
          }]
        } as any)
        .mockResolvedValueOnce({ // Application template
          rows: [{
            id: 'template-1',
            grant_id: 'grant-1',
            template_type: 'form',
            title: 'Standard Application',
            sections: JSON.stringify([
              {
                id: 'project_title',
                title: 'Project Title',
                section_type: 'text',
                required: true,
                order_index: 1
              }
            ]),
            required_fields: JSON.stringify(['project_title']),
            optional_fields: JSON.stringify([]),
            validation_rules: JSON.stringify([]),
            ai_guidance: JSON.stringify([])
          }]
        } as any)
        .mockResolvedValueOnce({ // Previous applications
          rows: []
        } as any)

      // Mock user preferences
      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 5,
          favorite_categories: ['Innovation'],
          avg_grant_amount: 50000,
          preferred_funders: [],
          success_rate: 0.7
        }
      })

      // Mock OpenAI chatCompletion method
      mockOpenAI.chatCompletion = jest.fn().mockResolvedValue({
        content: JSON.stringify({ project_title: 'AI-powered Innovation Project' }),
        usage: { promptTokens: 50, completionTokens: 30, totalTokens: 80, estimatedCost: 0.05 }
      })

      const result = await service.createSmartForm(request)

      expect(result).toMatchObject({
        template: expect.objectContaining({
          grant_id: 'grant-1',
          template_type: 'form'
        }),
        pre_filled_data: expect.any(Object),
        ai_suggestions: expect.any(Array),
        estimated_completion_time: expect.any(Number),
        success_probability: expect.any(Number),
        next_recommended_sections: expect.any(Array)
      })

      expect(mockDb.query).toHaveBeenCalledTimes(3) // Grant details, template, previous applications
      expect(mockUserPreferences.getUserProfile).toHaveBeenCalledWith('user-1')
    })

    it('should handle missing grant gracefully', async () => {
      const request: SmartFormRequest = {
        user_id: 'user-1',
        grant_id: 'nonexistent-grant',
        organization_profile: { id: 'org-1', name: 'Test Org' }
      }

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // No grant found
        .mockResolvedValueOnce({ rows: [] } as any) // No template found
        .mockResolvedValueOnce({ rows: [] } as any) // No previous applications

      await expect(service.createSmartForm(request)).rejects.toThrow('Grant or application template not found')
    })
  })

  describe('generateSectionContent', () => {
    it('should generate content for application sections', async () => {
      const request: ContentGenerationRequest = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        section_type: 'project_summary',
        context_data: { 
          organization: 'Tech Startup',
          sector: 'AI/ML'
        },
        target_length: 500,
        tone: 'professional'
      }

      // Mock grant details
      mockDb.query.mockResolvedValueOnce({
        rows: [{
          id: 'grant-1',
          title: 'Innovation Grant',
          description: 'AI and ML research funding',
          categories: ['Innovation', 'Technology']
        }]
      } as any)

      // Mock user preferences
      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      })

      // Mock OpenAI content generation
      const mockContent = 'Generated project summary content for AI/ML innovation project targeting...'
      mockOpenAI.chatCompletion = jest.fn().mockResolvedValue({
        content: mockContent,
        usage: { promptTokens: 100, completionTokens: 150, totalTokens: 250, estimatedCost: 0.15 }
      })

      const result = await service.generateSectionContent(request)

      expect(result).toMatchObject({
        generated_content: expect.any(String),
        alternative_versions: expect.any(Array),
        writing_tips: expect.any(Array),
        estimated_score: expect.any(Number),
        improvement_suggestions: expect.any(Array),
        word_count: expect.any(Number),
        readability_score: expect.any(Number)
      })

      expect(result.generated_content).toContain('Generated project summary')
      expect(result.word_count).toBeGreaterThan(0)
      expect(result.estimated_score).toBeGreaterThanOrEqual(0)
      expect(result.estimated_score).toBeLessThanOrEqual(1)
    })

    it('should handle different content generation tones', async () => {
      const request: ContentGenerationRequest = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        section_type: 'technical_approach',
        context_data: {},
        tone: 'technical'
      }

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'grant-1', title: 'Research Grant' }]
      } as any)

      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      })

      mockOpenAI.chatCompletion = jest.fn().mockResolvedValue({
        content: 'Technical methodology content',
        usage: { promptTokens: 80, completionTokens: 120, totalTokens: 200, estimatedCost: 0.12 }
      })

      const result = await service.generateSectionContent(request)

      expect(result.generated_content).toBeTruthy()
      expect(mockOpenAI.chatCompletion).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          model: 'gpt-4o-mini',
          temperature: 0.7
        })
      )
    })
  })

  describe('validateApplication', () => {
    it('should validate application and return comprehensive results', async () => {
      const draftId = 'draft-1'

      // Mock application draft
      mockDb.query
        .mockResolvedValueOnce({ // Get draft
          rows: [{
            id: draftId,
            user_id: 'user-1',
            grant_id: 'grant-1',
            template_id: 1,
            form_data: JSON.stringify({
              project_title: 'My Project',
              project_summary: 'A short summary'
            }),
            ai_suggestions: JSON.stringify([]),
            validation_results: JSON.stringify([])
          }]
        } as any)
        .mockResolvedValueOnce({ // Get grant
          rows: [{
            id: 'grant-1',
            title: 'Innovation Grant'
          }]
        } as any)
        .mockResolvedValueOnce({ // Get template
          rows: [{
            id: 1,
            grant_id: 'grant-1',
            sections: JSON.stringify([
              { id: 'project_title', required: true },
              { id: 'project_summary', required: true }
            ]),
            required_fields: JSON.stringify(['project_title', 'project_summary', 'budget']),
            validation_rules: JSON.stringify([
              {
                field_name: 'project_summary',
                rule_type: 'min_length',
                parameters: { min_length: 100 },
                error_message: 'Summary must be at least 100 characters',
                severity: 'error'
              }
            ])
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // Update validation

      const result = await service.validateApplication(draftId)

      expect(result).toMatchObject({
        validation_results: expect.any(Array),
        overall_score: expect.any(Number),
        completion_percentage: expect.any(Number),
        ai_suggestions: expect.any(Array),
        critical_issues: expect.any(Array),
        improvement_priority: expect.any(Array)
      })

      expect(result.validation_results.length).toBeGreaterThan(0)
      expect(result.overall_score).toBeGreaterThanOrEqual(0)
      expect(result.overall_score).toBeLessThanOrEqual(1)
      expect(result.completion_percentage).toBeGreaterThanOrEqual(0)
      expect(result.completion_percentage).toBeLessThanOrEqual(100)
    })

    it('should identify critical validation issues', async () => {
      const draftId = 'draft-1'

      mockDb.query
        .mockResolvedValueOnce({ // Get draft with missing required fields
          rows: [{
            id: draftId,
            user_id: 'user-1',
            grant_id: 'grant-1',
            template_id: 1,
            form_data: JSON.stringify({}), // Empty form data
            ai_suggestions: JSON.stringify([]),
            validation_results: JSON.stringify([])
          }]
        } as any)
        .mockResolvedValueOnce({ // Get grant
          rows: [{ id: 'grant-1', title: 'Grant' }]
        } as any)
        .mockResolvedValueOnce({ // Get template
          rows: [{
            id: 1,
            required_fields: JSON.stringify(['project_title', 'budget']),
            validation_rules: JSON.stringify([])
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // Update

      const result = await service.validateApplication(draftId)

      expect(result.critical_issues.length).toBeGreaterThan(0)
      expect(result.critical_issues[0]).toContain('required')
      expect(result.completion_percentage).toBe(0)
    })
  })

  describe('autoCompleteFields', () => {
    it('should auto-complete specified fields with confidence scores', async () => {
      const draftId = 'draft-1'
      const fieldNames = ['project_title', 'organization_name']

      // Mock application draft
      mockDb.query
        .mockResolvedValueOnce({ // Get draft
          rows: [{
            id: draftId,
            user_id: 'user-1',
            grant_id: 'grant-1',
            template_id: 1,
            form_data: JSON.stringify({})
          }]
        } as any)
        .mockResolvedValueOnce({ // Get grant
          rows: [{ id: 'grant-1', title: 'Innovation Grant' }]
        } as any)
        .mockResolvedValueOnce({ // Get template
          rows: [{
            id: 1,
            sections: JSON.stringify([
              { id: 'project_title', title: 'Project Title' },
              { id: 'organization_name', title: 'Organization Name' }
            ])
          }]
        } as any)

      // Mock user preferences
      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      })

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // Update form data

      const result = await service.autoCompleteFields(draftId, fieldNames)

      expect(result).toMatchObject({
        project_title: {
          value: expect.any(String),
          confidence: expect.any(Number),
          reasoning: expect.any(String)
        },
        organization_name: {
          value: expect.any(String),
          confidence: expect.any(Number),
          reasoning: expect.any(String)
        }
      })

      Object.values(result).forEach(completion => {
        expect(completion.confidence).toBeGreaterThanOrEqual(0)
        expect(completion.confidence).toBeLessThanOrEqual(1)
        expect(completion.reasoning).toBeTruthy()
      })
    })

    it('should handle non-existent fields gracefully', async () => {
      const draftId = 'draft-1'
      const fieldNames = ['nonexistent_field']

      mockDb.query
        .mockResolvedValueOnce({ // Get draft
          rows: [{
            id: draftId,
            user_id: 'user-1',
            grant_id: 'grant-1',
            template_id: 1,
            form_data: JSON.stringify({})
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'grant-1' }] } as any) // Grant
        .mockResolvedValueOnce({ // Template with no matching sections
          rows: [{
            id: 1,
            sections: JSON.stringify([])
          }]
        } as any)

      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      })

      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // Update

      const result = await service.autoCompleteFields(draftId, fieldNames)

      expect(result).toEqual({}) // No fields completed for non-existent fields
    })
  })

  describe('getWritingSuggestions', () => {
    it('should provide comprehensive writing analysis and suggestions', async () => {
      const draftId = 'draft-1'
      const sectionId = 'project_summary'

      // Mock application draft with content
      mockDb.query
        .mockResolvedValueOnce({ // Get draft
          rows: [{
            id: draftId,
            user_id: 'user-1',
            grant_id: 'grant-1',
            template_id: 1,
            form_data: JSON.stringify({
              [sectionId]: 'This is a short project summary that needs improvement and expansion.'
            })
          }]
        } as any)
        .mockResolvedValueOnce({ // Get grant
          rows: [{
            id: 'grant-1',
            title: 'Innovation Grant',
            description: 'Funding for innovative projects with strong impact potential'
          }]
        } as any)
        .mockResolvedValueOnce({ // Get template
          rows: [{
            id: 1,
            sections: JSON.stringify([
              {
                id: sectionId,
                title: 'Project Summary',
                section_type: 'narrative'
              }
            ])
          }]
        } as any)

      const result = await service.getWritingSuggestions(draftId, sectionId)

      expect(result).toMatchObject({
        suggestions: expect.any(Array),
        tone_analysis: {
          current_tone: expect.any(String),
          recommended_tone: expect.any(String),
          adjustments: expect.any(Array)
        },
        readability: {
          score: expect.any(Number),
          grade_level: expect.any(String),
          improvements: expect.any(Array)
        },
        keyword_optimization: {
          missing_keywords: expect.any(Array),
          keyword_density: expect.any(Object)
        }
      })

      expect(result.readability.score).toBeGreaterThanOrEqual(0)
      expect(result.readability.score).toBeLessThanOrEqual(100)
      expect(result.tone_analysis.current_tone).toBeTruthy()
      expect(result.tone_analysis.recommended_tone).toBeTruthy()
    })

    it('should analyze keyword optimization effectively', async () => {
      const draftId = 'draft-1'
      const sectionId = 'project_summary'
      const content = 'This project focuses on artificial intelligence and machine learning applications for healthcare innovation'

      mockDb.query
        .mockResolvedValueOnce({ // Get draft
          rows: [{
            id: draftId,
            form_data: JSON.stringify({ [sectionId]: content })
          }]
        } as any)
        .mockResolvedValueOnce({ // Get grant
          rows: [{
            id: 'grant-1',
            title: 'Healthcare Innovation Grant',
            description: 'Supporting healthcare technology innovation and artificial intelligence research'
          }]
        } as any)
        .mockResolvedValueOnce({ // Get template
          rows: [{
            sections: JSON.stringify([{ id: sectionId, title: 'Summary' }])
          }]
        } as any)

      const result = await service.getWritingSuggestions(draftId, sectionId)

      expect(result.keyword_optimization.keyword_density).toHaveProperty('healthcare')
      expect(result.keyword_optimization.keyword_density).toHaveProperty('innovation')
      
      // Should detect missing important keywords from grant description
      expect(result.keyword_optimization.missing_keywords).toBeInstanceOf(Array)
    })
  })

  describe('helper methods', () => {
    it('should calculate readability scores correctly', async () => {
      // Access private method for testing (using any to bypass TypeScript)
      const calculateReadability = (service as any).calculateReadabilityScore.bind(service)

      const simpleText = 'This is simple. Easy to read. Short sentences.'
      const complexText = 'This is an extraordinarily complex sentence with multiple subordinate clauses, numerous polysyllabic words, and convoluted grammatical structures that significantly impede comprehension and accessibility.'

      const simpleScore = calculateReadability(simpleText)
      const complexScore = calculateReadability(complexText)

      expect(simpleScore).toBeGreaterThanOrEqual(complexScore)
      expect(simpleScore).toBeGreaterThanOrEqual(0)
      expect(simpleScore).toBeLessThanOrEqual(100)
      expect(complexScore).toBeGreaterThanOrEqual(0)
      expect(complexScore).toBeLessThanOrEqual(100)
    })

    it('should count syllables approximately correctly', async () => {
      const countSyllables = (service as any).countSyllables.bind(service)

      expect(countSyllables('hello')).toBeGreaterThan(0)
      expect(countSyllables('education')).toBeGreaterThan(countSyllables('cat'))
      expect(countSyllables('extraordinary')).toBeGreaterThan(countSyllables('simple'))
    })

    it('should calculate completion percentage accurately', async () => {
      const calculateCompletion = (service as any).calculateCompletionPercentage.bind(service)

      const template = {
        required_fields: ['field1', 'field2', 'field3'],
        optional_fields: ['field4', 'field5']
      }

      const emptyDraft = { form_data: {} }
      const partialDraft = { form_data: { field1: 'value1', field4: 'value4' } }
      const completeDraft = { 
        form_data: { 
          field1: 'value1', 
          field2: 'value2', 
          field3: 'value3', 
          field4: 'value4', 
          field5: 'value5' 
        } 
      }

      expect(calculateCompletion(emptyDraft, template)).toBe(0)
      expect(calculateCompletion(partialDraft, template)).toBe(40) // 2 out of 5 fields
      expect(calculateCompletion(completeDraft, template)).toBe(100)
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const request: SmartFormRequest = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        organization_profile: { id: 'org-1', name: 'Test' }
      }

      mockDb.query.mockRejectedValue(new Error('Database connection failed'))

      await expect(service.createSmartForm(request)).rejects.toThrow('Database connection failed')
    })

    it('should handle OpenAI API errors gracefully', async () => {
      const request: ContentGenerationRequest = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        section_type: 'summary',
        context_data: {}
      }

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: 'grant-1', title: 'Grant' }]
      } as any)

      mockUserPreferences.getUserProfile = jest.fn().mockResolvedValue({
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      })

      mockOpenAI.chatCompletion = jest.fn().mockRejectedValue(new Error('OpenAI API error'))

      await expect(service.generateSectionContent(request)).rejects.toThrow('OpenAI API error')
    })
  })
})