/**
 * AI Service Client
 * Frontend utility for interacting with AI-powered backend APIs
 */

export interface OrganizationProfile {
  id: string
  name: string
  description: string
  sector?: string
  size?: 'startup' | 'small' | 'medium' | 'large' | 'enterprise'
  location?: string
  capabilities?: string[]
  previousGrants?: string[]
}

export interface GrantMatchResult {
  grant: any
  matchScore: number
  analysisResult: {
    overallCompatibility: number
    eligibilityStatus: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNCLEAR'
    matchingCriteria: string[]
    recommendations: string[]
    reasoning: string
    confidence: number
  }
  semanticSimilarity: number
  reasoning: string
  recommendations: string[]
}

export interface SemanticSearchResult {
  id: string
  title: string
  content: string
  similarity: number
  metadata: any
  reasoning?: string
}

export interface AIHealthStatus {
  status: 'healthy' | 'unhealthy'
  grantsProcessed: number
  vectorsStored: number
  aiInteractions: number
  errors?: string[]
  timestamp: string
}

export interface AIStats {
  grantsProcessed: number
  vectorsStored: number
  aiInteractions24h: number
  status: string
  timestamp: string
}

class AIService {
  private baseUrl: string

  constructor() {
    this.baseUrl = '/api'
  }

  /**
   * Find grants matching an organization profile using AI
   */
  async matchGrants(
    organizationProfile: OrganizationProfile,
    filters?: any,
    limit: number = 10
  ): Promise<{
    matches: GrantMatchResult[]
    processingTime: number
    aiModel: string
    metadata: any
  }> {
    const response = await fetch(`${this.baseUrl}/ai/grants/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authorization header if token exists
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        organizationProfile,
        filters,
        limit
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `AI grant matching failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Perform semantic search for grants using natural language
   */
  async semanticSearch(
    query: string,
    organizationId?: string,
    filters?: any,
    limit: number = 10
  ): Promise<{
    results: SemanticSearchResult[]
    query: string
    processingTime: number
    totalResults: number
    metadata: any
  }> {
    const response = await fetch(`${this.baseUrl}/ai/grants/search/semantic`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        query,
        organizationId,
        filters,
        limit
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Semantic search failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Analyze a specific grant for organization compatibility
   */
  async analyzeGrant(
    grantId: string,
    organizationProfile: OrganizationProfile,
    query?: string
  ): Promise<{
    grantId: string
    organizationId: string
    analysis: any
    processingTime: number
    metadata: any
  }> {
    const response = await fetch(`${this.baseUrl}/ai/grants/${grantId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        organizationProfile,
        query
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Grant analysis failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get AI services health status
   */
  async getHealthStatus(): Promise<AIHealthStatus> {
    const response = await fetch(`${this.baseUrl}/ai/health`, {
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
      throw new Error(error.message || `AI health check failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Get AI processing statistics
   */
  async getStats(): Promise<AIStats> {
    const response = await fetch(`${this.baseUrl}/ai/stats`, {
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
      throw new Error(error.message || `AI stats failed: ${response.status}`)
    }

    return response.json()
  }

  /**
   * Legacy AI search for backwards compatibility
   */
  async legacyAISearch(
    orgProfile: OrganizationProfile,
    filters?: any,
    limit: number = 10
  ): Promise<any> {
    const response = await fetch(`${this.baseUrl}/grants/search/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(typeof window !== 'undefined' && localStorage.getItem('token') && {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        })
      },
      body: JSON.stringify({
        org_profile: orgProfile,
        filters,
        limit
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.message || `Legacy AI search failed: ${response.status}`)
    }

    return response.json()
  }
}

// Export singleton instance
export const aiService = new AIService()

// Export class for testing
export { AIService }