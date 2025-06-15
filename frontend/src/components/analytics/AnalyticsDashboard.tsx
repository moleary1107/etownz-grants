"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs"
import { Progress } from "../ui/progress"
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  DollarSign, 
  Target, 
  Filter,
  Download,
  RefreshCw,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react"
import { User, UserRole } from "../../lib/auth"

interface MetricData {
  current: number
  previous: number
  target?: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

interface ChartDataPoint {
  label: string
  value: number
  category?: string
  color?: string
}

interface AnalyticsData {
  overview: {
    totalGrants: MetricData
    applications: MetricData
    successRate: MetricData
    fundingSecured: MetricData
  }
  trends: {
    grantsOverTime: ChartDataPoint[]
    applicationsOverTime: ChartDataPoint[]
    successRateOverTime: ChartDataPoint[]
    fundingOverTime: ChartDataPoint[]
  }
  breakdown: {
    grantsByCategory: ChartDataPoint[]
    applicationsByStatus: ChartDataPoint[]
    fundingBySource: ChartDataPoint[]
    deadlinesByMonth: ChartDataPoint[]
  }
  insights: {
    id: string
    type: 'success' | 'warning' | 'info' | 'error'
    title: string
    description: string
    actionText?: string
    actionUrl?: string
  }[]
}

interface AnalyticsDashboardProps {
  user: User
  dateRange?: string
  refreshInterval?: number
  className?: string
}

export function AnalyticsDashboard({ 
  user, 
  dateRange = '30d', 
  refreshInterval = 300000,
  className = "" 
}: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange)
  const [activeTab, setActiveTab] = useState('overview')
  const [showFilters, setShowFilters] = useState(false)

