"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Brain,
  Target,
  TrendingUp,
  Star,
  Clock,
  Calendar,
  DollarSign,
  Building,
  Users,
  Zap,
  RefreshCw,
  Filter,
  Search,
  Eye,
  Bookmark,
  Heart,
  ThumbsUp,
  ThumbsDown,
  ArrowRight,
  Info,
  Lightbulb,
  Award,
  MapPin,
  Globe,
  ChevronRight,
  Sparkles,
  BarChart3,
  Settings,
  Bell,
  CheckCircle,
  AlertTriangle,
  FileText,
  ExternalLink,
  Copy,
  Share2,
  Download
} from 'lucide-react'
import { User } from '../../lib/auth'

interface GrantRecommendation {
  id: string
  title: string
  funder: string
  description: string
  deadline: Date
  amount: {
    min: number
    max: number
    currency: string
  }
  categories: string[]
  eligibilityScore: number
  matchScore: number
  competitionLevel: 'low' | 'medium' | 'high'
  applicationComplexity: 'simple' | 'moderate' | 'complex'
  confidenceScore: number
  reasonsForMatch: string[]
  potentialChallenges: string[]
  applicationUrl: string
  estimatedEffort: number // hours
  successProbability: number
  fundingHistory: {
    totalAwarded: number
    successRate: number
    averageAward: number
  }
  location: {
    regions: string[]
    isGlobal: boolean
  }
  aiInsights: {
    strengthScore: number
    improvementAreas: string[]
    strategicAdvice: string[]
    timing: 'excellent' | 'good' | 'fair' | 'poor'
  }
  similarSuccessfulApplications: {
    count: number
    examples: string[]
  }
  bookmarked: boolean
  feedback?: 'relevant' | 'not_relevant'
}

interface UserProfile {
  id: string
  name: string
  organizationType: 'startup' | 'sme' | 'large_enterprise' | 'non_profit' | 'academic' | 'government'
  sectors: string[]
  fundingHistory: {
    totalReceived: number
    applicationCount: number
    successRate: number
  }
  preferences: {
    fundingRange: { min: number; max: number }
    applicationComplexity: string[]
    preferredFunders: string[]
    excludedCategories: string[]
  }
  projectTypes: string[]
  teamSize: number
  location: string
  experience: 'beginner' | 'intermediate' | 'expert'
}

interface RecommendationFilters {
  categories: string[]
  fundingRange: { min: number; max: number }
  deadline: 'all' | '30_days' | '60_days' | '90_days'
  competitionLevel: string[]
  complexity: string[]
  minMatchScore: number
}

interface PersonalizedGrantRecommendationsProps {
  user: User
  onRecommendationBookmark?: (recommendationId: string, bookmarked: boolean) => void
  onRecommendationFeedback?: (recommendationId: string, feedback: 'relevant' | 'not_relevant') => void
  className?: string
}

