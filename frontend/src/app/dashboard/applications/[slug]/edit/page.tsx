"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../components/ui/card"
import { Button } from "../../../../../components/ui/button"
import { Input } from "../../../../../components/ui/input"
import { Textarea } from "../../../../../components/ui/textarea"
import { Sidebar } from "../../../../../components/layout/Sidebar"
import { 
  ArrowLeft,
  Save,
  Eye,
  AlertCircle
} from "lucide-react"
import { User as AuthUser, hasPermission } from "../../../../../lib/auth"
import { generateSlug } from "../../../../../lib/utils"

interface Application {
  id: string
  grant_id: string
  project_title: string
  project_description: string
  requested_amount: number
  project_duration: number
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected'
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

export default function EditApplicationPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const router = useRouter()
  const params = useParams()
  const applicationSlug = params.slug as string

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
      
      // Check permissions
      if (!hasPermission(userData, 'canSubmitApplications')) {
        router.push('/dashboard/applications')
        return
      }
      
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
      
      // Mock data for editing - in production this would be an API call
      const mockApplications: Record<string, Application> = {
        'sfi-discover-programme-application': {
          id: '3',
          grant_id: 'grant-sfi-discover-003',
          project_title: 'SFI Discover Programme Application',
          project_description: 'A STEM education outreach program designed to engage secondary school students in cutting-edge science and technology research.',
          requested_amount: 25000,
          project_duration: 12,
          status: 'draft',
          application_data: {
            team_size: 5,
            technical_approach: 'Interactive workshops and hands-on experiments designed to demonstrate advanced scientific concepts in an accessible way.',
            expected_outcomes: [
              'Engage 500+ secondary school students',
              'Develop 10 interactive STEM modules',
              'Partner with 8 secondary schools',
              'Create reusable educational resources'
            ],
            budget_breakdown: {
              personnel: 15000,
              equipment: 6000,
              operations: 3000,
              other: 1000
            },
            timeline: [
              {
                phase: 'Planning & Development',
                duration: 3,
                deliverables: ['Curriculum design', 'Partnership agreements', 'Material development']
              },
              {
                phase: 'Pilot Program',
                duration: 3,
                deliverables: ['Pilot workshops', 'Feedback collection', 'Program refinement']
              },
              {
                phase: 'Full Implementation',
                duration: 6,
                deliverables: ['School visits', 'Workshop delivery', 'Impact assessment']
              }
            ],
            risk_assessment: [
              {
                risk: 'Low school participation due to curriculum constraints',
                impact: 'Reduced reach and impact of the program',
                mitigation: 'Early engagement with school principals and alignment with curriculum'
              }
            ],
            success_metrics: [
              'Minimum 500 student participants',
              '90% positive feedback from teachers',
              'Increased interest in STEM subjects measured through surveys',
              'Publication of educational resources'
            ],
            sustainability_plan: 'The educational materials and resources developed will be made freely available online for continued use by schools. We will seek additional funding for program expansion.'
          }
        }
      }

      const app = mockApplications[applicationSlug]
      if (!app) {
        setError('Application not found')
        return
      }

      // Only allow editing if it's a draft
      if (app.status !== 'draft') {
        router.push(`/dashboard/applications/${applicationSlug}`)
        return
      }

      setApplication(app)
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