  // Generate mock analytics data based on user role
  const generateAnalyticsData = useMemo((): AnalyticsData => {
    const baseData = {
      overview: {
        totalGrants: { current: 127, previous: 115, trend: 'up' as const, percentage: 10.4 },
        applications: { current: 23, previous: 18, trend: 'up' as const, percentage: 27.8 },
        successRate: { current: 34, previous: 31, target: 40, trend: 'up' as const, percentage: 9.7 },
        fundingSecured: { current: 125000, previous: 98000, target: 150000, trend: 'up' as const, percentage: 27.6 }
      },
      trends: {
        grantsOverTime: [
          { label: 'Jan', value: 95 },
          { label: 'Feb', value: 102 },
          { label: 'Mar', value: 108 },
          { label: 'Apr', value: 115 },
          { label: 'May', value: 127 }
        ],
        applicationsOverTime: [
          { label: 'Jan', value: 12 },
          { label: 'Feb', value: 15 },
          { label: 'Mar', value: 18 },
          { label: 'Apr', value: 20 },
          { label: 'May', value: 23 }
        ],
        successRateOverTime: [
          { label: 'Jan', value: 28 },
          { label: 'Feb', value: 30 },
          { label: 'Mar', value: 31 },
          { label: 'Apr', value: 33 },
          { label: 'May', value: 34 }
        ],
        fundingOverTime: [
          { label: 'Jan', value: 65000 },
          { label: 'Feb', value: 78000 },
          { label: 'Mar', value: 89000 },
          { label: 'Apr', value: 98000 },
          { label: 'May', value: 125000 }
        ]
      },
      breakdown: {
        grantsByCategory: [
          { label: 'Research & Development', value: 45, color: '#3B82F6' },
          { label: 'Enterprise Support', value: 32, color: '#10B981' },
          { label: 'Community Development', value: 28, color: '#F59E0B' },
          { label: 'Environmental', value: 22, color: '#8B5CF6' }
        ],
        applicationsByStatus: [
          { label: 'In Progress', value: 8, color: '#3B82F6' },
          { label: 'Submitted', value: 6, color: '#10B981' },
          { label: 'Under Review', value: 5, color: '#F59E0B' },
          { label: 'Approved', value: 4, color: '#059669' }
        ],
        fundingBySource: [
          { label: 'Enterprise Ireland', value: 45000, color: '#3B82F6' },
          { label: 'Science Foundation Ireland', value: 35000, color: '#10B981' },
          { label: 'Local Councils', value: 25000, color: '#F59E0B' },
          { label: 'EU Horizon', value: 20000, color: '#8B5CF6' }
        ],
        deadlinesByMonth: [
          { label: 'June', value: 8 },
          { label: 'July', value: 12 },
          { label: 'August', value: 6 },
          { label: 'September', value: 15 },
          { label: 'October', value: 9 }
        ]
      },
      insights: [
        {
          id: '1',
          type: 'success' as const,
          title: 'Strong Performance',
          description: 'Your success rate has improved by 9.7% this month, exceeding the platform average.',
          actionText: 'View Details',
          actionUrl: '/dashboard/applications'
        },
        {
          id: '2',
          type: 'info' as const,
          title: 'New Opportunities',
          description: '12 new grants matching your profile have been added this week.',
          actionText: 'Explore Grants',
          actionUrl: '/dashboard/grants'
        },
        {
          id: '3',
          type: 'warning' as const,
          title: 'Upcoming Deadlines',
          description: '3 applications have deadlines in the next 7 days.',
          actionText: 'Review Deadlines',
          actionUrl: '/dashboard/deadlines'
        }
      ]
    }

    // Customize data based on user role
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return {
          ...baseData,
          overview: {
            totalGrants: { current: 1247, previous: 1156, trend: 'up' as const, percentage: 7.9 },
            applications: { current: 892, previous: 823, trend: 'up' as const, percentage: 8.4 },
            successRate: { current: 42, previous: 39, target: 45, trend: 'up' as const, percentage: 7.7 },
            fundingSecured: { current: 2400000, previous: 2100000, target: 3000000, trend: 'up' as const, percentage: 14.3 }
          },
          insights: [
            {
              id: '1',
              type: 'success' as const,
              title: 'Platform Growth',
              description: 'Platform-wide success rate increased to 42%, with 47 active organizations.',
              actionText: 'System Analytics',
              actionUrl: '/dashboard/analytics'
            },
            {
              id: '2',
              type: 'info' as const,
              title: 'User Engagement',
              description: '23 new users joined this week across 5 organizations.',
              actionText: 'User Management',
              actionUrl: '/dashboard/users'
            }
          ]
        }
      
      case UserRole.ORGANIZATION_ADMIN:
        return {
          ...baseData,
          overview: {
            totalGrants: { current: 89, previous: 76, trend: 'up' as const, percentage: 17.1 },
            applications: { current: 34, previous: 28, trend: 'up' as const, percentage: 21.4 },
            successRate: { current: 47, previous: 42, target: 50, trend: 'up' as const, percentage: 11.9 },
            fundingSecured: { current: 340000, previous: 285000, target: 400000, trend: 'up' as const, percentage: 19.3 }
          },
          insights: [
            {
              id: '1',
              type: 'success' as const,
              title: 'Team Performance',
              description: 'Your team has achieved a 47% success rate, above organization average.',
              actionText: 'Team Analytics',
              actionUrl: '/dashboard/analytics'
            },
            {
              id: '2',
              type: 'info' as const,
              title: 'Resource Optimization',
              description: 'Consider allocating more resources to R&D grants (highest success rate).',
              actionText: 'View Recommendations',
              actionUrl: '/dashboard/grants'
            }
          ]
        }
      
      default:
        return baseData
    }
  }, [user.role])

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setData(generateAnalyticsData)
      setIsLoading(false)
    }

    loadData()
    
    // Set up refresh interval
    const interval = setInterval(loadData, refreshInterval)
    return () => clearInterval(interval)
  }, [generateAnalyticsData, refreshInterval, selectedPeriod])

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `€${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `€${(value / 1000).toFixed(0)}K`
    return `€${value.toLocaleString()}`
  }

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <div className="h-4 w-4" />
    }
  }

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error': return <XCircle className="h-5 w-5 text-red-600" />
      default: return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const renderMetricCard = (title: string, icon: React.ComponentType<React.SVGProps<SVGSVGElement>>, metric: MetricData, format?: string) => {
    const IconComponent = icon
    const isPositive = metric.trend === 'up'
    const progressValue = metric.target ? (metric.current / metric.target) * 100 : 0
    
    return (
      <Card className="relative overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
          <IconComponent className="h-4 w-4 text-gray-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {format === 'currency' ? formatCurrency(metric.current) : 
             format === 'percentage' ? `${metric.current}%` : 
             metric.current.toLocaleString()}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
            {getTrendIcon(metric.trend)}
            <span className={isPositive ? 'text-green-600' : 'text-red-600'}>
              {isPositive ? '+' : ''}{metric.percentage.toFixed(1)}%
            </span>
            <span>from last period</span>
          </div>
          {metric.target && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Progress to target</span>
                <span>{progressValue.toFixed(0)}%</span>
              </div>
              <Progress value={progressValue} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const renderSimpleChart = (data: ChartDataPoint[]) => {
    const maxValue = Math.max(...data.map(d => d.value))
    
    return (
      <div className="space-y-3">
        {data.map((point) => (
          <div key={point.label} className="flex items-center space-x-3">
            <div className="w-24 text-sm text-gray-600 font-medium">
              {point.label}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div 
                  className="h-6 rounded transition-all duration-500 ease-out"
                  style={{
                    width: `${(point.value / maxValue) * 100}%`,
                    backgroundColor: point.color || '#3B82F6',
                    minWidth: '8px'
                  }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {typeof point.value === 'number' && point.value > 1000 
                    ? formatCurrency(point.value)
                    : point.value.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600 mt-1">Performance insights and trends</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1"
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.reload()}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Period:</span>
        {['7d', '30d', '90d', '1y'].map((period) => (
          <Button
            key={period}
            variant={selectedPeriod === period ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPeriod(period)}
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {renderMetricCard("Total Grants", FileText, data.overview.totalGrants)}
        {renderMetricCard("Applications", Target, data.overview.applications)}
        {renderMetricCard("Success Rate", TrendingUp, data.overview.successRate, 'percentage')}
        {renderMetricCard("Funding Secured", DollarSign, data.overview.fundingSecured, 'currency')}
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>Grants Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.trends.grantsOverTime)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Applications Over Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.trends.applicationsOverTime)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Success Rate Trend</CardTitle>
                <CardDescription>Success rate percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.trends.successRateOverTime)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funding Secured</CardTitle>
                <CardDescription>Total funding secured over time</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.trends.fundingOverTime)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Grants by Category</CardTitle>
                <CardDescription>Distribution of grants by funding category</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.breakdown.grantsByCategory)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Applications by Status</CardTitle>
                <CardDescription>Current status of your applications</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.breakdown.applicationsByStatus)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Funding by Source</CardTitle>
                <CardDescription>Funding breakdown by organization</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.breakdown.fundingBySource)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Deadlines</CardTitle>
                <CardDescription>Application deadlines by month</CardDescription>
              </CardHeader>
              <CardContent>
                {renderSimpleChart(data.breakdown.deadlinesByMonth)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.insights.map((insight) => (
              <Card key={insight.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start space-x-3">
                    {getInsightIcon(insight.type)}
                    <div className="flex-1">
                      <CardTitle className="text-base">{insight.title}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {insight.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                {insight.actionText && (
                  <CardContent className="pt-0">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => window.location.href = insight.actionUrl || '#'}
                    >
                      {insight.actionText}
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}