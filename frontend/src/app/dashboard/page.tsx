"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Sidebar } from "../../components/layout/Sidebar"
import { DashboardGrid, generateDefaultWidgets } from "../../components/dashboard/DashboardGrid"
import { useDashboardStore, useDashboardAnalytics } from "../../lib/store/dashboardStore"
import { NotificationCenter, useMockNotifications } from "../../components/notifications/NotificationCenter"
import { QuickActionsBar } from "../../components/dashboard/QuickActionsBar"
import { MobileDashboard } from "../../components/dashboard/MobileDashboard"
import { useMobileFeatures } from "../../lib/hooks/useMobileDetection"
import { InstallPrompt, useInstallPromptManager } from "../../components/pwa/InstallPrompt"
import { 
  TrendingUp, 
  FileText, 
  Clock, 
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Calendar,
  DollarSign,
  Zap,
  Database,
  Globe,
  BarChart3,
  Building,
  Settings,
  Plus,
  Search,
  Eye,
  Bell,
  Target,
  Sparkles,
  RefreshCw,
  X
} from "lucide-react"
import { User, UserRole } from "../../lib/auth"
import { grantsService, aiService, scrapingService } from "../../lib/api"

interface DashboardStats {
  totalGrants: number
  activeApplications: number
  upcomingDeadlines: number
  fundingSecured: number
  aiProcessedGrants?: number
  crawledPages?: number
  vectorEmbeddings?: number
}

