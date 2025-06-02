import { UserPreferencesService, UserPreference, UserInteraction, RecommendationRequest } from '../services/userPreferencesService'
import { DatabaseService } from '../services/database'
import { VectorDatabaseService } from '../services/vectorDatabase'
import { OpenAIService } from '../services/openaiService'

// Mock the dependencies
jest.mock('../services/database')
jest.mock('../services/vectorDatabase')
jest.mock('../services/openaiService')
jest.mock('../services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn()
  }
}))

describe('UserPreferencesService', () => {
  let service: UserPreferencesService
  let mockDb: jest.Mocked<DatabaseService>
  let mockVectorDb: jest.Mocked<VectorDatabaseService>
  let mockOpenAI: jest.Mocked<OpenAIService>

  beforeEach(() => {
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>
    mockVectorDb = new VectorDatabaseService() as jest.Mocked<VectorDatabaseService>
    mockOpenAI = new OpenAIService() as jest.Mocked<OpenAIService>
    
    service = new UserPreferencesService(mockDb, mockVectorDb, mockOpenAI)
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('recordInteraction', () => {
    it('should record user interaction and update preferences', async () => {
      const interaction = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        interaction_type: 'favorite' as const,
        context: { source: 'dashboard' }
      }

      // Mock database calls
      mockDb.query
        .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // Insert interaction
        .mockResolvedValueOnce({ // Get grant details
          rows: [{
            id: 'grant-1',
            categories: ['Research & Development', 'Innovation'],
            funder_type: 'government',
            amount_max: 50000
          }]
        } as any)
        .mockResolvedValue({ rows: [], rowCount: 1 } as any) // Update preferences

      await service.recordInteraction(interaction)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO user_interactions'),
        ['user-1', 'grant-1', 'favorite', '{"source":"dashboard"}']
      )
    })

    it('should handle database errors gracefully', async () => {
      const interaction = {
        user_id: 'user-1',
        grant_id: 'grant-1',
        interaction_type: 'view' as const
      }

      mockDb.query.mockRejectedValueOnce(new Error('Database error'))

      await expect(service.recordInteraction(interaction)).rejects.toThrow('Database error')
    })
  })

  describe('getUserProfile', () => {
    it('should return complete user profile with preferences and metrics', async () => {
      const userId = 'user-1'

      // Mock preferences query
      mockDb.query
        .mockResolvedValueOnce({ // Preferences
          rows: [{
            user_id: userId,
            preference_type: 'category',
            preference_value: 'Research & Development',
            weight: 0.8,
            created_at: new Date(),
            updated_at: new Date()
          }]
        } as any)
        .mockResolvedValueOnce({ // Interactions
          rows: [{
            user_id: userId,
            grant_id: 'grant-1',
            interaction_type: 'favorite',
            timestamp: new Date(),
            context: {}
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [{ total: '5' }] } as any) // Total interactions
        .mockResolvedValueOnce({ rows: [] } as any) // Categories
        .mockResolvedValueOnce({ rows: [{ avg_amount: '25000' }] } as any) // Average amount
        .mockResolvedValueOnce({ rows: [] } as any) // Funders

      const profile = await service.getUserProfile(userId)

      expect(profile.user_id).toBe(userId)
      expect(profile.preferences).toHaveLength(1)
      expect(profile.preferences[0].preference_type).toBe('category')
      expect(profile.learning_metrics.total_interactions).toBe(5)
    })

    it('should handle empty user data', async () => {
      const userId = 'new-user'

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // No preferences
        .mockResolvedValueOnce({ rows: [] } as any) // No interactions
        .mockResolvedValue({ rows: [{ total: '0' }] } as any) // Empty metrics

      const profile = await service.getUserProfile(userId)

      expect(profile.preferences).toHaveLength(0)
      expect(profile.interactions).toHaveLength(0)
      expect(profile.learning_metrics.total_interactions).toBe(0)
    })
  })

  describe('getRecommendations', () => {
    it('should generate personalized recommendations based on user preferences', async () => {
      const request: RecommendationRequest = {
        user_id: 'user-1',
        limit: 5
      }

      // Mock user profile
      mockDb.query
        .mockResolvedValueOnce({ // Preferences
          rows: [{
            user_id: 'user-1',
            preference_type: 'category',
            preference_value: 'Research & Development',
            weight: 0.8,
            created_at: new Date(),
            updated_at: new Date()
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // Interactions  
        .mockResolvedValueOnce({ rows: [{ total: '10' }] } as any) // Total interactions
        .mockResolvedValueOnce({ // Categories
          rows: [{
            categories: ['Research & Development'],
            interaction_count: '5'
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [{ avg_amount: '30000' }] } as any) // Average amount
        .mockResolvedValueOnce({ rows: [] } as any) // Funders
        .mockResolvedValueOnce({ // Candidate grants
          rows: [{
            id: 'grant-1',
            title: 'R&D Innovation Grant',
            categories: ['Research & Development'],
            funder_type: 'government',
            amount_max: 50000,
            embedding_id: null
          }, {
            id: 'grant-2',
            title: 'Community Development Fund',
            categories: ['Community Development'],
            funder_type: 'council',
            amount_max: 25000,
            embedding_id: null
          }]
        } as any)

      const recommendations = await service.getRecommendations(request)

      expect(recommendations).toHaveLength(2)
      // The first grant should match category and have higher score
      const grant1 = recommendations.find(r => r.grant_id === 'grant-1')
      const grant2 = recommendations.find(r => r.grant_id === 'grant-2')
      expect(grant1).toBeDefined()
      expect(grant2).toBeDefined()
      expect(grant1!.score).toBeGreaterThan(grant2!.score)
      expect(grant1!.explanation).toContain('Matches preferred category: Research & Development')
    })

    it('should exclude grants user has already interacted with', async () => {
      const request: RecommendationRequest = {
        user_id: 'user-1',
        exclude_grant_ids: ['grant-exclude'],
        limit: 3
      }

      // Mock user with interactions
      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // Preferences
        .mockResolvedValueOnce({ // Interactions with applied/dismissed grants
          rows: [{
            user_id: 'user-1',
            grant_id: 'grant-applied',
            interaction_type: 'apply',
            timestamp: new Date()
          }]
        } as any)
        .mockResolvedValue({ rows: [{ total: '1' }] } as any) // Metrics

      await service.getRecommendations(request)

      // Verify the query excludes both explicitly excluded and interacted grants
      const lastCall = mockDb.query.mock.calls[mockDb.query.mock.calls.length - 1]
      expect(lastCall[0]).toContain('NOT IN')
      expect(lastCall[1]).toEqual(['grant-exclude', 'grant-applied'])
    })

    it('should handle context-specific boost categories', async () => {
      const request: RecommendationRequest = {
        user_id: 'user-1',
        boost_categories: ['Innovation'],
        context: 'search',
        limit: 2
      }

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // Preferences
        .mockResolvedValueOnce({ rows: [] } as any) // Interactions
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any) // Total interactions
        .mockResolvedValueOnce({ rows: [] } as any) // Categories
        .mockResolvedValueOnce({ rows: [{ avg_amount: '0' }] } as any) // Average amount
        .mockResolvedValueOnce({ rows: [] } as any) // Funders
        .mockResolvedValueOnce({ // Grants with boost category
          rows: [{
            id: 'grant-boost',
            title: 'Innovation Grant',
            categories: ['Innovation'],
            funder_type: 'government',
            amount_max: 40000,
            embedding_id: null
          }]
        } as any)

      const recommendations = await service.getRecommendations(request)

      expect(recommendations).toHaveLength(1)
      expect(recommendations[0].explanation).toContain('Matches current search context')
    })
  })

  describe('explainRecommendation', () => {
    it('should provide detailed explanation for a specific recommendation', async () => {
      const userId = 'user-1'
      const grantId = 'grant-1'

      // Mock user profile with strong R&D preference
      mockDb.query
        .mockResolvedValueOnce({ // Preferences
          rows: [{
            user_id: userId,
            preference_type: 'category',
            preference_value: 'Research & Development',
            weight: 0.9,
            created_at: new Date(),
            updated_at: new Date()
          }]
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any) // Interactions
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any) // Total interactions
        .mockResolvedValueOnce({ rows: [] } as any) // Categories
        .mockResolvedValueOnce({ rows: [{ avg_amount: '0' }] } as any) // Average amount
        .mockResolvedValueOnce({ rows: [] } as any) // Funders
        .mockResolvedValueOnce({ // Grant details
          rows: [{
            id: grantId,
            title: 'AI Research Grant',
            categories: ['Research & Development', 'Innovation'],
            funder_type: 'government',
            amount_max: 100000,
            embedding_id: null
          }]
        } as any)

      const explanation = await service.explainRecommendation(userId, grantId)

      expect(explanation.score).toBeGreaterThan(0)
      expect(explanation.reasoning.preference_match).toBeGreaterThan(0)
      expect(explanation.explanation).toContain('Matches preferred category: Research & Development')
      expect(explanation.userProfile.user_id).toBe(userId)
    })

    it('should handle non-existent grants', async () => {
      const userId = 'user-1'
      const grantId = 'non-existent'

      mockDb.query
        .mockResolvedValueOnce({ rows: [] } as any) // Preferences
        .mockResolvedValueOnce({ rows: [] } as any) // Interactions
        .mockResolvedValueOnce({ rows: [{ total: '0' }] } as any) // Total interactions
        .mockResolvedValueOnce({ rows: [] } as any) // Categories
        .mockResolvedValueOnce({ rows: [{ avg_amount: '0' }] } as any) // Average amount
        .mockResolvedValueOnce({ rows: [] } as any) // Funders
        .mockResolvedValueOnce({ rows: [] } as any) // No grant found

      await expect(service.explainRecommendation(userId, grantId))
        .rejects.toThrow('Grant not found')
    })
  })

  describe('batchUpdatePreferences', () => {
    it('should update multiple preferences at once', async () => {
      const userId = 'user-1'
      const preferences = [
        {
          preference_type: 'category' as const,
          preference_value: 'Innovation',
          weight: 0.7
        },
        {
          preference_type: 'funder_type' as const,
          preference_value: 'government',
          weight: 0.6
        }
      ]

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 } as any)

      await service.batchUpdatePreferences(userId, preferences)

      // Should call updatePreference for each preference
      expect(mockDb.query).toHaveBeenCalledTimes(4) // 2 checks + 2 inserts
    })

    it('should skip invalid preferences', async () => {
      const userId = 'user-1'
      const preferences = [
        { preference_type: 'category' as const, preference_value: 'Valid', weight: 0.5 },
        { preference_type: undefined as any, preference_value: 'Invalid', weight: 0.5 },
        { preference_value: 'Missing Type', weight: 0.5 } as any
      ]

      mockDb.query.mockResolvedValue({ rows: [], rowCount: 1 } as any)

      await service.batchUpdatePreferences(userId, preferences)

      // Should only process the valid preference
      expect(mockDb.query).toHaveBeenCalledTimes(2) // 1 check + 1 insert
    })
  })

  describe('preference weight calculations', () => {
    it('should apply correct weight adjustments for different interaction types', async () => {
      const service = new UserPreferencesService(mockDb, mockVectorDb, mockOpenAI)

      // Access private method through prototype
      const getWeightAdjustment = (service as any).getWeightAdjustment.bind(service)

      expect(getWeightAdjustment('apply')).toBe(0.3)
      expect(getWeightAdjustment('favorite')).toBe(0.2)
      expect(getWeightAdjustment('share')).toBe(0.1)
      expect(getWeightAdjustment('view')).toBe(0.05)
      expect(getWeightAdjustment('dismiss')).toBe(-0.1)
      expect(getWeightAdjustment('unknown')).toBe(0)
    })

    it('should categorize amounts into correct ranges', async () => {
      const service = new UserPreferencesService(mockDb, mockVectorDb, mockOpenAI)

      // Access private method
      const getAmountRange = (service as any).getAmountRange.bind(service)

      expect(getAmountRange(3000)).toBe('small')
      expect(getAmountRange(15000)).toBe('medium')
      expect(getAmountRange(75000)).toBe('large')
      expect(getAmountRange(200000)).toBe('enterprise')
    })
  })

  describe('recommendation scoring', () => {
    it('should calculate preference match scores correctly', async () => {
      const grant = {
        id: 'grant-1',
        categories: ['Research & Development'],
        funder_type: 'government',
        amount_max: 50000
      }

      const userProfile = {
        user_id: 'user-1',
        preferences: [{
          user_id: 'user-1',
          preference_type: 'category' as const,
          preference_value: 'Research & Development',
          weight: 0.8,
          created_at: new Date(),
          updated_at: new Date()
        }],
        interactions: [],
        learning_metrics: {
          total_interactions: 0,
          favorite_categories: [],
          avg_grant_amount: 0,
          preferred_funders: [],
          success_rate: 0
        }
      }

      // Access private method
      const scoreGrant = (service as any).scoreGrant.bind(service)
      const result = await scoreGrant(grant, userProfile, { user_id: 'user-1' })

      expect(result.score).toBeGreaterThan(0)
      expect(result.reasoning.preference_match).toBe(0.8)
      expect(result.explanation).toContain('Matches preferred category: Research & Development')
    })

    it('should apply novelty factor for unexplored categories', async () => {
      const grant = {
        id: 'grant-1',
        categories: ['New Category'],
        funder_type: 'government',
        amount_max: 30000
      }

      const userProfile = {
        user_id: 'user-1',
        preferences: [],
        interactions: [],
        learning_metrics: {
          total_interactions: 5,
          favorite_categories: ['Research & Development'], // Different category
          avg_grant_amount: 25000,
          preferred_funders: [],
          success_rate: 0
        }
      }

      const scoreGrant = (service as any).scoreGrant.bind(service)
      const result = await scoreGrant(grant, userProfile, { user_id: 'user-1' })

      expect(result.reasoning.novelty_factor).toBe(0.8)
      expect(result.explanation).toContain('New category to explore')
    })
  })
})