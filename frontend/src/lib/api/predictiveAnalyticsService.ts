/**
 * Predictive Analytics Service Client
 * Frontend utility for interacting with AI-powered predictive analytics APIs
 */

export interface GrantSuccessPrediction {
  grant_id: string
  organization_id: string
  success_probability: number // 0-100
  confidence_score: number // 0-100
  predicted_factors: {
    organization_fit: number
    historical_performance: number
    competition_level: number
    timing_factor: number
    budget_alignment: number
  }
  recommendations: {
    category: 'timing' | 'budget' | 'approach' | 'requirements'
    suggestion: string
    impact_score: number // 0-10
    priority: 'high' | 'medium' | 'low'
  }[]
  historical_comparison: {
    similar_grants_applied: number
    similar_grants_won: number
    avg_success_rate: number
    best_performing_category: string
  }
  competitive_analysis: {
    estimated_applicants: number
    competition_level: 'low' | 'medium' | 'high' | 'very_high'
    your_ranking_estimate: number // 1-100 percentile
    key_differentiators: string[]
  }
  optimal_timing: {
    recommended_submission_window: {
      start_date: Date
      end_date: Date
    }
    timing_rationale: string
    seasonal_factors: string[]
  }
  created_at: Date
}

export interface BudgetOptimization {
  grant_id: string
  organization_id: string
  analysis: {
    requested_amount: number
    optimal_range: {
      min: number
      max: number
      recommended: number
    }
    justification: string
    risk_assessment: {
      too_low_risk: string
      too_high_risk: string
      optimal_rationale: string
    }
  }
  benchmarking: {
    similar_organizations: {
      avg_request: number
      median_request: number
      success_rate_by_amount: {
        range: string
        success_rate: number
        sample_size: number
      }[]
    }
    historical_trends: {
      year: number
      avg_award: number
      success_rate: number
    }[]
  }
  recommendations: {
    budget_strategy: string
    timing_considerations: string[]
    competitive_positioning: string
  }
  created_at: Date
}

export interface CompetitionAnalysis {
  grant_id: string
  analysis_date: Date
  competition_metrics: {
    estimated_total_applicants: number
    application_difficulty_score: number // 1-10
    funder_selectivity: number // % success rate
    geographic_competition: {
      local: number
      regional: number
      national: number
      international: number
    }
  }
  market_insights: {
    trending_focus_areas: string[]
    emerging_competitors: string[]
    funding_landscape_changes: string[]
  }
  strategic_recommendations: {
    positioning_strategy: string
    differentiation_opportunities: string[]
    timing_advantages: string[]
    collaboration_suggestions: string[]
  }
  confidence_metrics: {
    data_completeness: number // 0-100
    prediction_accuracy: number // 0-100
    last_updated: Date
  }
}

export interface PredictiveInsights {
  user_id: string
  insights: {
    type: 'success_trend' | 'market_opportunity' | 'competitive_advantage' | 'timing_alert'
    title: string
    description: string
    data_points: any[]
    actionable_recommendations: string[]
    priority_score: number // 1-10
    expires_at?: Date
  }[]
  performance_summary: {
    total_predictions_made: number
    accuracy_rate: number
    successful_recommendations: number
    user_engagement_score: number
  }
  generated_at: Date
}

export interface PredictionRequest {
  grant_id: string
  organization_id: string
  application_data?: any
}

export interface BudgetOptimizationRequest {
  grant_id: string
  organization_id: string
  proposed_amount: number
}

