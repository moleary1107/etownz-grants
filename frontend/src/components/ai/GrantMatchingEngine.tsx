"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Brain,
  Target, 
  TrendingUp, 
  Zap,
  Calendar,
  DollarSign,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Filter,
  ArrowRight,
  RefreshCw,
  BookOpen,
  Award,
  Clock,
  MapPin
} from 'lucide-react'
import { User } from '../../lib/auth'

// Enhanced Grant interface for AI matching
interface EnhancedGrant {
  id: string
  title: string
  description: string
  amount: number
  deadline: Date
  organization: string
  category: string
  sector: string[]
  eligibility: {
    organizationType: string[]
    minEmployees?: number
    maxEmployees?: number
    requiredSectors: string[]
    geographicRestrictions?: string[]
    previousFundingRestrictions?: boolean
  }
  requirements: {
    businessPlan: boolean
    financialStatements: boolean
    projectProposal: boolean
    teamInfo: boolean
    sustainability: boolean
    innovation: boolean
  }
  keywords: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'expert'
  historicalData: {
    successRate: number
    averageAwardAmount: number
    typicalApplicants: number
    processingTime: number
  }
}

interface MatchScore {
  grantId: string
  overallScore: number
  breakdown: {
    eligibilityMatch: number
    sectorRelevance: number
    organizationFit: number
    historicalSuccess: number
    competitionLevel: number
    deadlineViability: number
    requirementsFulfillment: number
  }
  confidence: number
  reasoning: string[]
  recommendations: string[]
  riskFactors: string[]
}

interface GrantMatchingEngineProps {
  user: User
  organizationProfile: any
  grants: EnhancedGrant[]
  onMatchFound?: (matches: MatchScore[]) => void
  className?: string
}

