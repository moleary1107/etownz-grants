"use client"

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { 
  Settings, 
  Bell, 
  Plus,
  Search,
  FileText,
  Clock,
  Target,
  Zap,
  BarChart3,
  ChevronRight,
  Menu,
  X,
  Home,
  Bookmark,
  User,
  Grid,
  List,
  Filter,
  RefreshCw,
  Smartphone,
  Wifi,
  WifiOff,
  Download
} from 'lucide-react'
import { User as UserType, UserRole } from '../../lib/auth'
import { DashboardWidget } from './DashboardGrid'
import { useDashboardStore } from '../../lib/store/dashboardStore'

interface MobileDashboardProps {
  user: UserType
  widgets: DashboardWidget[]
  onWidgetUpdate: (widgets: DashboardWidget[]) => void
  className?: string
}

export function MobileDashboard({ user, widgets, onWidgetUpdate, className = "" }: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState<'home' | 'widgets' | 'actions' | 'profile'>('home')
  const [isOnline, setIsOnline] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const { preferences } = useDashboardStore()

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    setIsOnline(navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const getQuickActions = () => {
    const baseActions = [
      { 
        id: 'new-app', 
        title: 'New Application', 
        icon: Plus, 
        color: 'bg-green-600', 
        href: '/dashboard/applications/create' 
      },
      { 
        id: 'find-grants', 
        title: 'Find Grants', 
        icon: Search, 
        color: 'bg-blue-600', 
        href: '/dashboard/grants' 
      },
      { 
        id: 'my-apps', 
        title: 'My Applications', 
        icon: FileText, 
        color: 'bg-purple-600', 
        href: '/dashboard/applications' 
      },
      { 
        id: 'deadlines', 
        title: 'Deadlines', 
        icon: Clock, 
        color: 'bg-orange-600', 
        href: '/dashboard/deadlines' 
      }
    ]

    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ORGANIZATION_ADMIN) {
      baseActions.push({
        id: 'analytics',
        title: 'Analytics',
        icon: BarChart3,
        color: 'bg-teal-600',
        href: '/dashboard/analytics'
      })
    }

    return baseActions
  }

  const renderMobileWidget = (widget: DashboardWidget) => {
    return (
      <Card key={widget.id} className="touch-none">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{widget.title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {widget.type.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <MobileWidgetContent widget={widget} user={user} />
        </CardContent>
      </Card>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-4">
            {/* Connection Status */}
            <Card className={`${!isOnline ? 'border-yellow-300 bg-yellow-50' : 'border-green-300 bg-green-50'}`}>
              <CardContent className="pt-4">
                <div className="flex items-center space-x-3">
                  {isOnline ? (
                    <Wifi className="h-5 w-5 text-green-600" />
                  ) : (
                    <WifiOff className="h-5 w-5 text-yellow-600" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {isOnline ? 'Connected' : 'Offline Mode'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isOnline ? 'Real-time sync enabled' : 'Working from cache'}
                    </p>
                  </div>
                  {!isOnline && (
                    <Button size="sm" variant="outline" className="ml-auto">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Welcome Message */}
            <Card>
              <CardContent className="pt-4">
                <h2 className="text-lg font-semibold mb-2">
                  Welcome back, {user.name.split(' ')[0]}!
                </h2>
                <p className="text-sm text-gray-600 mb-3">
                  {user.role === UserRole.GRANT_WRITER ? 
                    'Ready to discover new funding opportunities?' :
                    'Here\'s your organization overview.'
                  }
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-xl font-bold text-blue-600">8</div>
                    <div className="text-xs text-gray-500">Active Apps</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-orange-600">3</div>
                    <div className="text-xs text-gray-500">Deadlines</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {getQuickActions().slice(0, 4).map((action) => {
                    const IconComponent = action.icon
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className={`h-16 flex-col space-y-1 ${action.color} text-white border-none`}
                        onClick={() => window.location.href = action.href}
                      >
                        <IconComponent className="h-5 w-5" />
                        <span className="text-xs">{action.title}</span>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { title: 'Grant submitted', time: '2h ago', type: 'success' },
                    { title: 'Deadline reminder', time: '4h ago', type: 'warning' },
                    { title: 'New opportunity', time: '6h ago', type: 'info' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-2 h-2 rounded-full ${
                          activity.type === 'success' ? 'bg-green-500' :
                          activity.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        }`} />
                        <span className="text-sm">{activity.title}</span>
                      </div>
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 'widgets':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Dashboard Widgets</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-4' : 'space-y-3'}>
              {widgets.filter(w => w.visible).map(widget => 
                viewMode === 'grid' ? 
                  renderMobileWidget(widget) :
                  <Card key={widget.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{widget.title}</span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Card>
              )}
            </div>
          </div>
        )

      case 'actions':
        return (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">All Actions</h2>
            <div className="grid grid-cols-1 gap-3">
              {getQuickActions().map((action) => {
                const IconComponent = action.icon
                return (
                  <Card key={action.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="pt-4">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${action.color}`}>
                          <IconComponent className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{action.title}</h3>
                          <p className="text-sm text-gray-500">
                            {action.id === 'new-app' ? 'Start a new grant application' :
                             action.id === 'find-grants' ? 'Discover funding opportunities' :
                             action.id === 'my-apps' ? 'View your applications' :
                             action.id === 'deadlines' ? 'Check upcoming deadlines' :
                             'View analytics and insights'}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )

      case 'profile':
        return (
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <p className="text-sm text-gray-500 capitalize">
                    {user.role.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">App Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Notifications</span>
                  <Button variant="outline" size="sm">
                    <Bell className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Offline Mode</span>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Preferences</span>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-gray-50 ${className}`}>
      {/* Mobile Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Smartphone className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-lg font-semibold">eTownz Grants</h1>
            <p className="text-xs text-gray-500">Mobile Dashboard</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {!isOnline && (
            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
              Offline
            </Badge>
          )}
          <Button variant="ghost" size="sm">
            <Bell className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderTabContent()}
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t px-2 py-2">
        <div className="flex items-center justify-around">
          {[
            { id: 'home', icon: Home, label: 'Home' },
            { id: 'widgets', icon: Grid, label: 'Widgets' },
            { id: 'actions', icon: Target, label: 'Actions' },
            { id: 'profile', icon: User, label: 'Profile' }
          ].map((tab) => {
            const IconComponent = tab.icon
            const isActive = activeTab === tab.id
            return (
              <Button
                key={tab.id}
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-col space-y-1 h-auto py-2 ${
                  isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-600'
                }`}
              >
                <IconComponent className="h-5 w-5" />
                <span className="text-xs">{tab.label}</span>
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Mobile Widget Content Component
function MobileWidgetContent({ widget, user }: { widget: DashboardWidget; user: UserType }) {
  switch (widget.type) {
    case 'stats_overview':
      return (
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">8</div>
            <div className="text-xs text-gray-500">Active</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">42%</div>
            <div className="text-xs text-gray-500">Success</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">12</div>
            <div className="text-xs text-gray-500">Month</div>
          </div>
        </div>
      )

    case 'upcoming_deadlines':
      return (
        <div className="space-y-2">
          {[
            { grant: 'SFI Discover', days: 3, urgent: true },
            { grant: 'Enterprise Ireland', days: 7, urgent: false }
          ].map((deadline, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm truncate">{deadline.grant}</span>
              <Badge variant={deadline.urgent ? 'destructive' : 'secondary'} className="text-xs">
                {deadline.days}d
              </Badge>
            </div>
          ))}
        </div>
      )

    default:
      return (
        <div className="text-center py-2">
          <p className="text-sm text-gray-500">Mobile view coming soon</p>
        </div>
      )
  }
}