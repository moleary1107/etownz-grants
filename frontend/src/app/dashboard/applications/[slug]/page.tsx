"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Declare module augmentation for jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Sidebar } from "../../../../components/layout/Sidebar"
import { 
  ArrowLeft,
  Calendar,
  DollarSign, 
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Edit,
  Download,
  Upload,
  MessageSquare,
  User,
  Building,
  Target,
  TrendingUp
} from "lucide-react"
import { User as AuthUser, hasPermission } from "../../../../lib/auth"
import { generateSlug } from "../../../../lib/utils"

interface Application {
  id: string
  grant_id: string
  project_title: string
  project_description: string
  requested_amount: number
  project_duration: number
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  submitted_at?: string
  application_data: {
    team_size: number
    technical_approach: string
    expected_outcomes: string[]
    budget_breakdown: {
      personnel: number
      equipment: number
      operations: number
      other: number
    }
    timeline: Array<{
      phase: string
      duration: number
      deliverables: string[]
    }>
    risk_assessment: Array<{
      risk: string
      impact: string
      mitigation: string
    }>
    success_metrics: string[]
    sustainability_plan: string
  }
}

interface Grant {
  id: string
  title: string
  organization: string
  description: string
  amount_min: number
  amount_max: number
  deadline: string
  status: string
}

interface Comment {
  id: string
  text: string
  author: string
  authorId: string
  timestamp: string
}

