import request from 'supertest'
import { Pool } from 'pg'
import app from '../index'
import { AITransparencyService } from '../services/aiTransparencyService'

// Mock database
const mockDb = {
  query: jest.fn()
} as unknown as Pool

describe('AI Transparency Service', () => {
  let aiService: AITransparencyService
  const mockUserId = 'user-123'
  const mockApplicationId = 'app-123'

  beforeEach(() => {
    aiService = new AITransparencyService(mockDb)
    jest.clearAllMocks()
  })

  describe('createInteraction', () => {
    it('should create AI interaction successfully', async () => {
      const mockInteraction = {
        userId: mockUserId,
        applicationId: mockApplicationId,
        interactionType: 'content_generation',
        promptText: 'Generate project description',
        modelUsed: 'gpt-4-turbo',
        confidenceScore: 0.85,
        tokensUsed: 150,
        processingTimeMs: 2500
      }

      const mockResult = {
        rows: [{ id: 'interaction-123' }]
      }

      ;(mockDb.query as jest.Mock).mockResolvedValueOnce(mockResult)

      const interactionId = await aiService.createInteraction(mockInteraction)

      expect(interactionId).toBe('interaction-123')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_interactions'),
        expect.arrayContaining([
          expect.any(String), // id
          mockUserId,
          mockApplicationId,
          'content_generation',
          'Generate project description',
          undefined, // response_text
          'gpt-4-turbo',
          0.85,
          150,
          2500,
          'completed',
          '{}'
        ])
      )
    })

    it('should handle database errors gracefully', async () => {
      const mockInteraction = {
        userId: mockUserId,
        interactionType: 'content_generation',
        modelUsed: 'gpt-4-turbo'
      }

      ;(mockDb.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'))

      await expect(aiService.createInteraction(mockInteraction))
        .rejects.toThrow('Failed to create AI interaction')
    })
  })

  describe('updateInteraction', () => {
    it('should update interaction with response data', async () => {
      const updates = {
        responseText: 'Generated content here',
        confidenceScore: 0.92,
        tokensUsed: 200,
        status: 'completed' as const
      }

      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [] })

      await aiService.updateInteraction('interaction-123', updates)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE ai_interactions'),
        expect.arrayContaining([
          'Generated content here',
          0.92,
          200,
          'completed',
          'interaction-123'
        ])
      )
    })

    it('should handle empty updates gracefully', async () => {
      await aiService.updateInteraction('interaction-123', {})
      expect(mockDb.query).not.toHaveBeenCalled()
    })
  })

  describe('saveGeneratedContent', () => {
    it('should save AI generated content', async () => {
      const content = {
        interactionId: 'interaction-123',
        applicationId: mockApplicationId,
        sectionName: 'project_description',
        contentText: 'AI generated project description',
        contentType: 'text',
        confidenceScore: 0.88,
        reasoning: 'Based on similar successful projects',
        sources: ['Enterprise Ireland guidelines', 'Similar funded projects']
      }

      const mockResult = {
        rows: [{ id: 'content-123' }]
      }

      ;(mockDb.query as jest.Mock).mockResolvedValueOnce(mockResult)

      const contentId = await aiService.saveGeneratedContent(content)

      expect(contentId).toBe('content-123')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ai_generated_content'),
        expect.arrayContaining([
          expect.any(String), // id
          'interaction-123',
          mockApplicationId,
          'project_description',
          'AI generated project description',
          'text',
          0.88,
          'Based on similar successful projects',
          JSON.stringify(['Enterprise Ireland guidelines', 'Similar funded projects']),
          false,
          false,
          1
        ])
      )
    })
  })

  describe('saveComplianceCheck', () => {
    it('should save compliance check results', async () => {
      const check = {
        applicationId: mockApplicationId,
        checkType: 'eligibility',
        overallScore: 85,
        issues: [
          {
            field: 'organization_size',
            requirement: 'Must be SME',
            severity: 'major' as const,
            suggestion: 'Provide evidence of SME status'
          }
        ],
        recommendations: [
          {
            category: 'documentation',
            priority: 'high' as const,
            description: 'Upload company registration documents',
            actionItems: ['Get certified copy from CRO'],
            estimatedImpact: 'Required for eligibility'
          }
        ],
        aiModelUsed: 'gpt-4-turbo',
        confidenceScore: 0.91
      }

      const mockResult = {
        rows: [{ id: 'check-123' }]
      }

      ;(mockDb.query as jest.Mock).mockResolvedValueOnce(mockResult)

      const checkId = await aiService.saveComplianceCheck(check)

      expect(checkId).toBe('check-123')
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO compliance_checks'),
        expect.arrayContaining([
          expect.any(String), // id
          mockApplicationId,
          undefined, // grant_scheme_id
          'eligibility',
          85,
          JSON.stringify(check.issues),
          JSON.stringify(check.recommendations),
          'gpt-4-turbo',
          0.91,
          'completed'
        ])
      )
    })
  })

  describe('getAIUsageStats', () => {
    it('should return usage statistics', async () => {
      const mockStats = [
        {
          interaction_type: 'content_generation',
          count: 25,
          avg_confidence: 0.87,
          avg_rating: 4.2,
          total_tokens: 12500,
          avg_processing_time: 2800
        },
        {
          interaction_type: 'compliance_check',
          count: 15,
          avg_confidence: 0.92,
          avg_rating: 4.5,
          total_tokens: 8000,
          avg_processing_time: 3200
        }
      ]

      ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: mockStats })

      const stats = await aiService.getAIUsageStats(mockUserId)

      expect(stats).toEqual(mockStats)
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockUserId]
      )
    })
  })
})

