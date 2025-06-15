"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Badge } from "../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Sidebar } from "../../../components/layout/Sidebar"
import { SmartDeadlineManager } from "../../../components/deadlines/SmartDeadlineManager"
import { 
  Clock, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Eye,
  ArrowRight,
  Search,
  Bell,
  Plus,
  ExternalLink,
  DollarSign,
  Building,
  Target,
  Zap
} from "lucide-react"
import { User } from "../../../lib/auth"

interface GrantDeadline {
  id: string
  title: string
  funder: string
  amount: {
    min: number
    max: number
    currency: string
  }
  deadline: Date
  daysRemaining: number
  category: string
  difficulty: 'Low' | 'Medium' | 'High'
  eligibilityMatch: number // 0-100%
  isTracked: boolean
  status: 'upcoming' | 'urgent' | 'due_today' | 'overdue'
  description: string
  requirements: string[]
  applicationUrl: string
}

interface ApplicationDeadline {
  id: string
  grantTitle: string
  applicationId: string
  status: 'draft' | 'in_review' | 'submitted' | 'requires_action'
  deadline: Date
  daysRemaining: number
  completionPercentage: number
  nextAction: string
  assignedTo?: string
}

export default function DeadlinesPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterPeriod, setFilterPeriod] = useState<'all' | '7_days' | '30_days' | '60_days'>('30_days')
  const [grantDeadlines, setGrantDeadlines] = useState<GrantDeadline[]>([])
  const [applicationDeadlines, setApplicationDeadlines] = useState<ApplicationDeadline[]>([])
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
      loadDeadlines()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadDeadlines = async () => {
    try {
      setIsLoading(true)
      
      // Mock data - in real app, fetch from API
      const mockGrantDeadlines: GrantDeadline[] = [
        {
          id: '1',
          title: 'Enterprise Ireland Innovation Partnership',
          funder: 'Enterprise Ireland',
          amount: { min: 25000, max: 200000, currency: 'EUR' },
          deadline: new Date('2025-06-15'),
          daysRemaining: 13,
          category: 'Innovation',
          difficulty: 'Medium',
          eligibilityMatch: 92,
          isTracked: true,
          status: 'upcoming',
          description: 'Funding for collaborative R&D projects between companies and research institutes',
          requirements: ['Industry partnership', 'R&D focus', 'Irish company'],
          applicationUrl: 'https://enterprise-ireland.com/apply'
        },
        {
          id: '2',
          title: 'SFI Discover Programme',
          funder: 'Science Foundation Ireland',
          amount: { min: 15000, max: 50000, currency: 'EUR' },
          deadline: new Date('2025-06-08'),
          daysRemaining: 6,
          category: 'Research',
          difficulty: 'High',
          eligibilityMatch: 78,
          isTracked: false,
          status: 'urgent',
          description: 'Public engagement with STEM research and innovation',
          requirements: ['Research institution', 'Public engagement plan', 'STEM focus'],
          applicationUrl: 'https://sfi.ie/discover'
        },
        {
          id: '3',
          title: 'Dublin City Council Community Grant',
          funder: 'Dublin City Council',
          amount: { min: 1000, max: 15000, currency: 'EUR' },
          deadline: new Date('2025-06-03'),
          daysRemaining: 1,
          category: 'Community',
          difficulty: 'Low',
          eligibilityMatch: 85,
          isTracked: true,
          status: 'due_today',
          description: 'Supporting community initiatives and local development projects',
          requirements: ['Dublin-based', 'Community benefit', 'Local partnership'],
          applicationUrl: 'https://dublincity.ie/grants'
        },
        {
          id: '4',
          title: 'Horizon Europe EIC Accelerator',
          funder: 'European Commission',
          amount: { min: 500000, max: 2500000, currency: 'EUR' },
          deadline: new Date('2025-07-20'),
          daysRemaining: 48,
          category: 'Deep Tech',
          difficulty: 'High',
          eligibilityMatch: 68,
          isTracked: false,
          status: 'upcoming',
          description: 'Supporting breakthrough innovations with commercial potential',
          requirements: ['Deep tech innovation', 'Market potential', 'EU company'],
          applicationUrl: 'https://eic.ec.europa.eu'
        }
      ]

      const mockApplicationDeadlines: ApplicationDeadline[] = [
        {
          id: 'app1',
          grantTitle: 'Enterprise Ireland Innovation Partnership',
          applicationId: 'APP-2025-001',
          status: 'in_review',
          deadline: new Date('2025-06-15'),
          daysRemaining: 13,
          completionPercentage: 75,
          nextAction: 'Submit financial projections',
          assignedTo: 'John Smith'
        },
        {
          id: 'app2',
          grantTitle: 'Dublin City Council Community Grant',
          applicationId: 'APP-2025-002',
          status: 'requires_action',
          deadline: new Date('2025-06-03'),
          daysRemaining: 1,
          completionPercentage: 90,
          nextAction: 'Upload community support letters',
          assignedTo: 'Sarah Johnson'
        }
      ]

      setGrantDeadlines(mockGrantDeadlines)
      setApplicationDeadlines(mockApplicationDeadlines)
    } catch (error) {
      console.error('Error loading deadlines:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'due_today': return 'bg-red-100 text-red-800'
      case 'urgent': return 'bg-orange-100 text-orange-800'
      case 'upcoming': return 'bg-blue-100 text-blue-800'
      case 'overdue': return 'bg-red-500 text-white'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Low': return 'bg-green-100 text-green-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'High': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const filteredGrantDeadlines = grantDeadlines.filter(deadline => {
    const matchesSearch = !searchTerm || 
      deadline.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deadline.funder.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deadline.category.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesPeriod = filterPeriod === 'all' || 
      (filterPeriod === '7_days' && deadline.daysRemaining <= 7) ||
      (filterPeriod === '30_days' && deadline.daysRemaining <= 30) ||
      (filterPeriod === '60_days' && deadline.daysRemaining <= 60)

    return matchesSearch && matchesPeriod
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Deadlines
                </h1>
                <p className="text-gray-600 mt-2">
                  Track grant deadlines and manage your applications
                </p>
              </div>
              <div className="mt-4 sm:mt-0 flex items-center space-x-3">
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Set Reminder
                </Button>
                <Button size="sm" onClick={() => router.push('/dashboard/grants')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Find Grants
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Due This Week</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {grantDeadlines.filter(d => d.daysRemaining <= 7).length}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Tracked Grants</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {grantDeadlines.filter(d => d.isTracked).length}
                    </p>
                  </div>
                  <Eye className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Active Applications</p>
                    <p className="text-2xl font-bold text-green-600">
                      {applicationDeadlines.filter(d => d.status !== 'submitted').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Potential Funding</p>
                    <p className="text-2xl font-bold text-purple-600">
                      €{(grantDeadlines.reduce((sum, d) => sum + d.amount.max, 0) / 1000000).toFixed(1)}M
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="smart-manager" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="smart-manager">Smart Manager</TabsTrigger>
              <TabsTrigger value="grant-deadlines">Grant Deadlines</TabsTrigger>
              <TabsTrigger value="my-applications">My Applications</TabsTrigger>
            </TabsList>

            {/* Smart Deadline Manager Tab */}
            <TabsContent value="smart-manager">
              <SmartDeadlineManager
                user={user}
                onDeadlineUpdate={(deadline) => {
                  console.log('Deadline updated:', deadline)
                  // Could sync with backend or update local state
                }}
                onReminderCreate={(reminder) => {
                  console.log('Reminder created:', reminder)
                  // Could trigger notification system
                }}
              />
            </TabsContent>

            {/* Grant Deadlines Tab */}
            <TabsContent value="grant-deadlines" className="space-y-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search grants..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={filterPeriod}
                  onChange={(e) => setFilterPeriod(e.target.value)}
                  className="flex h-10 w-48 rounded-md border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Deadlines</option>
                  <option value="7_days">Next 7 Days</option>
                  <option value="30_days">Next 30 Days</option>
                  <option value="60_days">Next 60 Days</option>
                </select>
              </div>

              {/* Grant Deadlines List */}
              <div className="space-y-4">
                {filteredGrantDeadlines.map((deadline) => (
                  <Card key={deadline.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {deadline.title}
                              </h3>
                              <p className="text-sm text-gray-600 flex items-center mt-1">
                                <Building className="w-4 h-4 mr-1" />
                                {deadline.funder}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(deadline.status)}>
                                {deadline.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              {deadline.isTracked && (
                                <Badge variant="outline">
                                  <Eye className="w-3 h-3 mr-1" />
                                  Tracked
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <DollarSign className="w-4 h-4 mr-2" />
                              {formatCurrency(deadline.amount.min, deadline.amount.currency)} - {formatCurrency(deadline.amount.max, deadline.amount.currency)}
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              {deadline.daysRemaining} days remaining
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Target className="w-4 h-4 mr-2" />
                              {deadline.eligibilityMatch}% match
                            </div>
                          </div>

                          <p className="text-sm text-gray-700 mb-3">
                            {deadline.description}
                          </p>

                          <div className="flex flex-wrap gap-2 mb-4">
                            <Badge variant="outline">{deadline.category}</Badge>
                            <Badge className={getDifficultyColor(deadline.difficulty)}>
                              {deadline.difficulty} Difficulty
                            </Badge>
                            {deadline.requirements.slice(0, 2).map((req, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {req}
                              </Badge>
                            ))}
                            {deadline.requirements.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{deadline.requirements.length - 2} more
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:ml-6">
                          <Button size="sm" onClick={() => window.open(deadline.applicationUrl, '_blank')}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Apply Now
                          </Button>
                          <Button variant="outline" size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Track Grant
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/grants/${deadline.id}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      {/* Deadline indicator */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Deadline: {deadline.deadline.toLocaleDateString('en-IE', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            <span className={`font-medium ${
                              deadline.daysRemaining <= 7 ? 'text-red-600' : 
                              deadline.daysRemaining <= 14 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {deadline.daysRemaining} days left
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {filteredGrantDeadlines.length === 0 && (
                  <div className="text-center py-12">
                    <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No deadlines found</h3>
                    <p className="text-gray-600 mb-4">
                      {searchTerm || filterPeriod !== 'all' 
                        ? 'Try adjusting your search criteria or filters'
                        : 'Start tracking grants to see their deadlines here'
                      }
                    </p>
                    <Button onClick={() => router.push('/dashboard/grants')}>
                      <Search className="w-4 h-4 mr-2" />
                      Discover Grants
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* My Applications Tab */}
            <TabsContent value="my-applications" className="space-y-6">
              <div className="space-y-4">
                {applicationDeadlines.map((app) => (
                  <Card key={app.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900">
                                {app.grantTitle}
                              </h3>
                              <p className="text-sm text-gray-600">
                                Application ID: {app.applicationId}
                              </p>
                            </div>
                            <Badge className={
                              app.status === 'submitted' ? 'bg-green-100 text-green-800' :
                              app.status === 'requires_action' ? 'bg-red-100 text-red-800' :
                              app.status === 'in_review' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {app.status.replace('_', ' ').toUpperCase()}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-2" />
                              {app.daysRemaining} days remaining
                            </div>
                            <div className="flex items-center text-sm text-gray-600">
                              <Zap className="w-4 h-4 mr-2" />
                              {app.completionPercentage}% complete
                            </div>
                            {app.assignedTo && (
                              <div className="flex items-center text-sm text-gray-600">
                                <Building className="w-4 h-4 mr-2" />
                                {app.assignedTo}
                              </div>
                            )}
                          </div>

                          {/* Progress bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Progress</span>
                              <span className="text-gray-900 font-medium">{app.completionPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${app.completionPercentage}%` }}
                              ></div>
                            </div>
                          </div>

                          {app.nextAction && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 mb-4">
                              <div className="flex">
                                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                                <div>
                                  <p className="text-sm font-medium text-yellow-800">
                                    Next Action Required
                                  </p>
                                  <p className="text-sm text-yellow-700">
                                    {app.nextAction}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 lg:ml-6">
                          <Button size="sm" onClick={() => router.push(`/dashboard/applications/${app.applicationId}/edit`)}>
                            <ArrowRight className="w-4 h-4 mr-2" />
                            Continue Application
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/applications/${app.applicationId}`)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>

                      {/* Deadline indicator */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">
                            Deadline: {app.deadline.toLocaleDateString('en-IE', { 
                              weekday: 'long', 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </span>
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            <span className={`font-medium ${
                              app.daysRemaining <= 7 ? 'text-red-600' : 
                              app.daysRemaining <= 14 ? 'text-orange-600' : 'text-green-600'
                            }`}>
                              {app.daysRemaining} days left
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {applicationDeadlines.length === 0 && (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No active applications</h3>
                    <p className="text-gray-600 mb-4">
                      You don&apos;t have any applications in progress
                    </p>
                    <Button onClick={() => router.push('/dashboard/applications/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Start New Application
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}