export default function ApplicationDetailPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [grant, setGrant] = useState<Grant | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [documents, setDocuments] = useState<{id: string, name: string, uploadedAt: string, size: string}[]>([])
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const router = useRouter()
  const params = useParams()
  const applicationSlug = params.slug as string

  const exportToPDF = () => {
    if (!application || !grant) return

    const doc = new jsPDF()
    
    // Title
    doc.setFontSize(20)
    doc.text('Grant Application', 20, 20)
    
    // Grant and Application Info
    doc.setFontSize(12)
    doc.text(`Grant: ${grant.title}`, 20, 35)
    doc.text(`Application ID: ${application.id}`, 20, 45)
    doc.text(`Status: ${application.status.toUpperCase()}`, 20, 55)
    doc.text(`Submitted: ${application.submitted_at ? new Date(application.submitted_at).toLocaleDateString() : 'Not submitted'}`, 20, 65)
    
    // Project Details
    doc.setFontSize(16)
    doc.text('Project Details', 20, 85)
    doc.setFontSize(12)
    doc.text(`Title: ${application.project_title}`, 20, 95)
    
    // Wrap description text
    const splitDescription = doc.splitTextToSize(`Description: ${application.project_description}`, 170)
    doc.text(splitDescription, 20, 105)
    
    const descHeight = splitDescription.length * 5
    let yPos = 105 + descHeight + 10
    
    // Financial Information
    doc.text(`Requested Amount: €${application.requested_amount.toLocaleString()}`, 20, yPos)
    doc.text(`Project Duration: ${application.project_duration} months`, 20, yPos + 10)
    doc.text(`Team Size: ${application.application_data.team_size}`, 20, yPos + 20)
    
    // Budget Breakdown Table
    yPos += 40
    doc.setFontSize(14)
    doc.text('Budget Breakdown', 20, yPos)
    
    const budgetData = Object.entries(application.application_data.budget_breakdown).map(([category, amount]) => [
      category.charAt(0).toUpperCase() + category.slice(1),
      `€${amount.toLocaleString()}`
    ])
    
    doc.autoTable({
      startY: yPos + 5,
      head: [['Category', 'Amount']],
      body: budgetData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    })
    
    // Expected Outcomes
    yPos = (doc as any).previousAutoTable.finalY + 20
    doc.setFontSize(14)
    doc.text('Expected Outcomes', 20, yPos)
    doc.setFontSize(12)
    
    application.application_data.expected_outcomes.forEach((outcome, index) => {
      const outcomeText = doc.splitTextToSize(`${index + 1}. ${outcome}`, 170)
      doc.text(outcomeText, 20, yPos + 10 + (index * 10))
      yPos += outcomeText.length * 5
    })
    
    // Technical Approach
    if (yPos > 250) {
      doc.addPage()
      yPos = 20
    }
    
    doc.setFontSize(14)
    doc.text('Technical Approach', 20, yPos + 20)
    doc.setFontSize(12)
    const splitApproach = doc.splitTextToSize(application.application_data.technical_approach, 170)
    doc.text(splitApproach, 20, yPos + 30)
    
    // Save the PDF
    doc.save(`application-${application.id}-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleAddComment = () => {
    if (!newComment.trim() || !user) return

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      text: newComment,
      author: user.name,
      authorId: user.id,
      timestamp: new Date().toISOString()
    }

    setComments([comment, ...comments])
    setNewComment('')
    setShowCommentDialog(false)
    
    // In a real app, this would save to the backend
    // await saveComment(application.id, comment)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !application) return

    setUploadingFile(true)
    try {
      // Simulate upload delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Add to documents list
      const newDoc = {
        id: `doc-${Date.now()}`,
        name: file.name,
        uploadedAt: new Date().toISOString(),
        size: `${(file.size / 1024).toFixed(1)} KB`
      }
      
      setDocuments([newDoc, ...documents])
      setShowUploadDialog(false)
    } catch (error) {
      console.error('Error uploading file:', error)
      alert('Failed to upload file. Please try again.')
    } finally {
      setUploadingFile(false)
    }
  }

  const handleDownloadAllFiles = async () => {
    if (!application) return

    try {
      // Create application summary for download
      const applicationData = {
        id: application.id,
        title: application.project_title,
        description: application.project_description,
        status: application.status,
        requestedAmount: application.requested_amount,
        documents: documents.map(d => d.name),
        comments: comments.map(c => ({ author: c.author, text: c.text, timestamp: c.timestamp }))
      }
      
      const blob = new Blob([JSON.stringify(applicationData, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `application-${application.id}-data.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading files:', error)
      alert('Failed to download files. Please try again.')
    }
  }

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
      loadApplication()
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router, applicationSlug])

  const loadApplication = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // For now, use mock data based on slug
      // In production, this would be an API call: 
      // const response = await fetch(`/api/applications/by-slug/${applicationSlug}`)
      
      const mockApplications: Record<string, Application> = {
        'ai-powered-environmental-monitoring-system': {
          id: '1',
          grant_id: 'grant-ei-rd-001',
          project_title: 'AI-Powered Environmental Monitoring System',
          project_description: 'Development of an innovative AI system that uses IoT sensors and machine learning to monitor and predict environmental changes in real-time, helping organizations optimize their sustainability efforts.',
          requested_amount: 75000,
          project_duration: 18,
          status: 'submitted',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-20T14:30:00Z',
          submitted_at: '2024-01-20T14:30:00Z',
          application_data: {
            team_size: 6,
            technical_approach: 'Our approach combines edge computing with cloud-based AI to process environmental data in real-time. We use advanced machine learning algorithms including time-series forecasting and anomaly detection to provide predictive insights.',
            expected_outcomes: [
              '30% improvement in environmental monitoring accuracy',
              'Real-time alerting system for environmental anomalies',
              'Predictive analytics for resource optimization',
              'Integration with existing IoT infrastructure'
            ],
            budget_breakdown: {
              personnel: 45000,
              equipment: 15000,
              operations: 10000,
              other: 5000
            },
            timeline: [
              {
                phase: 'Research & Planning',
                duration: 3,
                deliverables: ['Market research report', 'Technical specifications', 'Team formation']
              },
              {
                phase: 'Development',
                duration: 9,
                deliverables: ['Core AI algorithms', 'IoT integration', 'Dashboard interface']
              },
              {
                phase: 'Testing & Deployment',
                duration: 4,
                deliverables: ['Beta testing', 'Production deployment', 'User training']
              },
              {
                phase: 'Evaluation',
                duration: 2,
                deliverables: ['Performance analysis', 'Final report', 'Knowledge transfer']
              }
            ],
            risk_assessment: [
              {
                risk: 'Technical complexity may exceed initial estimates',
                impact: 'Project delays and potential budget overruns',
                mitigation: 'Regular technical reviews and agile development methodology'
              },
              {
                risk: 'IoT hardware compatibility issues',
                impact: 'Integration delays and additional development time',
                mitigation: 'Early prototyping and vendor partnerships'
              }
            ],
            success_metrics: [
              'System accuracy of 95% or higher',
              'Response time under 500ms for real-time alerts',
              'Successful integration with 5+ IoT sensor types',
              'User satisfaction score of 4.5/5 or higher'
            ],
            sustainability_plan: 'The system will be maintained through a combination of user subscriptions and licensing to other organizations. A dedicated support team will be established using revenue from the first year of operations.'
          }
        },
        'community-digital-hub-initiative': {
          id: '2',
          grant_id: 'grant-dcc-community-002',
          project_title: 'Community Digital Hub Initiative',
          project_description: 'Establishing a state-of-the-art digital learning center to provide technology training and resources to underserved community members, focusing on digital literacy and job skills development.',
          requested_amount: 8500,
          project_duration: 12,
          status: 'approved',
          created_at: '2024-01-10T09:00:00Z',
          updated_at: '2024-02-10T16:45:00Z',
          submitted_at: '2024-01-15T11:20:00Z',
          application_data: {
            team_size: 4,
            technical_approach: 'Community-centered approach focusing on hands-on learning and peer-to-peer mentoring. Curriculum designed with input from local employers and education partners.',
            expected_outcomes: [
              'Train 150+ community members in digital skills',
              'Achieve 80% job placement rate for program graduates',
              'Establish partnerships with 10+ local employers',
              'Create sustainable funding model for ongoing operations'
            ],
            budget_breakdown: {
              personnel: 4000,
              equipment: 3000,
              operations: 1000,
              other: 500
            },
            timeline: [
              {
                phase: 'Setup & Partnerships',
                duration: 2,
                deliverables: ['Space setup', 'Equipment installation', 'Partnership agreements']
              },
              {
                phase: 'Program Development',
                duration: 3,
                deliverables: ['Curriculum design', 'Instructor training', 'Community outreach']
              },
              {
                phase: 'Program Delivery',
                duration: 6,
                deliverables: ['Training sessions', 'Skills assessments', 'Job placement support']
              },
              {
                phase: 'Evaluation & Sustainability',
                duration: 1,
                deliverables: ['Impact assessment', 'Sustainability plan', 'Final report']
              }
            ],
            risk_assessment: [
              {
                risk: 'Low community participation',
                impact: 'Reduced program effectiveness and outcomes',
                mitigation: 'Extensive community outreach and flexible scheduling'
              }
            ],
            success_metrics: [
              'Minimum 150 program participants',
              '80% course completion rate',
              '70% employment rate within 6 months',
              'Community satisfaction score of 4.0/5'
            ],
            sustainability_plan: 'Long-term sustainability through a combination of ongoing grants, corporate sponsorships, and modest participant fees for advanced courses.'
          }
        },
        'eic-accelerator-breakthrough-innovation': {
          id: '4',
          grant_id: 'grant-eic-accel-004',
          project_title: 'EIC Accelerator Breakthrough Innovation',
          project_description: 'Revolutionary cleantech solution for carbon capture using novel materials and AI optimization.',
          requested_amount: 1500000,
          project_duration: 24,
          status: 'under_review',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T14:30:00Z',
          submitted_at: '2024-01-10T14:30:00Z',
          application_data: {
            team_size: 12,
            technical_approach: 'Breakthrough technology combining advanced materials science with AI-driven process optimization.',
            expected_outcomes: [
              'Market-ready carbon capture technology',
              'Patent portfolio development',
              'Strategic partnerships with major corporations',
              'Commercial deployment pilot projects'
            ],
            budget_breakdown: {
              personnel: 800000,
              equipment: 400000,
              operations: 200000,
              other: 100000
            },
            timeline: [
              {
                phase: 'Technology Development',
                duration: 8,
                deliverables: ['Prototype development', 'Performance validation', 'Patent filing']
              },
              {
                phase: 'Pilot Testing',
                duration: 8,
                deliverables: ['Field trials', 'Commercial partnerships', 'Scale-up planning']
              },
              {
                phase: 'Market Entry',
                duration: 8,
                deliverables: ['Commercial launch', 'Customer acquisition', 'Growth planning']
              }
            ],
            risk_assessment: [
              {
                risk: 'Technical complexity may lead to development delays',
                impact: 'Extended timeline and increased costs',
                mitigation: 'Experienced technical team and milestone-based development'
              }
            ],
            success_metrics: [
              'Technology performance targets achieved',
              'Commercial partnerships secured',
              'Patent protection established',
              'Revenue generation initiated'
            ],
            sustainability_plan: 'Commercial revenue model with licensing and direct sales to ensure long-term sustainability.'
          }
        },
        'local-enterprise-innovation-initiative': {
          id: '5',
          grant_id: 'grant-leo-innov-005',
          project_title: 'Local Enterprise Innovation Initiative',
          project_description: 'Supporting local businesses through innovation workshops and mentorship programs.',
          requested_amount: 12000,
          project_duration: 6,
          status: 'rejected',
          created_at: '2024-01-05T10:00:00Z',
          updated_at: '2024-02-15T14:30:00Z',
          submitted_at: '2024-01-05T14:30:00Z',
          application_data: {
            team_size: 3,
            technical_approach: 'Community-based approach focusing on practical innovation support for local businesses.',
            expected_outcomes: [
              'Support 20+ local businesses',
              'Deliver innovation workshops',
              'Establish mentorship network',
              'Create business development resources'
            ],
            budget_breakdown: {
              personnel: 8000,
              equipment: 2000,
              operations: 1500,
              other: 500
            },
            timeline: [
              {
                phase: 'Program Setup',
                duration: 1,
                deliverables: ['Program design', 'Partner recruitment', 'Resource development']
              },
              {
                phase: 'Workshop Delivery',
                duration: 4,
                deliverables: ['Innovation workshops', 'Mentorship matching', 'Business support']
              },
              {
                phase: 'Evaluation',
                duration: 1,
                deliverables: ['Impact assessment', 'Final report', 'Recommendations']
              }
            ],
            risk_assessment: [
              {
                risk: 'Low business participation',
                impact: 'Reduced program effectiveness',
                mitigation: 'Strong marketing and incentive programs'
              }
            ],
            success_metrics: [
              'Minimum 20 businesses engaged',
              'Workshop completion rate of 80%',
              'Positive feedback scores',
              'Measurable business improvements'
            ],
            sustainability_plan: 'Partnership model with local organizations for ongoing program continuation.'
          }
        }
      }

      const app = mockApplications[applicationSlug]
      if (!app) {
        setError('Application not found')
        return
      }

      setApplication(app)
      
      // Load associated grant data
      const mockGrants: Record<string, Grant> = {
        'grant-ei-rd-001': {
          id: 'grant-ei-rd-001',
          title: 'Enterprise Ireland R&D Fund',
          organization: 'Enterprise Ireland',
          description: 'Supporting innovative R&D projects that have commercial potential',
          amount_min: 50000,
          amount_max: 100000,
          deadline: '2024-03-15T23:59:59Z',
          status: 'active'
        },
        'grant-dcc-community-002': {
          id: 'grant-dcc-community-002',
          title: 'Dublin City Council Community Grant',
          organization: 'Dublin City Council',
          description: 'Supporting community-led initiatives that benefit local residents',
          amount_min: 5000,
          amount_max: 15000,
          deadline: '2024-02-28T23:59:59Z',
          status: 'active'
        }
      }
      
      const associatedGrant = mockGrants[app.grant_id]
      if (associatedGrant) {
        setGrant(associatedGrant)
      }

    } catch (error) {
      console.error('Error loading application:', error)
      setError('Failed to load application details')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'Application not found'}
            </h2>
            <p className="text-gray-600 mb-4">
              The application you're looking for doesn't exist or you don't have permission to view it.
            </p>
            <Button onClick={() => router.push('/dashboard/applications')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
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
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => router.push('/dashboard/applications')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {application.project_title}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <span className={`px-3 py-1 text-sm rounded-full flex items-center space-x-2 ${getStatusColor(application.status)}`}>
                    {getStatusIcon(application.status)}
                    <span className="capitalize">{application.status.replace('_', ' ')}</span>
                  </span>
                  {grant && (
                    <span className="text-sm text-gray-600">
                      Applied to: <span className="font-medium">{grant.title}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              {application.status === 'draft' && hasPermission(user, 'canSubmitApplications') && (
                <Button onClick={() => router.push(`/dashboard/applications/${generateSlug(application.project_title)}/edit`)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Application
                </Button>
              )}
              <Button variant="outline" onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Project Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Project Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {application.project_description}
                  </p>
                  
                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Requested Amount</h4>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(application.requested_amount)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Project Duration</h4>
                      <p className="text-2xl font-bold text-blue-600">
                        {application.project_duration} months
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Technical Approach */}
              <Card>
                <CardHeader>
                  <CardTitle>Technical Approach</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {application.application_data.technical_approach}
                  </p>
                </CardContent>
              </Card>

              {/* Expected Outcomes */}
              <Card>
                <CardHeader>
                  <CardTitle>Expected Outcomes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {application.application_data.expected_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Project Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Clock className="h-5 w-5" />
                    <span>Project Timeline</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {application.application_data.timeline.map((phase, index) => (
                      <div key={index} className="border-l-2 border-blue-200 pl-4 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">{phase.phase}</h4>
                          <span className="text-sm text-gray-600">{phase.duration} months</span>
                        </div>
                        <ul className="space-y-1">
                          {phase.deliverables.map((deliverable, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-center space-x-2">
                              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
                              <span>{deliverable}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Assessment */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Assessment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {application.application_data.risk_assessment.map((risk, index) => (
                      <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{risk.risk}</h4>
                        <p className="text-sm text-gray-700 mb-2">
                          <span className="font-medium">Impact:</span> {risk.impact}
                        </p>
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Mitigation:</span> {risk.mitigation}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Success Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Success Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {application.application_data.success_metrics.map((metric, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{metric}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Sustainability Plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Sustainability Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed">
                    {application.application_data.sustainability_plan}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Application Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Application Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Application ID</h4>
                    <p className="text-sm text-gray-600 font-mono">{application.id}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Created</h4>
                    <p className="text-sm text-gray-600">{formatDate(application.created_at)}</p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Last Updated</h4>
                    <p className="text-sm text-gray-600">{formatDate(application.updated_at)}</p>
                  </div>
                  
                  {application.submitted_at && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Submitted</h4>
                      <p className="text-sm text-gray-600">{formatDate(application.submitted_at)}</p>
                    </div>
                  )}
                  
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-1">Team Size</h4>
                    <p className="text-sm text-gray-600 flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      {application.application_data.team_size} members
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Grant Information */}
              {grant && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <Building className="h-5 w-5" />
                      <span>Grant Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Grant Title</h4>
                      <p className="text-sm text-gray-700">{grant.title}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Organization</h4>
                      <p className="text-sm text-gray-700">{grant.organization}</p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Funding Range</h4>
                      <p className="text-sm text-gray-700">
                        {formatCurrency(grant.amount_min)} - {formatCurrency(grant.amount_max)}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">Deadline</h4>
                      <p className="text-sm text-gray-700 flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {formatDate(grant.deadline)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Budget Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <DollarSign className="h-5 w-5" />
                    <span>Budget Breakdown</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(application.application_data.budget_breakdown).map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center">
                        <span className="text-sm text-gray-600 capitalize">{category}</span>
                        <span className="text-sm font-medium">{formatCurrency(amount)}</span>
                      </div>
                    ))}
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center font-medium">
                        <span>Total</span>
                        <span className="text-green-600">{formatCurrency(application.requested_amount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Documents */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  {documents.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No documents uploaded</p>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {documents.map((doc) => (
                        <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <div>
                              <p className="text-sm font-medium">{doc.name}</p>
                              <p className="text-xs text-gray-500">{doc.size} • {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <Button size="sm" variant="ghost">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Comments */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Comments & Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">No comments yet</p>
                  ) : (
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {comments.map((comment) => (
                        <div key={comment.id} className="border-b pb-3 last:border-0">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">{comment.author}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(comment.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full" variant="outline" onClick={() => setShowCommentDialog(true)}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Add Comment
                  </Button>
                  <Button className="w-full" variant="outline" onClick={() => setShowUploadDialog(true)}>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                  <Button 
                    className="w-full" 
                    variant="outline" 
                    onClick={handleDownloadAllFiles}
                    disabled={documents.length === 0 && comments.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download All Files
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Comment Dialog */}
          {showCommentDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Add Comment</h3>
                <textarea
                  className="w-full p-3 border rounded-lg resize-none"
                  rows={4}
                  placeholder="Enter your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  autoFocus
                />
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCommentDialog(false)
                      setNewComment('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim()}
                  >
                    Add Comment
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Dialog */}
          {showUploadDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4">Upload Document</h3>
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                    <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Click to select a file or drag and drop</p>
                    <input
                      type="file"
                      className="hidden"
                      id="file-upload"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.txt,.rtf,.odt,.xls,.xlsx,.ppt,.pptx"
                    />
                    <label
                      htmlFor="file-upload"
                      className="cursor-pointer inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Select File
                    </label>
                    <p className="text-xs text-gray-500 mt-2">
                      Supported formats: PDF, DOC, DOCX, TXT, RTF, ODT, XLS, XLSX, PPT, PPTX
                    </p>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowUploadDialog(false)}
                    disabled={uploadingFile}
                  >
                    Cancel
                  </Button>
                  {uploadingFile && (
                    <div className="flex items-center text-sm text-gray-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Uploading...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}