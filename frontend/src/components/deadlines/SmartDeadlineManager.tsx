"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Clock,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Target,
  TrendingUp,
  Brain,
  Zap,
  Bell,
  Filter,
  RefreshCw,
  Plus,
  Edit,
  ArrowRight,
  Timer,
  Flame,
  CalendarDays,
  AlarmClock,
  MessageSquare,
  BookOpen,
  User,
  Users
} from 'lucide-react'
import { User as UserType } from '../../lib/auth'

interface DeadlineItem {
  id: string
  title: string
  description: string
  grantId: string
  grantTitle: string
  deadlineDate: Date
  category: 'application' | 'report' | 'milestone' | 'review'
  priority: 'low' | 'medium' | 'high' | 'critical'
  status: 'upcoming' | 'in-progress' | 'completed' | 'missed' | 'at-risk'
  estimatedWorkload: number // hours
  dependencies: string[]
  assignedTo: string[]
  progress: number
  aiPredictions: {
    riskScore: number
    completionProbability: number
    recommendedStartDate: Date
    recommendedActions: string[]
    similarDeadlinePerformance: number
  }
  reminders: Reminder[]
  milestones: Milestone[]
}

interface Reminder {
  id: string
  type: 'email' | 'push' | 'dashboard'
  triggerDate: Date
  message: string
  sent: boolean
  priority: 'low' | 'medium' | 'high'
}

interface Milestone {
  id: string
  title: string
  description: string
  dueDate: Date
  completed: boolean
  estimatedHours: number
  dependencies: string[]
}

interface DeadlineAnalytics {
  upcomingCount: number
  atRiskCount: number
  completedThisMonth: number
  averageCompletionRate: number
  workloadDistribution: { week: string; hours: number }[]
  riskTrends: { date: string; riskScore: number }[]
  categoryBreakdown: { category: string; count: number; risk: number }[]
}

interface SmartDeadlineManagerProps {
  user: UserType
  deadlines?: DeadlineItem[]
  onDeadlineUpdate?: (deadline: DeadlineItem) => void
  onReminderCreate?: (reminder: Reminder) => void
  className?: string
}

