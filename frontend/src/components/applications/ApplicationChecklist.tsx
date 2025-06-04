"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { ProgressCircle } from "../ui/progress-circle"
import { 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  Bot,
  Loader2,
  ChevronDown,
  ChevronRight,
  Target,
  FileText,
  DollarSign,
  Calendar,
  Shield,
  Lightbulb
} from "lucide-react"

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

interface ApplicationChecklistProps {
  grantId: string
  grantDetails: Record<string, unknown> | null
  organizationProfile: Record<string, unknown> | null
  applicationData: Record<string, unknown>
  onUpdateChecklist?: (checklist: ChecklistItem[]) => void
  className?: string
}

export function ApplicationChecklist({
  grantId,
  grantDetails,
  organizationProfile,
  // applicationData,
  onUpdateChecklist,
  className = ""
}: ApplicationChecklistProps) {
  const [checklist, setChecklist] = useState<ChecklistItem[]>([])
  // const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Documentation', 'Eligibility']))
  const [error, setError] = useState<string | null>(null)

  // Group checklist items by category
  const groupedChecklist = checklist.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = []
    }
    groups[item.category].push(item)
    return groups
  }, {} as Record<string, ChecklistItem[]>)

  // Calculate completion statistics
  const totalItems = checklist.length
  const completedItems = checklist.filter(item => item.completed).length
  const completionPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0
  const mandatoryItems = checklist.filter(item => item.mandatory)
  const completedMandatoryItems = mandatoryItems.filter(item => item.completed)
  const mandatoryPercentage = mandatoryItems.length > 0 ? 
    (completedMandatoryItems.length / mandatoryItems.length) * 100 : 100

  const generateChecklist = async () => {
    try {
      setIsGenerating(true)
      setError(null)
      
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/applications/${applicationId}/generate-checklist`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${localStorage.getItem('token')}`
      //   },
      //   body: JSON.stringify({
      //     grantDetails,
      //     organizationProfile
      //   })
      // })
      
      // Mock AI-generated checklist
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const mockChecklist: ChecklistItem[] = [
        {
          id: "doc_1",
          category: "Documentation",
          item: "Prepare company registration certificate",
          priority: "high",
          mandatory: true,
          estimated_time: "1 hour",
          dependencies: [],
          description: "Obtain certified copy of company registration from Companies Registration Office",
          aiGenerated: true
        },
        {
          id: "doc_2",
          category: "Documentation",
          item: "Gather financial statements (last 2 years)",
          priority: "high",
          mandatory: true,
          estimated_time: "2 hours",
          dependencies: [],
          description: "Audited financial statements or management accounts for the last two financial years",
          aiGenerated: true
        },
        {
          id: "elig_1",
          category: "Eligibility",
          item: "Verify organization size classification",
          priority: "high",
          mandatory: true,
          estimated_time: "30 minutes",
          dependencies: ["doc_2"],
          description: "Confirm organization meets SME criteria: <250 employees, <€50M turnover, <€43M balance sheet",
          aiGenerated: true
        },
        {
          id: "elig_2",
          category: "Eligibility",
          item: "Confirm project innovation requirements",
          priority: "high",
          mandatory: true,
          estimated_time: "1 hour",
          dependencies: [],
          description: "Document how project demonstrates clear innovation beyond current state of the art",
          aiGenerated: true
        },
        {
          id: "tech_1",
          category: "Technical",
          item: "Develop detailed technical specification",
          priority: "medium",
          mandatory: true,
          estimated_time: "8 hours",
          dependencies: ["elig_2"],
          description: "Create comprehensive technical approach including methodology, tools, and implementation plan",
          aiGenerated: true
        },
        {
          id: "tech_2",
          category: "Technical",
          item: "Prepare risk assessment matrix",
          priority: "medium",
          mandatory: false,
          estimated_time: "3 hours",
          dependencies: ["tech_1"],
          description: "Identify technical, commercial, and operational risks with mitigation strategies",
          aiGenerated: true
        },
        {
          id: "fin_1",
          category: "Financial",
          item: "Create detailed budget breakdown",
          priority: "high",
          mandatory: true,
          estimated_time: "4 hours",
          dependencies: ["tech_1"],
          description: "Itemized budget showing personnel, equipment, overhead, and other costs",
          aiGenerated: true
        },
        {
          id: "fin_2",
          category: "Financial",
          item: "Secure match funding commitment",
          priority: "high",
          mandatory: true,
          estimated_time: "2 weeks",
          dependencies: ["fin_1"],
          description: "Obtain written commitment for 25% match funding requirement",
          aiGenerated: true
        },
        {
          id: "time_1",
          category: "Timeline",
          item: "Develop project timeline with milestones",
          priority: "medium",
          mandatory: true,
          estimated_time: "2 hours",
          dependencies: ["tech_1"],
          description: "Create detailed Gantt chart with key deliverables and milestone dates",
          aiGenerated: true
        },
        {
          id: "sustain_1",
          category: "Sustainability",
          item: "Prepare commercialization strategy",
          priority: "low",
          mandatory: false,
          estimated_time: "4 hours",
          dependencies: ["tech_1", "fin_1"],
          description: "Outline how project outcomes will be commercialized and sustained post-grant",
          aiGenerated: true
        }
      ]
      
      setChecklist(mockChecklist)
      onUpdateChecklist?.(mockChecklist)
      
    } catch (error) {
      console.error('Error generating checklist:', error)
      setError('Failed to generate checklist. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  useEffect(() => {
    if (grantDetails && organizationProfile) {
      generateChecklist()
    }
  }, [grantId, grantDetails, organizationProfile])

  const toggleItemCompletion = (itemId: string) => {
    const updatedChecklist = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    )
    setChecklist(updatedChecklist)
    onUpdateChecklist?.(updatedChecklist)
  }

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      'Documentation': FileText,
      'Eligibility': Shield,
      'Technical': Target,
      'Financial': DollarSign,
      'Timeline': Calendar,
      'Sustainability': Lightbulb
    }
    const IconComponent = icons[category] || FileText
    return <IconComponent className="w-4 h-4" />
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getEstimatedTotalTime = () => {
    return checklist.reduce((total, item) => {
      const hours = parseFloat(item.estimated_time.match(/\d+/)?.[0] || '0')
      const isWeeks = item.estimated_time.includes('week')
      return total + (isWeeks ? hours * 40 : hours) // Assume 40 hours per week
    }, 0)
  }

  if (isGenerating) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Generating Application Checklist
          </CardTitle>
          <CardDescription>
            AI is analyzing grant requirements and creating a personalized checklist...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
            <p className="text-sm text-gray-600">This may take a few moments</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Application Checklist
              {checklist.some(item => item.aiGenerated) && (
                <Badge variant="outline" className="ml-2">
                  <Bot className="w-3 h-3 mr-1" />
                  AI Generated
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Complete these tasks to ensure a strong grant application
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <ProgressCircle percentage={completionPercentage} size={48} />
              <div className="text-xs text-gray-600 mt-1">Overall</div>
            </div>
            <div className="text-center">
              <ProgressCircle 
                percentage={mandatoryPercentage} 
                size={48}
                className={mandatoryPercentage === 100 ? "text-green-600" : "text-red-600"}
              />
              <div className="text-xs text-gray-600 mt-1">Mandatory</div>
            </div>
          </div>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{completedItems}</div>
            <div className="text-xs text-gray-600">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
            <div className="text-xs text-gray-600">Total Items</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{mandatoryItems.length}</div>
            <div className="text-xs text-gray-600">Mandatory</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{Math.round(getEstimatedTotalTime())}h</div>
            <div className="text-xs text-gray-600">Est. Time</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-red-700 text-sm">{error}</span>
            </div>
          </div>
        )}
        
        {checklist.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <CheckCircle className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No checklist available</h3>
            <p className="text-gray-600 mb-4">
              Generate an AI-powered checklist based on grant requirements.
            </p>
            <Button onClick={generateChecklist} disabled={isGenerating}>
              <Bot className="w-4 h-4 mr-2" />
              Generate Checklist
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Regenerate button */}
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={generateChecklist}
                disabled={isGenerating}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
            
            {/* Checklist by category */}
            {Object.entries(groupedChecklist).map(([category, items]) => {
              const categoryCompleted = items.filter(item => item.completed).length
              const categoryTotal = items.length
              const categoryPercentage = (categoryCompleted / categoryTotal) * 100
              const isExpanded = expandedCategories.has(category)
              
              return (
                <div key={category} className="border rounded-lg">
                  <button
                    onClick={() => toggleCategoryExpansion(category)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {getCategoryIcon(category)}
                      <div className="text-left">
                        <h3 className="font-medium text-gray-900">{category}</h3>
                        <p className="text-sm text-gray-600">
                          {categoryCompleted} of {categoryTotal} completed
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <ProgressCircle percentage={categoryPercentage} size={32} />
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t bg-gray-50 p-4 space-y-3">
                      {items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-start gap-3 p-3 bg-white rounded-lg border"
                        >
                          <button
                            onClick={() => toggleItemCompletion(item.id)}
                            className="mt-0.5"
                          >
                            {item.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <div className="w-5 h-5 border-2 border-gray-300 rounded-full hover:border-blue-500 transition-colors" />
                            )}
                          </button>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {item.item}
                              </h4>
                              <Badge 
                                variant="outline" 
                                className={getPriorityColor(item.priority)}
                              >
                                {item.priority}
                              </Badge>
                              {item.mandatory && (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  Required
                                </Badge>
                              )}
                            </div>
                            
                            <p className="text-sm text-gray-600 mb-2">
                              {item.description}
                            </p>
                            
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.estimated_time}
                              </div>
                              {item.dependencies.length > 0 && (
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {item.dependencies.length} dependencies
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}