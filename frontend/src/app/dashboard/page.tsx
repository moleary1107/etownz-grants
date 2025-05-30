"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Sidebar } from "../../components/layout/Sidebar"
import { 
  TrendingUp, 
  FileText, 
  Clock, 
  Users,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Calendar,
  DollarSign
} from "lucide-react"
import { User, UserRole } from "../../lib/auth"

interface DashboardStats {
  totalGrants: number
  activeApplications: number
  upcomingDeadlines: number
  fundingSecured: number
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
    fundingSecured: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [, setIsLoading] = useState(true)
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
      loadDashboardData()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadDashboardData = async () => {
    try {
      // Mock data for now - replace with actual API calls
      setStats({
        totalGrants: 127,
        activeApplications: 8,
        upcomingDeadlines: 3,
        fundingSecured: 125000
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

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
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

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {user.name.split(' ')[0]}
            </h1>
            <p className="text-gray-600 mt-2">{getWelcomeMessage()}</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Total Grants</CardTitle>
                <FileText className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{stats.totalGrants}</div>
                <p className="text-xs text-muted-foreground">
                  Available opportunities
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Active Applications</CardTitle>
                <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold">{stats.activeApplications}</div>
                <p className="text-xs text-muted-foreground">
                  In progress
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Upcoming Deadlines</CardTitle>
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.upcomingDeadlines}</div>
                <p className="text-xs text-muted-foreground">
                  Next 30 days
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium">Funding Secured</CardTitle>
                <DollarSign className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg sm:text-2xl font-bold text-green-600">
                  €{stats.fundingSecured.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  This year
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest updates and notifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {activity.status === 'success' && (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        )}
                        {activity.status === 'warning' && (
                          <AlertCircle className="h-5 w-5 text-orange-500" />
                        )}
                        {activity.status === 'info' && (
                          <FileText className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {activity.timestamp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="outline" className="w-full">
                    View All Activity
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks and shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" onClick={() => router.push('/dashboard/grants')}>
                    <FileText className="mr-2 h-4 w-4" />
                    Discover New Grants
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/applications')}>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Start New Application
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/deadlines')}>
                    <Calendar className="mr-2 h-4 w-4" />
                    View Deadlines
                  </Button>
                  
                  {user.role === UserRole.ORGANIZATION_ADMIN && (
                    <Button variant="outline" className="w-full justify-start" onClick={() => router.push('/dashboard/users')}>
                      <Users className="mr-2 h-4 w-4" />
                      Manage Team
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}