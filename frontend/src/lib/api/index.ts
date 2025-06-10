/**
 * API Services Index
 * Central export point for all API service clients
 */

// AI Services
export { aiService, AIService } from './aiService'
export type { 
  OrganizationProfile, 
  GrantMatchResult, 
  SemanticSearchResult, 
  AIHealthStatus, 
  AIStats 
} from './aiService'

// Grants Services
export { grantsService, GrantsService } from './grantsService'
export type { 
  Grant, 
  GrantFilters, 
  GrantsResponse, 
  GrantStats 
} from './grantsService'

// Scraping Services
export { scrapingService, ScrapingService } from './scrapingService'
export type { 
  CrawlJob, 
  ScrapedPage, 
  ScrapedDocument, 
  ScrapingStats, 
  CrawlJobConfig 
} from './scrapingService'

// Monitoring Services
export { monitoringService, MonitoringService } from './monitoringService'
export type { 
  MonitoringRule, 
  GrantAlert, 
  MonitoringStats, 
  MonitoringJob 
} from './monitoringService'

// Predictive Analytics Services
export { predictiveAnalyticsService, PredictiveAnalyticsService } from './predictiveAnalyticsService'
export type { 
  GrantSuccessPrediction, 
  BudgetOptimization, 
  CompetitionAnalysis, 
  PredictiveInsights,
  PredictionRequest,
  BudgetOptimizationRequest 
} from './predictiveAnalyticsService'

// OpenAI Assistants Services
export { assistantsService, AssistantsService } from './assistantsService'
export type {
  Assistant,
  AssistantThread,
  GenerateContentRequest,
  GeneratedContent,
  ComplianceCheckRequest,
  ComplianceCheckResult,
  BudgetOptimizationRequest as AssistantBudgetRequest,
  BudgetOptimizationResult
} from './assistantsService'

// Knowledge Base Services
export { knowledgeBaseService, KnowledgeBaseService } from './knowledgeBaseService'
export type {
  KnowledgeBaseEntry,
  SearchQuery,
  SearchResult,
  QuestionRequest,
  AnswerResponse,
  DocumentUploadRequest
} from './knowledgeBaseService'

// AI Monitoring Services
export { aiMonitoringService, AIMonitoringService } from './aiMonitoringService'
export type {
  AIMetric,
  AIAlert,
  ProviderStatus,
  ServiceMetrics,
  ModelUsage,
  CostAnalytics,
  PerformanceDashboard
} from './aiMonitoringService'

// Collaboration Services
export { collaborationService, default as CollaborationService } from './collaborationService'
export type {
  TeamMember,
  ActivityItem,
  Comment,
  Task,
  Message,
  DocumentSection,
  FileUpload,
  NotificationItem,
  VideoCallSession
} from '../../types/collaboration'

// Workflow Services
export { WorkflowService } from './workflowService'
export type {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowTaskInstance,
  AutomationRule,
  WorkflowAnalytics,
  WorkflowMetrics
} from '../../types/workflow'

// Version Control Services
export { VersionControlService } from './versionControlService'
export type {
  DocumentRepository,
  DocumentBranch,
  DocumentCommit,
  PullRequest,
  MergeOperation,
  ComparisonResult,
  VersionControlAnalytics
} from '../../types/versionControl'

// Central API configuration
export const API_CONFIG = {
  baseUrl: process.env.NODE_ENV === 'production' 
    ? 'https://grants.etownz.com' 
    : 'http://localhost:8000',
  timeout: 30000,
  retries: 3
}

// Generic API service for components that need basic HTTP client
export const apiService = {
  async get(endpoint: string) {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      headers: apiUtils.getAuthHeaders()
    });
    return { data: await response.json() };
  },
  
  async post(endpoint: string, data: any) {
    const response = await fetch(`${API_CONFIG.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: apiUtils.getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return { data: await response.json() };
  }
}

// Also export as apiClient for backward compatibility
export const apiClient = apiService

// Utility functions for API interactions
export const apiUtils = {
  /**
   * Get authorization headers if user is logged in
   */
  getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token')
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }
    
    return headers
  },

  /**
   * Handle API errors consistently
   */
  handleApiError(error: any, context: string): Error {
    console.error(`API Error in ${context}:`, error)
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new Error('Network error - please check your connection')
    }
    
    if (error.status === 401) {
      // Handle unauthorized - redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/auth/login'
      }
      return new Error('Authentication required')
    }
    
    if (error.status === 403) {
      return new Error('Access denied - insufficient permissions')
    }
    
    if (error.status === 429) {
      return new Error('Rate limit exceeded - please try again later')
    }
    
    if (error.status >= 500) {
      return new Error('Server error - please try again later')
    }
    
    return error instanceof Error ? error : new Error(String(error))
  },

  /**
   * Format processing time for display
   */
  formatProcessingTime(timeMs: number): string {
    if (timeMs < 1000) return `${timeMs}ms`
    if (timeMs < 60000) return `${(timeMs / 1000).toFixed(1)}s`
    if (timeMs < 3600000) return `${(timeMs / 60000).toFixed(1)}m`
    return `${(timeMs / 3600000).toFixed(1)}h`
  },

  /**
   * Debounce function for search inputs
   */
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func(...args), wait)
    }
  },

  /**
   * Retry API call with exponential backoff
   */
  async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
        return this.retry(fn, retries - 1, delay * 2)
      }
      throw error
    }
  }
}

// Export commonly used types and constants
export const AI_MODELS = {
  EMBEDDING: 'text-embedding-3-small',
  CHAT: 'gpt-4o-mini',
  ANALYSIS: 'gpt-4o-mini'
} as const

export const GRANT_CATEGORIES = [
  'Research & Development',
  'Community Development', 
  'Education & STEM',
  'Innovation',
  'Entrepreneurship',
  'Technology',
  'Healthcare',
  'Environment',
  'Arts & Culture',
  'Social Enterprise'
] as const

export const ORGANIZATION_SIZES = [
  'startup',
  'small',
  'medium', 
  'large',
  'enterprise'
] as const

export const JOB_TYPES = [
  'full_crawl',
  'targeted_scrape',
  'document_harvest',
  'link_discovery'
] as const

export const JOB_STATUSES = [
  'pending',
  'running',
  'completed',
  'failed',
  'paused'
] as const