describe('AI Transparency API Routes', () => {
  const mockToken = 'valid-jwt-token'
  
  beforeEach(() => {
    // Mock JWT verification
    jest.spyOn(require('jsonwebtoken'), 'verify').mockImplementation(() => ({
      id: 'user-123',
      email: 'test@example.com'
    }))
  })

  describe('POST /ai/interactions', () => {
    it('should create AI interaction successfully', async () => {
      const interactionData = {
        interactionType: 'content_generation',
        applicationId: 'app-123',
        promptText: 'Generate project description',
        modelUsed: 'gpt-4-turbo',
        confidenceScore: 0.85
      }

      const response = await request(app)
        .post('/ai/interactions')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(interactionData)
        .expect(201)

      expect(response.body).toHaveProperty('interactionId')
    })

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        interactionType: 'content_generation'
        // Missing modelUsed
      }

      await request(app)
        .post('/ai/interactions')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('should return 400 for invalid confidence score', async () => {
      const invalidData = {
        interactionType: 'content_generation',
        modelUsed: 'gpt-4-turbo',
        confidenceScore: 1.5 // Invalid - should be <= 1
      }

      await request(app)
        .post('/ai/interactions')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400)
    })

    it('should return 401 for missing authorization', async () => {
      const interactionData = {
        interactionType: 'content_generation',
        modelUsed: 'gpt-4-turbo'
      }

      await request(app)
        .post('/ai/interactions')
        .send(interactionData)
        .expect(401)
    })
  })

  describe('POST /ai/interactions/:interactionId/rating', () => {
    it('should submit rating successfully', async () => {
      const ratingData = {
        rating: 4,
        feedback: 'Good quality generation'
      }

      await request(app)
        .post('/ai/interactions/interaction-123/rating')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(ratingData)
        .expect(200)
    })

    it('should return 400 for invalid rating', async () => {
      const invalidRating = {
        rating: 6 // Invalid - should be <= 5
      }

      await request(app)
        .post('/ai/interactions/interaction-123/rating')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidRating)
        .expect(400)
    })
  })

  describe('POST /ai/content', () => {
    it('should save AI generated content', async () => {
      const contentData = {
        interactionId: 'interaction-123',
        sectionName: 'project_description',
        contentText: 'AI generated content',
        contentType: 'text',
        confidenceScore: 0.9
      }

      const response = await request(app)
        .post('/ai/content')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(contentData)
        .expect(201)

      expect(response.body).toHaveProperty('contentId')
    })

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        interactionId: 'interaction-123',
        contentText: 'AI generated content'
        // Missing sectionName, contentType, confidenceScore
      }

      await request(app)
        .post('/ai/content')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidData)
        .expect(400)
    })
  })

  describe('GET /ai/analytics/usage', () => {
    it('should return usage statistics', async () => {
      const response = await request(app)
        .get('/ai/analytics/usage')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should accept date range parameters', async () => {
      const startDate = '2024-01-01'
      const endDate = '2024-01-31'

      const response = await request(app)
        .get('/ai/analytics/usage')
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })
  })

  describe('GET /ai/interactions', () => {
    it('should return user interactions', async () => {
      const response = await request(app)
        .get('/ai/interactions')
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should accept pagination parameters', async () => {
      const response = await request(app)
        .get('/ai/interactions')
        .query({ limit: 10, offset: 20 })
        .set('Authorization', `Bearer ${mockToken}`)
        .expect(200)

      expect(Array.isArray(response.body)).toBe(true)
    })
  })
})

describe('AI Transparency Edge Cases', () => {
  let aiService: AITransparencyService

  beforeEach(() => {
    aiService = new AITransparencyService(mockDb)
    jest.clearAllMocks()
  })

  it('should handle large confidence scores correctly', async () => {
    const interaction = {
      userId: 'user-123',
      interactionType: 'content_generation',
      modelUsed: 'gpt-4-turbo',
      confidenceScore: 1.0 // Maximum valid value
    }

    ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'test-id' }] })

    const result = await aiService.createInteraction(interaction)
    expect(result).toBe('test-id')
  })

  it('should handle empty sources array', async () => {
    const content = {
      interactionId: 'interaction-123',
      sectionName: 'test',
      contentText: 'content',
      contentType: 'text',
      confidenceScore: 0.8,
      sources: [] // Empty array
    }

    ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'content-id' }] })

    const result = await aiService.saveGeneratedContent(content)
    expect(result).toBe('content-id')
  })

  it('should handle null metadata gracefully', async () => {
    const interaction = {
      userId: 'user-123',
      interactionType: 'content_generation',
      modelUsed: 'gpt-4-turbo',
      metadata: undefined
    }

    ;(mockDb.query as jest.Mock).mockResolvedValueOnce({ rows: [{ id: 'test-id' }] })

    await aiService.createInteraction(interaction)
    
    expect(mockDb.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining(['{}']) // Should default to empty JSON object
    )
  })
})