import { useState } from 'react'
import { apiClient } from './index'

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
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
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
  issues: ComplianceIssue[]
  recommendations: ComplianceRecommendation[]
  aiModelUsed?: string
  confidenceScore?: number
  status?: 'pending' | 'completed' | 'failed'
  checkedAt?: string
}

export interface ComplianceIssue {
  field: string
  requirement: string
  severity: 'critical' | 'major' | 'minor'
  suggestion: string
  found: boolean
  details?: string
}

export interface ComplianceRecommendation {
  category: string
  priority: 'high' | 'medium' | 'low'
  description: string
  actionItems: string[]
  estimatedImpact: string
}

export interface DocumentAnalysisResult {
  id?: string
  applicationId?: string
  documentName: string
  documentType?: string
  analysisType: string
  extractedText?: string
  keyRequirements?: unknown[]
  complianceScore?: number
  summary?: string
  insights?: Record<string, unknown>
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed'
  aiModelUsed?: string
  confidenceScore?: number
  createdAt?: string
}

export interface AIUsageStats {
  interactionType: string
  count: number
  avgConfidence: number
  avgRating: number
  totalTokens: number
  avgProcessingTime: number
}

class AITransparencyService {
  // AI Interactions
  async createInteraction(interaction: Omit<AIInteraction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<{ interactionId: string }> {
    const response = await apiClient.post('/ai/interactions', interaction)
    return response.data
  }

  async updateInteraction(interactionId: string, updates: Partial<AIInteraction>): Promise<void> {
    await apiClient.put(`/ai/interactions/${interactionId}`, updates)
  }

  async getInteraction(interactionId: string): Promise<AIInteraction> {
    const response = await apiClient.get(`/ai/interactions/${interactionId}`)
    return response.data
  }

  async getUserInteractions(limit = 50, offset = 0): Promise<AIInteraction[]> {
    const response = await apiClient.get('/ai/interactions', {
      params: { limit, offset }
    })
    return response.data
  }

  async submitRating(interactionId: string, rating: number, feedback?: string): Promise<void> {
    await apiClient.post(`/ai/interactions/${interactionId}/rating`, {
      rating,
      feedback
    })
  }

  // AI Generated Content
  async saveGeneratedContent(content: AIGeneratedContent): Promise<{ contentId: string }> {
    const response = await apiClient.post('/ai/content', content)
    return response.data
  }

  async getGeneratedContent(applicationId: string, sectionName?: string): Promise<AIGeneratedContent[]> {
    const response = await apiClient.get(`/ai/content/${applicationId}`, {
      params: sectionName ? { sectionName } : {}
    })
    return response.data
  }

  // Compliance Checks
  async getComplianceChecks(applicationId: string): Promise<ComplianceCheckResult[]> {
    const response = await apiClient.get(`/ai/compliance/${applicationId}`)
    return response.data
  }

  async saveComplianceCheck(check: ComplianceCheckResult): Promise<{ checkId: string }> {
    const response = await apiClient.post('/ai/compliance', check)
    return response.data
  }

  // Document Analysis
  async getDocumentAnalysis(applicationId: string): Promise<DocumentAnalysisResult[]> {
    const response = await apiClient.get(`/ai/documents/${applicationId}`)
    return response.data
  }

  async saveDocumentAnalysis(analysis: DocumentAnalysisResult): Promise<{ analysisId: string }> {
    const response = await apiClient.post('/ai/documents', analysis)
    return response.data
  }

  // Analytics
  async getUsageStats(startDate?: string, endDate?: string): Promise<AIUsageStats[]> {
    const response = await apiClient.get('/ai/analytics/usage', {
      params: { startDate, endDate }
    })
    return response.data
  }

  // Helper methods for creating interactions
  async trackContentGeneration(
    applicationId: string,
    sectionName: string,
    promptText: string,
    modelUsed: string,
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const { interactionId } = await this.createInteraction({
      applicationId,
      interactionType: 'content_generation',
      promptText,
      modelUsed,
      status: 'processing',
      metadata: {
        sectionName,
        ...metadata
      }
    })
    return interactionId
  }

  async completeContentGeneration(
    interactionId: string,
    responseText: string,
    confidenceScore: number,
    tokensUsed?: number,
    processingTimeMs?: number
  ): Promise<void> {
    await this.updateInteraction(interactionId, {
      responseText,
      confidenceScore,
      tokensUsed,
      processingTimeMs,
      status: 'completed'
    })
  }

  async trackDocumentAnalysis(
    applicationId: string,
    documentName: string,
    analysisType: string,
    modelUsed: string
  ): Promise<string> {
    const { interactionId } = await this.createInteraction({
      applicationId,
      interactionType: 'document_analysis',
      promptText: `Analyzing document: ${documentName}`,
      modelUsed,
      status: 'processing',
      metadata: {
        documentName,
        analysisType
      }
    })
    return interactionId
  }

  async trackComplianceCheck(
    applicationId: string,
    checkType: string,
    modelUsed: string,
    grantSchemeId?: string
  ): Promise<string> {
    const { interactionId } = await this.createInteraction({
      applicationId,
      interactionType: 'compliance_check',
      promptText: `Running ${checkType} compliance check`,
      modelUsed,
      status: 'processing',
      metadata: {
        checkType,
        grantSchemeId
      }
    })
    return interactionId
  }

  // Batch operations
  async batchCreateInteractions(interactions: Array<Omit<AIInteraction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<string[]> {
    const promises = interactions.map(interaction => this.createInteraction(interaction))
    const results = await Promise.all(promises)
    return results.map(result => result.interactionId)
  }

  // Error handling wrapper
  private async withErrorHandling<T>(operation: () => Promise<T>, context: string): Promise<T> {
    try {
      return await operation()
    } catch (error) {
      console.error(`AI Transparency Service Error in ${context}:`, error)
      throw error
    }
  }
}

// Export singleton instance
export const aiTransparencyService = new AITransparencyService()

// React hooks for AI transparency
export const useAIInteractions = () => {
  const [interactions, setInteractions] = useState<AIInteraction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadInteractions = async (limit = 50, offset = 0) => {
    setLoading(true)
    setError(null)
    try {
      const data = await aiTransparencyService.getUserInteractions(limit, offset)
      setInteractions(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load interactions')
    } finally {
      setLoading(false)
    }
  }

  const submitRating = async (interactionId: string, rating: number, feedback?: string) => {
    try {
      await aiTransparencyService.submitRating(interactionId, rating, feedback)
      // Update local state
      setInteractions(prev => 
        prev.map(interaction => 
          interaction.id === interactionId 
            ? { ...interaction, userRating: rating, userFeedback: feedback }
            : interaction
        )
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit rating')
    }
  }

  return {
    interactions,
    loading,
    error,
    loadInteractions,
    submitRating
  }
}

export const useAIContent = (applicationId: string) => {
  const [content, setContent] = useState<AIGeneratedContent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadContent = async (sectionName?: string) => {
    if (!applicationId) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await aiTransparencyService.getGeneratedContent(applicationId, sectionName)
      setContent(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load AI content')
    } finally {
      setLoading(false)
    }
  }

  const saveContent = async (newContent: AIGeneratedContent) => {
    try {
      const { contentId } = await aiTransparencyService.saveGeneratedContent(newContent)
      setContent(prev => [...prev, { ...newContent, id: contentId }])
      return contentId
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content')
      throw err
    }
  }

  return {
    content,
    loading,
    error,
    loadContent,
    saveContent
  }
}

export const useComplianceChecks = (applicationId: string) => {
  const [checks, setChecks] = useState<ComplianceCheckResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChecks = async () => {
    if (!applicationId) return
    
    setLoading(true)
    setError(null)
    try {
      const data = await aiTransparencyService.getComplianceChecks(applicationId)
      setChecks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load compliance checks')
    } finally {
      setLoading(false)
    }
  }

  return {
    checks,
    loading,
    error,
    loadChecks
  }
}

// Hook for tracking AI interactions in components
export const useAITracking = () => {
  const trackInteraction = async (
    type: string,
    modelUsed: string,
    applicationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<string> => {
    return aiTransparencyService.createInteraction({
      interactionType: type,
      modelUsed,
      applicationId,
      status: 'processing',
      metadata
    }).then(result => result.interactionId)
  }

  const completeInteraction = async (
    interactionId: string,
    responseText: string,
    confidenceScore: number,
    tokensUsed?: number,
    processingTimeMs?: number
  ) => {
    return aiTransparencyService.updateInteraction(interactionId, {
      responseText,
      confidenceScore,
      tokensUsed,
      processingTimeMs,
      status: 'completed'
    })
  }

  const failInteraction = async (interactionId: string, error: string) => {
    return aiTransparencyService.updateInteraction(interactionId, {
      status: 'failed',
      metadata: { error }
    })
  }

  return {
    trackInteraction,
    completeInteraction,
    failInteraction
  }
}

export default AITransparencyService