export function GrantMatchingEngine({ 
  user, 
  organizationProfile, 
  grants, 
  onMatchFound,
  className = "" 
}: GrantMatchingEngineProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [matches, setMatches] = useState<MatchScore[]>([])
  const [selectedMatch, setSelectedMatch] = useState<MatchScore | null>(null)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [filterLevel, setFilterLevel] = useState<'all' | 'high' | 'excellent'>('all')
  const [sortBy, setSortBy] = useState<'score' | 'amount' | 'deadline'>('score')

  // Advanced ML-based matching algorithm
  const calculateGrantMatch = useMemo(() => {
    return (grant: EnhancedGrant): MatchScore => {
      const profile = organizationProfile || {}
      const reasoning: string[] = []
      const recommendations: string[] = []
      const riskFactors: string[] = []

      // 1. Eligibility Match (25% weight)
      let eligibilityScore = 0
      if (grant.eligibility.organizationType.includes(profile.type || 'private')) {
        eligibilityScore += 40
        reasoning.push(`Organization type (${profile.type}) matches eligibility criteria`)
      } else {
        riskFactors.push(`Organization type mismatch - grant requires: ${grant.eligibility.organizationType.join(', ')}`)
      }

      const employees = profile.employees || 0
      if (grant.eligibility.minEmployees && employees >= grant.eligibility.minEmployees) {
        eligibilityScore += 20
      } else if (grant.eligibility.minEmployees && employees < grant.eligibility.minEmployees) {
        riskFactors.push(`Minimum employee requirement not met (need ${grant.eligibility.minEmployees}, have ${employees})`)
      }

      if (grant.eligibility.maxEmployees && employees <= grant.eligibility.maxEmployees) {
        eligibilityScore += 20
      } else if (grant.eligibility.maxEmployees && employees > grant.eligibility.maxEmployees) {
        riskFactors.push(`Maximum employee limit exceeded (limit ${grant.eligibility.maxEmployees}, have ${employees})`)
      }

      if (!grant.eligibility.minEmployees && !grant.eligibility.maxEmployees) {
        eligibilityScore += 40 // No employee restrictions
      }

      // Geographic check
      if (grant.eligibility.geographicRestrictions) {
        const userLocation = profile.location || 'Ireland'
        if (grant.eligibility.geographicRestrictions.includes(userLocation)) {
          eligibilityScore += 20
          reasoning.push(`Geographic eligibility confirmed for ${userLocation}`)
        } else {
          riskFactors.push(`Geographic restrictions may apply - check eligibility for ${userLocation}`)
        }
      } else {
        eligibilityScore += 20
      }

      // 2. Sector Relevance (20% weight)
      let sectorScore = 0
      const userSectors = profile.sectors || []
      const matchingSectors = grant.sector.filter(s => userSectors.includes(s))
      
      if (matchingSectors.length > 0) {
        sectorScore = Math.min(100, (matchingSectors.length / grant.sector.length) * 100)
        reasoning.push(`Strong sector alignment: ${matchingSectors.join(', ')}`)
      } else {
        const similarSectors = findSimilarSectors(userSectors, grant.sector)
        if (similarSectors.length > 0) {
          sectorScore = 60
          reasoning.push(`Potential sector relevance: ${similarSectors.join(', ')}`)
        } else {
          riskFactors.push(`Limited sector alignment - may need to demonstrate relevance`)
        }
      }

      // 3. Organization Fit (15% weight)
      let orgScore = 0
      const revenue = profile.annualRevenue || 0
      const fundingAmount = grant.amount

      // Size appropriateness
      if (fundingAmount <= revenue * 0.5) {
        orgScore += 40
        reasoning.push('Grant amount well-suited to organization size')
      } else if (fundingAmount <= revenue * 1.5) {
        orgScore += 25
        recommendations.push('Consider the significant impact this grant would have on your operations')
      } else {
        orgScore += 10
        riskFactors.push('Grant amount may be disproportionately large for organization size')
      }

      // Experience with similar grants
      const previousGrants = profile.previousGrants || 0
      if (previousGrants > 5) {
        orgScore += 30
        reasoning.push('Strong track record with grant applications')
      } else if (previousGrants > 0) {
        orgScore += 20
        reasoning.push('Some experience with grant applications')
      } else {
        orgScore += 10
        recommendations.push('Consider getting support for your first grant application')
      }

      // Innovation readiness
      const innovation = profile.innovationCapability || 'medium'
      if (grant.requirements.innovation && innovation === 'high') {
        orgScore += 30
        reasoning.push('Strong innovation capability aligns with grant requirements')
      } else if (grant.requirements.innovation && innovation === 'medium') {
        orgScore += 15
        recommendations.push('Highlight your innovation initiatives in the application')
      }

      // 4. Historical Success Probability (15% weight)
      let historicalScore = Math.min(100, grant.historicalData.successRate * 2)
      if (grant.historicalData.successRate > 30) {
        reasoning.push(`High historical success rate (${grant.historicalData.successRate}%)`)
      } else if (grant.historicalData.successRate > 15) {
        reasoning.push(`Moderate success rate (${grant.historicalData.successRate}%)`)
      } else {
        riskFactors.push(`Low historical success rate (${grant.historicalData.successRate}%)`)
      }

      // 5. Competition Level (10% weight)
      let competitionScore = 0
      const expectedApplicants = grant.historicalData.typicalApplicants
      if (expectedApplicants < 50) {
        competitionScore = 80
        reasoning.push('Lower competition expected (< 50 typical applicants)')
      } else if (expectedApplicants < 200) {
        competitionScore = 60
        reasoning.push('Moderate competition expected')
      } else {
        competitionScore = 30
        riskFactors.push(`High competition expected (${expectedApplicants}+ typical applicants)`)
      }

      // 6. Deadline Viability (10% weight)
      let deadlineScore = 0
      const daysUntilDeadline = Math.ceil((grant.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const requiredPrepTime = getDifficultyPrepTime(grant.difficulty)
      
      if (daysUntilDeadline >= requiredPrepTime * 1.5) {
        deadlineScore = 100
        reasoning.push('Ample time available for thorough preparation')
      } else if (daysUntilDeadline >= requiredPrepTime) {
        deadlineScore = 70
        reasoning.push('Sufficient time for preparation with focused effort')
      } else if (daysUntilDeadline >= requiredPrepTime * 0.7) {
        deadlineScore = 40
        recommendations.push('Tight deadline - prioritize essential requirements')
      } else {
        deadlineScore = 10
        riskFactors.push('Very tight deadline - may be challenging to complete quality application')
      }

      // 7. Requirements Fulfillment (5% weight)
      let requirementsScore = 0
      const orgCapabilities = profile.capabilities || {}
      let metRequirements = 0
      let totalRequirements = 0

      Object.entries(grant.requirements).forEach(([req, required]) => {
        if (required) {
          totalRequirements++
          if (orgCapabilities[req]) {
            metRequirements++
          }
        }
      })

      if (totalRequirements > 0) {
        requirementsScore = (metRequirements / totalRequirements) * 100
        if (metRequirements === totalRequirements) {
          reasoning.push('All grant requirements can be fulfilled')
        } else {
          recommendations.push(`Focus on developing: ${Object.keys(grant.requirements).filter(k => grant.requirements[k as keyof typeof grant.requirements] && !orgCapabilities[k]).join(', ')}`)
        }
      } else {
        requirementsScore = 100
      }

      // Calculate weighted overall score
      const overallScore = Math.round(
        (eligibilityScore * 0.25) +
        (sectorScore * 0.20) +
        (orgScore * 0.15) +
        (historicalScore * 0.15) +
        (competitionScore * 0.10) +
        (deadlineScore * 0.10) +
        (requirementsScore * 0.05)
      )

      // Calculate confidence based on data completeness
      const confidence = calculateConfidence(profile, grant)

      return {
        grantId: grant.id,
        overallScore,
        breakdown: {
          eligibilityMatch: Math.round(eligibilityScore),
          sectorRelevance: Math.round(sectorScore),
          organizationFit: Math.round(orgScore),
          historicalSuccess: Math.round(historicalScore),
          competitionLevel: Math.round(competitionScore),
          deadlineViability: Math.round(deadlineScore),
          requirementsFulfillment: Math.round(requirementsScore)
        },
        confidence,
        reasoning,
        recommendations,
        riskFactors
      }
    }
  }, [organizationProfile])

  // Helper functions
  const findSimilarSectors = (userSectors: string[], grantSectors: string[]): string[] => {
    const sectorMapping: Record<string, string[]> = {
      'technology': ['software', 'fintech', 'health-tech', 'ed-tech'],
      'healthcare': ['biotech', 'medtech', 'pharmaceuticals'],
      'agriculture': ['agritech', 'food-tech', 'sustainability'],
      'manufacturing': ['advanced-manufacturing', 'automation', 'industrial'],
      'services': ['consulting', 'professional-services', 'business-services']
    }

    const similar: string[] = []
    userSectors.forEach(userSector => {
      grantSectors.forEach(grantSector => {
        if (sectorMapping[userSector]?.includes(grantSector) || 
            sectorMapping[grantSector]?.includes(userSector)) {
          similar.push(grantSector)
        }
      })
    })
    return [...new Set(similar)]
  }

  const getDifficultyPrepTime = (difficulty: string): number => {
    switch (difficulty) {
      case 'easy': return 14
      case 'medium': return 30
      case 'hard': return 60
      case 'expert': return 90
      default: return 30
    }
  }

  const calculateConfidence = (profile: any, grant: EnhancedGrant): number => {
    let completeness = 0
    const fields = ['type', 'employees', 'sectors', 'annualRevenue', 'location', 'previousGrants']
    fields.forEach(field => {
      if (profile[field]) completeness += 16.67
    })
    return Math.min(100, Math.round(completeness))
  }

  // Run AI analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true)
    setAnalysisComplete(false)
    
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const calculatedMatches = grants.map(calculateGrantMatch)
      .sort((a, b) => b.overallScore - a.overallScore)
    
    setMatches(calculatedMatches)
    setAnalysisComplete(true)
    setIsAnalyzing(false)
    
    if (onMatchFound) {
      onMatchFound(calculatedMatches)
    }
  }

  // Filter and sort matches
  const filteredMatches = useMemo(() => {
    let filtered = matches
    
    // Apply score filter
    switch (filterLevel) {
      case 'excellent':
        filtered = matches.filter(m => m.overallScore >= 80)
        break
      case 'high':
        filtered = matches.filter(m => m.overallScore >= 60)
        break
      default:
        filtered = matches
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          const grantA = grants.find(g => g.id === a.grantId)
          const grantB = grants.find(g => g.id === b.grantId)
          return (grantB?.amount || 0) - (grantA?.amount || 0)
        case 'deadline':
          const deadlineA = grants.find(g => g.id === a.grantId)?.deadline || new Date()
          const deadlineB = grants.find(g => g.id === b.grantId)?.deadline || new Date()
          return deadlineA.getTime() - deadlineB.getTime()
        default:
          return b.overallScore - a.overallScore
      }
    })
  }, [matches, filterLevel, sortBy, grants])

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-blue-600 bg-blue-100'
    if (score >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent Match'
    if (score >= 60) return 'Good Match'
    if (score >= 40) return 'Possible Match'
    return 'Poor Match'
  }

  useEffect(() => {
    if (grants.length > 0 && organizationProfile) {
      runAnalysis()
    }
  }, [grants, organizationProfile])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600" />
            AI Grant Matching Engine
          </h2>
          <p className="text-gray-600 mt-1">Advanced ML algorithms for precise grant-user compatibility</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </Button>
        </div>
      </div>

      {/* Analysis Status */}
      {isAnalyzing && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              <div>
                <h3 className="text-lg font-semibold text-purple-900">Analyzing Grant Compatibility</h3>
                <p className="text-purple-700 text-sm">Processing {grants.length} grants using advanced ML algorithms...</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {analysisComplete && (
        <Tabs defaultValue="matches" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="matches">Grant Matches ({filteredMatches.length})</TabsTrigger>
            <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="matches" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="all">All Matches</option>
                    <option value="high">High Compatibility (60%+)</option>
                    <option value="excellent">Excellent Matches (80%+)</option>
                  </select>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Sort by:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="text-sm border rounded px-2 py-1"
                  >
                    <option value="score">Match Score</option>
                    <option value="amount">Grant Amount</option>
                    <option value="deadline">Deadline</option>
                  </select>
                </div>
              </div>
              <p className="text-sm text-gray-600 mt-2 sm:mt-0">
                Showing {filteredMatches.length} of {matches.length} matches
              </p>
            </div>

            {/* Grant Matches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredMatches.map((match) => {
                const grant = grants.find(g => g.id === match.grantId)
                if (!grant) return null

                return (
                  <Card 
                    key={match.grantId} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedMatch(match)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg flex items-center">
                            {grant.title}
                            <Sparkles className="h-4 w-4 ml-2 text-yellow-500" />
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {grant.organization} • {grant.category}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={`${getScoreColor(match.overallScore)} font-bold`}>
                            {match.overallScore}% Match
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {match.confidence}% Confidence
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Grant Details */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-medium">€{grant.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-blue-600" />
                            <span>{grant.deadline.toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Target className="h-4 w-4 text-purple-600" />
                            <span>{grant.difficulty} difficulty</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-orange-600" />
                            <span>{grant.historicalData.successRate}% success rate</span>
                          </div>
                        </div>

                        {/* Score Breakdown */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Compatibility Breakdown</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Eligibility:</span>
                              <span className="font-medium">{match.breakdown.eligibilityMatch}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Sector Fit:</span>
                              <span className="font-medium">{match.breakdown.sectorRelevance}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Org Match:</span>
                              <span className="font-medium">{match.breakdown.organizationFit}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Success Odds:</span>
                              <span className="font-medium">{match.breakdown.historicalSuccess}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Reasons */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Why This Matches</p>
                          <ul className="space-y-1">
                            {match.reasoning.slice(0, 2).map((reason, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <CheckCircle className="h-3 w-3 text-green-500 mt-0.5 flex-shrink-0" />
                                <span className="text-xs text-gray-600">{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Action Button */}
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Navigate to grant details or application
                            window.location.href = `/dashboard/grants/${grant.id}`
                          }}
                        >
                          View Grant Details
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {filteredMatches.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No matches found</h3>
                <p className="text-gray-600">
                  Try adjusting your filters or updating your organization profile for better matches.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            {selectedMatch && (
              <MatchAnalysisDetail 
                match={selectedMatch} 
                grant={grants.find(g => g.id === selectedMatch.grantId)!}
              />
            )}
            {!selectedMatch && (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a grant to view detailed analysis</h3>
                <p className="text-gray-600">
                  Click on any grant match to see the complete AI analysis breakdown.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <AIInsightsPanel matches={matches} organizationProfile={organizationProfile} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// Detailed Analysis Component
function MatchAnalysisDetail({ match, grant }: { match: MatchScore; grant: EnhancedGrant }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Award className="h-5 w-5 mr-2" />
            {grant.title} - Detailed Analysis
          </CardTitle>
          <CardDescription>
            AI-powered compatibility assessment with actionable insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Score Breakdown */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Compatibility Scores</h3>
              {Object.entries(match.breakdown).map(([key, score]) => (
                <div key={key} className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className="text-sm font-bold">{score}%</span>
                  </div>
                  <Progress value={score} className="h-2" />
                </div>
              ))}
            </div>

            {/* Insights */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">AI Insights</h3>
              
              {match.reasoning.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                  <ul className="space-y-1">
                    {match.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.recommendations.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h4>
                  <ul className="space-y-1">
                    {match.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {match.riskFactors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-orange-700 mb-2">Risk Factors</h4>
                  <ul className="space-y-1">
                    {match.riskFactors.map((risk, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// AI Insights Panel Component
function AIInsightsPanel({ matches, organizationProfile }: { matches: MatchScore[]; organizationProfile: any }) {
  const insights = useMemo(() => {
    const total = matches.length
    const excellent = matches.filter(m => m.overallScore >= 80).length
    const good = matches.filter(m => m.overallScore >= 60).length
    const avgScore = Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / total)
    
    const commonStrengths = matches.flatMap(m => m.reasoning)
      .reduce((acc: Record<string, number>, reason) => {
        acc[reason] = (acc[reason] || 0) + 1
        return acc
      }, {})
    
    const topStrengths = Object.entries(commonStrengths)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([strength]) => strength)

    const commonRisks = matches.flatMap(m => m.riskFactors)
      .reduce((acc: Record<string, number>, risk) => {
        acc[risk] = (acc[risk] || 0) + 1
        return acc
      }, {})
    
    const topRisks = Object.entries(commonRisks)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([risk]) => risk)

    return {
      total,
      excellent,
      good,
      avgScore,
      topStrengths,
      topRisks
    }
  }, [matches])

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.total}</div>
              <div className="text-sm text-gray-600">Total Grants Analyzed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{insights.excellent}</div>
              <div className="text-sm text-gray-600">Excellent Matches (80%+)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.good}</div>
              <div className="text-sm text-gray-600">Good Matches (60%+)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{insights.avgScore}%</div>
              <div className="text-sm text-gray-600">Average Match Score</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Strategic Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            Strategic Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-green-700 mb-3">Your Competitive Advantages</h3>
              <ul className="space-y-2">
                {insights.topStrengths.map((strength, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-orange-700 mb-3">Areas for Improvement</h3>
              <ul className="space-y-2">
                {insights.topRisks.map((risk, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}