export function PersonalizedGrantRecommendations({ 
  user, 
  onRecommendationBookmark,
  onRecommendationFeedback,
  className = "" 
}: PersonalizedGrantRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<GrantRecommendation[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [currentView, setCurrentView] = useState<'recommendations' | 'profile' | 'analytics'>('recommendations')
  const [filters, setFilters] = useState<RecommendationFilters>({
    categories: [],
    fundingRange: { min: 0, max: 1000000 },
    deadline: 'all',
    competitionLevel: [],
    complexity: [],
    minMatchScore: 0
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'match_score' | 'deadline' | 'amount' | 'success_probability'>('match_score')

  // Initialize with mock data
  useEffect(() => {
    loadUserProfile()
    loadRecommendations()
  }, [])

  const loadUserProfile = useCallback(async () => {
    // Mock user profile based on authenticated user
    const mockProfile: UserProfile = {
      id: user.id,
      name: user.name,
      organizationType: 'startup',
      sectors: ['Technology', 'Innovation', 'Software Development'],
      fundingHistory: {
        totalReceived: 150000,
        applicationCount: 8,
        successRate: 37.5
      },
      preferences: {
        fundingRange: { min: 25000, max: 250000 },
        applicationComplexity: ['moderate'],
        preferredFunders: ['Enterprise Ireland', 'Science Foundation Ireland'],
        excludedCategories: ['Agriculture']
      },
      projectTypes: ['R&D', 'Product Development', 'Market Expansion'],
      teamSize: 12,
      location: 'Dublin, Ireland',
      experience: 'intermediate'
    }
    setUserProfile(mockProfile)
  }, [user])

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true)
    
    // Simulate AI recommendation generation
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const mockRecommendations: GrantRecommendation[] = [
      {
        id: 'rec-001',
        title: 'Enterprise Ireland High Potential Start-Up (HPSU) Fund',
        funder: 'Enterprise Ireland',
        description: 'Funding for high-growth potential start-ups with innovative products and global market ambitions. Focus on technology commercialization and international expansion.',
        deadline: new Date('2024-08-15'),
        amount: { min: 50000, max: 500000, currency: 'EUR' },
        categories: ['Innovation', 'Technology', 'Startup'],
        eligibilityScore: 92,
        matchScore: 89,
        competitionLevel: 'high',
        applicationComplexity: 'complex',
        confidenceScore: 94,
        reasonsForMatch: [
          'Perfect alignment with your startup profile and technology focus',
          'Your team size (12) meets their scaling requirements',
          'Dublin location provides access to their mentor network',
          'Previous funding history demonstrates growth potential'
        ],
        potentialChallenges: [
          'Highly competitive with 200+ applications typically',
          'Requires detailed international market analysis',
          'Strict milestone and reporting requirements'
        ],
        applicationUrl: 'https://enterprise-ireland.com/hpsu',
        estimatedEffort: 80,
        successProbability: 68,
        fundingHistory: {
          totalAwarded: 45000000,
          successRate: 15,
          averageAward: 185000
        },
        location: {
          regions: ['Ireland'],
          isGlobal: false
        },
        aiInsights: {
          strengthScore: 85,
          improvementAreas: [
            'Strengthen international market validation',
            'Develop clearer IP strategy',
            'Enhance financial projections detail'
          ],
          strategicAdvice: [
            'Apply in Q2 for better success rates historically',
            'Partner with established mentor from their network',
            'Focus on scalability metrics in your pitch'
          ],
          timing: 'excellent'
        },
        similarSuccessfulApplications: {
          count: 23,
          examples: [
            'TechCorp raised €350K for AI platform expansion',
            'DataFlow secured €280K for European market entry'
          ]
        },
        bookmarked: false
      },
      {
        id: 'rec-002',
        title: 'Horizon Europe EIC Accelerator',
        funder: 'European Commission',
        description: 'Supporting breakthrough innovations with significant commercial potential and positive impact. Focuses on deep-tech innovations ready for market deployment.',
        deadline: new Date('2024-09-22'),
        amount: { min: 500000, max: 2500000, currency: 'EUR' },
        categories: ['Deep Tech', 'Innovation', 'European'],
        eligibilityScore: 78,
        matchScore: 82,
        competitionLevel: 'high',
        applicationComplexity: 'complex',
        confidenceScore: 85,
        reasonsForMatch: [
          'Strong innovation profile matches deep-tech focus',
          'EU market expansion aligns with program goals',
          'Technology readiness level appears suitable'
        ],
        potentialChallenges: [
          'Extremely competitive European-wide program',
          'Requires proven commercial traction',
          'Complex application process with multiple stages'
        ],
        applicationUrl: 'https://eic.ec.europa.eu/eic-funding-opportunities/eic-accelerator_en',
        estimatedEffort: 120,
        successProbability: 12,
        fundingHistory: {
          totalAwarded: 1200000000,
          successRate: 8,
          averageAward: 1800000
        },
        location: {
          regions: ['European Union'],
          isGlobal: false
        },
        aiInsights: {
          strengthScore: 72,
          improvementAreas: [
            'Demonstrate clear commercial traction',
            'Strengthen European market strategy',
            'Enhance technology differentiation narrative'
          ],
          strategicAdvice: [
            'Consider applying in 2025 after building more traction',
            'Partner with established European companies',
            'Focus on societal impact metrics'
          ],
          timing: 'fair'
        },
        similarSuccessfulApplications: {
          count: 5,
          examples: [
            'BioTech Solutions received €2.1M for medical device',
            'GreenEnergy secured €1.8M for sustainable technology'
          ]
        },
        bookmarked: true
      },
      {
        id: 'rec-003',
        title: 'Science Foundation Ireland Discover Programme',
        funder: 'Science Foundation Ireland',
        description: 'Supporting public engagement with STEM research and innovation. Perfect for organizations wanting to demonstrate societal impact of their technology.',
        deadline: new Date('2024-07-30'),
        amount: { min: 15000, max: 50000, currency: 'EUR' },
        categories: ['Research', 'Public Engagement', 'STEM'],
        eligibilityScore: 95,
        matchScore: 76,
        competitionLevel: 'medium',
        applicationComplexity: 'simple',
        confidenceScore: 91,
        reasonsForMatch: [
          'Excellent fit for demonstrating technology impact',
          'Simple application process suits your capacity',
          'Strong success rate for technology companies'
        ],
        potentialChallenges: [
          'Lower funding amount may not meet all needs',
          'Requires clear public engagement strategy',
          'Focus on education rather than commercial development'
        ],
        applicationUrl: 'https://sfi.ie/discover',
        estimatedEffort: 25,
        successProbability: 78,
        fundingHistory: {
          totalAwarded: 8500000,
          successRate: 45,
          averageAward: 32000
        },
        location: {
          regions: ['Ireland'],
          isGlobal: false
        },
        aiInsights: {
          strengthScore: 88,
          improvementAreas: [
            'Develop public engagement expertise',
            'Create measurable impact metrics'
          ],
          strategicAdvice: [
            'Excellent stepping stone to larger SFI grants',
            'Partner with educational institutions',
            'Document engagement activities for future applications'
          ],
          timing: 'excellent'
        },
        similarSuccessfulApplications: {
          count: 45,
          examples: [
            'TechEdu received €35K for STEM workshops',
            'InnovateLab got €42K for public tech demonstrations'
          ]
        },
        bookmarked: false
      }
    ]
    
    setRecommendations(mockRecommendations)
    setIsLoading(false)
  }, [])

  const generateNewRecommendations = async () => {
    setIsGenerating(true)
    
    // Simulate AI analysis and recommendation generation
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // In real implementation, this would call ML models
    await loadRecommendations()
    setIsGenerating(false)
  }

  const handleBookmark = (recommendationId: string) => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === recommendationId 
        ? { ...rec, bookmarked: !rec.bookmarked }
        : rec
    ))
    
    const recommendation = recommendations.find(r => r.id === recommendationId)
    if (recommendation && onRecommendationBookmark) {
      onRecommendationBookmark(recommendationId, !recommendation.bookmarked)
    }
  }

  const handleFeedback = (recommendationId: string, feedback: 'relevant' | 'not_relevant') => {
    setRecommendations(prev => prev.map(rec => 
      rec.id === recommendationId 
        ? { ...rec, feedback }
        : rec
    ))
    
    if (onRecommendationFeedback) {
      onRecommendationFeedback(recommendationId, feedback)
    }
  }

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations.filter(rec => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        const matchesSearch = 
          rec.title.toLowerCase().includes(searchLower) ||
          rec.funder.toLowerCase().includes(searchLower) ||
          rec.description.toLowerCase().includes(searchLower) ||
          rec.categories.some(cat => cat.toLowerCase().includes(searchLower))
        
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.categories.length > 0) {
        const hasMatchingCategory = rec.categories.some(cat => 
          filters.categories.includes(cat)
        )
        if (!hasMatchingCategory) return false
      }

      // Funding range filter
      if (rec.amount.max < filters.fundingRange.min || rec.amount.min > filters.fundingRange.max) {
        return false
      }

      // Deadline filter
      if (filters.deadline !== 'all') {
        const daysUntilDeadline = Math.ceil(
          (rec.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        
        const deadlineThresholds = {
          '30_days': 30,
          '60_days': 60,
          '90_days': 90
        }
        
        if (daysUntilDeadline > deadlineThresholds[filters.deadline]) {
          return false
        }
      }

      // Competition level filter
      if (filters.competitionLevel.length > 0 && !filters.competitionLevel.includes(rec.competitionLevel)) {
        return false
      }

      // Complexity filter
      if (filters.complexity.length > 0 && !filters.complexity.includes(rec.applicationComplexity)) {
        return false
      }

      // Match score filter
      if (rec.matchScore < filters.minMatchScore) {
        return false
      }

      return true
    })

    // Sort recommendations
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'match_score':
          return b.matchScore - a.matchScore
        case 'deadline':
          return a.deadline.getTime() - b.deadline.getTime()
        case 'amount':
          return b.amount.max - a.amount.max
        case 'success_probability':
          return b.successProbability - a.successProbability
        default:
          return 0
      }
    })
  }, [recommendations, searchQuery, filters, sortBy])

  const getMatchScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'complex': return 'bg-red-100 text-red-800'
      case 'moderate': return 'bg-yellow-100 text-yellow-800'
      case 'simple': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTimingColor = (timing: string) => {
    switch (timing) {
      case 'excellent': return 'text-green-600'
      case 'good': return 'text-blue-600'
      case 'fair': return 'text-yellow-600'
      case 'poor': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Sparkles className="h-6 w-6 mr-2 text-purple-600" />
            Personalized Grant Recommendations
          </h2>
          <p className="text-gray-600 mt-1">
            AI-powered grant discovery tailored to your profile and success patterns
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={generateNewRecommendations}
            disabled={isGenerating}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
            <span>{isGenerating ? 'Generating...' : 'Refresh'}</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('profile')}
            className={currentView === 'profile' ? 'bg-blue-50' : ''}
          >
            <Settings className="h-4 w-4 mr-1" />
            Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('analytics')}
            className={currentView === 'analytics' ? 'bg-blue-50' : ''}
          >
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </Button>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="profile">Profile & Preferences</TabsTrigger>
          <TabsTrigger value="analytics">Success Analytics</TabsTrigger>
        </TabsList>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          {/* Filters and Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search recommendations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="match_score">Best Match</option>
                  <option value="deadline">Deadline</option>
                  <option value="amount">Funding Amount</option>
                  <option value="success_probability">Success Rate</option>
                </select>

                {/* Quick Filters */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant={filters.minMatchScore > 80 ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      minMatchScore: prev.minMatchScore > 80 ? 0 : 80 
                    }))}
                  >
                    High Match
                  </Button>
                  <Button
                    variant={filters.deadline === '30_days' ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      deadline: prev.deadline === '30_days' ? 'all' : '30_days' 
                    }))}
                  >
                    Urgent
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommendations List */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredRecommendations.map((recommendation) => (
                <Card key={recommendation.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {recommendation.title}
                            </h3>
                            <p className="text-sm text-gray-600 flex items-center">
                              <Building className="w-4 h-4 mr-1" />
                              {recommendation.funder}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            <div className={`text-xl font-bold ${getMatchScoreColor(recommendation.matchScore)}`}>
                              {recommendation.matchScore}%
                            </div>
                            <div className="text-xs text-gray-500">match</div>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-gray-700 text-sm mb-4">
                          {recommendation.description}
                        </p>

                        {/* Key Metrics */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2 text-sm">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span>
                              {recommendation.amount.min.toLocaleString()} - {recommendation.amount.max.toLocaleString()} {recommendation.amount.currency}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span>{recommendation.deadline.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Target className="h-4 w-4 text-purple-600" />
                            <span>{recommendation.successProbability}% success rate</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="h-4 w-4 text-orange-600" />
                            <span>{recommendation.estimatedEffort}h effort</span>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-4">
                          {recommendation.categories.map((category, index) => (
                            <Badge key={index} variant="outline">{category}</Badge>
                          ))}
                          <Badge className={getCompetitionColor(recommendation.competitionLevel)}>
                            {recommendation.competitionLevel} competition
                          </Badge>
                          <Badge className={getComplexityColor(recommendation.applicationComplexity)}>
                            {recommendation.applicationComplexity} process
                          </Badge>
                          <Badge variant="outline" className={getTimingColor(recommendation.aiInsights.timing)}>
                            {recommendation.aiInsights.timing} timing
                          </Badge>
                        </div>

                        {/* AI Insights Preview */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div className="bg-green-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Why this matches
                            </h4>
                            <ul className="space-y-1">
                              {recommendation.reasonsForMatch.slice(0, 2).map((reason, index) => (
                                <li key={index} className="text-sm text-green-800">• {reason}</li>
                              ))}
                              {recommendation.reasonsForMatch.length > 2 && (
                                <li className="text-sm text-green-700">
                                  +{recommendation.reasonsForMatch.length - 2} more reasons
                                </li>
                              )}
                            </ul>
                          </div>
                          
                          <div className="bg-orange-50 p-3 rounded-lg">
                            <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Potential challenges
                            </h4>
                            <ul className="space-y-1">
                              {recommendation.potentialChallenges.slice(0, 2).map((challenge, index) => (
                                <li key={index} className="text-sm text-orange-800">• {challenge}</li>
                              ))}
                              {recommendation.potentialChallenges.length > 2 && (
                                <li className="text-sm text-orange-700">
                                  +{recommendation.potentialChallenges.length - 2} more challenges
                                </li>
                              )}
                            </ul>
                          </div>
                        </div>

                        {/* Success Examples */}
                        {recommendation.similarSuccessfulApplications.count > 0 && (
                          <div className="bg-blue-50 p-3 rounded-lg mb-4">
                            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                              <Award className="h-4 w-4 mr-1" />
                              Similar successful applications ({recommendation.similarSuccessfulApplications.count})
                            </h4>
                            <div className="space-y-1">
                              {recommendation.similarSuccessfulApplications.examples.map((example, index) => (
                                <p key={index} className="text-sm text-blue-800">• {example}</p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col space-y-2 ml-6">
                        <Button
                          size="sm"
                          onClick={() => window.open(recommendation.applicationUrl, '_blank')}
                          className="whitespace-nowrap"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Apply Now
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBookmark(recommendation.id)}
                          className={recommendation.bookmarked ? 'bg-yellow-50 border-yellow-300' : ''}
                        >
                          <Bookmark className={`h-4 w-4 ${recommendation.bookmarked ? 'text-yellow-600 fill-current' : ''}`} />
                        </Button>

                        <div className="flex space-x-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeedback(recommendation.id, 'relevant')}
                            className={recommendation.feedback === 'relevant' ? 'bg-green-50' : ''}
                          >
                            <ThumbsUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleFeedback(recommendation.id, 'not_relevant')}
                            className={recommendation.feedback === 'not_relevant' ? 'bg-red-50' : ''}
                          >
                            <ThumbsDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredRecommendations.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No recommendations found</h3>
                  <p className="text-gray-600 mb-4">
                    {searchQuery || Object.values(filters).some(f => f !== 'all' && f !== 0 && (Array.isArray(f) ? f.length > 0 : true))
                      ? 'Try adjusting your search criteria or filters'
                      : 'Generate new recommendations based on your updated profile'
                    }
                  </p>
                  <Button onClick={generateNewRecommendations}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Generate Recommendations
                  </Button>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {userProfile && (
            <div className="grid gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Profile</CardTitle>
                  <CardDescription>
                    Your profile helps us find the most relevant grant opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Organization:</strong> {userProfile.name}</div>
                        <div><strong>Type:</strong> {userProfile.organizationType}</div>
                        <div><strong>Location:</strong> {userProfile.location}</div>
                        <div><strong>Team Size:</strong> {userProfile.teamSize}</div>
                        <div><strong>Experience:</strong> {userProfile.experience}</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Funding History</h4>
                      <div className="space-y-2 text-sm">
                        <div><strong>Total Received:</strong> €{userProfile.fundingHistory.totalReceived.toLocaleString()}</div>
                        <div><strong>Applications:</strong> {userProfile.fundingHistory.applicationCount}</div>
                        <div><strong>Success Rate:</strong> {userProfile.fundingHistory.successRate}%</div>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Sectors</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.sectors.map((sector, index) => (
                          <Badge key={index} variant="outline">{sector}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Project Types</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.projectTypes.map((type, index) => (
                          <Badge key={index} variant="outline">{type}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Fine-tune your recommendations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-2">Funding Range</h4>
                      <div className="text-sm">
                        €{userProfile.preferences.fundingRange.min.toLocaleString()} - €{userProfile.preferences.fundingRange.max.toLocaleString()}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Application Complexity</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.preferences.applicationComplexity.map((complexity, index) => (
                          <Badge key={index} variant="outline">{complexity}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Preferred Funders</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.preferences.preferredFunders.map((funder, index) => (
                          <Badge key={index} variant="outline">{funder}</Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-2">Excluded Categories</h4>
                      <div className="flex flex-wrap gap-1">
                        {userProfile.preferences.excludedCategories.map((category, index) => (
                          <Badge key={index} className="bg-red-100 text-red-800">{category}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recommendation Performance</CardTitle>
                <CardDescription>
                  How well our AI recommendations match your interests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {recommendations.length}
                    </div>
                    <div className="text-sm text-gray-600">Total Recommendations</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {recommendations.filter(r => r.matchScore >= 80).length}
                    </div>
                    <div className="text-sm text-gray-600">High Match (80%+)</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">
                      {recommendations.filter(r => r.bookmarked).length}
                    </div>
                    <div className="text-sm text-gray-600">Bookmarked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      {Math.round(recommendations.reduce((sum, r) => sum + r.matchScore, 0) / recommendations.length)}%
                    </div>
                    <div className="text-sm text-gray-600">Avg Match Score</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Probability Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['High (70%+)', 'Medium (40-70%)', 'Low (<40%)'].map((range, index) => {
                    const counts = [
                      recommendations.filter(r => r.successProbability >= 70).length,
                      recommendations.filter(r => r.successProbability >= 40 && r.successProbability < 70).length,
                      recommendations.filter(r => r.successProbability < 40).length
                    ]
                    const percentage = recommendations.length > 0 ? (counts[index] / recommendations.length) * 100 : 0
                    
                    return (
                      <div key={range} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{range}</span>
                          <span>{counts[index]} grants ({Math.round(percentage)}%)</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}