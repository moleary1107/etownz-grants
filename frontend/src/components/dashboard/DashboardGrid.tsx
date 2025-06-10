"use client"

import React, { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { 
  Settings, 
  X, 
  GripVertical,
  BarChart3,
  FileText,
  Clock,
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Zap,
  Bell,
  Calendar
} from 'lucide-react'
import { User, UserRole } from '../../lib/auth'

// Widget Types
export interface DashboardWidget {
  id: string
  type: WidgetType
  title: string
  size: 'small' | 'medium' | 'large'
  position: number
  visible: boolean
  data?: any
  config?: Record<string, any>
}

export type WidgetType = 
  | 'stats_overview' 
  | 'recent_activity' 
  | 'quick_actions' 
  | 'upcoming_deadlines'
  | 'grant_recommendations'
  | 'performance_chart'
  | 'team_activity'
  | 'ai_insights'
  | 'funding_tracker'
  | 'compliance_status'
  | 'analytics_dashboard'

interface DashboardGridProps {
  user: User
  widgets: DashboardWidget[]
  onWidgetUpdate: (widgets: DashboardWidget[]) => void
  onWidgetConfig?: (widgetId: string) => void
}

const WIDGET_ICONS: Record<WidgetType, React.ElementType> = {
  stats_overview: BarChart3,
  recent_activity: Bell,
  quick_actions: Zap,
  upcoming_deadlines: Clock,
  grant_recommendations: Target,
  performance_chart: TrendingUp,
  team_activity: Users,
  ai_insights: Zap,
  funding_tracker: DollarSign,
  compliance_status: FileText,
  analytics_dashboard: TrendingUp
}

const DEFAULT_WIDGETS_BY_ROLE: Record<UserRole, Partial<DashboardWidget>[]> = {
  [UserRole.SUPER_ADMIN]: [
    { type: 'stats_overview', title: 'Platform Overview', size: 'large' },
    { type: 'analytics_dashboard', title: 'Interactive Analytics', size: 'large' },
    { type: 'performance_chart', title: 'System Performance', size: 'medium' },
    { type: 'team_activity', title: 'User Activity', size: 'medium' },
    { type: 'recent_activity', title: 'System Events', size: 'medium' }
  ],
  [UserRole.ORGANIZATION_ADMIN]: [
    { type: 'stats_overview', title: 'Organization Stats', size: 'large' },
    { type: 'analytics_dashboard', title: 'Team Analytics', size: 'large' },
    { type: 'team_activity', title: 'Team Performance', size: 'medium' },
    { type: 'funding_tracker', title: 'Funding Overview', size: 'medium' },
    { type: 'upcoming_deadlines', title: 'Team Deadlines', size: 'small' },
    { type: 'quick_actions', title: 'Admin Actions', size: 'small' }
  ],
  [UserRole.GRANT_WRITER]: [
    { type: 'stats_overview', title: 'My Applications', size: 'medium' },
    { type: 'upcoming_deadlines', title: 'My Deadlines', size: 'medium' },
    { type: 'grant_recommendations', title: 'Recommended Grants', size: 'large' },
    { type: 'analytics_dashboard', title: 'Performance Analytics', size: 'medium' },
    { type: 'ai_insights', title: 'AI Suggestions', size: 'medium' },
    { type: 'quick_actions', title: 'Quick Actions', size: 'small' },
    { type: 'recent_activity', title: 'Recent Activity', size: 'small' }
  ],
  [UserRole.VIEWER]: [
    { type: 'stats_overview', title: 'Grant Overview', size: 'medium' },
    { type: 'grant_recommendations', title: 'Available Grants', size: 'large' },
    { type: 'upcoming_deadlines', title: 'Upcoming Deadlines', size: 'medium' },
    { type: 'analytics_dashboard', title: 'Grant Analytics', size: 'medium' },
    { type: 'recent_activity', title: 'Recent Updates', size: 'medium' }
  ]
}

export function DashboardGrid({ user, widgets, onWidgetUpdate, onWidgetConfig }: DashboardGridProps) {
  const [isCustomizing, setIsCustomizing] = useState(false)
  const [localWidgets, setLocalWidgets] = useState<DashboardWidget[]>(widgets)

  useEffect(() => {
    setLocalWidgets(widgets)
  }, [widgets])

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(localWidgets)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    // Update positions
    const updatedWidgets = items.map((widget, index) => ({
      ...widget,
      position: index
    }))

    setLocalWidgets(updatedWidgets)
    onWidgetUpdate(updatedWidgets)
  }

  const toggleWidgetVisibility = (widgetId: string) => {
    const updatedWidgets = localWidgets.map(widget =>
      widget.id === widgetId 
        ? { ...widget, visible: !widget.visible }
        : widget
    )
    setLocalWidgets(updatedWidgets)
    onWidgetUpdate(updatedWidgets)
  }

  const getWidgetSizeClass = (size: DashboardWidget['size']) => {
    switch (size) {
      case 'small': return 'col-span-1'
      case 'medium': return 'col-span-1 lg:col-span-2'
      case 'large': return 'col-span-1 lg:col-span-3'
      default: return 'col-span-1'
    }
  }

  const renderWidget = (widget: DashboardWidget, isDragging = false) => {
    const IconComponent = WIDGET_ICONS[widget.type]
    
    return (
      <Card className={`${isDragging ? 'rotate-3 shadow-xl' : ''} transition-all duration-200`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2">
            {isCustomizing && (
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
            )}
            <IconComponent className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
          </div>
          {isCustomizing && (
            <div className="flex items-center space-x-1">
              {onWidgetConfig && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onWidgetConfig(widget.id)}
                  className="h-6 w-6 p-0"
                >
                  <Settings className="h-3 w-3" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleWidgetVisibility(widget.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <WidgetContent widget={widget} user={user} />
        </CardContent>
      </Card>
    )
  }

  const visibleWidgets = localWidgets
    .filter(widget => widget.visible)
    .sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      {/* Customization Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
          <p className="text-sm text-gray-600">
            {isCustomizing ? 'Drag widgets to reorder, click × to hide' : 'Your personalized overview'}
          </p>
        </div>
        <Button
          variant={isCustomizing ? "default" : "outline"}
          onClick={() => setIsCustomizing(!isCustomizing)}
          className="flex items-center space-x-2"
        >
          <Settings className="h-4 w-4" />
          <span>{isCustomizing ? 'Done' : 'Customize'}</span>
        </Button>
      </div>

      {/* Widget Grid */}
      {isCustomizing ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard-widgets">
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${
                  snapshot.isDraggingOver ? 'bg-blue-50 rounded-lg p-2' : ''
                }`}
              >
                {visibleWidgets.map((widget, index) => (
                  <Draggable key={widget.id} draggableId={widget.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={getWidgetSizeClass(widget.size)}
                      >
                        {renderWidget(widget, snapshot.isDragging)}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {visibleWidgets.map((widget) => (
            <div key={widget.id} className={getWidgetSizeClass(widget.size)}>
              {renderWidget(widget)}
            </div>
          ))}
        </div>
      )}

      {/* Hidden Widgets Panel */}
      {isCustomizing && localWidgets.some(w => !w.visible) && (
        <Card className="bg-gray-50">
          <CardHeader>
            <CardTitle className="text-sm">Hidden Widgets</CardTitle>
            <CardDescription>Click to add back to dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {localWidgets
                .filter(widget => !widget.visible)
                .map((widget) => {
                  const IconComponent = WIDGET_ICONS[widget.type]
                  return (
                    <Button
                      key={widget.id}
                      variant="outline"
                      size="sm"
                      onClick={() => toggleWidgetVisibility(widget.id)}
                      className="flex items-center space-x-2"
                    >
                      <IconComponent className="h-3 w-3" />
                      <span>{widget.title}</span>
                    </Button>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Widget Content Component
function WidgetContent({ widget, user }: { widget: DashboardWidget; user: User }) {
  switch (widget.type) {
    case 'stats_overview':
      return <StatsOverviewWidget user={user} />
    case 'recent_activity':
      return <RecentActivityWidget user={user} />
    case 'quick_actions':
      return <QuickActionsWidget user={user} />
    case 'upcoming_deadlines':
      return <UpcomingDeadlinesWidget user={user} />
    case 'grant_recommendations':
      return <GrantRecommendationsWidget user={user} />
    case 'ai_insights':
      return <AIInsightsWidget user={user} />
    case 'analytics_dashboard':
      return <AnalyticsDashboardWidget user={user} />
    default:
      return (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">Widget content coming soon</p>
        </div>
      )
  }
}

// Individual Widget Components
function StatsOverviewWidget({ user }: { user: User }) {
  const stats = [
    { label: 'Active', value: '8', color: 'text-blue-600' },
    { label: 'Success Rate', value: '42%', color: 'text-green-600' },
    { label: 'This Month', value: '12', color: 'text-purple-600' }
  ]

  return (
    <div className="grid grid-cols-3 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="text-center">
          <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-gray-500">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}

function RecentActivityWidget({ user }: { user: User }) {
  const activities = [
    { title: 'Grant submitted', time: '2h ago', type: 'success' },
    { title: 'Deadline reminder', time: '4h ago', type: 'warning' },
    { title: 'New opportunity', time: '6h ago', type: 'info' }
  ]

  return (
    <div className="space-y-2">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm">{activity.title}</span>
          <span className="text-xs text-gray-500">{activity.time}</span>
        </div>
      ))}
    </div>
  )
}

function QuickActionsWidget({ user }: { user: User }) {
  const actions = user.role === UserRole.GRANT_WRITER 
    ? ['New Application', 'Find Grants', 'Check Deadlines']
    : ['View Applications', 'Browse Grants', 'Monitor Team']

  return (
    <div className="space-y-2">
      {actions.map((action, index) => (
        <Button key={index} variant="outline" size="sm" className="w-full justify-start">
          {action}
        </Button>
      ))}
    </div>
  )
}

function UpcomingDeadlinesWidget({ user }: { user: User }) {
  const deadlines = [
    { grant: 'SFI Discover', days: 3, urgent: true },
    { grant: 'Enterprise Ireland', days: 7, urgent: false },
    { grant: 'Dublin City Council', days: 14, urgent: false }
  ]

  return (
    <div className="space-y-2">
      {deadlines.map((deadline, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-sm truncate">{deadline.grant}</span>
          <span className={`text-xs px-2 py-1 rounded ${
            deadline.urgent ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {deadline.days}d
          </span>
        </div>
      ))}
    </div>
  )
}

function GrantRecommendationsWidget({ user }: { user: User }) {
  const grants = [
    { title: 'Innovation Fund 2024', match: 95, amount: '€50K' },
    { title: 'Research Excellence', match: 87, amount: '€25K' },
    { title: 'Community Impact', match: 72, amount: '€15K' }
  ]

  return (
    <div className="space-y-3">
      {grants.map((grant, index) => (
        <div key={index} className="border rounded p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">{grant.title}</span>
            <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
              {grant.match}%
            </span>
          </div>
          <div className="text-xs text-gray-500">{grant.amount}</div>
        </div>
      ))}
    </div>
  )
}

function AIInsightsWidget({ user }: { user: User }) {
  const insights = [
    'Your application completion rate is 23% above average',
    'Consider applying to 2 more grants this month',
    'Success rate could improve by 15% with better budget planning'
  ]

  return (
    <div className="space-y-2">
      {insights.map((insight, index) => (
        <div key={index} className="flex items-start space-x-2">
          <Zap className="h-3 w-3 text-blue-500 mt-1 flex-shrink-0" />
          <span className="text-xs text-gray-700">{insight}</span>
        </div>
      ))}
    </div>
  )
}

function AnalyticsDashboardWidget({ user }: { user: User }) {
  // Simplified analytics widget for dashboard embedding
  const metrics = [
    { label: 'Success Rate', value: '42%', trend: '+5.2%', color: 'text-green-600' },
    { label: 'Applications', value: '23', trend: '+12%', color: 'text-blue-600' },
    { label: 'Funding', value: '€125K', trend: '+27%', color: 'text-purple-600' }
  ]

  const chartData = [
    { month: 'Jan', value: 65 },
    { month: 'Feb', value: 72 },
    { month: 'Mar', value: 68 },
    { month: 'Apr', value: 78 },
    { month: 'May', value: 85 }
  ]

  const maxValue = Math.max(...chartData.map(d => d.value))

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((metric, index) => (
          <div key={index} className="text-center">
            <div className={`text-lg font-bold ${metric.color}`}>{metric.value}</div>
            <div className="text-xs text-gray-500">{metric.label}</div>
            <div className="text-xs text-green-600">{metric.trend}</div>
          </div>
        ))}
      </div>

      {/* Mini Chart */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-gray-700">Performance Trend</div>
        <div className="flex items-end justify-between h-16 space-x-1">
          {chartData.map((point, index) => (
            <div key={index} className="flex flex-col items-center flex-1">
              <div 
                className="w-full bg-blue-500 rounded-sm transition-all duration-300"
                style={{ 
                  height: `${(point.value / maxValue) * 100}%`,
                  minHeight: '4px'
                }}
              />
              <span className="text-xs text-gray-500 mt-1">{point.month}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Action */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full"
        onClick={() => window.location.href = '/dashboard/analytics'}
      >
        <BarChart3 className="h-3 w-3 mr-1" />
        View Full Analytics
      </Button>
    </div>
  )
}

// Utility function to generate default widgets for a user
export function generateDefaultWidgets(user: User): DashboardWidget[] {
  const defaultWidgets = DEFAULT_WIDGETS_BY_ROLE[user.role] || []
  
  return defaultWidgets.map((widget, index) => ({
    id: `${widget.type}-${index}`,
    type: widget.type!,
    title: widget.title!,
    size: widget.size || 'medium',
    position: index,
    visible: true,
    data: {},
    config: {}
  }))
}