import { PredictiveAnalyticsService } from '../services/predictiveAnalyticsService'
import { DatabaseService } from '../services/database'
import { OpenAIService } from '../services/openaiService'
import { VectorDatabaseService } from '../services/vectorDatabase'

// Mock all dependencies
jest.mock('../services/database')
jest.mock('../services/openaiService')
jest.mock('../services/vectorDatabase')
jest.mock('../services/logger')

describe('PredictiveAnalyticsService', () => {
  let service: PredictiveAnalyticsService
  let mockDb: jest.Mocked<DatabaseService>
  let mockOpenAI: jest.Mocked<OpenAIService>
  let mockVectorDb: jest.Mocked<VectorDatabaseService>

  const mockGrantData = {
    id: 'grant-123',
    title: 'Technology Innovation Grant',
    categories: ['Technology', 'Innovation'],
    eligibility_criteria: { sector: 'technology', size: 'small' },
    amount_max: 100000,
    amount_min: 25000,
    deadline: '2025-12-31',
    funder: 'Tech Foundation',
    funder_type: 'foundation'
  }

  const mockOrgData = {
    id: 'org-123',
    name: 'Tech Startup Inc',
    sector: 'technology',
    size: 'small',
    capabilities: ['AI', 'Machine Learning', 'Software Development'],
    previous_grants: ['Previous Grant 1', 'Previous Grant 2']
  }

  const mockHistoricalData = {
    total_applications: 10,
    successful_applications: 4,
    avg_success_rate: 0.4,
    similar_grants: { applied: 5, won: 2 },
    best_category: 'Technology'
  }

  beforeEach(() => {
    // Create mocked instances
    mockDb = new DatabaseService() as jest.Mocked<DatabaseService>
    mockOpenAI = new OpenAIService() as jest.Mocked<OpenAIService>
    mockVectorDb = new VectorDatabaseService() as jest.Mocked<VectorDatabaseService>

    // Create service instance with mocked dependencies
    service = new PredictiveAnalyticsService(mockDb, mockOpenAI, mockVectorDb)

    // Setup default mock implementations
    mockDb.query = jest.fn()
    mockOpenAI.chatCompletion = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('predictGrantSuccess', () => {
    beforeEach(() => {
      // Mock database queries for grant success prediction
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] }) // getGrantData
        .mockResolvedValueOnce({ rows: [mockOrgData] }) // getOrganizationData
        .mockResolvedValueOnce({ rows: [mockHistoricalData] }) // getHistoricalPerformance
        .mockResolvedValueOnce({ rows: [{ current_applications: 25 }] }) // assessCompetitionLevel
        .mockResolvedValueOnce({ rows: [] }) // storePrediction

      // Mock OpenAI responses
      mockOpenAI.chatCompletion
        .mockResolvedValueOnce({
          content: '85',
          usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110, estimatedCost: 0.01 }
        }) // calculateOrganizationFit
        .mockResolvedValueOnce({
          content: JSON.stringify({
            success_probability: 78,
            confidence: 85,
            reasoning: 'Strong organizational fit with good historical performance',
            key_factors: ['sector_alignment', 'capability_match', 'track_record']
          }),
          usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250, estimatedCost: 0.02 }
        }) // generateAISuccessPrediction
    })

    it('should generate comprehensive success prediction', async () => {
      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction).toMatchObject({
        grant_id: 'grant-123',
        organization_id: 'org-123',
        success_probability: expect.any(Number),
        confidence_score: expect.any(Number),
        predicted_factors: {
          organization_fit: expect.any(Number),
          historical_performance: expect.any(Number),
          competition_level: expect.any(Number),
          timing_factor: expect.any(Number),
          budget_alignment: expect.any(Number)
        },
        recommendations: expect.any(Array),
        historical_comparison: expect.objectContaining({
          similar_grants_applied: expect.any(Number),
          similar_grants_won: expect.any(Number),
          avg_success_rate: expect.any(Number)
        }),
        competitive_analysis: expect.any(Object),
        optimal_timing: expect.any(Object),
        created_at: expect.any(Date)
      })

      expect(prediction.success_probability).toBeGreaterThanOrEqual(0)
      expect(prediction.success_probability).toBeLessThanOrEqual(100)
      expect(prediction.confidence_score).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence_score).toBeLessThanOrEqual(100)
    })

    it('should calculate prediction factors correctly', async () => {
      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction.predicted_factors.organization_fit).toBeGreaterThanOrEqual(0)
      expect(prediction.predicted_factors.organization_fit).toBeLessThanOrEqual(100)
      expect(prediction.predicted_factors.historical_performance).toBeGreaterThanOrEqual(0)
      expect(prediction.predicted_factors.historical_performance).toBeLessThanOrEqual(100)
      expect(prediction.predicted_factors.competition_level).toBeGreaterThanOrEqual(0)
      expect(prediction.predicted_factors.competition_level).toBeLessThanOrEqual(100)
    })

    it('should generate actionable recommendations', async () => {
      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction.recommendations).toBeInstanceOf(Array)
      prediction.recommendations.forEach(rec => {
        expect(rec).toMatchObject({
          category: expect.stringMatching(/^(timing|budget|approach|requirements)$/),
          suggestion: expect.any(String),
          impact_score: expect.any(Number),
          priority: expect.stringMatching(/^(high|medium|low)$/)
        })
        expect(rec.impact_score).toBeGreaterThanOrEqual(0)
        expect(rec.impact_score).toBeLessThanOrEqual(10)
      })
    })

    it('should include competitive analysis', async () => {
      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction.competitive_analysis).toMatchObject({
        estimated_applicants: expect.any(Number),
        competition_level: expect.stringMatching(/^(low|medium|high|very_high)$/),
        your_ranking_estimate: expect.any(Number),
        key_differentiators: expect.any(Array)
      })

      expect(prediction.competitive_analysis.your_ranking_estimate).toBeGreaterThanOrEqual(1)
      expect(prediction.competitive_analysis.your_ranking_estimate).toBeLessThanOrEqual(100)
    })

    it('should provide optimal timing recommendations', async () => {
      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction.optimal_timing).toMatchObject({
        recommended_submission_window: {
          start_date: expect.any(Date),
          end_date: expect.any(Date)
        },
        timing_rationale: expect.any(String),
        seasonal_factors: expect.any(Array)
      })

      const { start_date, end_date } = prediction.optimal_timing.recommended_submission_window
      expect(start_date.getTime()).toBeLessThan(end_date.getTime())
    })

    it('should store prediction in database', async () => {
      await service.predictGrantSuccess('grant-123', 'org-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grant_success_predictions'),
        expect.arrayContaining(['grant-123', 'org-123'])
      )
    })

    it('should handle missing grant data gracefully', async () => {
      mockDb.query.mockReset()
      mockDb.query
        .mockResolvedValueOnce({ rows: [] }) // No grant found
        .mockResolvedValueOnce({ rows: [mockOrgData] })
        .mockResolvedValueOnce({ rows: [mockHistoricalData] })

      const prediction = await service.predictGrantSuccess('invalid-grant', 'org-123')

      // Should still return a prediction with default values
      expect(prediction.grant_id).toBe('invalid-grant')
      expect(prediction.success_probability).toBeGreaterThanOrEqual(0)
    })

    it('should handle AI service errors gracefully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] })
        .mockResolvedValueOnce({ rows: [mockOrgData] })
        .mockResolvedValueOnce({ rows: [mockHistoricalData] })

      mockOpenAI.chatCompletion.mockRejectedValue(new Error('AI service unavailable'))

      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      // Should still return a prediction with fallback values
      expect(prediction.success_probability).toBeGreaterThanOrEqual(0)
      expect(prediction.confidence_score).toBeGreaterThanOrEqual(0)
    })
  })

  describe('optimizeBudget', () => {
    const mockSimilarOrgs = {
      avg_request: 75000,
      median_request: 50000,
      success_rate_by_amount: [
        { range: '$0-25k', success_rate: 45, sample_size: 120 },
        { range: '$25k-50k', success_rate: 35, sample_size: 85 }
      ]
    }

    const mockHistoricalTrends = [
      { year: 2023, avg_award: 45000, success_rate: 32 },
      { year: 2022, avg_award: 42000, success_rate: 35 }
    ]

    beforeEach(() => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] }) // getGrantData
        .mockResolvedValueOnce({ rows: [] }) // storeBudgetOptimization
    })

    it('should generate budget optimization recommendations', async () => {
      const optimization = await service.optimizeBudget('grant-123', 'org-123', 60000)

      expect(optimization).toMatchObject({
        grant_id: 'grant-123',
        organization_id: 'org-123',
        analysis: {
          requested_amount: 60000,
          optimal_range: {
            min: expect.any(Number),
            max: expect.any(Number),
            recommended: expect.any(Number)
          },
          justification: expect.any(String),
          risk_assessment: {
            too_low_risk: expect.any(String),
            too_high_risk: expect.any(String),
            optimal_rationale: expect.any(String)
          }
        },
        benchmarking: expect.any(Object),
        recommendations: expect.any(Object),
        created_at: expect.any(Date)
      })

      const { min, max, recommended } = optimization.analysis.optimal_range
      expect(min).toBeLessThanOrEqual(recommended)
      expect(recommended).toBeLessThanOrEqual(max)
      expect(min).toBeGreaterThan(0)
    })

    it('should provide realistic budget ranges', async () => {
      const optimization = await service.optimizeBudget('grant-123', 'org-123', 60000)

      const maxGrantAmount = mockGrantData.amount_max
      expect(optimization.analysis.optimal_range.max).toBeLessThanOrEqual(maxGrantAmount)
      expect(optimization.analysis.optimal_range.min).toBeGreaterThanOrEqual(maxGrantAmount * 0.1)
    })

    it('should include risk assessment', async () => {
      const optimization = await service.optimizeBudget('grant-123', 'org-123', 60000)

      expect(optimization.analysis.risk_assessment).toMatchObject({
        too_low_risk: expect.any(String),
        too_high_risk: expect.any(String),
        optimal_rationale: expect.any(String)
      })

      expect(optimization.analysis.risk_assessment.too_low_risk.length).toBeGreaterThan(0)
      expect(optimization.analysis.risk_assessment.too_high_risk.length).toBeGreaterThan(0)
    })

    it('should store optimization results', async () => {
      await service.optimizeBudget('grant-123', 'org-123', 60000)

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO budget_optimizations'),
        expect.arrayContaining(['grant-123', 'org-123'])
      )
    })
  })

  describe('analyzeCompetition', () => {
    beforeEach(() => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] }) // getGrantData
        .mockResolvedValueOnce({ rows: [] }) // storeCompetitionAnalysis
    })

    it('should provide comprehensive competition analysis', async () => {
      const analysis = await service.analyzeCompetition('grant-123')

      expect(analysis).toMatchObject({
        grant_id: 'grant-123',
        analysis_date: expect.any(Date),
        competition_metrics: {
          estimated_total_applicants: expect.any(Number),
          application_difficulty_score: expect.any(Number),
          funder_selectivity: expect.any(Number),
          geographic_competition: {
            local: expect.any(Number),
            regional: expect.any(Number),
            national: expect.any(Number),
            international: expect.any(Number)
          }
        },
        market_insights: {
          trending_focus_areas: expect.any(Array),
          emerging_competitors: expect.any(Array),
          funding_landscape_changes: expect.any(Array)
        },
        strategic_recommendations: {
          positioning_strategy: expect.any(String),
          differentiation_opportunities: expect.any(Array),
          timing_advantages: expect.any(Array),
          collaboration_suggestions: expect.any(Array)
        },
        confidence_metrics: {
          data_completeness: expect.any(Number),
          prediction_accuracy: expect.any(Number),
          last_updated: expect.any(Date)
        }
      })

      expect(analysis.competition_metrics.estimated_total_applicants).toBeGreaterThan(0)
      expect(analysis.competition_metrics.application_difficulty_score).toBeGreaterThanOrEqual(1)
      expect(analysis.competition_metrics.application_difficulty_score).toBeLessThanOrEqual(10)
    })

    it('should calculate realistic competition metrics', async () => {
      const analysis = await service.analyzeCompetition('grant-123')

      const geoCompetition = analysis.competition_metrics.geographic_competition
      const total = geoCompetition.local + geoCompetition.regional + 
                   geoCompetition.national + geoCompetition.international

      expect(total).toBeLessThanOrEqual(100) // Should be percentages
      expect(geoCompetition.local).toBeGreaterThanOrEqual(0)
      expect(geoCompetition.regional).toBeGreaterThanOrEqual(0)
      expect(geoCompetition.national).toBeGreaterThanOrEqual(0)
      expect(geoCompetition.international).toBeGreaterThanOrEqual(0)
    })

    it('should provide actionable strategic recommendations', async () => {
      const analysis = await service.analyzeCompetition('grant-123')

      expect(analysis.strategic_recommendations.positioning_strategy).toBeTruthy()
      expect(analysis.strategic_recommendations.differentiation_opportunities.length).toBeGreaterThan(0)
      expect(analysis.strategic_recommendations.timing_advantages.length).toBeGreaterThan(0)
      expect(analysis.strategic_recommendations.collaboration_suggestions.length).toBeGreaterThan(0)
    })

    it('should store competition analysis', async () => {
      await service.analyzeCompetition('grant-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO competition_analyses'),
        expect.arrayContaining(['grant-123'])
      )
    })
  })

  describe('generatePredictiveInsights', () => {
    const mockUserProfile = {
      id: 'user-123',
      name: 'Test User',
      organization_id: 'org-123'
    }

    const mockRecentActivity = [
      { grant_id: 'grant-1', status: 'approved', created_at: '2024-01-15' },
      { grant_id: 'grant-2', status: 'pending', created_at: '2024-02-01' }
    ]

    const mockPerformanceSummary = {
      total_predictions: 15,
      accuracy_rate: 0.75,
      successful_recommendations: 8,
      avg_engagement: 0.6
    }

    beforeEach(() => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockUserProfile] }) // getUserProfile
        .mockResolvedValueOnce({ rows: mockRecentActivity }) // getRecentActivity
        .mockResolvedValueOnce({ rows: [mockPerformanceSummary] }) // calculatePerformanceSummary
        .mockResolvedValueOnce({ rows: [] }) // storePredictiveInsights
    })

    it('should generate comprehensive predictive insights', async () => {
      const insights = await service.generatePredictiveInsights('user-123')

      expect(insights).toMatchObject({
        user_id: 'user-123',
        insights: expect.any(Array),
        performance_summary: {
          total_predictions_made: expect.any(Number),
          accuracy_rate: expect.any(Number),
          successful_recommendations: expect.any(Number),
          user_engagement_score: expect.any(Number)
        },
        generated_at: expect.any(Date)
      })

      expect(insights.insights.length).toBeGreaterThan(0)
    })

    it('should generate different types of insights', async () => {
      const insights = await service.generatePredictiveInsights('user-123')

      const insightTypes = insights.insights.map(insight => insight.type)
      const expectedTypes = ['success_trend', 'market_opportunity', 'competitive_advantage', 'timing_alert']
      
      expectedTypes.forEach(type => {
        expect(insightTypes).toContain(type)
      })
    })

    it('should include actionable recommendations in insights', async () => {
      const insights = await service.generatePredictiveInsights('user-123')

      insights.insights.forEach(insight => {
        expect(insight).toMatchObject({
          type: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          data_points: expect.any(Array),
          actionable_recommendations: expect.any(Array),
          priority_score: expect.any(Number)
        })

        expect(insight.priority_score).toBeGreaterThanOrEqual(1)
        expect(insight.priority_score).toBeLessThanOrEqual(10)
        expect(insight.actionable_recommendations.length).toBeGreaterThan(0)
      })
    })

    it('should calculate realistic performance summary', async () => {
      const insights = await service.generatePredictiveInsights('user-123')

      expect(insights.performance_summary.accuracy_rate).toBeGreaterThanOrEqual(0)
      expect(insights.performance_summary.accuracy_rate).toBeLessThanOrEqual(1)
      expect(insights.performance_summary.user_engagement_score).toBeGreaterThanOrEqual(0)
      expect(insights.performance_summary.user_engagement_score).toBeLessThanOrEqual(1)
    })

    it('should store predictive insights', async () => {
      await service.generatePredictiveInsights('user-123')

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO predictive_insights'),
        expect.arrayContaining(['user-123'])
      )
    })
  })

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'))

      await expect(service.predictGrantSuccess('grant-123', 'org-123')).rejects.toThrow()
    })

    it('should handle OpenAI API errors gracefully', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] })
        .mockResolvedValueOnce({ rows: [mockOrgData] })
        .mockResolvedValueOnce({ rows: [mockHistoricalData] })

      mockOpenAI.chatCompletion.mockRejectedValue(new Error('OpenAI API rate limit exceeded'))

      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      // Should still return a prediction with fallback values
      expect(prediction).toBeDefined()
      expect(prediction.success_probability).toBeGreaterThanOrEqual(0)
    })

    it('should validate prediction inputs', async () => {
      await expect(service.predictGrantSuccess('', '')).rejects.toThrow()
    })

    it('should handle invalid budget amounts', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [mockGrantData] })

      const optimization = await service.optimizeBudget('grant-123', 'org-123', -1000)

      expect(optimization.analysis.optimal_range.recommended).toBeGreaterThan(0)
    })
  })

  describe('prediction accuracy tracking', () => {
    it('should support prediction validation workflow', async () => {
      // First make a prediction
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] })
        .mockResolvedValueOnce({ rows: [mockOrgData] })
        .mockResolvedValueOnce({ rows: [mockHistoricalData] })
        .mockResolvedValueOnce({ rows: [{ current_applications: 25 }] })
        .mockResolvedValueOnce({ rows: [] }) // storePrediction

      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction).toBeDefined()
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO grant_success_predictions'),
        expect.any(Array)
      )
    })

    it('should track model performance metrics', async () => {
      const insights = await service.generatePredictiveInsights('user-123')

      expect(insights.performance_summary).toMatchObject({
        total_predictions_made: expect.any(Number),
        accuracy_rate: expect.any(Number),
        successful_recommendations: expect.any(Number),
        user_engagement_score: expect.any(Number)
      })
    })
  })

  describe('integration scenarios', () => {
    it('should handle complete prediction workflow', async () => {
      // Setup comprehensive mocks
      mockDb.query
        .mockResolvedValueOnce({ rows: [mockGrantData] })
        .mockResolvedValueOnce({ rows: [mockOrgData] })
        .mockResolvedValueOnce({ rows: [mockHistoricalData] })
        .mockResolvedValueOnce({ rows: [{ current_applications: 25 }] })
        .mockResolvedValueOnce({ rows: [] })

      mockOpenAI.chatCompletion
        .mockResolvedValueOnce({
          content: '85',
          usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110, estimatedCost: 0.01 }
        })
        .mockResolvedValueOnce({
          content: JSON.stringify({
            success_probability: 78,
            confidence: 85,
            reasoning: 'Strong match',
            key_factors: ['alignment']
          }),
          usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250, estimatedCost: 0.02 }
        })

      const prediction = await service.predictGrantSuccess('grant-123', 'org-123')

      expect(prediction.success_probability).toBeGreaterThan(0)
      expect(prediction.recommendations.length).toBeGreaterThan(0)
      expect(prediction.competitive_analysis).toBeDefined()
      expect(prediction.optimal_timing).toBeDefined()
    })

    it('should provide consistent results for same inputs', async () => {
      // Setup identical mocks
      const setupMocks = () => {
        mockDb.query
          .mockResolvedValueOnce({ rows: [mockGrantData] })
          .mockResolvedValueOnce({ rows: [mockOrgData] })
          .mockResolvedValueOnce({ rows: [mockHistoricalData] })
          .mockResolvedValueOnce({ rows: [{ current_applications: 25 }] })
          .mockResolvedValueOnce({ rows: [] })

        mockOpenAI.chatCompletion
          .mockResolvedValueOnce({
            content: '85',
            usage: { promptTokens: 100, completionTokens: 10, totalTokens: 110, estimatedCost: 0.01 }
          })
          .mockResolvedValueOnce({
            content: JSON.stringify({
              success_probability: 78,
              confidence: 85,
              reasoning: 'Strong match',
              key_factors: ['alignment']
            }),
            usage: { promptTokens: 200, completionTokens: 50, totalTokens: 250, estimatedCost: 0.02 }
          })
      }

      setupMocks()
      const prediction1 = await service.predictGrantSuccess('grant-123', 'org-123')

      jest.clearAllMocks()
      setupMocks()
      const prediction2 = await service.predictGrantSuccess('grant-123', 'org-123')

      // Core prediction factors should be consistent
      expect(prediction1.predicted_factors.organization_fit)
        .toBe(prediction2.predicted_factors.organization_fit)
      expect(prediction1.predicted_factors.historical_performance)
        .toBe(prediction2.predicted_factors.historical_performance)
    })
  })
})