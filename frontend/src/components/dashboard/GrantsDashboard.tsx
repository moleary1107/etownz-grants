"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Search, 
  MapPin,
  Clock,
  ExternalLink,
  BookmarkPlus,
  Star,
  Zap,
  Loader2,
  AlertCircle
} from "lucide-react"
import { User } from "../../../lib/auth"
import { grantsService, aiService, Grant as APIGrant, OrganizationProfile } from "../../../lib/api"
import { useSearchHistory, useGrantAnalyses, AISearchResult } from "../../../lib/store/aiStore"
import { GrantCardSkeleton } from "../../../components/ui/loading-skeleton"

// Use the API Grant type and extend it with UI-specific properties
interface Grant extends APIGrant {
  // UI-specific properties
  isFavorite?: boolean
  matchScore?: number
  provider?: string
  providerType?: 'government' | 'council' | 'eu' | 'foundation'
  location?: string
  eligibility?: string[]
  category?: string
}

export default function GrantsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [grants, setGrants] = useState<Grant[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedProvider, setSelectedProvider] = useState("all")
  const [sortBy, setSortBy] = useState("deadline")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [aiSearchMode, setAiSearchMode] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const router = useRouter()
  
  // AI Store hooks
  const {
    addSearchResult,
    setCurrentSearch,
    getSearchByQuery
  } = useSearchHistory()
  
  const { } = useGrantAnalyses()

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)
      loadGrants()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router, loadGrants])

  const loadGrants = useCallback(async (useAI: boolean = false) => {
    try {
      setIsLoading(true)
      setError(null)
      
      if (useAI && user) {
        // Check if we have cached results for this query
        const cachedSearch = getSearchByQuery(`ai_match_${selectedCategory}`)
        if (cachedSearch && Date.now() - new Date(cachedSearch.metadata.timestamp).getTime() < 300000) { // 5 min cache
          setGrants(transformAIResults(cachedSearch.results))
          setProcessingTime(cachedSearch.metadata.processingTime)
          setAiSearchMode(true)
          setCurrentSearch(cachedSearch)
          return
        }
        
        // Use AI-powered grant matching
        setAiProcessing(true)
        
        // Create organization profile from user data
        const orgProfile: OrganizationProfile = {
          id: user.id,
          name: user.name,
          description: `Organization for ${user.name}`,
          sector: 'technology', // Default - could be from user profile
          size: 'small',
          location: 'ireland'
        }

        const startTime = Date.now()
        const response = await aiService.matchGrants(orgProfile, {
          categories: selectedCategory !== 'all' ? [selectedCategory] : undefined
        }, 20)
        
        const processingTimeMs = Date.now() - startTime
        setProcessingTime(processingTimeMs)
        
        // Store search result in AI store
        const searchResult: AISearchResult = {
          id: `ai_match_${Date.now()}`,
          query: `ai_match_${selectedCategory}`,
          type: 'match',
          results: response.matches,
          metadata: {
            processingTime: processingTimeMs,
            timestamp: new Date().toISOString(),
            model: response.aiModel || 'gpt-4o-mini',
            confidence: response.metadata?.confidence
          },
          organizationProfile: orgProfile as Record<string, unknown>,
          filters: { categories: selectedCategory !== 'all' ? [selectedCategory] : undefined }
        }
        addSearchResult(searchResult)
        
        // Transform AI results to Grant interface
        const aiGrants = transformAIResults(response.matches)
        setGrants(aiGrants)
        setAiSearchMode(true)
      } else {
        // Use traditional grants API
        const filters = {
          search: searchTerm || undefined,
          categories: selectedCategory !== 'all' ? [selectedCategory] : undefined,
          sort_by: sortBy as string,
          limit: 50
        }

        const response = await grantsService.getGrants(filters)
        
        // Transform API results to Grant interface
        const apiGrants: Grant[] = response.grants.map(grant => ({
          ...grant,
          provider: grant.funder || 'Unknown',
          providerType: getProviderType(grant.funder_type),
          location: 'Ireland', // Default
          eligibility: extractEligibility(grant.eligibility_criteria),
          category: grant.categories?.[0] || 'General',
          isFavorite: false,
          matchScore: undefined,
          deadline: grant.deadline ? new Date(grant.deadline) : undefined,
          amount: {
            min: grant.amount_min || 0,
            max: grant.amount_max || 0,
            currency: grant.currency || 'EUR'
          }
        }))

        setGrants(apiGrants)
        setAiSearchMode(false)
      }
    } catch (error) {
      console.error('Error loading grants:', error)
      setError(error instanceof Error ? error.message : 'Failed to load grants')
    } finally {
      setIsLoading(false)
      setAiProcessing(false)
    }
  }, [selectedCategory, selectedProvider, sortBy, searchTerm, user, getSearchByQuery, addSearchResult, setCurrentSearch, transformAIResults])
  
  const transformAIResults = (matches: Array<{ grant: Grant; score: number }>): Grant[] => {
    return matches.map(match => ({
      ...match.grant,
      provider: match.grant.funder || 'Unknown',
      providerType: getProviderType(match.grant.funder_type),
      location: 'Ireland', // Default
      eligibility: extractEligibility(match.grant.eligibility_criteria),
      category: match.grant.categories?.[0] || 'General',
      isFavorite: false,
      matchScore: Math.round(match.matchScore),
      deadline: match.grant.deadline ? new Date(match.grant.deadline) : undefined,
      amount: {
        min: match.grant.amount_min || 0,
        max: match.grant.amount_max || 0,
        currency: match.grant.currency || 'EUR'
      }
    }))
  }

  // Helper function to determine provider type
  const getProviderType = (funderType?: string): 'government' | 'council' | 'eu' | 'foundation' => {
    if (!funderType) return 'government'
    const type = funderType.toLowerCase()
    if (type.includes('eu') || type.includes('european')) return 'eu'
    if (type.includes('council') || type.includes('city')) return 'council'
    if (type.includes('foundation') || type.includes('private')) return 'foundation'
    return 'government'
  }

  // Helper function to extract eligibility criteria
  const extractEligibility = (criteria?: Record<string, unknown>): string[] => {
    if (!criteria) return []
    const eligibilityList: string[] = []
    
    if (criteria.sector && typeof criteria.sector === 'string') eligibilityList.push(criteria.sector)
    if (criteria.stage && typeof criteria.stage === 'string') eligibilityList.push(criteria.stage)
    if (criteria.size && typeof criteria.size === 'string') eligibilityList.push(criteria.size)
    if (criteria.location && typeof criteria.location === 'string') eligibilityList.push(criteria.location)
    
    return eligibilityList.length > 0 ? eligibilityList : ['General']
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const toggleFavorite = (grantId: string) => {
    setGrants(prevGrants =>
      prevGrants.map(grant =>
        grant.id === grantId
          ? { ...grant, isFavorite: !grant.isFavorite }
          : grant
      )
    )
  }

  const formatAmount = (grant: Grant) => {
    if (!grant.amount || (!grant.amount.min && !grant.amount.max)) {
      return 'Amount not specified'
    }
    
    const currency = grant.amount.currency === 'EUR' ? '€' : '$'
    
    if (grant.amount.min === grant.amount.max) {
      return `${currency}${grant.amount.min.toLocaleString()}`
    }
    
    if (grant.amount.min && grant.amount.max) {
      return `${currency}${grant.amount.min.toLocaleString()} - ${currency}${grant.amount.max.toLocaleString()}`
    }
    
    if (grant.amount.min) {
      return `From ${currency}${grant.amount.min.toLocaleString()}`
    }
    
    if (grant.amount.max) {
      return `Up to ${currency}${grant.amount.max.toLocaleString()}`
    }
    
    return 'Amount not specified'
  }

  const getProviderColor = (type: Grant['providerType']) => {
    switch (type) {
      case 'government': return 'bg-blue-100 text-blue-800'
      case 'council': return 'bg-green-100 text-green-800'
      case 'eu': return 'bg-purple-100 text-purple-800'
      case 'foundation': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDaysUntilDeadline = (deadline?: Date) => {
    if (!deadline) return 0
    const today = new Date()
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  // Add semantic search functionality
  const performSemanticSearch = async () => {
    if (!searchTerm.trim()) {
      loadGrants(false)
      return
    }

    try {
      // Check if we have cached results for this exact query
      const cachedSearch = getSearchByQuery(searchTerm)
      if (cachedSearch && Date.now() - new Date(cachedSearch.metadata.timestamp).getTime() < 600000) { // 10 min cache
        setGrants(transformSemanticResults(cachedSearch.results))
        setProcessingTime(cachedSearch.metadata.processingTime)
        setAiSearchMode(true)
        setCurrentSearch(cachedSearch)
        return
      }
      
      setAiProcessing(true)
      setError(null)
      
      const startTime = Date.now()
      const response = await aiService.semanticSearch(
        searchTerm,
        user?.id,
        {
          categories: selectedCategory !== 'all' ? [selectedCategory] : undefined
        },
        20
      )
      
      const processingTimeMs = Date.now() - startTime
      setProcessingTime(processingTimeMs)
      
      // Store search result in AI store
      const searchResult: AISearchResult = {
        id: `semantic_${Date.now()}`,
        query: searchTerm,
        type: 'semantic',
        results: response.results,
        metadata: {
          processingTime: processingTimeMs,
          timestamp: new Date().toISOString(),
          model: 'text-embedding-3-small'
        },
        filters: {
          categories: selectedCategory !== 'all' ? [selectedCategory] : undefined
        }
      }
      addSearchResult(searchResult)
      
      // Transform semantic search results to Grant interface
      const semanticGrants = transformSemanticResults(response.results)
      setGrants(semanticGrants)
      setAiSearchMode(true)
    } catch (error) {
      console.error('Semantic search error:', error)
      setError(error instanceof Error ? error.message : 'Semantic search failed')
    } finally {
      setAiProcessing(false)
    }
  }
  
  const transformSemanticResults = (results: Array<{ id: string; title: string; content: string; score: number }>): Grant[] => {
    return results.map((result) => ({
      id: result.id,
      title: result.title,
      description: result.content,
      summary: result.content.substring(0, 200) + '...',
      provider: result.metadata?.funder || 'Unknown',
      providerType: getProviderType(result.metadata?.funder_type),
      location: result.metadata?.location || 'Ireland',
      eligibility: extractEligibility(result.metadata?.eligibility_criteria),
      category: result.metadata?.categories?.[0] || 'General',
      url: result.metadata?.url || '#',
      isFavorite: false,
      matchScore: Math.round(result.similarity * 100),
      amount: {
        min: result.metadata?.amount_min || 0,
        max: result.metadata?.amount_max || 0,
        currency: result.metadata?.currency || 'EUR'
      },
      deadline: result.metadata?.deadline ? new Date(result.metadata.deadline) : undefined,
      funder: result.metadata?.funder,
      categories: result.metadata?.categories,
      eligibility_criteria: result.metadata?.eligibility_criteria,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    }))
  }

  const filteredGrants = grants.filter(grant => {
    // Skip client-side filtering for AI search results if using semantic search
    if (aiSearchMode && !searchTerm) {
      const matchesCategory = selectedCategory === 'all' || grant.category === selectedCategory
      const matchesProvider = selectedProvider === 'all' || grant.providerType === selectedProvider
      return matchesCategory && matchesProvider
    }
    
    const matchesSearch = grant.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (grant.description && grant.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (grant.provider && grant.provider.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || grant.category === selectedCategory
    const matchesProvider = selectedProvider === 'all' || grant.providerType === selectedProvider
    
    return matchesSearch && matchesCategory && matchesProvider
  }).sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        if (!a.deadline || !b.deadline) return 0
        return a.deadline.getTime() - b.deadline.getTime()
      case 'amount':
        const aMax = a.amount?.max || 0
        const bMax = b.amount?.max || 0
        return bMax - aMax
      case 'match':
        const aMatch = a.matchScore || 0
        const bMatch = b.matchScore || 0
        return bMatch - aMatch
      default:
        return 0
    }
  })

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Grant Discovery
                  {aiSearchMode && (
                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Zap className="w-3 h-3 mr-1" />
                      AI-Powered
                    </span>
                  )}
                </h1>
                <p className="text-gray-600">
                  {aiSearchMode 
                    ? 'AI-powered grant matching and semantic search results'
                    : 'Discover funding opportunities tailored to your organization'
                  }
                </p>
                {processingTime && (
                  <p className="text-sm text-gray-500 mt-1">
                    Processed in {processingTime}ms
                  </p>
                )}
              </div>
              {error && (
                <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-md">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search grants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                <option value="Research & Development">Research & Development</option>
                <option value="Community Development">Community Development</option>
                <option value="Education & STEM">Education & STEM</option>
                <option value="Innovation">Innovation</option>
                <option value="Entrepreneurship">Entrepreneurship</option>
              </select>
              
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Providers</option>
                <option value="government">Government</option>
                <option value="council">Local Council</option>
                <option value="eu">EU</option>
                <option value="foundation">Foundation</option>
              </select>
            </div>
            
            {/* AI Search Controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => loadGrants(true)}
                  disabled={aiProcessing || !user}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  size="sm"
                >
                  {aiProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  AI Match
                </Button>
                
                <Button
                  onClick={performSemanticSearch}
                  disabled={aiProcessing || !searchTerm.trim()}
                  variant="outline"
                  size="sm"
                >
                  {aiProcessing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4 mr-2" />
                  )}
                  Semantic Search
                </Button>
                
                <Button
                  onClick={() => loadGrants(false)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600"
                >
                  Clear AI
                </Button>
              </div>
              
              <div className="text-sm text-gray-600">
                {filteredGrants.length} grants found
                {aiSearchMode && (
                  <span className="ml-2 text-blue-600 font-medium">
                    (AI-powered)
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-sm border border-gray-300 bg-white text-gray-900 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="deadline">Deadline</option>
                  <option value="amount">Funding Amount</option>
                  {aiSearchMode && <option value="match">Match Score</option>}
                </select>
              </div>
              
              {aiProcessing && (
                <div className="flex items-center text-blue-600 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing with AI...
                </div>
              )}
            </div>
          </div>

          {/* Grants Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <GrantCardSkeleton key={index} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredGrants.map((grant) => {
              const daysLeft = getDaysUntilDeadline(grant.deadline)
              const isUrgent = daysLeft <= 7

              return (
                <Card key={grant.id} className="relative hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getProviderColor(grant.providerType)}`}>
                            {grant.providerType}
                          </span>
                          {grant.matchScore !== undefined && (
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 text-yellow-500" />
                              <span className="text-xs text-gray-600">{grant.matchScore}% match</span>
                            </div>
                          )}
                          {aiSearchMode && (
                            <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              <Zap className="w-3 h-3 inline mr-1" />
                              AI
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">{grant.title}</CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {grant.provider}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleFavorite(grant.id)}
                        className="ml-2"
                      >
                        <BookmarkPlus 
                          className={`h-4 w-4 ${grant.isFavorite ? 'text-blue-600 fill-current' : 'text-gray-400'}`} 
                        />
                      </Button>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-gray-700 mb-4 line-clamp-3">
                      {grant.description}
                    </p>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-green-600">
                            {formatAmount(grant)}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{grant.location}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {grant.eligibility.slice(0, 2).map((criteria, index) => (
                          <span 
                            key={index}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                          >
                            {criteria}
                          </span>
                        ))}
                        {grant.eligibility.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                            +{grant.eligibility.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        className="flex-1" 
                        size="sm"
                        onClick={() => router.push(`/dashboard/applications/create?grantId=${grant.id}`)}
                      >
                        Apply Now
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <a href={grant.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            </div>
          )}

          {filteredGrants.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Search className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No grants found</h3>
              <p className="text-gray-600">
                Try adjusting your search criteria or filters to find more opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}