  const handleSave = async () => {
    if (!application) return
    
    try {
      setIsSaving(true)
      
      // In production, this would be an API call to save the application
      // await fetch(`/api/applications/${applicationId}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(application)
      // })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setHasChanges(false)
      // Show success message or redirect
      router.push(`/dashboard/applications/${applicationId}`)
    } catch (error) {
      console.error('Error saving application:', error)
      setError('Failed to save application')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: any) => {
    if (!application) return
    
    setApplication(prev => ({
      ...prev!,
      [field]: value
    }))
    setHasChanges(true)
  }

  const updateApplicationData = (field: string, value: any) => {
    if (!application) return
    
    setApplication(prev => ({
      ...prev!,
      application_data: {
        ...prev!.application_data,
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const updateBudgetBreakdown = (category: string, value: number) => {
    if (!application) return
    
    setApplication(prev => ({
      ...prev!,
      application_data: {
        ...prev!.application_data,
        budget_breakdown: {
          ...prev!.application_data.budget_breakdown,
          [category]: value
        }
      }
    }))
    setHasChanges(true)
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
              The application you're trying to edit doesn't exist or cannot be modified.
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

  const totalBudget = Object.values(application.application_data.budget_breakdown).reduce((a, b) => a + b, 0)
  const budgetMismatch = totalBudget !== application.requested_amount

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
                onClick={() => router.push(`/dashboard/applications/${applicationId}`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Edit Application
                </h1>
                <p className="text-gray-600 mt-1">
                  Make changes to your draft application
                </p>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <Button 
                variant="outline"
                onClick={() => router.push(`/dashboard/applications/${applicationId}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving || !hasChanges}
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>

          {budgetMismatch && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Budget mismatch: Requested amount (€{application.requested_amount.toLocaleString()}) 
                  doesn't match budget breakdown total (€{totalBudget.toLocaleString()})
                </span>
              </div>
            </div>
          )}

          <div className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Title
                  </label>
                  <Input
                    value={application.project_title}
                    onChange={(e) => updateField('project_title', e.target.value)}
                    placeholder="Enter project title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Project Description
                  </label>
                  <Textarea
                    value={application.project_description}
                    onChange={(e) => updateField('project_description', e.target.value)}
                    placeholder="Describe your project"
                    rows={4}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Requested Amount (€)
                    </label>
                    <Input
                      type="number"
                      value={application.requested_amount}
                      onChange={(e) => updateField('requested_amount', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Duration (months)
                    </label>
                    <Input
                      type="number"
                      value={application.project_duration}
                      onChange={(e) => updateField('project_duration', parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team Size
                  </label>
                  <Input
                    type="number"
                    value={application.application_data.team_size}
                    onChange={(e) => updateApplicationData('team_size', parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Technical Approach */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Approach</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={application.application_data.technical_approach}
                  onChange={(e) => updateApplicationData('technical_approach', e.target.value)}
                  placeholder="Describe your technical approach"
                  rows={6}
                />
              </CardContent>
            </Card>

            {/* Budget Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Budget Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(application.application_data.budget_breakdown).map(([category, amount]) => (
                    <div key={category}>
                      <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                        {category} (€)
                      </label>
                      <Input
                        type="number"
                        value={amount}
                        onChange={(e) => updateBudgetBreakdown(category, parseInt(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Budget:</span>
                    <span className={`font-bold ${budgetMismatch ? 'text-red-600' : 'text-green-600'}`}>
                      €{totalBudget.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expected Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle>Expected Outcomes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.application_data.expected_outcomes.map((outcome, index) => (
                    <div key={index}>
                      <Input
                        value={outcome}
                        onChange={(e) => {
                          const newOutcomes = [...application.application_data.expected_outcomes]
                          newOutcomes[index] = e.target.value
                          updateApplicationData('expected_outcomes', newOutcomes)
                        }}
                        placeholder={`Expected outcome ${index + 1}`}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newOutcomes = [...application.application_data.expected_outcomes, '']
                      updateApplicationData('expected_outcomes', newOutcomes)
                    }}
                  >
                    Add Outcome
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Success Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Success Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {application.application_data.success_metrics.map((metric, index) => (
                    <div key={index}>
                      <Input
                        value={metric}
                        onChange={(e) => {
                          const newMetrics = [...application.application_data.success_metrics]
                          newMetrics[index] = e.target.value
                          updateApplicationData('success_metrics', newMetrics)
                        }}
                        placeholder={`Success metric ${index + 1}`}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => {
                      const newMetrics = [...application.application_data.success_metrics, '']
                      updateApplicationData('success_metrics', newMetrics)
                    }}
                  >
                    Add Metric
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sustainability Plan */}
            <Card>
              <CardHeader>
                <CardTitle>Sustainability Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={application.application_data.sustainability_plan}
                  onChange={(e) => updateApplicationData('sustainability_plan', e.target.value)}
                  placeholder="Describe how the project will be sustained after funding ends"
                  rows={4}
                />
              </CardContent>
            </Card>
          </div>

          {/* Save Button */}
          <div className="flex justify-end mt-8 space-x-3">
            <Button 
              variant="outline"
              onClick={() => router.push(`/dashboard/applications/${applicationId}`)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}