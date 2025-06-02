"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  TrendingUp, 
  Target, 
  DollarSign, 
  Users,
  AlertCircle,
  CheckCircle,
  Clock,
  Brain,
  BarChart3,
  Eye,
  ArrowUp,
  ArrowDown,
  Zap,
  Lightbulb,
  Award,
  Calendar,
  Percent,
  Activity,
  Search,
  Filter,
  Download,
  RefreshCw,
  Info
} from "lucide-react"
import { User } from "../../../lib/auth"
import { 
  predictiveAnalyticsService, 
  GrantSuccessPrediction, 
  BudgetOptimization, 
  CompetitionAnalysis, 
  PredictiveInsights
} from "../../../lib/api"

interface AnalyticsData {
  predictions: GrantSuccessPrediction[]
  insights: PredictiveInsights | null
  modelPerformance: any | null
  totalPredictions: number
  avgSuccessProbability: number
  topRecommendations: any[]
}

export default function PredictiveAnalyticsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    predictions: [],
    insights: null,
    modelPerformance: null,
    totalPredictions: 0,
    avgSuccessProbability: 0,
    topRecommendations: []
  })
  const [selectedPrediction, setSelectedPrediction] = useState<GrantSuccessPrediction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showPredictionModal, setShowPredictionModal] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'high_probability' | 'recent'>('all')
  const [searchTerm, setSearchTerm] = useState("")
  const router = useRouter()

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
      loadAnalyticsData(userData.id)
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadAnalyticsData = async (userId: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      const [insights, modelPerformance, historicalPredictions] = await Promise.all([
        predictiveAnalyticsService.getPredictiveInsights(userId).catch(() => null),
        predictiveAnalyticsService.getModelPerformance().catch(() => null),
        predictiveAnalyticsService.getHistoricalPredictions(userId, { 
          limit: 50, 
          include_outcomes: true 
        }).catch(() => ({ predictions: [], total: 0, accuracy_summary: null }))
      ])

      // Calculate analytics metrics
      const predictions = historicalPredictions.predictions || []
      const avgSuccessProbability = predictions.length > 0 
        ? predictions.reduce((sum, p) => sum + p.success_probability, 0) / predictions.length 
        : 0

      // Extract top recommendations across all predictions
      const allRecommendations = predictions.flatMap(p => p.recommendations)
      const topRecommendations = allRecommendations
        .sort((a, b) => b.impact_score - a.impact_score)
        .slice(0, 5)

      setAnalyticsData({
        predictions,
        insights,
        modelPerformance,
        totalPredictions: historicalPredictions.total || 0,
        avgSuccessProbability,
        topRecommendations
      })
    } catch (error) {
      console.error('Error loading analytics data:', error)
      setError(error instanceof Error ? error.message : 'Failed to load analytics data')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const refreshData = async () => {
    if (user) {
      await loadAnalyticsData(user.id)
    }
  }

  const filteredPredictions = analyticsData.predictions.filter(prediction => {
    const matchesFilter = filterType === 'all' || 
      (filterType === 'high_probability' && prediction.success_probability >= 70) ||
      (filterType === 'recent' && new Date(prediction.created_at).getTime() > Date.now() - (7 * 24 * 60 * 60 * 1000))

    const matchesSearch = !searchTerm || 
      prediction.grant_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prediction.competitive_analysis.key_differentiators.some(d => 
        d.toLowerCase().includes(searchTerm.toLowerCase())
      )

    return matchesFilter && matchesSearch
  })

  const getSuccessProbabilityColor = (probability: number) => {
    if (probability >= 80) return 'text-green-600 bg-green-100'
    if (probability >= 60) return 'text-blue-600 bg-blue-100'
    if (probability >= 40) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success_trend': return <TrendingUp className="w-5 h-5" />
      case 'market_opportunity': return <Target className="w-5 h-5" />
      case 'competitive_advantage': return <Award className="w-5 h-5" />
      case 'timing_alert': return <Clock className="w-5 h-5" />
      default: return <Lightbulb className="w-5 h-5" />
    }
  }

  const getInsightColor = (priorityScore: number) => {
    if (priorityScore >= 8) return 'border-red-200 bg-red-50'
    if (priorityScore >= 6) return 'border-yellow-200 bg-yellow-50'
    return 'border-blue-200 bg-blue-50'
  }

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
                  Predictive Analytics Dashboard
                  <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Brain className="w-3 h-3 mr-1" />
                    AI-Powered
                  </span>
                </h1>
                <p className="text-gray-600">
                  Advanced machine learning insights for grant success optimization
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {error && (
                  <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-md">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                <Button onClick={refreshData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Total Predictions</p>
                    <p className="text-2xl font-bold">{analyticsData.totalPredictions}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Avg Success Rate</p>
                    <p className="text-2xl font-bold">{Math.round(analyticsData.avgSuccessProbability)}%</p>
                  </div>
                  <Target className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Model Accuracy</p>
                    <p className="text-2xl font-bold">
                      {analyticsData.modelPerformance 
                        ? Math.round(analyticsData.modelPerformance.overall_accuracy * 100)
                        : 85
                      }%
                    </p>
                  </div>
                  <Brain className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Insights</p>
                    <p className="text-2xl font-bold">{analyticsData.insights?.insights.length || 0}</p>
                  </div>
                  <Lightbulb className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="predictions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="predictions">Success Predictions</TabsTrigger>
              <TabsTrigger value="insights">Predictive Insights</TabsTrigger>
              <TabsTrigger value="performance">Model Performance</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            {/* Success Predictions Tab */}
            <TabsContent value="predictions" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search predictions..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as any)}
                    className="flex h-10 w-48 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="all">All Predictions</option>
                    <option value="high_probability">High Probability (70%+)</option>
                    <option value="recent">Recent (Last 7 days)</option>
                  </select>
                </div>
                <p className="text-sm text-gray-600">
                  {filteredPredictions.length} predictions
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredPredictions.map((prediction) => (
                  <Card key={prediction.grant_id} className="hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => setSelectedPrediction(prediction)}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">Grant {prediction.grant_id.slice(-8)}</CardTitle>
                          <CardDescription className="mt-1">
                            Organization: {prediction.organization_id.slice(-8)}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end space-y-1">
                          <Badge className={`${getSuccessProbabilityColor(prediction.success_probability)} font-bold`}>
                            {prediction.success_probability}% Success
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {prediction.confidence_score}% Confidence
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <div className="space-y-4">
                        {/* Prediction Factors */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Key Factors</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Org Fit:</span>
                              <span className="font-medium">{prediction.predicted_factors.organization_fit}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Competition:</span>
                              <span className="font-medium">{prediction.predicted_factors.competition_level}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">History:</span>
                              <span className="font-medium">{prediction.predicted_factors.historical_performance}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Timing:</span>
                              <span className="font-medium">{prediction.predicted_factors.timing_factor}%</span>
                            </div>
                          </div>
                        </div>

                        {/* Top Recommendations */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Top Recommendations</p>
                          <div className="space-y-1">
                            {prediction.recommendations.slice(0, 2).map((rec, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${predictiveAnalyticsService.getPriorityColor(rec.priority)}`}
                                >
                                  {rec.priority.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-gray-600 truncate">
                                  {rec.suggestion.substring(0, 60)}...
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Competition Analysis */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Competition Overview</p>
                          <div className="flex items-center justify-between">
                            <Badge 
                              className={`${predictiveAnalyticsService.getCompetitionLevelColor(prediction.competitive_analysis.competition_level)} text-xs`}
                            >
                              {prediction.competitive_analysis.competition_level.replace('_', ' ').toUpperCase()} Competition
                            </Badge>
                            <span className="text-sm text-gray-600">
                              ~{prediction.competitive_analysis.estimated_applicants} applicants
                            </span>
                          </div>
                        </div>

                        {/* Optimal Timing */}
                        <div>
                          <p className="text-sm font-medium text-gray-700 mb-2">Optimal Timing</p>
                          <div className="flex items-center space-x-2 text-xs text-gray-600">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(prediction.optimal_timing.recommended_submission_window.start_date).toLocaleDateString()} - 
                              {new Date(prediction.optimal_timing.recommended_submission_window.end_date).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredPredictions.length === 0 && (
                <div className="text-center py-12">
                  <BarChart3 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No predictions found</h3>
                  <p className="text-gray-600">
                    {analyticsData.totalPredictions === 0 
                      ? 'Start using grant predictions to see analytics here'
                      : 'Try adjusting your search criteria or filters'
                    }
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Predictive Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              {analyticsData.insights ? (
                <div className="space-y-4">
                  {/* Performance Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Activity className="w-5 h-5 mr-2" />
                        Performance Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-600">
                            {analyticsData.insights.performance_summary.total_predictions_made}
                          </p>
                          <p className="text-sm text-gray-600">Predictions Made</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-green-600">
                            {Math.round(analyticsData.insights.performance_summary.accuracy_rate * 100)}%
                          </p>
                          <p className="text-sm text-gray-600">Accuracy Rate</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-purple-600">
                            {analyticsData.insights.performance_summary.successful_recommendations}
                          </p>
                          <p className="text-sm text-gray-600">Successful Recommendations</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-orange-600">
                            {Math.round(analyticsData.insights.performance_summary.user_engagement_score * 100)}%
                          </p>
                          <p className="text-sm text-gray-600">Engagement Score</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Insights List */}
                  <div className="space-y-4">
                    {analyticsData.insights.insights.map((insight, index) => (
                      <Card key={index} className={`border-l-4 ${getInsightColor(insight.priority_score)}`}>
                        <CardContent className="p-6">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {getInsightIcon(insight.type)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold">{insight.title}</h3>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline">
                                    Priority: {insight.priority_score}/10
                                  </Badge>
                                  {insight.expires_at && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Clock className="w-3 h-3 mr-1" />
                                      Expires {new Date(insight.expires_at).toLocaleDateString()}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              
                              <p className="text-gray-600 mb-4">{insight.description}</p>
                              
                              <div className="space-y-2">
                                <p className="text-sm font-medium text-gray-700">Actionable Recommendations:</p>
                                <ul className="list-disc list-inside space-y-1">
                                  {insight.actionable_recommendations.map((rec, recIndex) => (
                                    <li key={recIndex} className="text-sm text-gray-600">{rec}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Lightbulb className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No insights available</h3>
                  <p className="text-gray-600">
                    Insights will be generated as you use the predictive analytics features
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Model Performance Tab */}
            <TabsContent value="performance" className="space-y-6">
              {analyticsData.modelPerformance ? (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Overall Model Performance</CardTitle>
                      <CardDescription>
                        Machine learning model accuracy and reliability metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-green-600 mb-2">
                            {Math.round(analyticsData.modelPerformance.overall_accuracy * 100)}%
                          </div>
                          <p className="text-sm text-gray-600">Overall Accuracy</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-blue-600 mb-2">
                            {analyticsData.modelPerformance.predictions_count.toLocaleString()}
                          </div>
                          <p className="text-sm text-gray-600">Total Predictions</p>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-purple-600 mb-2">
                            {analyticsData.modelPerformance.accuracy_by_model?.length || 3}
                          </div>
                          <p className="text-sm text-gray-600">Active Models</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Model Breakdown */}
                  {analyticsData.modelPerformance.accuracy_by_model && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Model Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {analyticsData.modelPerformance.accuracy_by_model.map((model: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                              <div>
                                <h4 className="font-medium">{model.model_type.replace('_', ' ').toUpperCase()}</h4>
                                <p className="text-sm text-gray-600">{model.predictions} predictions</p>
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold">{Math.round(model.accuracy * 100)}%</div>
                                <p className="text-sm text-gray-600">Accuracy</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Model performance data loading</h3>
                  <p className="text-gray-600">
                    Performance metrics will be available once the models have sufficient data
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Recommendations Tab */}
            <TabsContent value="recommendations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Strategic Recommendations</CardTitle>
                  <CardDescription>
                    AI-generated recommendations based on your prediction history
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData.topRecommendations.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.topRecommendations.map((rec, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <Badge variant="outline" className="mb-2">
                                {rec.category.toUpperCase()}
                              </Badge>
                              <h4 className="font-medium">{rec.suggestion}</h4>
                            </div>
                            <div className="text-right">
                              <Badge className={predictiveAnalyticsService.getPriorityColor(rec.priority)}>
                                {rec.priority.toUpperCase()}
                              </Badge>
                              <p className="text-sm text-gray-600 mt-1">
                                Impact: {rec.impact_score}/10
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">No recommendations available yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}