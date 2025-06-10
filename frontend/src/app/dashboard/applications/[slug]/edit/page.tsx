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
      budget_type: 'total' | 'yearly'
      personnel: {
        salaries: number
        benefits: number
        contractors: number
      }
      equipment: {
        hardware: number
        software: number
        facilities: number
      }
      operations: {
        travel: number
        training: number
        utilities: number
        materials: number
      }
      indirect_costs: {
        administrative: number
        overhead: number
      }
      other: {
        description: string
        amount: number
      }[]
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
              budget_type: 'total',
              personnel: {
                salaries: 12000,
                benefits: 2000,
                contractors: 1000
              },
              equipment: {
                hardware: 3000,
                software: 2000,
                facilities: 1000
              },
              operations: {
                travel: 1500,
                training: 800,
                utilities: 500,
                materials: 200
              },
              indirect_costs: {
                administrative: 800,
                overhead: 200
              },
              other: []
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
      // await fetch(`/api/applications/${application.id}`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(application)
      // })
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setHasChanges(false)
      // Show success message or redirect
      router.push(`/dashboard/applications/${application.id}`)
    } catch (error) {
      console.error('Error saving application:', error)
      setError('Failed to save application')
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: string, value: string | number) => {
    if (!application) return
    
    setApplication(prev => ({
      ...prev!,
      [field]: value
    }))
    setHasChanges(true)
  }

  const updateApplicationData = (field: string, value: string | number | string[]) => {
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

  const updateBudgetBreakdown = (path: string, value: string | number | { description: string; amount: number }[]) => {
    if (!application) return
    
    setApplication(prev => {
      const newApplication = { ...prev! }
      const pathArray = path.split('.')
      let current: Record<string, unknown> = newApplication.application_data.budget_breakdown as Record<string, unknown>
      
      // Navigate to the parent of the target property
      for (let i = 0; i < pathArray.length - 1; i++) {
        if (!current[pathArray[i]]) {
          current[pathArray[i]] = {}
        }
        current = current[pathArray[i]] as Record<string, unknown>
      }
      
      // Set the final value
      current[pathArray[pathArray.length - 1]] = value
      
      return newApplication
    })
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
              The application you&apos;re trying to edit doesn&apos;t exist or cannot be modified.
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

  const calculateTotalBudget = () => {
    const budget = application.application_data.budget_breakdown
    const personnelTotal = budget.personnel.salaries + budget.personnel.benefits + budget.personnel.contractors
    const equipmentTotal = budget.equipment.hardware + budget.equipment.software + budget.equipment.facilities
    const operationsTotal = budget.operations.travel + budget.operations.training + budget.operations.utilities + budget.operations.materials
    const indirectTotal = budget.indirect_costs.administrative + budget.indirect_costs.overhead
    const otherTotal = budget.other.reduce((sum, item) => sum + item.amount, 0)
    return personnelTotal + equipmentTotal + operationsTotal + indirectTotal + otherTotal
  }
  
  const totalBudget = calculateTotalBudget()
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
                onClick={() => router.push(`/dashboard/applications/${application?.id}`)}
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
                onClick={() => router.push(`/dashboard/applications/${application?.id}`)}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/dashboard/ai-editor-fullpage?applicationId=${application?.id}&section=main`)}
                className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Editor
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
                  doesn&apos;t match budget breakdown total (€{totalBudget.toLocaleString()})
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
                <div className="flex items-center justify-between">
                  <CardTitle>Technical Approach</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/ai-editor-fullpage?applicationId=${application?.id}&section=technical_approach`)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Editor
                  </Button>
                </div>
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
                <CardTitle className="flex items-center gap-2">
                  Budget Breakdown
                </CardTitle>
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium">Budget Type:</label>
                  <select
                    className="p-2 border rounded"
                    value={application.application_data.budget_breakdown.budget_type}
                    onChange={(e) => updateBudgetBreakdown('budget_type', e.target.value)}
                  >
                    <option value="total">Total Project Budget</option>
                    <option value="yearly">Annual Budget</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Personnel Costs */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Personnel Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Salaries</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.personnel.salaries}
                        onChange={(e) => updateBudgetBreakdown('personnel.salaries', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Benefits</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.personnel.benefits}
                        onChange={(e) => updateBudgetBreakdown('personnel.benefits', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Contractors</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.personnel.contractors}
                        onChange={(e) => updateBudgetBreakdown('personnel.contractors', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: €{(application.application_data.budget_breakdown.personnel.salaries + application.application_data.budget_breakdown.personnel.benefits + application.application_data.budget_breakdown.personnel.contractors).toLocaleString()}
                  </div>
                </div>

                {/* Equipment Costs */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Equipment & Infrastructure</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Hardware</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.equipment.hardware}
                        onChange={(e) => updateBudgetBreakdown('equipment.hardware', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Software</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.equipment.software}
                        onChange={(e) => updateBudgetBreakdown('equipment.software', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Facilities</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.equipment.facilities}
                        onChange={(e) => updateBudgetBreakdown('equipment.facilities', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: €{(application.application_data.budget_breakdown.equipment.hardware + application.application_data.budget_breakdown.equipment.software + application.application_data.budget_breakdown.equipment.facilities).toLocaleString()}
                  </div>
                </div>

                {/* Operations Costs */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Operations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Travel</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.operations.travel}
                        onChange={(e) => updateBudgetBreakdown('operations.travel', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Training</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.operations.training}
                        onChange={(e) => updateBudgetBreakdown('operations.training', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Utilities</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.operations.utilities}
                        onChange={(e) => updateBudgetBreakdown('operations.utilities', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Materials</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.operations.materials}
                        onChange={(e) => updateBudgetBreakdown('operations.materials', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: €{(application.application_data.budget_breakdown.operations.travel + application.application_data.budget_breakdown.operations.training + application.application_data.budget_breakdown.operations.utilities + application.application_data.budget_breakdown.operations.materials).toLocaleString()}
                  </div>
                </div>

                {/* Indirect Costs */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Indirect Costs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Administrative</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.indirect_costs.administrative}
                        onChange={(e) => updateBudgetBreakdown('indirect_costs.administrative', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Overhead</label>
                      <Input
                        type="number"
                        value={application.application_data.budget_breakdown.indirect_costs.overhead}
                        onChange={(e) => updateBudgetBreakdown('indirect_costs.overhead', parseFloat(e.target.value) || 0)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: €{(application.application_data.budget_breakdown.indirect_costs.administrative + application.application_data.budget_breakdown.indirect_costs.overhead).toLocaleString()}
                  </div>
                </div>

                {/* Other Costs */}
                <div className="border rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Other Expenses</h3>
                  {application.application_data.budget_breakdown.other.map((item, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <Input
                        value={item.description}
                        onChange={(e) => {
                          const newOther = [...application.application_data.budget_breakdown.other]
                          newOther[index] = { ...newOther[index], description: e.target.value }
                          updateBudgetBreakdown('other', newOther)
                        }}
                        placeholder="Description"
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const newOther = [...application.application_data.budget_breakdown.other]
                          newOther[index] = { ...newOther[index], amount: parseFloat(e.target.value) || 0 }
                          updateBudgetBreakdown('other', newOther)
                        }}
                        placeholder="Amount"
                        className="w-32"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          const newOther = application.application_data.budget_breakdown.other.filter((_, i) => i !== index)
                          updateBudgetBreakdown('other', newOther)
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const newOther = [...application.application_data.budget_breakdown.other, { description: '', amount: 0 }]
                      updateBudgetBreakdown('other', newOther)
                    }}
                  >
                    Add Other Expense
                  </Button>
                  <div className="mt-2 text-right text-sm text-gray-600">
                    Subtotal: €{application.application_data.budget_breakdown.other.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                  </div>
                </div>

                {/* Total and Validation */}
                <div className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">Total Budget</h3>
                    <div className="text-right">
                      <p className="text-2xl font-bold">€{totalBudget.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">
                        Grant Amount: €{application.requested_amount.toLocaleString()}
                      </p>
                      {budgetMismatch && (
                        <p className="text-red-500 text-sm">
                          Difference: €{Math.abs(totalBudget - application.requested_amount).toLocaleString()}
                        </p>
                      )}
                    </div>
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
                <div className="flex items-center justify-between">
                  <CardTitle>Sustainability Plan</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/ai-editor-fullpage?applicationId=${application?.id}&section=sustainability_plan`)}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    AI Editor
                  </Button>
                </div>
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
              onClick={() => router.push(`/dashboard/applications/${application?.id}`)}
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