"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Textarea } from '../ui/textarea'
import { 
  Brain,
  Lightbulb, 
  CheckCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Wand2,
  FileText,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Zap,
  RefreshCw,
  Save,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Copy
} from 'lucide-react'
import { User } from '../../lib/auth'

interface ApplicationSection {
  id: string
  title: string
  description: string
  required: boolean
  completed: boolean
  content: string
  wordLimit?: number
  guidelines: string[]
  examples: string[]
  aiSuggestions: AISuggestion[]
  quality: {
    score: number
    feedback: string[]
    improvements: string[]
  }
}

interface AISuggestion {
  id: string
  type: 'content' | 'structure' | 'improvement' | 'example'
  title: string
  suggestion: string
  reasoning: string
  confidence: number
  impact: 'low' | 'medium' | 'high'
  category: string
}

interface ApplicationForm {
  id: string
  grantTitle: string
  sections: ApplicationSection[]
  overallProgress: number
  aiAnalysis: {
    strengthScore: number
    competitivenessScore: number
    completenessScore: number
    recommendations: string[]
    riskFactors: string[]
  }
}

interface IntelligentApplicationAssistantProps {
  user: User
  applicationId?: string
  grantData?: any
  onSave?: (content: ApplicationForm) => void
  className?: string
}

export function IntelligentApplicationAssistant({ 
  user, 
  applicationId, 
  grantData,
  onSave,
  className = "" 
}: IntelligentApplicationAssistantProps) {
  const [application, setApplication] = useState<ApplicationForm>(createMockApplication())
  const [currentSection, setCurrentSection] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [analysisRunning, setAnalysisRunning] = useState(false)

  // Auto-save functionality
  const saveApplication = useCallback(async () => {
    setLastSaved(new Date())
    if (onSave) {
      onSave(application)
    }
    console.log('Application auto-saved:', application)
  }, [application, onSave])

  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(saveApplication, 30000)
    return () => clearInterval(interval)
  }, [saveApplication])

  // Generate AI suggestions for current section
  const generateSuggestions = async (sectionId: string) => {
    setIsGenerating(true)
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const section = application.sections.find(s => s.id === sectionId)
    if (!section) return
    
    const newSuggestions: AISuggestion[] = [
      {
        id: `${sectionId}-suggestion-1`,
        type: 'content',
        title: 'Enhanced Value Proposition',
        suggestion: 'Consider emphasizing the unique market opportunity and competitive advantage your project addresses. Include specific metrics or market research to support your claims.',
        reasoning: 'Strong value propositions significantly improve application success rates by 23%',
        confidence: 85,
        impact: 'high',
        category: 'content_quality'
      },
      {
        id: `${sectionId}-suggestion-2`,
        type: 'structure',
        title: 'Improved Structure',
        suggestion: 'Restructure this section with clear subheadings: Problem Statement, Proposed Solution, Expected Outcomes, and Success Metrics.',
        reasoning: 'Well-structured applications are 34% more likely to receive funding',
        confidence: 92,
        impact: 'medium',
        category: 'organization'
      },
      {
        id: `${sectionId}-suggestion-3`,
        type: 'improvement',
        title: 'Add Quantitative Evidence',
        suggestion: 'Include specific numbers, percentages, or measurable outcomes to strengthen your proposal. For example: "Increase efficiency by 40%" rather than "improve efficiency".',
        reasoning: 'Quantified claims are more persuasive and demonstrate thorough planning',
        confidence: 78,
        impact: 'high',
        category: 'evidence'
      }
    ]
    
    setApplication(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, aiSuggestions: newSuggestions }
          : s
      )
    }))
    
    setIsGenerating(false)
  }

  // Apply AI suggestion to content
  const applySuggestion = (sectionId: string, suggestion: AISuggestion) => {
    const section = application.sections.find(s => s.id === sectionId)
    if (!section) return
    
    let improvedContent = section.content
    
    // Simulate applying the suggestion
    switch (suggestion.type) {
      case 'content':
        improvedContent = section.content + '\n\n' + suggestion.suggestion
        break
      case 'structure':
        improvedContent = `## Problem Statement\n${section.content}\n\n## Proposed Solution\n[Add your solution here]\n\n## Expected Outcomes\n[Add expected outcomes]\n\n## Success Metrics\n[Add measurable success criteria]`
        break
      case 'improvement':
        improvedContent = section.content.replace(/improve|increase|enhance/g, (match) => `${match} by [X]%`)
        break
    }
    
    setApplication(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, content: improvedContent }
          : s
      )
    }))
  }

  // Real-time content analysis
  const analyzeContent = async (sectionId: string, content: string) => {
    if (content.length < 50) return // Don't analyze very short content
    
    setAnalysisRunning(true)
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const wordCount = content.split(' ').length
    const hasQuantifiers = /\d+%|\d+\s*(dollars?|euros?|percent|times|fold)/i.test(content)
    const hasActionVerbs = /(implement|develop|create|establish|deliver|achieve)/i.test(content)
    const hasStructure = /##|•|\*|\d+\./g.test(content)
    
    let score = 50
    const feedback: string[] = []
    const improvements: string[] = []
    
    if (wordCount > 100) {
      score += 20
      feedback.push('Good content length')
    } else {
      improvements.push('Consider expanding your response for more detail')
    }
    
    if (hasQuantifiers) {
      score += 15
      feedback.push('Excellent use of specific metrics')
    } else {
      improvements.push('Add specific numbers or percentages to strengthen your claims')
    }
    
    if (hasActionVerbs) {
      score += 10
      feedback.push('Strong action-oriented language')
    }
    
    if (hasStructure) {
      score += 5
      feedback.push('Well-organized structure')
    } else {
      improvements.push('Consider using bullet points or numbered lists for clarity')
    }
    
    setApplication(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { 
              ...s, 
              quality: { score: Math.min(100, score), feedback, improvements }
            }
          : s
      )
    }))
    
    setAnalysisRunning(false)
  }

  // Update section content
  const updateSectionContent = (sectionId: string, content: string) => {
    setApplication(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === sectionId 
          ? { ...s, content, completed: content.length > 50 }
          : s
      )
    }))
    
    // Trigger analysis after user stops typing
    const timeoutId = setTimeout(() => {
      analyzeContent(sectionId, content)
    }, 2000)
    
    return () => clearTimeout(timeoutId)
  }

  // Calculate overall progress
  useEffect(() => {
    const completedSections = application.sections.filter(s => s.completed).length
    const progress = (completedSections / application.sections.length) * 100
    setApplication(prev => ({ ...prev, overallProgress: progress }))
  }, [application.sections])

  const currentSectionData = application.sections[currentSection]

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className}`}>
      {/* Main Application Form */}
      <div className="lg:col-span-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  {application.grantTitle}
                </CardTitle>
                <CardDescription>
                  AI-Assisted Application Completion
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={saveApplication}
                  className="flex items-center space-x-1"
                >
                  <Save className="h-3 w-3" />
                  <span>Save</span>
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="space-y-2 mt-4">
              <div className="flex justify-between text-sm">
                <span>Overall Progress</span>
                <span>{Math.round(application.overallProgress)}% Complete</span>
              </div>
              <Progress value={application.overallProgress} className="h-2" />
            </div>
          </CardHeader>

          <CardContent>
            {/* Section Navigation */}
            <div className="flex flex-wrap gap-2 mb-6">
              {application.sections.map((section, index) => (
                <Button
                  key={section.id}
                  variant={currentSection === index ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentSection(index)}
                  className="flex items-center space-x-1"
                >
                  {section.completed && <CheckCircle className="h-3 w-3" />}
                  <span>{section.title}</span>
                  {section.required && <span className="text-red-500">*</span>}
                </Button>
              ))}
            </div>

            {/* Current Section */}
            {currentSectionData && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    {currentSectionData.title}
                    {currentSectionData.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </h3>
                  <p className="text-gray-600 text-sm mt-1">
                    {currentSectionData.description}
                  </p>
                  {currentSectionData.wordLimit && (
                    <p className="text-xs text-gray-500 mt-1">
                      Word limit: {currentSectionData.wordLimit} words
                    </p>
                  )}
                </div>

                {/* Guidelines */}
                {currentSectionData.guidelines.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Guidelines</h4>
                    <ul className="space-y-1">
                      {currentSectionData.guidelines.map((guideline, index) => (
                        <li key={index} className="text-sm text-blue-800 flex items-start space-x-2">
                          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{guideline}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content Editor */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Your Response</label>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateSuggestions(currentSectionData.id)}
                        disabled={isGenerating}
                        className="flex items-center space-x-1"
                      >
                        <Wand2 className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                        <span>AI Assist</span>
                      </Button>
                      {currentSectionData.quality.score > 0 && (
                        <Badge 
                          className={`${
                            currentSectionData.quality.score >= 80 ? 'bg-green-100 text-green-800' :
                            currentSectionData.quality.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}
                        >
                          Quality: {currentSectionData.quality.score}%
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <Textarea
                    value={currentSectionData.content}
                    onChange={(e) => updateSectionContent(currentSectionData.id, e.target.value)}
                    placeholder="Start writing your response here. The AI assistant will provide real-time suggestions as you type..."
                    rows={12}
                    className="resize-none"
                  />
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>
                      Words: {currentSectionData.content.split(' ').filter(w => w.length > 0).length}
                      {currentSectionData.wordLimit && ` / ${currentSectionData.wordLimit}`}
                    </span>
                    {analysisRunning && (
                      <span className="flex items-center space-x-1">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Analyzing...</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Quality Feedback */}
                {currentSectionData.quality.score > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentSectionData.quality.feedback.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-green-900 mb-2 flex items-center">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Strengths
                        </h4>
                        <ul className="space-y-1">
                          {currentSectionData.quality.feedback.map((item, index) => (
                            <li key={index} className="text-sm text-green-800">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {currentSectionData.quality.improvements.length > 0 && (
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-orange-900 mb-2 flex items-center">
                          <TrendingUp className="h-4 w-4 mr-1" />
                          Suggestions for Improvement
                        </h4>
                        <ul className="space-y-1">
                          {currentSectionData.quality.improvements.map((item, index) => (
                            <li key={index} className="text-sm text-orange-800">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Examples */}
                {currentSectionData.examples.length > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="text-sm font-medium text-purple-900 mb-2 flex items-center">
                      <BookOpen className="h-4 w-4 mr-1" />
                      Example Responses
                    </h4>
                    <div className="space-y-3">
                      {currentSectionData.examples.map((example, index) => (
                        <div key={index} className="bg-white p-3 rounded border text-sm">
                          {example}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Previous Section
              </Button>
              <Button
                onClick={() => setCurrentSection(Math.min(application.sections.length - 1, currentSection + 1))}
                disabled={currentSection === application.sections.length - 1}
              >
                Next Section
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <div className="lg:col-span-4">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <Brain className="h-5 w-5 mr-2 text-purple-600" />
                  AI Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* AI Suggestions for Current Section */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Lightbulb className="h-4 w-4 mr-1 text-yellow-500" />
                  Smart Suggestions
                </h3>
                
                {currentSectionData?.aiSuggestions.length > 0 ? (
                  <div className="space-y-3">
                    {currentSectionData.aiSuggestions.map((suggestion) => (
                      <div key={suggestion.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <h4 className="text-sm font-medium">{suggestion.title}</h4>
                          <Badge 
                            variant="outline"
                            className={`text-xs ${
                              suggestion.impact === 'high' ? 'border-red-300 text-red-700' :
                              suggestion.impact === 'medium' ? 'border-yellow-300 text-yellow-700' :
                              'border-green-300 text-green-700'
                            }`}
                          >
                            {suggestion.impact} impact
                          </Badge>
                        </div>
                        
                        <p className="text-xs text-gray-600">{suggestion.suggestion}</p>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {suggestion.confidence}% confidence
                          </span>
                          <div className="flex items-center space-x-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => applySuggestion(currentSectionData.id, suggestion)}
                              className="h-6 px-2 text-xs"
                            >
                              Apply
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-1"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <Sparkles className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">
                      Click "AI Assist" to get smart suggestions for this section
                    </p>
                  </div>
                )}
              </div>

              {/* Overall Application Analysis */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-1 text-blue-500" />
                  Application Analysis
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Strength Score</span>
                    <span className="text-sm font-medium">{application.aiAnalysis.strengthScore}%</span>
                  </div>
                  <Progress value={application.aiAnalysis.strengthScore} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Competitiveness</span>
                    <span className="text-sm font-medium">{application.aiAnalysis.competitivenessScore}%</span>
                  </div>
                  <Progress value={application.aiAnalysis.competitivenessScore} className="h-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Completeness</span>
                    <span className="text-sm font-medium">{application.aiAnalysis.completenessScore}%</span>
                  </div>
                  <Progress value={application.aiAnalysis.completenessScore} className="h-2" />
                </div>
              </div>

              {/* Quick Tips */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center">
                  <MessageSquare className="h-4 w-4 mr-1 text-green-500" />
                  Quick Tips
                </h3>
                
                <div className="space-y-2">
                  {application.aiAnalysis.recommendations.map((tip, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <Zap className="h-3 w-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-gray-700">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Show AI Panel Button (when hidden) */}
      {!showAIPanel && (
        <div className="lg:col-span-4">
          <Button
            variant="outline"
            onClick={() => setShowAIPanel(true)}
            className="w-full flex items-center space-x-2"
          >
            <Brain className="h-4 w-4" />
            <span>Show AI Assistant</span>
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper function to create mock application data
function createMockApplication(): ApplicationForm {
  return {
    id: 'app-001',
    grantTitle: 'Enterprise Ireland Innovation Fund 2024',
    overallProgress: 25,
    sections: [
      {
        id: 'section-1',
        title: 'Project Overview',
        description: 'Provide a comprehensive overview of your project including objectives, innovation, and expected impact.',
        required: true,
        completed: false,
        content: '',
        wordLimit: 500,
        guidelines: [
          'Clearly state your project objectives',
          'Explain the innovation and uniqueness',
          'Describe the expected impact and benefits',
          'Include target market and customer segments'
        ],
        examples: [
          'Our project aims to develop an AI-powered platform that revolutionizes supply chain management for SMEs in Ireland, targeting a market worth €2.4B annually...'
        ],
        aiSuggestions: [],
        quality: {
          score: 0,
          feedback: [],
          improvements: []
        }
      },
      {
        id: 'section-2',
        title: 'Technical Approach',
        description: 'Detail your technical methodology, implementation plan, and development roadmap.',
        required: true,
        completed: false,
        content: '',
        wordLimit: 750,
        guidelines: [
          'Describe your technical methodology',
          'Outline the development phases',
          'Explain key technologies and tools',
          'Include risk mitigation strategies'
        ],
        examples: [
          'We will employ a cloud-native microservices architecture using React, Node.js, and AWS. The development will follow agile methodology with 2-week sprints...'
        ],
        aiSuggestions: [],
        quality: {
          score: 0,
          feedback: [],
          improvements: []
        }
      },
      {
        id: 'section-3',
        title: 'Market Analysis',
        description: 'Demonstrate your understanding of the market opportunity and competitive landscape.',
        required: true,
        completed: false,
        content: '',
        wordLimit: 600,
        guidelines: [
          'Define your target market size',
          'Analyze key competitors',
          'Identify market gaps and opportunities',
          'Present customer validation evidence'
        ],
        examples: [],
        aiSuggestions: [],
        quality: {
          score: 0,
          feedback: [],
          improvements: []
        }
      },
      {
        id: 'section-4',
        title: 'Budget & Timeline',
        description: 'Provide detailed budget breakdown and project timeline with key milestones.',
        required: true,
        completed: false,
        content: '',
        wordLimit: 400,
        guidelines: [
          'Break down costs by category',
          'Justify major expenses',
          'Include project timeline',
          'Define clear milestones'
        ],
        examples: [],
        aiSuggestions: [],
        quality: {
          score: 0,
          feedback: [],
          improvements: []
        }
      },
      {
        id: 'section-5',
        title: 'Team & Expertise',
        description: 'Showcase your team\'s qualifications and relevant experience.',
        required: false,
        completed: false,
        content: '',
        wordLimit: 400,
        guidelines: [
          'Highlight key team members',
          'Show relevant experience',
          'Demonstrate domain expertise',
          'Include advisor credentials'
        ],
        examples: [],
        aiSuggestions: [],
        quality: {
          score: 0,
          feedback: [],
          improvements: []
        }
      }
    ],
    aiAnalysis: {
      strengthScore: 65,
      competitivenessScore: 58,
      completenessScore: 25,
      recommendations: [
        'Add more quantitative data to strengthen your value proposition',
        'Include customer testimonials or validation evidence',
        'Expand on risk mitigation strategies',
        'Provide more detailed financial projections'
      ],
      riskFactors: [
        'Limited market validation evidence',
        'Competitive landscape analysis needs strengthening',
        'Technical feasibility could be better demonstrated'
      ]
    }
  }
}