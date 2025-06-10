"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../../components/ui/card"
import { Button } from "../../../../components/ui/button"
import { Input } from "../../../../components/ui/input"
import { Textarea } from "../../../../components/ui/textarea"
import { Badge } from "../../../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../../components/ui/tabs"
import { Sidebar } from "../../../../components/layout/Sidebar"
import { ApplicationChecklist } from "../../../../components/applications/ApplicationChecklist"
import { 
  ArrowLeft, 
  Save, 
  Send, 
  CheckCircle, 
  DollarSign,
  Calendar,
  FileText,
  Target,
  Bot,
  Loader2,
  Zap,
  Eye,
  Download
} from "lucide-react"
import { User } from "../../../../lib/auth"
import { useApplications } from "../../../../lib/store/aiStore"
import { grantsService, Grant } from "../../../../lib/api"

interface ChecklistItem {
  id: string
  category: string
  item: string
  priority: 'high' | 'medium' | 'low'
  mandatory: boolean
  estimated_time: string
  dependencies: string[]
  description: string
  completed?: boolean
  aiGenerated?: boolean
}

interface ApplicationData {
  grant_id: string
  project_title: string
  project_description: string
  requested_amount: number
  project_duration: number
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
    timeline: {
      phase: string
      duration: number
      deliverables: string[]
    }[]
    risk_assessment: {
      risk: string
      impact: string
      mitigation: string
    }[]
    success_metrics: string[]
    sustainability_plan: string
  }
}

function CreateApplicationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const grantId = searchParams.get('grantId')
  
  const [user, setUser] = useState<User | null>(null)
  const [selectedGrant, setSelectedGrant] = useState<Grant | null>(null)
  const [availableGrants, setAvailableGrants] = useState<Grant[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [step, setStep] = useState(1)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [activeTab, setActiveTab] = useState("form")
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([])
  const [showBudgetWarning, setShowBudgetWarning] = useState(false)
  
  // AI Store hooks
  const {
    currentApplication,
    createApplication,
    updateApplication
  } = useApplications()
  
  // Form data
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    grant_id: '',
    project_title: '',
    project_description: '',
    requested_amount: 0,
    project_duration: 12,
    application_data: {
      team_size: 1,
      technical_approach: '',
      expected_outcomes: [''],
      budget_breakdown: {
        budget_type: 'total',
        personnel: {
          salaries: 0,
          benefits: 0,
          contractors: 0
        },
        equipment: {
          hardware: 0,
          software: 0,
          facilities: 0
        },
        operations: {
          travel: 0,
          training: 0,
          utilities: 0,
          materials: 0
        },
        indirect_costs: {
          administrative: 0,
          overhead: 0
        },
        other: []
      },
      timeline: [{
        phase: 'Planning',
        duration: 3,
        deliverables: ['']
      }],
      risk_assessment: [{
        risk: '',
        impact: '',
        mitigation: ''
      }],
      success_metrics: [''],
      sustainability_plan: ''
    }
  })

  const updateApplicationData = useCallback((path: string, value: any) => {
    setApplicationData(prev => {
      const newData = { ...prev }
      const keys = path.split('.')
      let current: any = newData
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {}
        current = current[keys[i]]
      }
      
      current[keys[keys.length - 1]] = value
      return newData
    })
    
    // Update AI store separately to avoid state update during render
    if (currentApplication) {
      setTimeout(() => {
        const updatedSections = { ...currentApplication.sections }
        const sectionKeys = path.split('.')
        if (sectionKeys.length >= 2) {
          const sectionName = sectionKeys[0]
          const fieldName = sectionKeys.slice(1).join('.')
          
          if (!updatedSections[sectionName]) {
            updatedSections[sectionName] = {}
          }
          (updatedSections[sectionName] as Record<string, any>)[fieldName] = value
          
          updateApplication(currentApplication.id, {
            sections: updatedSections
          })
        }
      }, 0)
    }
  }, [currentApplication, updateApplication])

  const initializeApplication = useCallback((grantId: string, organizationId: string) => {
    if (!currentApplication || currentApplication.grantId !== grantId) {
      createApplication(grantId, organizationId)
      updateApplicationData('grant_id', grantId)
    }
  }, [currentApplication, createApplication, updateApplicationData])

  const loadAvailableGrants = useCallback(async () => {
    setLoading(true)
    try {
      const response = await grantsService.getGrants({ limit: 50 })
      setAvailableGrants(response.grants || [])
    } catch (error) {
      console.error('Failed to load grants:', error)
    } finally {
      setLoading(false)
    }
  }, [])
  
  const loadSpecificGrant = useCallback(async (grantId: string) => {
    setLoading(true)
    try {
      const response = await grantsService.getGrants({ limit: 50 })
      const grant = response.grants.find(g => g.id === grantId)
      if (grant) {
        setSelectedGrant(grant)
        setAvailableGrants([grant])
      }
    } catch (error) {
      console.error('Failed to load grant:', error)
    } finally {
      setLoading(false)
    }
  }, [])

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
      
      if (grantId) {
        loadSpecificGrant(grantId)
        initializeApplication(grantId, userData.id)
      } else {
        loadAvailableGrants()
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    }
  }, [router, grantId, loadSpecificGrant, initializeApplication, loadAvailableGrants])

  const addArrayItem = (path: string, defaultValue: any) => {
    const current = getNestedValue(applicationData, path) || []
    updateApplicationData(path, [...current, defaultValue])
  }

  const removeArrayItem = (path: string, index: number) => {
    const current = getNestedValue(applicationData, path) || []
    const newArray = current.filter((_: any, i: number) => i !== index)
    updateApplicationData(path, newArray)
  }

  const updateArrayItem = (path: string, index: number, value: any) => {
    const current = getNestedValue(applicationData, path) || []
    const newArray = [...current]
    newArray[index] = value
    updateApplicationData(path, newArray)
  }

  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  const validateStep = (stepNumber: number): boolean => {
    const newErrors: Record<string, string> = {}
    
    switch (stepNumber) {
      case 1:
        if (!selectedGrant) newErrors.grant = 'Please select a grant'
        if (!applicationData.project_title.trim()) newErrors.project_title = 'Project title is required'
        if (!applicationData.project_description.trim()) newErrors.project_description = 'Project description is required'
        if (applicationData.requested_amount <= 0) newErrors.requested_amount = 'Requested amount must be greater than 0'
        if (applicationData.project_duration <= 0) newErrors.project_duration = 'Project duration must be greater than 0'
        break
      
      case 2:
        if (!applicationData.application_data.technical_approach.trim()) {
          newErrors.technical_approach = 'Technical approach is required'
        }
        if (applicationData.application_data.team_size <= 0) {
          newErrors.team_size = 'Team size must be greater than 0'
        }
        break
      
      case 3:
        // Budget validation is now more flexible - no strict equality required
        break
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setStep(prev => prev - 1)
  }

  const saveAsDraft = async () => {
    setSaving(true)
    try {
      if (currentApplication) {
        updateApplication(currentApplication.id, {
          status: 'draft'
        })
      }
      
      router.push('/dashboard/applications')
    } catch (error) {
      console.error('Failed to save application:', error)
      alert('Failed to save application. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const submitApplication = async () => {
    if (!validateStep(step)) return
    
    // Check budget discrepancy
    const budget = applicationData.application_data.budget_breakdown
    const personnelTotal = budget.personnel.salaries + budget.personnel.benefits + budget.personnel.contractors
    const equipmentTotal = budget.equipment.hardware + budget.equipment.software + budget.equipment.facilities
    const operationsTotal = budget.operations.travel + budget.operations.training + budget.operations.utilities + budget.operations.materials
    const indirectTotal = budget.indirect_costs.administrative + budget.indirect_costs.overhead
    const otherTotal = budget.other.reduce((sum, item) => sum + item.amount, 0)
    const budgetTotal = personnelTotal + equipmentTotal + operationsTotal + indirectTotal + otherTotal
    
    const difference = Math.abs(budgetTotal - applicationData.requested_amount)
    const percentageDiff = applicationData.requested_amount > 0 ? (difference / applicationData.requested_amount) * 100 : 0
    
    if (difference > 0 && percentageDiff > 1) {
      const message = `Budget discrepancy detected:
      
Requested Amount: €${applicationData.requested_amount.toLocaleString()}
Budget Breakdown Total: €${budgetTotal.toLocaleString()}
Difference: €${difference.toLocaleString()} (${percentageDiff.toFixed(1)}%)

Are you sure you want to submit with this ${budgetTotal > applicationData.requested_amount ? 'over' : 'under'} budget?`
      
      if (!confirm(message)) return
    }
    
    setSubmitting(true)
    try {
      if (currentApplication) {
        updateApplication(currentApplication.id, {
          status: 'submitted'
        })
      }
      
      router.push('/dashboard/applications?success=true')
    } catch (error) {
      console.error('Failed to submit application:', error)
      alert('Failed to submit application. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // AI Content Generation
  const generateAIContent = async (fieldPath: string) => {
    if (!selectedGrant || !user) return
    
    try {
      setIsGeneratingAI(true)
      
      // Create context for AI generation
      const context = {
        grant: selectedGrant,
        organization: { name: user.name },
        fieldPath,
        existingData: applicationData
      }

      // Mock AI content generation - replace with actual AI service call
      const aiContent = await generateMockAIContent(fieldPath, context)
      updateApplicationData(fieldPath, aiContent)
      
    } catch (error) {
      console.error('Error generating AI content:', error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const generateMockAIContent = async (fieldPath: string, context: any): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const templates: Record<string, string> = {
      'project_description': `This innovative project leverages cutting-edge technology to address critical challenges in ${selectedGrant?.categories?.[0] || 'the technology sector'}. Our solution combines proven methodologies with novel approaches to deliver measurable impact and sustainable outcomes.`,
      'application_data.technical_approach': `Our technical approach follows industry best practices and incorporates the latest advancements in technology. We will utilize a phased implementation strategy that ensures quality deliverables while maintaining flexibility to adapt to changing requirements.`,
      'application_data.sustainability_plan': `The project sustainability will be ensured through multiple revenue streams, strategic partnerships, and continued innovation. We have identified key stakeholders who will support the long-term viability of this initiative beyond the grant period.`
    }
    
    return templates[fieldPath] || `AI-generated content for ${fieldPath}`
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((stepNumber) => (
        <div key={stepNumber} className="flex items-center">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
            ${step >= stepNumber ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}
          `}>
            {step > stepNumber ? <CheckCircle className="h-4 w-4" /> : stepNumber}
          </div>
          {stepNumber < 4 && (
            <div className={`w-16 h-1 ${step > stepNumber ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  )

  const renderGrantSelection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Select Grant & Basic Information
        </CardTitle>
        <CardDescription>Choose the grant you want to apply for and provide basic project details</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Grant Selection */}
        <div>
          <label className="block text-sm font-medium mb-2">Available Grants</label>
          {loading ? (
            <div className="text-center py-4">Loading grants...</div>
          ) : (
            <div className="grid gap-3 max-h-64 overflow-y-auto">
              {availableGrants.map(grant => (
                <div
                  key={grant.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedGrant?.id === grant.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    setSelectedGrant(grant)
                    updateApplicationData('grant_id', grant.id)
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">{grant.title}</h3>
                    <Badge variant="outline">{grant.funder}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{grant.description?.substring(0, 150)}...</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    {grant.amount_min && grant.amount_max && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        {grant.amount_min.toLocaleString()} - {grant.amount_max.toLocaleString()} {grant.currency}
                      </span>
                    )}
                    {grant.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(grant.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.grant && <p className="text-red-500 text-sm mt-1">{errors.grant}</p>}
        </div>

        {selectedGrant && (
          <>
            {/* Project Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Project Title *</label>
              <Input
                value={applicationData.project_title}
                onChange={(e) => updateApplicationData('project_title', e.target.value)}
                placeholder="Enter your project title"
                className={errors.project_title ? 'border-red-500' : ''}
              />
              {errors.project_title && <p className="text-red-500 text-sm mt-1">{errors.project_title}</p>}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium mb-2">Project Description *</label>
              <Textarea
                value={applicationData.project_description}
                onChange={(e) => updateApplicationData('project_description', e.target.value)}
                placeholder="Provide a detailed description of your project"
                rows={4}
                className={errors.project_description ? 'border-red-500' : ''}
              />
              {errors.project_description && <p className="text-red-500 text-sm mt-1">{errors.project_description}</p>}
            </div>

            {/* Requested Amount and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Requested Amount ({selectedGrant.currency}) *</label>
                <Input
                  type="number"
                  value={applicationData.requested_amount}
                  onChange={(e) => updateApplicationData('requested_amount', Number(e.target.value))}
                  min={selectedGrant.amount_min}
                  max={selectedGrant.amount_max}
                  className={errors.requested_amount ? 'border-red-500' : ''}
                />
                {selectedGrant.amount_min && selectedGrant.amount_max && (
                  <p className="text-sm text-gray-500 mt-1">
                    Range: {selectedGrant.amount_min.toLocaleString()} - {selectedGrant.amount_max.toLocaleString()}
                  </p>
                )}
                {errors.requested_amount && <p className="text-red-500 text-sm mt-1">{errors.requested_amount}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Project Duration (months) *</label>
                <Input
                  type="number"
                  value={applicationData.project_duration}
                  onChange={(e) => updateApplicationData('project_duration', Number(e.target.value))}
                  min={1}
                  max={60}
                  className={errors.project_duration ? 'border-red-500' : ''}
                />
                {errors.project_duration && <p className="text-red-500 text-sm mt-1">{errors.project_duration}</p>}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )

  const renderProjectDetails = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Project Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Technical Approach *</label>
          <Textarea
            value={applicationData.application_data.technical_approach}
            onChange={(e) => updateApplicationData('application_data.technical_approach', e.target.value)}
            placeholder="Describe your technical approach and methodology"
            rows={4}
            className={errors.technical_approach ? 'border-red-500' : ''}
          />
          {errors.technical_approach && <p className="text-red-500 text-sm mt-1">{errors.technical_approach}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Team Size *</label>
          <Input
            type="number"
            value={applicationData.application_data.team_size || ''}
            onChange={(e) => updateApplicationData('application_data.team_size', parseInt(e.target.value) || 1)}
            min="1"
            className={errors.team_size ? 'border-red-500' : ''}
          />
          {errors.team_size && <p className="text-red-500 text-sm mt-1">{errors.team_size}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Expected Outcomes *</label>
          {applicationData.application_data.expected_outcomes.map((outcome, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={outcome}
                onChange={(e) => {
                  const newOutcomes = [...applicationData.application_data.expected_outcomes]
                  newOutcomes[index] = e.target.value
                  updateApplicationData('application_data.expected_outcomes', newOutcomes)
                }}
                placeholder={`Expected outcome ${index + 1}`}
                className="flex-1"
              />
              {applicationData.application_data.expected_outcomes.length > 1 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newOutcomes = applicationData.application_data.expected_outcomes.filter((_, i) => i !== index)
                    updateApplicationData('application_data.expected_outcomes', newOutcomes)
                  }}
                >
                  Remove
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const newOutcomes = [...applicationData.application_data.expected_outcomes, '']
              updateApplicationData('application_data.expected_outcomes', newOutcomes)
            }}
          >
            Add Outcome
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderBudgetBreakdown = () => {
    const budget = applicationData.application_data.budget_breakdown

    const calculateTotal = () => {
      const personnelTotal = budget.personnel.salaries + budget.personnel.benefits + budget.personnel.contractors
      const equipmentTotal = budget.equipment.hardware + budget.equipment.software + budget.equipment.facilities
      const operationsTotal = budget.operations.travel + budget.operations.training + budget.operations.utilities + budget.operations.materials
      const indirectTotal = budget.indirect_costs.administrative + budget.indirect_costs.overhead
      const otherTotal = budget.other.reduce((sum, item) => sum + item.amount, 0)
      return personnelTotal + equipmentTotal + operationsTotal + indirectTotal + otherTotal
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Budget Breakdown
          </CardTitle>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Budget Type:</label>
            <select
              className="p-2 border rounded"
              value={budget.budget_type}
              onChange={(e) => updateApplicationData('application_data.budget_breakdown.budget_type', e.target.value)}
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
                  value={budget.personnel.salaries || ''}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.personnel.salaries', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Benefits</label>
                <Input
                  type="number"
                  value={budget.personnel.benefits || ''}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.personnel.benefits', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contractors</label>
                <Input
                  type="number"
                  value={budget.personnel.contractors || ''}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.personnel.contractors', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-2 text-right text-sm text-gray-600">
              Subtotal: €{(budget.personnel.salaries + budget.personnel.benefits + budget.personnel.contractors).toLocaleString()}
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
                  value={budget.equipment.hardware}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.equipment.hardware', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Software</label>
                <Input
                  type="number"
                  value={budget.equipment.software}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.equipment.software', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Facilities</label>
                <Input
                  type="number"
                  value={budget.equipment.facilities}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.equipment.facilities', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-2 text-right text-sm text-gray-600">
              Subtotal: €{(budget.equipment.hardware + budget.equipment.software + budget.equipment.facilities).toLocaleString()}
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
                  value={budget.operations.travel}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.operations.travel', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Training</label>
                <Input
                  type="number"
                  value={budget.operations.training}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.operations.training', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Utilities</label>
                <Input
                  type="number"
                  value={budget.operations.utilities}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.operations.utilities', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Materials</label>
                <Input
                  type="number"
                  value={budget.operations.materials}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.operations.materials', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-2 text-right text-sm text-gray-600">
              Subtotal: €{(budget.operations.travel + budget.operations.training + budget.operations.utilities + budget.operations.materials).toLocaleString()}
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
                  value={budget.indirect_costs.administrative}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.indirect_costs.administrative', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Overhead</label>
                <Input
                  type="number"
                  value={budget.indirect_costs.overhead}
                  onChange={(e) => updateApplicationData('application_data.budget_breakdown.indirect_costs.overhead', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="mt-2 text-right text-sm text-gray-600">
              Subtotal: €{(budget.indirect_costs.administrative + budget.indirect_costs.overhead).toLocaleString()}
            </div>
          </div>

          {/* Other Costs */}
          <div className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">Other Expenses</h3>
            {budget.other.map((item, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <Input
                  value={item.description}
                  onChange={(e) => {
                    const newOther = [...budget.other]
                    newOther[index] = { ...newOther[index], description: e.target.value }
                    updateApplicationData('application_data.budget_breakdown.other', newOther)
                  }}
                  placeholder="Description"
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const newOther = [...budget.other]
                    newOther[index] = { ...newOther[index], amount: parseFloat(e.target.value) || 0 }
                    updateApplicationData('application_data.budget_breakdown.other', newOther)
                  }}
                  placeholder="Amount"
                  className="w-32"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    const newOther = budget.other.filter((_, i) => i !== index)
                    updateApplicationData('application_data.budget_breakdown.other', newOther)
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
                const newOther = [...budget.other, { description: '', amount: 0 }]
                updateApplicationData('application_data.budget_breakdown.other', newOther)
              }}
            >
              Add Other Expense
            </Button>
            <div className="mt-2 text-right text-sm text-gray-600">
              Subtotal: €{budget.other.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
            </div>
          </div>

          {/* Total and Validation */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Total Budget</h3>
              <div className="text-right">
                <p className="text-2xl font-bold">€{calculateTotal().toLocaleString()}</p>
                <p className="text-sm text-gray-600">
                  Grant Amount: €{applicationData.requested_amount.toLocaleString()}
                </p>
                {calculateTotal() !== applicationData.requested_amount && (
                  <div className="space-y-2">
                    <p className="text-orange-500 text-sm">
                      Difference: €{Math.abs(calculateTotal() - applicationData.requested_amount).toLocaleString()} 
                      ({((Math.abs(calculateTotal() - applicationData.requested_amount) / applicationData.requested_amount) * 100).toFixed(1)}%)
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => updateApplicationData('requested_amount', calculateTotal())}
                    >
                      Update Requested Amount to Match Budget
                    </Button>
                  </div>
                )}
              </div>
            </div>
            {errors.budget && <p className="text-red-500 text-sm mt-2">{errors.budget}</p>}
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderReviewSubmit = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Review & Submit
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Application Summary</h3>
          <div className="grid gap-2 text-sm">
            <p><strong>Grant:</strong> {selectedGrant?.title}</p>
            <p><strong>Project Title:</strong> {applicationData.project_title}</p>
            <p><strong>Requested Amount:</strong> €{applicationData.requested_amount.toLocaleString()}</p>
            <p><strong>Duration:</strong> {applicationData.project_duration} months</p>
            <p><strong>Team Size:</strong> {applicationData.application_data.team_size}</p>
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Budget Summary</h3>
          <div className="grid gap-1 text-sm">
            {(() => {
              const budget = applicationData.application_data.budget_breakdown
              const personnelTotal = budget.personnel.salaries + budget.personnel.benefits + budget.personnel.contractors
              const equipmentTotal = budget.equipment.hardware + budget.equipment.software + budget.equipment.facilities
              const operationsTotal = budget.operations.travel + budget.operations.training + budget.operations.utilities + budget.operations.materials
              const indirectTotal = budget.indirect_costs.administrative + budget.indirect_costs.overhead
              const otherTotal = budget.other.reduce((sum, item) => sum + item.amount, 0)
              
              return (
                <>
                  <p><strong>Personnel:</strong> €{personnelTotal.toLocaleString()}</p>
                  <p><strong>Equipment:</strong> €{equipmentTotal.toLocaleString()}</p>
                  <p><strong>Operations:</strong> €{operationsTotal.toLocaleString()}</p>
                  <p><strong>Indirect:</strong> €{indirectTotal.toLocaleString()}</p>
                  <p><strong>Other:</strong> €{otherTotal.toLocaleString()}</p>
                  <p className="font-semibold border-t pt-1"><strong>Total:</strong> €{(personnelTotal + equipmentTotal + operationsTotal + indirectTotal + otherTotal).toLocaleString()}</p>
                </>
              )
            })()}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Project Description</h3>
          <p className="text-sm text-gray-700">{applicationData.project_description}</p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">Expected Outcomes</h3>
          <ul className="text-sm text-gray-700 list-disc list-inside">
            {applicationData.application_data.expected_outcomes.map((outcome, index) => (
              <li key={index}>{outcome}</li>
            ))}
          </ul>
        </div>

        <Button 
          onClick={submitApplication}
          disabled={submitting}
          className="w-full bg-green-600 hover:bg-green-700"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting Application...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Submit Application
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )

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
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" onClick={() => router.push('/dashboard/grants')}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Grants
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Create Application</h1>
                  <p className="text-gray-600">{selectedGrant?.title || 'Submit a new grant application'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={saveAsDraft}
                  disabled={saving}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Draft
                </Button>
              </div>
            </div>
          </div>

          {/* Enhanced UI with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="form">Application Form</TabsTrigger>
              <TabsTrigger value="checklist">Requirements</TabsTrigger>
              <TabsTrigger value="ai-assist">AI Assistant</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
            </TabsList>

            <TabsContent value="form" className="space-y-6">
              {/* Step Indicator */}
              {renderStepIndicator()}

              {/* Step Content */}
              <div className="mb-8">
                {step === 1 && renderGrantSelection()}
                {step === 2 && renderProjectDetails()}
                {step === 3 && renderBudgetBreakdown()}
                {step === 4 && renderReviewSubmit()}
              </div>

              {/* Navigation */}
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={step === 1}
                >
                  Previous
                </Button>

                <div className="flex gap-2">
                  {step < 4 ? (
                    <Button onClick={nextStep}>
                      Next
                    </Button>
                  ) : (
                    <Button onClick={submitApplication} disabled={saving}>
                      <Send className="h-4 w-4 mr-2" />
                      {saving ? 'Submitting...' : 'Submit Application'}
                    </Button>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="checklist">
              <ApplicationChecklist
                grantId={selectedGrant?.id || ''}
                grantDetails={selectedGrant as Record<string, unknown> | null}
                organizationProfile={{ name: user?.name, id: user?.id }}
                applicationData={applicationData as unknown as Record<string, unknown>}
                onUpdateChecklist={setChecklistItems}
              />
            </TabsContent>

            <TabsContent value="ai-assist">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5" />
                    AI Writing Assistant
                  </CardTitle>
                  <CardDescription>
                    Let AI help you write compelling grant application content
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button
                      onClick={() => generateAIContent('project_description')}
                      disabled={isGeneratingAI}
                      variant="outline"
                      className="h-20 flex-col"
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      ) : (
                        <Zap className="w-6 h-6 mb-2" />
                      )}
                      Generate Project Description
                    </Button>
                    
                    <Button
                      onClick={() => generateAIContent('application_data.technical_approach')}
                      disabled={isGeneratingAI}
                      variant="outline"
                      className="h-20 flex-col"
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      ) : (
                        <FileText className="w-6 h-6 mb-2" />
                      )}
                      Generate Technical Approach
                    </Button>
                    
                    <Button
                      onClick={() => generateAIContent('application_data.sustainability_plan')}
                      disabled={isGeneratingAI}
                      variant="outline"
                      className="h-20 flex-col"
                    >
                      {isGeneratingAI ? (
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      ) : (
                        <Target className="w-6 h-6 mb-2" />
                      )}
                      Generate Sustainability Plan
                    </Button>
                    
                    <Button
                      onClick={() => setActiveTab('checklist')}
                      variant="outline"
                      className="h-20 flex-col"
                    >
                      <CheckCircle className="w-6 h-6 mb-2" />
                      View Requirements
                      <span className="text-xs">Checklist</span>
                    </Button>
                  </div>
                  
                  {isGeneratingAI && (
                    <div className="text-center py-4">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm text-gray-600">AI is generating content...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="preview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Application Preview
                  </CardTitle>
                  <CardDescription>
                    Review your complete application
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-4">Grant Information</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div><strong>Grant:</strong> {selectedGrant?.title}</div>
                        <div><strong>Funder:</strong> {selectedGrant?.funder}</div>
                        <div><strong>Amount:</strong> {applicationData.requested_amount?.toLocaleString()} {selectedGrant?.currency}</div>
                        <div><strong>Duration:</strong> {applicationData.project_duration} months</div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <h3 className="font-medium mb-4">Project Details</h3>
                      <div className="space-y-2 text-sm">
                        <div><strong>Title:</strong> {applicationData.project_title}</div>
                        <div><strong>Description:</strong> {applicationData.project_description}</div>
                      </div>
                    </div>
                    
                    <div className="text-center pt-4">
                      <Button className="mr-4" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download PDF
                      </Button>
                      <Button onClick={submitApplication} disabled={saving}>
                        <Send className="w-4 w-4 mr-2" />
                        Submit Application
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

export default function CreateApplication() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <CreateApplicationContent />
    </Suspense>
  )
}