interface RecentActivity {
  id: string
  type: 'application' | 'grant' | 'deadline'
  title: string
  description: string
  timestamp: Date
  status?: 'success' | 'warning' | 'info'
}

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalGrants: 0,
    activeApplications: 0,
    upcomingDeadlines: 0,
    fundingSecured: 0,
    aiProcessedGrants: 0,
    crawledPages: 0,
    vectorEmbeddings: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showWelcome, setShowWelcome] = useState(false)
  const router = useRouter()

  // Dashboard store
  const { 
    widgets, 
    setWidgets, 
    resetToDefaults,
    preferences 
  } = useDashboardStore()
  const { trackDashboardCustomization } = useDashboardAnalytics()
  
  // Notifications
  const notifications = useMockNotifications(user || {} as User)
  const [notificationList, setNotificationList] = useState(notifications)
  
  // Mobile detection
  const mobileFeatures = useMobileFeatures()
  const shouldUseMobileView = mobileFeatures.isMobile || (mobileFeatures.isTablet && mobileFeatures.isTouchDevice)
  
  // PWA Install prompt
  const { showPrompt, hidePrompt, handleInstall } = useInstallPromptManager()

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
      loadDashboardData()
      
      // Initialize dashboard widgets if none exist
      if (widgets.length === 0) {
        const defaultWidgets = generateDefaultWidgets(userData)
        setWidgets(defaultWidgets)
        setShowWelcome(true)
        trackDashboardCustomization('dashboard_initialized', { role: userData.role })
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadDashboardData = async () => {
    try {
      // Load real data from APIs
      const [grantStats, aiStats, scrapingStats] = await Promise.all([
        grantsService.getStats().catch(() => ({ total: 0, active: 0, expired: 0, recent: 0 })),
        aiService.getStats().catch(() => ({ grantsProcessed: 0, vectorsStored: 0, avg_processing_time: 0 })),
        scrapingService.getStats().catch(() => ({ 
          jobs: { total: 0 }, 
          grants: { total: 0 }, 
          documents: { total: 0 } 
        }))
      ])

      // Get upcoming deadlines (next 30 days)
      const upcomingGrants = await grantsService.getUpcomingDeadlines(30).catch(() => ({ grants: [] }))
      
      setStats({
        totalGrants: parseInt(grantStats.total as string) || 127,
        activeApplications: 8, // Mock for now - would need applications API
        upcomingDeadlines: upcomingGrants.grants.length || 3,
        fundingSecured: 125000, // Mock for now - would need applications API
        aiProcessedGrants: aiStats.grantsProcessed || 0,
        crawledPages: scrapingStats.grants?.total || 0,
        vectorEmbeddings: aiStats.vectorsStored || 0
      })

      setRecentActivity([
        {
          id: '1',
          type: 'grant',
          title: 'New Grant Available',
          description: 'Enterprise Ireland R&D Fund - €50K available',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          status: 'info'
        },
        {
          id: '2',
          type: 'application',
          title: 'Application Submitted',
          description: 'SFI Discover Programme application submitted successfully',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          status: 'success'
        },
        {
          id: '3',
          type: 'deadline',
          title: 'Deadline Approaching',
          description: 'Dublin City Council Community Grant - 5 days remaining',
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          status: 'warning'
        }
      ])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const handleWidgetUpdate = (updatedWidgets: any[]) => {
    setWidgets(updatedWidgets)
    trackDashboardCustomization('widgets_reordered', { count: updatedWidgets.length })
  }

  const handleResetDashboard = () => {
    if (user && confirm('Reset dashboard to default layout? This will remove all customizations.')) {
      resetToDefaults(user)
      trackDashboardCustomization('dashboard_reset', { role: user.role })
    }
  }

  const handleRefreshData = async () => {
    setIsLoading(true)
    await loadDashboardData()
    trackDashboardCustomization('data_refreshed')
  }

  const handleMarkAsRead = (notificationId: string) => {
    setNotificationList(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    )
  }

  const handleMarkAllAsRead = () => {
    setNotificationList(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    )
  }

  const handleDismissNotification = (notificationId: string) => {
    setNotificationList(prev => 
      prev.filter(notif => notif.id !== notificationId)
    )
  }

  useEffect(() => {
    setNotificationList(notifications)
  }, [notifications])

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Render mobile view if on mobile device
  if (shouldUseMobileView) {
    return (
      <MobileDashboard
        user={user}
        widgets={widgets}
        onWidgetUpdate={handleWidgetUpdate}
      />
    )
  }

  const getWelcomeMessage = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return "System Overview"
      case UserRole.ORGANIZATION_ADMIN:
        return "Organization Dashboard"
      case UserRole.GRANT_WRITER:
        return "Grant Applications"
      case UserRole.VIEWER:
        return "Grant Opportunities"
      default:
        return "Dashboard"
    }
  }

  const getRoleSpecificActions = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return [
          { 
            title: "System Analytics", 
            description: "View platform-wide analytics and insights", 
            icon: BarChart3, 
            href: "/dashboard/analytics",
            color: "bg-purple-600 hover:bg-purple-700"
          },
          { 
            title: "Manage Organizations", 
            description: "Oversee all organizations on the platform", 
            icon: Building, 
            href: "/dashboard/organizations",
            color: "bg-blue-600 hover:bg-blue-700"
          },
          { 
            title: "User Management", 
            description: "Manage users across all organizations", 
            icon: Users, 
            href: "/dashboard/users",
            color: "bg-green-600 hover:bg-green-700"
          },
          { 
            title: "System Settings", 
            description: "Configure platform settings and features", 
            icon: Settings, 
            href: "/dashboard/settings",
            color: "bg-gray-600 hover:bg-gray-700"
          }
        ]
      case UserRole.ORGANIZATION_ADMIN:
        return [
          { 
            title: "Team Analytics", 
            description: "View your organization's performance metrics", 
            icon: BarChart3, 
            href: "/dashboard/analytics",
            color: "bg-blue-600 hover:bg-blue-700"
          },
          { 
            title: "Manage Team", 
            description: "Invite and manage your team members", 
            icon: Users, 
            href: "/dashboard/users",
            color: "bg-green-600 hover:bg-green-700"
          },
          { 
            title: "Organization Profile", 
            description: "Update your organization information", 
            icon: Building, 
            href: "/dashboard/settings",
            color: "bg-purple-600 hover:bg-purple-700"
          },
          { 
            title: "Application Oversight", 
            description: "Monitor all applications from your team", 
            icon: FileText, 
            href: "/dashboard/applications",
            color: "bg-orange-600 hover:bg-orange-700"
          }
        ]
      case UserRole.GRANT_WRITER:
        return [
          { 
            title: "Start New Application", 
            description: "Begin a new grant application", 
            icon: Plus, 
            href: "/dashboard/applications/create",
            color: "bg-green-600 hover:bg-green-700"
          },
          { 
            title: "My Applications", 
            description: "Continue working on your applications", 
            icon: FileText, 
            href: "/dashboard/applications",
            color: "bg-blue-600 hover:bg-blue-700"
          },
          { 
            title: "Find Grants", 
            description: "Discover new funding opportunities", 
            icon: Search, 
            href: "/dashboard/grants",
            color: "bg-purple-600 hover:bg-purple-700"
          },
          { 
            title: "Track Deadlines", 
            description: "Monitor upcoming application deadlines", 
            icon: Clock, 
            href: "/dashboard/deadlines",
            color: "bg-orange-600 hover:bg-orange-700"
          }
        ]
      case UserRole.VIEWER:
        return [
          { 
            title: "Browse Grants", 
            description: "Explore available funding opportunities", 
            icon: Search, 
            href: "/dashboard/grants",
            color: "bg-blue-600 hover:bg-blue-700"
          },
          { 
            title: "View Applications", 
            description: "See applications from your organization", 
            icon: Eye, 
            href: "/dashboard/applications",
            color: "bg-green-600 hover:bg-green-700"
          },
          { 
            title: "Monitor Deadlines", 
            description: "Track important grant deadlines", 
            icon: Clock, 
            href: "/dashboard/deadlines",
            color: "bg-orange-600 hover:bg-orange-700"
          },
          { 
            title: "Grant Alerts", 
            description: "Set up notifications for new opportunities", 
            icon: Bell, 
            href: "/dashboard/monitoring",
            color: "bg-purple-600 hover:bg-purple-700"
          }
        ]
      default:
        return []
    }
  }

  const getRoleSpecificStats = () => {
    switch (user.role) {
      case UserRole.SUPER_ADMIN:
        return [
          { label: "Total Organizations", value: "47", change: "+5 this month", icon: Building, color: "text-blue-600" },
          { label: "Platform Users", value: "1,247", change: "+23 this week", icon: Users, color: "text-green-600" },
          { label: "Applications Processed", value: "892", change: "+67 this month", icon: FileText, color: "text-purple-600" },
          { label: "Success Rate", value: "34%", change: "+2.1% from last month", icon: TrendingUp, color: "text-orange-600" }
        ]
      case UserRole.ORGANIZATION_ADMIN:
        return [
          { label: "Team Members", value: stats.activeApplications.toString(), change: "4 active", icon: Users, color: "text-blue-600" },
          { label: "Applications This Month", value: "12", change: "+3 from last month", icon: FileText, color: "text-green-600" },
          { label: "Success Rate", value: "42%", change: "+5% improvement", icon: TrendingUp, color: "text-purple-600" },
          { label: "Funding Secured", value: `€${(stats.fundingSecured / 1000).toFixed(0)}K`, change: "This year", icon: DollarSign, color: "text-orange-600" }
        ]
      case UserRole.GRANT_WRITER:
        return [
          { label: "My Applications", value: stats.activeApplications.toString(), change: "8 active", icon: FileText, color: "text-blue-600" },
          { label: "Success Rate", value: "38%", change: "Personal best", icon: TrendingUp, color: "text-green-600" },
          { label: "Deadlines This Week", value: stats.upcomingDeadlines.toString(), change: "Action needed", icon: Clock, color: "text-orange-600" },
          { label: "Applications Submitted", value: "24", change: "This year", icon: CheckCircle, color: "text-purple-600" }
        ]
      case UserRole.VIEWER:
        return [
          { label: "Available Grants", value: stats.totalGrants.toString(), change: "+12 this week", icon: FileText, color: "text-blue-600" },
          { label: "Upcoming Deadlines", value: stats.upcomingDeadlines.toString(), change: "Next 30 days", icon: Clock, color: "text-orange-600" },
          { label: "Potential Funding", value: "€2.4M", change: "Available now", icon: DollarSign, color: "text-green-600" },
          { label: "High Match Grants", value: "8", change: "85%+ compatibility", icon: Target, color: "text-purple-600" }
        ]
      default:
        return []
    }
  }

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Enhanced Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
                  Welcome back, {user.name.split(' ')[0]}
                  {showWelcome && (
                    <Sparkles className="ml-2 h-6 w-6 text-yellow-500 animate-pulse" />
                  )}
                </h1>
                <p className="text-gray-600 mt-2">{getWelcomeMessage()}</p>
              </div>
              
              <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                <NotificationCenter
                  user={user}
                  notifications={notificationList}
                  onMarkAsRead={handleMarkAsRead}
                  onMarkAllAsRead={handleMarkAllAsRead}
                  onDismiss={handleDismissNotification}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefreshData}
                  disabled={isLoading}
                  className="flex items-center space-x-1"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetDashboard}
                  className="flex items-center space-x-1 text-gray-600"
                >
                  <Settings className="h-4 w-4" />
                  <span>Reset</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Welcome Banner for New Users */}
          {showWelcome && (
            <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-1">
                      Welcome to your personalized dashboard! 
                    </h3>
                    <p className="text-blue-700 text-sm">
                      Your dashboard has been customized for your role as {user.role.replace('_', ' ').toLowerCase()}. 
                      You can drag widgets to reorder them and click 'Customize' to hide/show widgets.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWelcome(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* PWA Install Prompt */}
          {showPrompt && (
            <div className="mb-6">
              <InstallPrompt
                onInstall={handleInstall}
                onDismiss={hidePrompt}
              />
            </div>
          )}

          {/* Quick Actions Bar */}
          <div className="mb-6">
            <QuickActionsBar user={user} compact={false} />
          </div>

          {/* Enhanced Dashboard with Widgets */}
          <DashboardGrid
            user={user}
            widgets={widgets}
            onWidgetUpdate={handleWidgetUpdate}
            onWidgetConfig={(widgetId) => {
              console.log('Configure widget:', widgetId)
              // TODO: Implement widget configuration modal
            }}
          />

          {/* Legacy Stats for Context (will be integrated into widgets) */}
          {preferences.compactMode && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">System Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{stats.totalGrants}</div>
                      <div className="text-gray-500">Total Grants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{stats.activeApplications}</div>
                      <div className="text-gray-500">Active Applications</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</div>
                      <div className="text-gray-500">Upcoming Deadlines</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">€{(stats.fundingSecured / 1000).toFixed(0)}K</div>
                      <div className="text-gray-500">Funding Secured</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}