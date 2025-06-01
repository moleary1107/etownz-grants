"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  Plus,
  Search, 
  Calendar,
  DollarSign, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Trash2,
  Eye
} from "lucide-react"
import { User, hasPermission } from "../../../lib/auth"

interface Application {
  id: string
  grantTitle: string
  grantProvider: string
  amount: number
  currency: string
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  deadline: Date
  submittedDate?: Date
  lastModified: Date
  progress: number
  assignedTo?: string
  notes?: string
}

export default function ApplicationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedStatus, setSelectedStatus] = useState("all")
  const [sortBy, setSortBy] = useState("lastModified")
  const [isLoading, setIsLoading] = useState(true)
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
      loadApplications()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router])

  const loadApplications = async () => {
    try {
      // Mock applications data - replace with actual API call
      const mockApplications: Application[] = [
        {
          id: '1',
          grantTitle: 'Enterprise Ireland R&D Fund',
          grantProvider: 'Enterprise Ireland',
          amount: 75000,
          currency: 'EUR',
          status: 'submitted',
          deadline: new Date('2024-03-15'),
          submittedDate: new Date('2024-01-20'),
          lastModified: new Date('2024-01-20'),
          progress: 100,
          assignedTo: 'John Smith',
          notes: 'Strong technical proposal submitted. Awaiting review.'
        },
        {
          id: '2',
          grantTitle: 'Dublin City Council Community Grant',
          grantProvider: 'Dublin City Council',
          amount: 8500,
          currency: 'EUR',
          status: 'approved',
          deadline: new Date('2024-02-28'),
          submittedDate: new Date('2024-01-15'),
          lastModified: new Date('2024-02-10'),
          progress: 100,
          assignedTo: 'Sarah Johnson',
          notes: 'Approved! Funding confirmed for community center project.'
        },
        {
          id: '3',
          grantTitle: 'SFI Discover Programme',
          grantProvider: 'Science Foundation Ireland',
          amount: 25000,
          currency: 'EUR',
          status: 'draft',
          deadline: new Date('2024-04-30'),
          lastModified: new Date('2024-01-25'),
          progress: 45,
          assignedTo: 'Mike O\'Connor',
          notes: 'Working on budget section and partnership agreements.'
        },
        {
          id: '4',
          grantTitle: 'Horizon Europe - EIC Accelerator',
          grantProvider: 'European Commission',
          amount: 1500000,
          currency: 'EUR',
          status: 'under_review',
          deadline: new Date('2024-06-05'),
          submittedDate: new Date('2024-01-10'),
          lastModified: new Date('2024-01-10'),
          progress: 100,
          assignedTo: 'Emma Walsh',
          notes: 'Under evaluation by expert panel. Expecting feedback in March.'
        },
        {
          id: '5',
          grantTitle: 'Local Enterprise Office Innovation Fund',
          grantProvider: 'Local Enterprise Office',
          amount: 12000,
          currency: 'EUR',
          status: 'rejected',
          deadline: new Date('2024-01-31'),
          submittedDate: new Date('2024-01-05'),
          lastModified: new Date('2024-02-15'),
          progress: 100,
          assignedTo: 'Tom Murphy',
          notes: 'Rejected - insufficient market validation. Consider reapplying next round.'
        }
      ]

      setApplications(mockApplications)
    } catch (error) {
      console.error('Error loading applications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const getStatusColor = (status: Application['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'submitted': return 'bg-blue-100 text-blue-800'
      case 'under_review': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: Application['status']) => {
    switch (status) {
      case 'draft': return <Edit className="h-4 w-4" />
      case 'submitted': return <FileText className="h-4 w-4" />
      case 'under_review': return <Clock className="h-4 w-4" />
      case 'approved': return <CheckCircle className="h-4 w-4" />
      case 'rejected': return <AlertCircle className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const getStatusDisplayName = (status: Application['status']) => {
    switch (status) {
      case 'draft': return 'Draft'
      case 'submitted': return 'Submitted'
      case 'under_review': return 'Under Review'
      case 'approved': return 'Approved'
      case 'rejected': return 'Rejected'
      default: return 'Unknown'
    }
  }

  const getDaysUntilDeadline = (deadline: Date) => {
    const today = new Date()
    const diffTime = deadline.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const canEditApplication = (application: Application) => {
    if (!user) return false
    return application.status === 'draft' && 
           (hasPermission(user, 'canSubmitApplications') || hasPermission(user, 'canManageApplications'))
  }

  const canDeleteApplication = (application: Application) => {
    if (!user) return false
    return application.status === 'draft' && hasPermission(user, 'canManageApplications')
  }

  const filteredApplications = applications.filter(app => {
    const matchesSearch = app.grantTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.grantProvider.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus
    
    return matchesSearch && matchesStatus
  }).sort((a, b) => {
    switch (sortBy) {
      case 'deadline':
        return a.deadline.getTime() - b.deadline.getTime()
      case 'amount':
        return b.amount - a.amount
      case 'status':
        return a.status.localeCompare(b.status)
      case 'lastModified':
      default:
        return b.lastModified.getTime() - a.lastModified.getTime()
    }
  })

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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Grant Applications
              </h1>
              <p className="text-gray-600">
                Manage your grant applications and track their progress
              </p>
            </div>
            
            {hasPermission(user, 'canSubmitApplications') && (
              <Button onClick={() => router.push('/dashboard/applications/new')}>
                <Plus className="h-4 w-4 mr-2" />
                New Application
              </Button>
            )}
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search applications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="lastModified">Last Modified</option>
                <option value="deadline">Deadline</option>
                <option value="amount">Amount</option>
                <option value="status">Status</option>
              </select>
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {filteredApplications.length} applications found
              </div>
            </div>
          </div>

          {/* Applications Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredApplications.map((application) => {
              const daysLeft = getDaysUntilDeadline(application.deadline)
              const isUrgent = daysLeft <= 7 && application.status === 'draft'

              return (
                <Card key={application.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full flex items-center space-x-1 ${getStatusColor(application.status)}`}>
                            {getStatusIcon(application.status)}
                            <span>{getStatusDisplayName(application.status)}</span>
                          </span>
                          {application.progress < 100 && application.status === 'draft' && (
                            <span className="text-xs text-gray-500">
                              {application.progress}% complete
                            </span>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight">
                          {application.grantTitle}
                        </CardTitle>
                        <CardDescription className="text-sm text-gray-600 mt-1">
                          {application.grantProvider}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-600">
                            €{application.amount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className={`h-4 w-4 ${isUrgent ? 'text-red-500' : 'text-gray-400'}`} />
                          <span className={`text-sm ${isUrgent ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline passed'}
                          </span>
                        </div>
                      </div>
                      
                      {application.progress < 100 && application.status === 'draft' && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${application.progress}%` }}
                          ></div>
                        </div>
                      )}
                      
                      {application.assignedTo && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Assigned to:</span> {application.assignedTo}
                        </div>
                      )}
                      
                      {application.submittedDate && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Submitted:</span> {application.submittedDate.toLocaleDateString()}
                        </div>
                      )}
                      
                      {application.notes && (
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                          {application.notes}
                        </div>
                      )}
                      
                      <div className="text-xs text-gray-500">
                        Last modified: {application.lastModified.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => router.push(`/dashboard/applications/${application.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {canEditApplication(application) && (
                        <Button 
                          size="sm"
                          onClick={() => router.push(`/dashboard/applications/${application.id}/edit`)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      )}
                      
                      {canDeleteApplication(application) && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {filteredApplications.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <FileText className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications found</h3>
              <p className="text-gray-600 mb-4">
                {hasPermission(user, 'canSubmitApplications') 
                  ? "Get started by creating your first grant application."
                  : "No applications match your current search criteria."
                }
              </p>
              {hasPermission(user, 'canSubmitApplications') && (
                <Button onClick={() => router.push('/dashboard/applications/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Application
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}