export function SmartDeadlineManager({ 
  user, 
  deadlines = [],
  onDeadlineUpdate,
  onReminderCreate,
  className = "" 
}: SmartDeadlineManagerProps) {
  const [mockDeadlines, setMockDeadlines] = useState<DeadlineItem[]>(createMockDeadlines())
  const [selectedDeadline, setSelectedDeadline] = useState<DeadlineItem | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'deadline' | 'risk' | 'priority'>('deadline')
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const activeDeadlines = deadlines.length > 0 ? deadlines : mockDeadlines

  // Calculate analytics
  const analytics: DeadlineAnalytics = useMemo(() => {
    const now = new Date()
    const upcoming = activeDeadlines.filter(d => d.deadlineDate > now && d.status !== 'completed')
    const atRisk = activeDeadlines.filter(d => d.aiPredictions.riskScore > 70)
    const completedThisMonth = activeDeadlines.filter(d => {
      const monthAgo = new Date(now.getFullYear(), now.getMonth(), 1)
      return d.status === 'completed' && d.deadlineDate >= monthAgo
    })

    const completionRate = activeDeadlines.length > 0 
      ? (activeDeadlines.filter(d => d.status === 'completed').length / activeDeadlines.length) * 100
      : 0

    // Generate workload distribution for next 4 weeks
    const workloadDistribution = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now)
      weekStart.setDate(weekStart.getDate() + (i * 7))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const weekHours = activeDeadlines
        .filter(d => d.deadlineDate >= weekStart && d.deadlineDate <= weekEnd)
        .reduce((sum, d) => sum + d.estimatedWorkload, 0)
      
      return {
        week: `Week ${i + 1}`,
        hours: weekHours
      }
    })

    // Category breakdown
    const categoryBreakdown = ['application', 'report', 'milestone', 'review'].map(category => {
      const categoryDeadlines = activeDeadlines.filter(d => d.category === category)
      const avgRisk = categoryDeadlines.length > 0
        ? categoryDeadlines.reduce((sum, d) => sum + d.aiPredictions.riskScore, 0) / categoryDeadlines.length
        : 0
      
      return {
        category,
        count: categoryDeadlines.length,
        risk: avgRisk
      }
    })

    return {
      upcomingCount: upcoming.length,
      atRiskCount: atRisk.length,
      completedThisMonth: completedThisMonth.length,
      averageCompletionRate: completionRate,
      workloadDistribution,
      riskTrends: [], // Would be populated from historical data
      categoryBreakdown
    }
  }, [activeDeadlines])

  // Filter and sort deadlines
  const filteredDeadlines = useMemo(() => {
    let filtered = activeDeadlines

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(d => d.status === filterStatus)
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(d => d.priority === filterPriority)
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return a.deadlineDate.getTime() - b.deadlineDate.getTime()
        case 'risk':
          return b.aiPredictions.riskScore - a.aiPredictions.riskScore
        case 'priority':
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityOrder[b.priority] - priorityOrder[a.priority]
        default:
          return 0
      }
    })
  }, [activeDeadlines, filterStatus, filterPriority, sortBy])

  // AI-powered deadline analysis
  const runDeadlineAnalysis = async () => {
    setIsAnalyzing(true)
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update risk scores and recommendations based on current progress
    const updatedDeadlines = activeDeadlines.map(deadline => {
      const daysUntilDeadline = Math.ceil((deadline.deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const workloadPerDay = deadline.estimatedWorkload / Math.max(1, daysUntilDeadline)
      
      let riskScore = 0
      const recommendations: string[] = []
      
      // Calculate risk based on various factors
      if (daysUntilDeadline < 7) {
        riskScore += 30
        recommendations.push('Urgent: Deadline is within 7 days')
      }
      
      if (deadline.progress < 50 && daysUntilDeadline < 14) {
        riskScore += 25
        recommendations.push('Consider reallocating resources to catch up')
      }
      
      if (workloadPerDay > 8) {
        riskScore += 20
        recommendations.push('Daily workload may be unrealistic - consider extending deadline or reducing scope')
      }
      
      if (deadline.dependencies.length > 0) {
        riskScore += 15
        recommendations.push('Monitor dependencies closely for potential delays')
      }
      
      // Calculate completion probability
      const completionProbability = Math.max(0, Math.min(100, 100 - riskScore + (deadline.progress * 0.5)))
      
      return {
        ...deadline,
        aiPredictions: {
          ...deadline.aiPredictions,
          riskScore: Math.min(100, riskScore),
          completionProbability,
          recommendedActions: recommendations
        }
      }
    })
    
    setMockDeadlines(updatedDeadlines)
    setIsAnalyzing(false)
  }

  // Create smart reminder
  const createSmartReminder = (deadline: DeadlineItem) => {
    const now = new Date()
    const daysUntil = Math.ceil((deadline.deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    
    const reminders: Reminder[] = []
    
    // Create multiple reminders based on deadline urgency
    if (daysUntil > 14) {
      reminders.push({
        id: `${deadline.id}-reminder-14d`,
        type: 'email',
        triggerDate: new Date(deadline.deadlineDate.getTime() - (14 * 24 * 60 * 60 * 1000)),
        message: `Two weeks until ${deadline.title} deadline`,
        sent: false,
        priority: 'medium'
      })
    }
    
    if (daysUntil > 7) {
      reminders.push({
        id: `${deadline.id}-reminder-7d`,
        type: 'push',
        triggerDate: new Date(deadline.deadlineDate.getTime() - (7 * 24 * 60 * 60 * 1000)),
        message: `One week until ${deadline.title} deadline`,
        sent: false,
        priority: 'high'
      })
    }
    
    if (daysUntil > 1) {
      reminders.push({
        id: `${deadline.id}-reminder-1d`,
        type: 'dashboard',
        triggerDate: new Date(deadline.deadlineDate.getTime() - (24 * 60 * 60 * 1000)),
        message: `Final day for ${deadline.title}`,
        sent: false,
        priority: 'high'
      })
    }
    
    reminders.forEach(reminder => {
      if (onReminderCreate) {
        onReminderCreate(reminder)
      }
    })
    
    // Update deadline with new reminders
    const updatedDeadline = { ...deadline, reminders }
    if (onDeadlineUpdate) {
      onDeadlineUpdate(updatedDeadline)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in-progress': return 'bg-blue-100 text-blue-800'
      case 'at-risk': return 'bg-red-100 text-red-800'
      case 'missed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-orange-600 text-white'
      case 'medium': return 'bg-yellow-600 text-white'
      default: return 'bg-gray-600 text-white'
    }
  }

  const getRiskColor = (risk: number) => {
    if (risk >= 80) return 'text-red-600'
    if (risk >= 60) return 'text-orange-600'
    if (risk >= 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const formatTimeRemaining = (deadline: Date) => {
    const now = new Date()
    const diff = deadline.getTime() - now.getTime()
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    
    if (days < 0) return 'Overdue'
    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'
    if (days < 7) return `${days} days`
    if (days < 30) return `${Math.ceil(days / 7)} weeks`
    return `${Math.ceil(days / 30)} months`
  }

  useEffect(() => {
    // Run initial analysis
    runDeadlineAnalysis()
  }, [])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-blue-600" />
            Smart Deadline Management
          </h2>
          <p className="text-gray-600 mt-1">AI-powered deadline tracking with predictive insights</p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={runDeadlineAnalysis}
            disabled={isAnalyzing}
            className="flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>Re-analyze</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center space-x-1"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Analytics</span>
          </Button>
        </div>
      </div>

      {/* Analytics Dashboard */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{analytics.upcomingCount}</div>
                <div className="text-sm text-gray-600">Upcoming Deadlines</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{analytics.atRiskCount}</div>
                <div className="text-sm text-gray-600">At Risk</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{analytics.completedThisMonth}</div>
                <div className="text-sm text-gray-600">Completed This Month</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Math.round(analytics.averageCompletionRate)}%</div>
                <div className="text-sm text-gray-600">Completion Rate</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workload Distribution */}
      {showAnalytics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Timer className="h-5 w-5 mr-2" />
              Upcoming Workload Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.workloadDistribution.map((week, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>{week.week}</span>
                    <span className="font-medium">{week.hours}h</span>
                  </div>
                  <Progress value={(week.hours / 40) * 100} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Statuses</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="in-progress">In Progress</option>
                  <option value="at-risk">At Risk</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Priority:</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="all">All Priorities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="deadline">Deadline</option>
                  <option value="risk">Risk Score</option>
                  <option value="priority">Priority</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-2 sm:mt-0">
              Showing {filteredDeadlines.length} of {activeDeadlines.length} deadlines
            </p>
          </div>

          {/* Timeline */}
          <div className="space-y-4">
            {filteredDeadlines.map((deadline) => (
              <Card 
                key={deadline.id} 
                className={`hover:shadow-lg transition-shadow cursor-pointer ${
                  deadline.aiPredictions.riskScore > 70 ? 'border-red-200 bg-red-50' : ''
                }`}
                onClick={() => setSelectedDeadline(deadline)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{deadline.title}</h3>
                        <Badge className={getPriorityColor(deadline.priority)}>
                          {deadline.priority}
                        </Badge>
                        <Badge className={getStatusColor(deadline.status)}>
                          {deadline.status}
                        </Badge>
                        {deadline.aiPredictions.riskScore > 70 && (
                          <Badge className="bg-red-600 text-white flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3" />
                            <span>High Risk</span>
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2">{deadline.grantTitle}</p>
                      <p className="text-gray-700 text-sm mb-4">{deadline.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-blue-600" />
                          <span>{deadline.deadlineDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-green-600" />
                          <span>{formatTimeRemaining(deadline.deadlineDate)}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-purple-600" />
                          <span>{deadline.estimatedWorkload}h estimated</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Target className="h-4 w-4 text-orange-600" />
                          <span>{deadline.progress}% complete</span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{deadline.progress}%</span>
                        </div>
                        <Progress value={deadline.progress} className="h-2" />
                      </div>
                    </div>
                    
                    <div className="ml-6 text-right">
                      <div className="text-2xl font-bold mb-1">
                        <span className={getRiskColor(deadline.aiPredictions.riskScore)}>
                          {deadline.aiPredictions.riskScore}%
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">Risk Score</div>
                      <div className="text-sm font-medium text-green-600">
                        {deadline.aiPredictions.completionProbability}% likely to complete
                      </div>
                      
                      <div className="mt-4 space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            createSmartReminder(deadline)
                          }}
                          className="w-full"
                        >
                          <Bell className="h-3 w-3 mr-1" />
                          Set Reminders
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Navigate to deadline details
                          }}
                          className="w-full"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* AI Recommendations */}
                  {deadline.aiPredictions.recommendedActions.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
                        <Brain className="h-4 w-4 mr-1" />
                        AI Recommendations
                      </h4>
                      <ul className="space-y-1">
                        {deadline.aiPredictions.recommendedActions.slice(0, 2).map((action, index) => (
                          <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                            <Zap className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Assigned Team */}
                  {deadline.assignedTo.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-600" />
                        <span className="text-sm text-gray-600">
                          Assigned to: {deadline.assignedTo.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredDeadlines.length === 0 && (
            <div className="text-center py-12">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No deadlines found</h3>
              <p className="text-gray-600">
                Try adjusting your filters or create a new deadline to get started.
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="list">
          <DeadlineListView deadlines={filteredDeadlines} onDeadlineSelect={setSelectedDeadline} />
        </TabsContent>

        <TabsContent value="calendar">
          <DeadlineCalendarView deadlines={filteredDeadlines} onDeadlineSelect={setSelectedDeadline} />
        </TabsContent>

        <TabsContent value="insights">
          <AIInsightsPanel deadlines={activeDeadlines} analytics={analytics} />
        </TabsContent>
      </Tabs>

      {/* Detailed View Modal */}
      {selectedDeadline && (
        <DeadlineDetailModal 
          deadline={selectedDeadline} 
          onClose={() => setSelectedDeadline(null)}
          onUpdate={onDeadlineUpdate}
        />
      )}
    </div>
  )
}

// Additional Components
function DeadlineListView({ deadlines, onDeadlineSelect }: { deadlines: DeadlineItem[]; onDeadlineSelect: (deadline: DeadlineItem) => void }) {
  return (
    <div className="space-y-2">
      {deadlines.map((deadline) => (
        <div 
          key={deadline.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
          onClick={() => onDeadlineSelect(deadline)}
        >
          <div className="flex items-center space-x-4">
            <div className={`w-3 h-3 rounded-full ${
              deadline.aiPredictions.riskScore > 70 ? 'bg-red-500' :
              deadline.aiPredictions.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
            }`} />
            <div>
              <h3 className="font-medium">{deadline.title}</h3>
              <p className="text-sm text-gray-600">{deadline.grantTitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">{deadline.deadlineDate.toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">{deadline.progress}% complete</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function DeadlineCalendarView({ deadlines, onDeadlineSelect }: { deadlines: DeadlineItem[]; onDeadlineSelect: (deadline: DeadlineItem) => void }) {
  // Simple calendar implementation - would typically use a calendar library
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar View</CardTitle>
        <CardDescription>Visual timeline of all deadlines</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <CalendarDays className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Calendar view would be implemented here</p>
          <p className="text-sm text-gray-500 mt-2">
            Integration with calendar libraries like react-big-calendar or FullCalendar
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function AIInsightsPanel({ deadlines, analytics }: { deadlines: DeadlineItem[]; analytics: DeadlineAnalytics }) {
  const insights = useMemo(() => {
    const highRiskDeadlines = deadlines.filter(d => d.aiPredictions.riskScore > 70)
    const overdue = deadlines.filter(d => d.deadlineDate < new Date() && d.status !== 'completed')
    
    return {
      criticalIssues: highRiskDeadlines.length,
      overdueCount: overdue.length,
      recommendations: [
        'Consider redistributing workload from high-risk deadlines',
        'Schedule weekly check-ins for deadlines with >50% risk score',
        'Automate reminder notifications for team members',
        'Review and update time estimates based on historical performance'
      ]
    }
  }, [deadlines])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="h-5 w-5 mr-2" />
            AI-Powered Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{insights.criticalIssues}</div>
              <div className="text-sm text-gray-600">Critical Issues</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{insights.overdueCount}</div>
              <div className="text-sm text-gray-600">Overdue Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{Math.round(analytics.averageCompletionRate)}%</div>
              <div className="text-sm text-gray-600">Success Rate</div>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Strategic Recommendations</h3>
            <ul className="space-y-2">
              {insights.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DeadlineDetailModal({ deadline, onClose, onUpdate }: { 
  deadline: DeadlineItem; 
  onClose: () => void; 
  onUpdate?: (deadline: DeadlineItem) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{deadline.title}</h2>
            <Button variant="ghost" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Detailed deadline information would go here */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">Details</h3>
              <p className="text-gray-700">{deadline.description}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Progress</h4>
                <Progress value={deadline.progress} className="h-3 mb-2" />
                <p className="text-sm text-gray-600">{deadline.progress}% complete</p>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Risk Assessment</h4>
                <div className="text-2xl font-bold text-red-600">{deadline.aiPredictions.riskScore}%</div>
                <p className="text-sm text-gray-600">Risk of missing deadline</p>
              </div>
            </div>
            
            {deadline.milestones.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Milestones</h4>
                <div className="space-y-2">
                  {deadline.milestones.map((milestone) => (
                    <div key={milestone.id} className="flex items-center space-x-3 p-2 border rounded">
                      <CheckCircle className={`h-4 w-4 ${milestone.completed ? 'text-green-600' : 'text-gray-400'}`} />
                      <div className="flex-1">
                        <div className="font-medium">{milestone.title}</div>
                        <div className="text-sm text-gray-600">{milestone.description}</div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {milestone.dueDate.toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to create mock data
function createMockDeadlines(): DeadlineItem[] {
  const now = new Date()
  
  return [
    {
      id: 'deadline-1',
      title: 'Final Application Submission',
      description: 'Submit complete application package for Enterprise Ireland Innovation Fund',
      grantId: 'grant-1',
      grantTitle: 'Enterprise Ireland Innovation Fund 2024',
      deadlineDate: new Date(now.getTime() + (5 * 24 * 60 * 60 * 1000)), // 5 days from now
      category: 'application',
      priority: 'critical',
      status: 'in-progress',
      estimatedWorkload: 24,
      dependencies: ['budget-approval', 'technical-review'],
      assignedTo: ['John Doe', 'Jane Smith'],
      progress: 65,
      aiPredictions: {
        riskScore: 75,
        completionProbability: 68,
        recommendedStartDate: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)),
        recommendedActions: [
          'Focus on completing budget breakdown section',
          'Schedule final review meeting with team',
          'Prepare supporting documentation'
        ],
        similarDeadlinePerformance: 72
      },
      reminders: [],
      milestones: [
        {
          id: 'milestone-1',
          title: 'Budget Section Complete',
          description: 'Finalize detailed budget breakdown',
          dueDate: new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000)),
          completed: false,
          estimatedHours: 8,
          dependencies: []
        },
        {
          id: 'milestone-2',
          title: 'Technical Review',
          description: 'Complete technical approach review',
          dueDate: new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)),
          completed: true,
          estimatedHours: 6,
          dependencies: []
        }
      ]
    },
    {
      id: 'deadline-2',
      title: 'Quarterly Progress Report',
      description: 'Submit progress report for ongoing SFI project',
      grantId: 'grant-2',
      grantTitle: 'Science Foundation Ireland Discover',
      deadlineDate: new Date(now.getTime() + (14 * 24 * 60 * 60 * 1000)), // 2 weeks from now
      category: 'report',
      priority: 'medium',
      status: 'upcoming',
      estimatedWorkload: 16,
      dependencies: [],
      assignedTo: ['Research Team'],
      progress: 25,
      aiPredictions: {
        riskScore: 35,
        completionProbability: 85,
        recommendedStartDate: new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000)),
        recommendedActions: [
          'Start data collection early',
          'Schedule stakeholder interviews'
        ],
        similarDeadlinePerformance: 88
      },
      reminders: [],
      milestones: []
    },
    {
      id: 'deadline-3',
      title: 'Project Milestone Review',
      description: 'Mid-project milestone review and demonstration',
      grantId: 'grant-3',
      grantTitle: 'Dublin City Council Business Grant',
      deadlineDate: new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)), // 1 month from now
      category: 'milestone',
      priority: 'high',
      status: 'upcoming',
      estimatedWorkload: 20,
      dependencies: ['prototype-completion'],
      assignedTo: ['Development Team', 'Project Manager'],
      progress: 10,
      aiPredictions: {
        riskScore: 45,
        completionProbability: 78,
        recommendedStartDate: new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000)),
        recommendedActions: [
          'Accelerate prototype development',
          'Prepare demo materials early'
        ],
        similarDeadlinePerformance: 65
      },
      reminders: [],
      milestones: []
    }
  ]
}

// Missing import for Lightbulb - make sure it's imported at the top
import { Lightbulb, X } from 'lucide-react'