class PredictiveAnalyticsService {
  private baseUrl: string

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://grants.etownz.com/api' 
      : 'http://localhost:8001'
  }

  /**
   * Get comprehensive success probability prediction for a grant
   */
  async predictGrantSuccess(request: PredictionRequest): Promise<GrantSuccessPrediction> {
    const response = await fetch(`${this.baseUrl}/predictive/grants/${request.grant_id}/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        organization_id: request.organization_id,
        application_data: request.application_data
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to predict grant success: ${response.status}`)
    }

    const data = await response.json()
    
    // Convert date strings to Date objects
    return {
      ...data,
      created_at: new Date(data.created_at),
      optimal_timing: {
        ...data.optimal_timing,
        recommended_submission_window: {
          start_date: new Date(data.optimal_timing.recommended_submission_window.start_date),
          end_date: new Date(data.optimal_timing.recommended_submission_window.end_date)
        }
      }
    }
  }

  /**
   * Get budget optimization recommendations
   */
  async optimizeBudget(request: BudgetOptimizationRequest): Promise<BudgetOptimization> {
    const response = await fetch(`${this.baseUrl}/predictive/grants/${request.grant_id}/optimize-budget`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        organization_id: request.organization_id,
        proposed_amount: request.proposed_amount
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to optimize budget: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      ...data,
      created_at: new Date(data.created_at)
    }
  }

  /**
   * Get competitive analysis for a grant
   */
  async analyzeCompetition(grantId: string): Promise<CompetitionAnalysis> {
    const response = await fetch(`${this.baseUrl}/predictive/grants/${grantId}/competition`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to analyze competition: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      ...data,
      analysis_date: new Date(data.analysis_date),
      confidence_metrics: {
        ...data.confidence_metrics,
        last_updated: new Date(data.confidence_metrics.last_updated)
      }
    }
  }

  /**
   * Get personalized predictive insights for a user
   */
  async getPredictiveInsights(userId: string): Promise<PredictiveInsights> {
    const response = await fetch(`${this.baseUrl}/predictive/users/${userId}/insights`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to get predictive insights: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      ...data,
      generated_at: new Date(data.generated_at),
      insights: data.insights.map((insight: any) => ({
        ...insight,
        expires_at: insight.expires_at ? new Date(insight.expires_at) : undefined
      }))
    }
  }

  /**
   * Get multiple predictions for grants in batch
   */
  async batchPredictSuccess(
    requests: PredictionRequest[]
  ): Promise<GrantSuccessPrediction[]> {
    const response = await fetch(`${this.baseUrl}/predictive/grants/batch-predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({ predictions: requests })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to batch predict: ${response.status}`)
    }

    const data = await response.json()
    
    return data.predictions.map((prediction: any) => ({
      ...prediction,
      created_at: new Date(prediction.created_at),
      optimal_timing: {
        ...prediction.optimal_timing,
        recommended_submission_window: {
          start_date: new Date(prediction.optimal_timing.recommended_submission_window.start_date),
          end_date: new Date(prediction.optimal_timing.recommended_submission_window.end_date)
        }
      }
    }))
  }

  /**
   * Update prediction with actual outcome for ML improvement
   */
  async updatePredictionOutcome(
    predictionId: string,
    outcome: 'approved' | 'rejected' | 'withdrawn' | 'pending'
  ): Promise<{ success: boolean; accuracy_score?: number }> {
    const response = await fetch(`${this.baseUrl}/predictive/predictions/${predictionId}/outcome`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({ outcome })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to update prediction outcome: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get historical predictions for an organization
   */
  async getHistoricalPredictions(
    organizationId: string,
    options: {
      limit?: number
      offset?: number
      include_outcomes?: boolean
    } = {}
  ): Promise<{
    predictions: GrantSuccessPrediction[]
    total: number
    accuracy_summary: {
      total_predictions: number
      validated_predictions: number
      avg_accuracy: number
      accuracy_by_range: {
        range: string
        count: number
        accuracy: number
      }[]
    }
  }> {
    const params = new URLSearchParams()
    if (options.limit) params.set('limit', options.limit.toString())
    if (options.offset) params.set('offset', options.offset.toString())
    if (options.include_outcomes) params.set('include_outcomes', 'true')

    const queryString = params.toString()
    const url = `${this.baseUrl}/predictive/organizations/${organizationId}/predictions${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to get historical predictions: ${response.status}`)
    }

    const data = await response.json()
    
    return {
      ...data,
      predictions: data.predictions.map((prediction: any) => ({
        ...prediction,
        created_at: new Date(prediction.created_at),
        optimal_timing: {
          ...prediction.optimal_timing,
          recommended_submission_window: {
            start_date: new Date(prediction.optimal_timing.recommended_submission_window.start_date),
            end_date: new Date(prediction.optimal_timing.recommended_submission_window.end_date)
          }
        }
      }))
    }
  }

  /**
   * Get model performance metrics
   */
  async getModelPerformance(): Promise<{
    overall_accuracy: number
    predictions_count: number
    accuracy_by_model: {
      model_type: string
      accuracy: number
      predictions: number
    }[]
    recent_performance: {
      date: string
      accuracy: number
      predictions: number
    }[]
  }> {
    const response = await fetch(`${this.baseUrl}/predictive/models/performance`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to get model performance: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Provide feedback on prediction quality
   */
  async providePredictionFeedback(
    predictionId: string,
    feedback: {
      rating: number // 1-10
      comments?: string
      usefulness_score: number // 1-10
      recommendation_followed: boolean
    }
  ): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/predictive/predictions/${predictionId}/feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify(feedback)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to provide feedback: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get prediction explanation for transparency
   */
  async explainPrediction(predictionId: string): Promise<{
    prediction_id: string
    explanation: {
      main_factors: {
        factor: string
        weight: number
        contribution: number
        description: string
      }[]
      decision_tree: {
        condition: string
        impact: string
        confidence: number
      }[]
      model_reasoning: string
      data_sources: string[]
    }
    transparency_score: number
  }> {
    const response = await fetch(`${this.baseUrl}/predictive/predictions/${predictionId}/explain`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      }
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Failed to explain prediction: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Helper method to get prediction confidence level as text
   */
  getConfidenceLevel(score: number): 'very_low' | 'low' | 'medium' | 'high' | 'very_high' {
    if (score < 20) return 'very_low'
    if (score < 40) return 'low'
    if (score < 60) return 'medium'
    if (score < 80) return 'high'
    return 'very_high'
  }

  /**
   * Helper method to get success probability as text
   */
  getSuccessProbabilityText(probability: number): string {
    if (probability < 20) return 'Very Low Chance'
    if (probability < 40) return 'Low Chance'
    if (probability < 60) return 'Moderate Chance'
    if (probability < 80) return 'Good Chance'
    return 'Excellent Chance'
  }

  /**
   * Helper method to format currency amounts
   */
  formatCurrency(amount: number, currency: string = 'EUR'): string {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  /**
   * Helper method to calculate days until deadline
   */
  getDaysUntilDeadline(deadline: Date): number {
    const now = new Date()
    const diffTime = deadline.getTime() - now.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  /**
   * Helper method to get recommendation priority color
   */
  getPriorityColor(priority: 'high' | 'medium' | 'low'): string {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  /**
   * Helper method to get competition level color
   */
  getCompetitionLevelColor(level: 'low' | 'medium' | 'high' | 'very_high'): string {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'very_high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }
}

// Export singleton instance
export const predictiveAnalyticsService = new PredictiveAnalyticsService()

// Export class for testing
export { PredictiveAnalyticsService }