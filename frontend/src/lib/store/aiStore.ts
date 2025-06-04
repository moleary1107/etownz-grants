/**
 * AI Store - Global state management for AI results and interactions
 * Provides persistence across components and pages
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Types for AI results and interactions
export interface AISearchResult {
  id: string
  query: string
  type: 'semantic' | 'match' | 'analysis'
  results: unknown[]
  metadata: {
    processingTime: number
    timestamp: string
    model: string
    confidence?: number
  }
  organizationProfile?: Record<string, unknown>
  filters?: Record<string, unknown>
}

export interface GrantAnalysis {
  grantId: string
  organizationId: string
  analysis: {
    overallCompatibility: number
    eligibilityStatus: 'ELIGIBLE' | 'PARTIALLY_ELIGIBLE' | 'NOT_ELIGIBLE' | 'UNCLEAR'
    matchingCriteria: Array<{
      criterion: string
      matches: boolean
      score: number
      explanation: string
    }>
    recommendations: string[]
    reasoning: string
    confidence: number
  }
  processingTime: number
  timestamp: string
}

export interface ApplicationData {
  id: string
  grantId: string
  organizationId: string
  status: 'draft' | 'in_progress' | 'review' | 'submitted' | 'approved' | 'rejected'
  sections: Record<string, unknown>
  aiSuggestions: Record<string, unknown>
  checklist: Array<{
    id: string
    requirement: string
    completed: boolean
    aiGenerated?: boolean
    content?: string
  }>
  documents: Array<{
    id: string
    name: string
    type: string
    url: string
    aiGenerated?: boolean
  }>
  createdAt: string
  updatedAt: string
}

interface AIStore {
  // Search results
  searchHistory: AISearchResult[]
  currentSearch: AISearchResult | null
  
  // Grant analyses
  grantAnalyses: Record<string, GrantAnalysis>
  
  // Application data
  applications: Record<string, ApplicationData>
  currentApplication: ApplicationData | null
  
  // AI preferences
  preferences: {
    defaultModel: string
    autoSave: boolean
    shareAcrossOrganization: boolean
    rateLimitRemaining: number
    rateLimitReset: string
  }
  
  // Actions for search results
  addSearchResult: (result: AISearchResult) => void
  setCurrentSearch: (result: AISearchResult | null) => void
  getSearchByQuery: (query: string) => AISearchResult | undefined
  clearSearchHistory: () => void
  
  // Actions for grant analyses
  addGrantAnalysis: (analysis: GrantAnalysis) => void
  getGrantAnalysis: (grantId: string, organizationId: string) => GrantAnalysis | undefined
  
  // Actions for applications
  createApplication: (grantId: string, organizationId: string) => ApplicationData
  updateApplication: (id: string, updates: Partial<ApplicationData>) => void
  setCurrentApplication: (application: ApplicationData | null) => void
  getApplication: (id: string) => ApplicationData | undefined
  
  // Actions for preferences
  updatePreferences: (preferences: Partial<AIStore['preferences']>) => void
  
  // Persistence actions
  clearAllData: () => void
  exportData: () => string
  importData: (data: string) => void
}

export const useAIStore = create<AIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      searchHistory: [],
      currentSearch: null,
      grantAnalyses: {},
      applications: {},
      currentApplication: null,
      preferences: {
        defaultModel: 'gpt-4o-mini',
        autoSave: true,
        shareAcrossOrganization: false,
        rateLimitRemaining: 100,
        rateLimitReset: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
      },
      
      // Search result actions
      addSearchResult: (result) => set((state) => ({
        searchHistory: [result, ...state.searchHistory.slice(0, 49)], // Keep last 50 searches
        currentSearch: result
      })),
      
      setCurrentSearch: (result) => set({ currentSearch: result }),
      
      getSearchByQuery: (query) => {
        const state = get()
        return state.searchHistory.find(search => 
          search.query.toLowerCase() === query.toLowerCase()
        )
      },
      
      clearSearchHistory: () => set({ searchHistory: [], currentSearch: null }),
      
      // Grant analysis actions
      addGrantAnalysis: (analysis) => set((state) => ({
        grantAnalyses: {
          ...state.grantAnalyses,
          [`${analysis.grantId}_${analysis.organizationId}`]: analysis
        }
      })),
      
      getGrantAnalysis: (grantId, organizationId) => {
        const state = get()
        return state.grantAnalyses[`${grantId}_${organizationId}`]
      },
      
      // Application actions
      createApplication: (grantId, organizationId) => {
        const id = `app_${grantId}_${organizationId}_${Date.now()}`
        const application: ApplicationData = {
          id,
          grantId,
          organizationId,
          status: 'draft',
          sections: {},
          aiSuggestions: {},
          checklist: [],
          documents: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        set((state) => ({
          applications: {
            ...state.applications,
            [id]: application
          },
          currentApplication: application
        }))
        
        return application
      },
      
      updateApplication: (id, updates) => set((state) => {
        const existingApp = state.applications[id]
        if (!existingApp) return state
        
        const updatedApp = {
          ...existingApp,
          ...updates,
          updatedAt: new Date().toISOString()
        }
        
        return {
          applications: {
            ...state.applications,
            [id]: updatedApp
          },
          currentApplication: state.currentApplication?.id === id ? updatedApp : state.currentApplication
        }
      }),
      
      setCurrentApplication: (application) => set({ currentApplication: application }),
      
      getApplication: (id) => {
        const state = get()
        return state.applications[id]
      },
      
      // Preferences actions
      updatePreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences }
      })),
      
      // Persistence actions
      clearAllData: () => set({
        searchHistory: [],
        currentSearch: null,
        grantAnalyses: {},
        applications: {},
        currentApplication: null
      }),
      
      exportData: () => {
        const state = get()
        return JSON.stringify({
          searchHistory: state.searchHistory,
          grantAnalyses: state.grantAnalyses,
          applications: state.applications,
          preferences: state.preferences
        })
      },
      
      importData: (data) => {
        try {
          const parsed = JSON.parse(data)
          set((state) => ({
            ...state,
            ...parsed
          }))
        } catch (error) {
          console.error('Failed to import AI store data:', error)
        }
      }
    }),
    {
      name: 'ai-store',
      partialize: (state) => ({
        searchHistory: state.searchHistory,
        grantAnalyses: state.grantAnalyses,
        applications: state.applications,
        preferences: state.preferences
      })
    }
  )
)

// Hooks for specific store sections - using stable selectors to prevent infinite loops
export const useSearchHistory = () => {
  const searchHistory = useAIStore((state) => state.searchHistory)
  const currentSearch = useAIStore((state) => state.currentSearch)
  const addSearchResult = useAIStore((state) => state.addSearchResult)
  const setCurrentSearch = useAIStore((state) => state.setCurrentSearch)
  const getSearchByQuery = useAIStore((state) => state.getSearchByQuery)
  const clearSearchHistory = useAIStore((state) => state.clearSearchHistory)
  
  return {
    searchHistory,
    currentSearch,
    addSearchResult,
    setCurrentSearch,
    getSearchByQuery,
    clearSearchHistory
  }
}

export const useGrantAnalyses = () => {
  const grantAnalyses = useAIStore((state) => state.grantAnalyses)
  const addGrantAnalysis = useAIStore((state) => state.addGrantAnalysis)
  const getGrantAnalysis = useAIStore((state) => state.getGrantAnalysis)
  
  return {
    grantAnalyses,
    addGrantAnalysis,
    getGrantAnalysis
  }
}

export const useApplications = () => {
  const applications = useAIStore((state) => state.applications)
  const currentApplication = useAIStore((state) => state.currentApplication)
  const createApplication = useAIStore((state) => state.createApplication)
  const updateApplication = useAIStore((state) => state.updateApplication)
  const setCurrentApplication = useAIStore((state) => state.setCurrentApplication)
  const getApplication = useAIStore((state) => state.getApplication)
  
  return {
    applications,
    currentApplication,
    createApplication,
    updateApplication,
    setCurrentApplication,
    getApplication
  }
}

export const useAIPreferences = () => {
  const preferences = useAIStore((state) => state.preferences)
  const updatePreferences = useAIStore((state) => state.updatePreferences)
  
  return {
    preferences,
    updatePreferences
  }
}