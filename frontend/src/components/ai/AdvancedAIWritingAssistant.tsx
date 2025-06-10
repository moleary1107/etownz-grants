"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Textarea } from '../ui/textarea'
import { 
  Wand2,
  Brain,
  FileText,
  Edit3,
  Check,
  X,
  RefreshCw,
  Copy,
  Save,
  Download,
  Upload,
  Zap,
  Lightbulb,
  Target,
  TrendingUp,
  Star,
  MessageSquare,
  Clock,
  Users,
  Settings,
  Eye,
  EyeOff,
  ChevronRight,
  ChevronDown,
  Plus,
  Minus,
  RotateCcw,
  RotateCw,
  Type,
  AlignLeft,
  AlignCenter,
  Bold,
  Italic,
  Underline,
  List,
  CheckSquare,
  Quote,
  Code,
  Link,
  Image,
  Hash,
  Sparkles,
  BookOpen,
  Award,
  AlertTriangle,
  Info,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Headphones
} from 'lucide-react'
import { User } from '../../lib/auth'

interface WritingProject {
  id: string
  title: string
  type: 'grant_application' | 'proposal' | 'report' | 'letter' | 'executive_summary'
  grantId?: string
  content: {
    sections: WritingSection[]
    metadata: {
      wordCount: number
      lastModified: Date
      version: number
      collaborators: string[]
    }
  }
  aiSettings: {
    tone: 'professional' | 'academic' | 'persuasive' | 'technical' | 'friendly'
    style: 'formal' | 'semi-formal' | 'conversational'
    complexity: 'simple' | 'moderate' | 'complex'
    audienceLevel: 'general' | 'expert' | 'executive'
    focusAreas: string[]
  }
  status: 'draft' | 'in_review' | 'approved' | 'submitted'
  qualityScore: number
  suggestions: AISuggestion[]
}

interface WritingSection {
  id: string
  title: string
  content: string
  type: 'introduction' | 'methodology' | 'objectives' | 'budget' | 'timeline' | 'conclusion' | 'custom'
  wordLimit?: number
  required: boolean
  aiAnalysis: {
    readabilityScore: number
    coherenceScore: number
    persuasivenessScore: number
    clarityScore: number
    completenessScore: number
    suggestions: string[]
    improvements: ContentImprovement[]
  }
  alternatives: ContentAlternative[]
  comments: Comment[]
}

interface AISuggestion {
  id: string
  type: 'grammar' | 'style' | 'structure' | 'content' | 'clarity' | 'persuasion'
  severity: 'low' | 'medium' | 'high'
  title: string
  description: string
  originalText: string
  suggestedText: string
  reasoning: string
  confidence: number
  accepted?: boolean
  position: { start: number; end: number }
  category: string
}

interface ContentImprovement {
  id: string
  type: 'expand' | 'condense' | 'rephrase' | 'strengthen' | 'clarify'
  title: string
  description: string
  impact: 'low' | 'medium' | 'high'
  effort: 'easy' | 'moderate' | 'significant'
  preview: string
}

interface ContentAlternative {
  id: string
  title: string
  content: string
  tone: string
  style: string
  reasoning: string
  score: number
}

interface Comment {
  id: string
  author: string
  content: string
  timestamp: Date
  type: 'suggestion' | 'question' | 'approval' | 'concern'
  resolved: boolean
  position?: { start: number; end: number }
}

interface AdvancedAIWritingAssistantProps {
  user: User
  projectId?: string
  grantData?: any
  onSave?: (project: WritingProject) => void
  onExport?: (project: WritingProject, format: 'pdf' | 'docx' | 'txt') => void
  className?: string
}

export function AdvancedAIWritingAssistant({ 
  user, 
  projectId, 
  grantData,
  onSave,
  onExport,
  className = "" 
}: AdvancedAIWritingAssistantProps) {
  const [project, setProject] = useState<WritingProject>(createMockProject())
  const [activeSection, setActiveSection] = useState<string>('')
  const [selectedText, setSelectedText] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [currentView, setCurrentView] = useState<'editor' | 'suggestions' | 'alternatives' | 'analytics'>('editor')
  const [showAIPanel, setShowAIPanel] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [textToSpeech, setTextToSpeech] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  
  const editorRef = useRef<HTMLTextAreaElement>(null)
  const autoSaveInterval = useRef<NodeJS.Timeout>()

  // Initialize project
  useEffect(() => {
    if (projectId) {
      loadProject(projectId)
    } else {
      setActiveSection(project.content.sections[0]?.id || '')
    }
  }, [projectId])

  // Auto-save functionality
  useEffect(() => {
    if (autoSave) {
      autoSaveInterval.current = setInterval(() => {
        saveProject()
      }, 30000) // Auto-save every 30 seconds

      return () => {
        if (autoSaveInterval.current) {
          clearInterval(autoSaveInterval.current)
        }
      }
    }
  }, [autoSave, project])

  const loadProject = async (id: string) => {
    // Mock loading - in real implementation would fetch from API
    setProject(createMockProject())
    setActiveSection(project.content.sections[0]?.id || '')
  }

  const saveProject = useCallback(async () => {
    setLastSaved(new Date())
    if (onSave) {
      onSave(project)
    }
    console.log('Project auto-saved:', project)
  }, [project, onSave])

  const generateContent = async (sectionId: string, prompt: string) => {
    setIsGenerating(true)
    
    // Simulate AI content generation
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const section = project.content.sections.find(s => s.id === sectionId)
    if (!section) return

    const templates = {
      introduction: `This innovative project addresses critical challenges in ${grantData?.categories?.[0] || 'the technology sector'} through cutting-edge research and development. Our organization brings unique expertise and a proven track record of successful project delivery, positioning us ideally to achieve the ambitious goals outlined in this proposal.`,
      methodology: `Our comprehensive methodology combines industry best practices with innovative approaches tailored to this project's specific requirements. We will employ a phased approach that ensures quality deliverables while maintaining flexibility to adapt to emerging opportunities and challenges throughout the project lifecycle.`,
      objectives: `The primary objective of this project is to develop and implement solutions that create measurable impact in ${grantData?.categories?.[0] || 'our target domain'}. Through systematic execution of our planned activities, we aim to achieve significant advancement in the field while delivering tangible benefits to stakeholders and the broader community.`,
      budget: `Our budget has been carefully constructed to ensure optimal resource allocation while maximizing project impact. All costs have been thoroughly researched and represent fair market value for the proposed activities. The allocation reflects our commitment to delivering exceptional results within the specified funding parameters.`,
      timeline: `The project timeline has been developed through careful analysis of task dependencies, resource availability, and milestone requirements. Our phased approach allows for systematic progress monitoring while maintaining sufficient flexibility to address unforeseen challenges and opportunities that may arise during execution.`
    }

    const generatedContent = templates[section.type as keyof typeof templates] || 
      `AI-generated content for ${section.title} based on your project requirements and grant guidelines. This content has been optimized for clarity, persuasiveness, and alignment with funder expectations.`

    updateSectionContent(sectionId, generatedContent)
    setIsGenerating(false)
  }

  const analyzeContent = async (sectionId: string) => {
    setIsAnalyzing(true)
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const section = project.content.sections.find(s => s.id === sectionId)
    if (!section) return

    const wordCount = section.content.split(' ').length
    const sentences = section.content.split(/[.!?]+/).length
    const avgWordsPerSentence = wordCount / sentences
    
    // Mock analysis scores
    const analysis = {
      readabilityScore: Math.min(100, Math.max(0, 100 - (avgWordsPerSentence - 15) * 2)),
      coherenceScore: 75 + Math.random() * 20,
      persuasivenessScore: 70 + Math.random() * 25,
      clarityScore: 80 + Math.random() * 15,
      completenessScore: Math.min(100, (wordCount / (section.wordLimit || 500)) * 100),
      suggestions: [
        'Consider adding more specific examples to strengthen your arguments',
        'The conclusion could be more compelling with quantified outcomes',
        'Some sentences are quite long - consider breaking them down for clarity'
      ],
      improvements: [
        {
          id: `imp-${Date.now()}-1`,
          type: 'strengthen' as const,
          title: 'Add quantitative evidence',
          description: 'Include specific metrics and data to support your claims',
          impact: 'high' as const,
          effort: 'moderate' as const,
          preview: 'Replace general statements with specific percentages and numbers'
        },
        {
          id: `imp-${Date.now()}-2`,
          type: 'clarify' as const,
          title: 'Simplify complex sentences',
          description: 'Break down long sentences for better readability',
          impact: 'medium' as const,
          effort: 'easy' as const,
          preview: 'Shorter sentences improve comprehension by 23%'
        }
      ]
    }

    updateSectionAnalysis(sectionId, analysis)
    setIsAnalyzing(false)
  }

  const generateSuggestions = async (text: string, sectionId: string) => {
    // Mock AI suggestions generation
    const suggestions: AISuggestion[] = [
      {
        id: `sug-${Date.now()}-1`,
        type: 'style',
        severity: 'medium',
        title: 'Enhance persuasiveness',
        description: 'Consider using more compelling language to strengthen your argument',
        originalText: text.substring(0, 50) + '...',
        suggestedText: 'Enhanced version with more persuasive language...',
        reasoning: 'Strong, active language increases proposal success rates by 18%',
        confidence: 85,
        position: { start: 0, end: 50 },
        category: 'persuasion'
      },
      {
        id: `sug-${Date.now()}-2`,
        type: 'clarity',
        severity: 'low',
        title: 'Improve clarity',
        description: 'This sentence could be clearer and more direct',
        originalText: text.substring(50, 100) + '...',
        suggestedText: 'Clearer, more direct version...',
        reasoning: 'Clear communication improves reviewer comprehension',
        confidence: 78,
        position: { start: 50, end: 100 },
        category: 'clarity'
      }
    ]

    setProject(prev => ({
      ...prev,
      suggestions: [...prev.suggestions, ...suggestions]
    }))
  }

  const updateSectionContent = (sectionId: string, content: string) => {
    setProject(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map(section =>
          section.id === sectionId 
            ? { ...section, content }
            : section
        ),
        metadata: {
          ...prev.content.metadata,
          wordCount: prev.content.sections.reduce((total, s) => 
            total + (s.id === sectionId ? content.split(' ').length : s.content.split(' ').length), 0
          ),
          lastModified: new Date()
        }
      }
    }))
  }

  const updateSectionAnalysis = (sectionId: string, analysis: any) => {
    setProject(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map(section =>
          section.id === sectionId 
            ? { ...section, aiAnalysis: analysis }
            : section
        )
      }
    }))
  }

  const acceptSuggestion = (suggestionId: string) => {
    setProject(prev => ({
      ...prev,
      suggestions: prev.suggestions.map(sug =>
        sug.id === suggestionId 
          ? { ...sug, accepted: true }
          : sug
      )
    }))
    
    // Apply the suggestion to the content
    const suggestion = project.suggestions.find(s => s.id === suggestionId)
    if (suggestion) {
      const section = project.content.sections.find(s => 
        s.content.includes(suggestion.originalText)
      )
      if (section) {
        const updatedContent = section.content.replace(
          suggestion.originalText, 
          suggestion.suggestedText
        )
        updateSectionContent(section.id, updatedContent)
      }
    }
  }

  const rejectSuggestion = (suggestionId: string) => {
    setProject(prev => ({
      ...prev,
      suggestions: prev.suggestions.filter(sug => sug.id !== suggestionId)
    }))
  }

  const generateAlternatives = async (sectionId: string) => {
    setIsGenerating(true)
    
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const alternatives: ContentAlternative[] = [
      {
        id: `alt-${Date.now()}-1`,
        title: 'Professional Tone',
        content: 'Professional version of the content with formal language and structure...',
        tone: 'professional',
        style: 'formal',
        reasoning: 'Best for corporate and government funders',
        score: 92
      },
      {
        id: `alt-${Date.now()}-2`,
        title: 'Academic Style',
        content: 'Academic version with research focus and scholarly language...',
        tone: 'academic',
        style: 'formal',
        reasoning: 'Ideal for research-focused grants and academic institutions',
        score: 88
      },
      {
        id: `alt-${Date.now()}-3`,
        title: 'Persuasive Approach',
        content: 'Persuasive version emphasizing impact and benefits...',
        tone: 'persuasive',
        style: 'semi-formal',
        reasoning: 'Effective for competitive funding opportunities',
        score: 85
      }
    ]

    setProject(prev => ({
      ...prev,
      content: {
        ...prev.content,
        sections: prev.content.sections.map(section =>
          section.id === sectionId 
            ? { ...section, alternatives }
            : section
        )
      }
    }))
    
    setIsGenerating(false)
  }

  const activeSection_data = project.content.sections.find(s => s.id === activeSection)
  const pendingSuggestions = project.suggestions.filter(s => s.accepted === undefined)
  const acceptedSuggestions = project.suggestions.filter(s => s.accepted === true)

  // Text-to-speech functionality
  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
      setIsPlaying(true)
      
      utterance.onend = () => setIsPlaying(false)
    }
  }

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
      setIsPlaying(false)
    }
  }

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 gap-6 ${className}`}>
      {/* Main Editor */}
      <div className="xl:col-span-8 space-y-6">
        {/* Project Header */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <Edit3 className="h-5 w-5 mr-2 text-blue-600" />
                  {project.title}
                </CardTitle>
                <CardDescription>
                  Advanced AI-powered writing assistant with real-time optimization
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                {lastSaved && (
                  <span className="text-xs text-gray-500">
                    Saved {lastSaved.toLocaleTimeString()}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={saveProject}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => onExport?.(project, 'pdf')}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
            
            {/* Project Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">
                  {project.content.metadata.wordCount}
                </div>
                <div className="text-xs text-gray-600">Words</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">
                  {project.qualityScore}%
                </div>
                <div className="text-xs text-gray-600">Quality</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {pendingSuggestions.length}
                </div>
                <div className="text-xs text-gray-600">Suggestions</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {project.content.sections.filter(s => s.content.trim()).length}/{project.content.sections.length}
                </div>
                <div className="text-xs text-gray-600">Sections</div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Section Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {project.content.sections.map((section) => (
                <Button
                  key={section.id}
                  variant={activeSection === section.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveSection(section.id)}
                  className="flex items-center space-x-1"
                >
                  {section.content.trim() && <Check className="h-3 w-3 text-green-600" />}
                  <span>{section.title}</span>
                  {section.required && <span className="text-red-500">*</span>}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Active Section Editor */}
        {activeSection_data && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    {activeSection_data.title}
                    {activeSection_data.required && <span className="text-red-500 ml-1">*</span>}
                  </CardTitle>
                  {activeSection_data.wordLimit && (
                    <CardDescription>
                      Word limit: {activeSection_data.content.split(' ').length} / {activeSection_data.wordLimit}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateContent(activeSection_data.id, '')}
                    disabled={isGenerating}
                  >
                    <Wand2 className={`h-4 w-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                    Generate
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => analyzeContent(activeSection_data.id)}
                    disabled={isAnalyzing}
                  >
                    <Brain className={`h-4 w-4 mr-1 ${isAnalyzing ? 'animate-spin' : ''}`} />
                    Analyze
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAlternatives(activeSection_data.id)}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Alternatives
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* Editor Toolbar */}
              <div className="flex items-center space-x-2 mb-4 p-2 border rounded-lg bg-gray-50">
                <Button variant="ghost" size="sm">
                  <Bold className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Italic className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Underline className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-gray-300" />
                <Button variant="ghost" size="sm">
                  <List className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Quote className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <Link className="h-4 w-4" />
                </Button>
                <div className="w-px h-4 bg-gray-300" />
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => textToSpeech ? stopSpeaking() : speakText(activeSection_data.content)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setTextToSpeech(!textToSpeech)}
                >
                  {textToSpeech ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </Button>
              </div>

              {/* Content Editor */}
              <div className="space-y-4">
                <Textarea
                  ref={editorRef}
                  value={activeSection_data.content}
                  onChange={(e) => {
                    updateSectionContent(activeSection_data.id, e.target.value)
                    // Generate suggestions on text selection
                    if (e.target.selectionStart !== e.target.selectionEnd) {
                      const selected = e.target.value.substring(
                        e.target.selectionStart, 
                        e.target.selectionEnd
                      )
                      setSelectedText(selected)
                      if (selected.length > 20) {
                        generateSuggestions(selected, activeSection_data.id)
                      }
                    }
                  }}
                  placeholder="Start writing your content here. The AI assistant will provide real-time suggestions as you type..."
                  rows={15}
                  className="resize-none font-mono text-sm leading-relaxed"
                />

                {/* Real-time Quality Indicators */}
                {activeSection_data.aiAnalysis && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        activeSection_data.aiAnalysis.readabilityScore >= 80 ? 'text-green-600' :
                        activeSection_data.aiAnalysis.readabilityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(activeSection_data.aiAnalysis.readabilityScore)}%
                      </div>
                      <div className="text-xs text-gray-600">Readability</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        activeSection_data.aiAnalysis.coherenceScore >= 80 ? 'text-green-600' :
                        activeSection_data.aiAnalysis.coherenceScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(activeSection_data.aiAnalysis.coherenceScore)}%
                      </div>
                      <div className="text-xs text-gray-600">Coherence</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        activeSection_data.aiAnalysis.persuasivenessScore >= 80 ? 'text-green-600' :
                        activeSection_data.aiAnalysis.persuasivenessScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(activeSection_data.aiAnalysis.persuasivenessScore)}%
                      </div>
                      <div className="text-xs text-gray-600">Persuasiveness</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        activeSection_data.aiAnalysis.clarityScore >= 80 ? 'text-green-600' :
                        activeSection_data.aiAnalysis.clarityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(activeSection_data.aiAnalysis.clarityScore)}%
                      </div>
                      <div className="text-xs text-gray-600">Clarity</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        activeSection_data.aiAnalysis.completenessScore >= 80 ? 'text-green-600' :
                        activeSection_data.aiAnalysis.completenessScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {Math.round(activeSection_data.aiAnalysis.completenessScore)}%
                      </div>
                      <div className="text-xs text-gray-600">Completeness</div>
                    </div>
                  </div>
                )}

                {/* Content Alternatives */}
                {activeSection_data.alternatives.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-900">Alternative Versions</h4>
                    {activeSection_data.alternatives.map((alternative) => (
                      <div key={alternative.id} className="border rounded-lg p-3 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-sm">{alternative.title}</h5>
                            <p className="text-xs text-gray-600">{alternative.reasoning}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-medium text-blue-600">
                              {alternative.score}% match
                            </span>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => updateSectionContent(activeSection_data.id, alternative.content)}
                            >
                              Use This
                            </Button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{alternative.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* AI Assistant Panel */}
      {showAIPanel && (
        <div className="xl:col-span-4 space-y-6">
          {/* AI Assistant Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-lg">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  AI Writing Assistant
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAIPanel(false)}
                >
                  <EyeOff className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          </Card>

          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="suggestions">Suggestions</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            {/* Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Real-time Suggestions</CardTitle>
                  <CardDescription>
                    AI-powered recommendations to improve your content
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {pendingSuggestions.length > 0 ? (
                    <div className="space-y-3">
                      {pendingSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{suggestion.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                {suggestion.description}
                              </p>
                            </div>
                            <Badge 
                              variant="outline"
                              className={
                                suggestion.severity === 'high' ? 'border-red-300 text-red-700' :
                                suggestion.severity === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                'border-green-300 text-green-700'
                              }
                            >
                              {suggestion.severity}
                            </Badge>
                          </div>
                          
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="font-medium text-red-600">Original:</span>
                              <p className="text-gray-700 mt-1">{suggestion.originalText}</p>
                            </div>
                            <div>
                              <span className="font-medium text-green-600">Suggested:</span>
                              <p className="text-gray-700 mt-1">{suggestion.suggestedText}</p>
                            </div>
                            <div>
                              <span className="font-medium text-blue-600">Reasoning:</span>
                              <p className="text-gray-700 mt-1">{suggestion.reasoning}</p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500">
                              {suggestion.confidence}% confidence
                            </span>
                            <div className="flex space-x-1">
                              <Button
                                size="sm"
                                onClick={() => acceptSuggestion(suggestion.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <Check className="h-3 w-3 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectSuggestion(suggestion.id)}
                                className="h-6 px-2 text-xs"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <CheckSquare className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No suggestions at the moment</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Keep writing and the AI will provide recommendations
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Accepted Suggestions */}
              {acceptedSuggestions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Applied Improvements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {acceptedSuggestions.map((suggestion) => (
                        <div key={suggestion.id} className="flex items-center space-x-2 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-gray-700">{suggestion.title}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Writing Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">
                          {project.content.metadata.wordCount}
                        </div>
                        <div className="text-xs text-gray-600">Total Words</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {project.qualityScore}%
                        </div>
                        <div className="text-xs text-gray-600">Quality Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {Math.round(project.content.metadata.wordCount / project.content.sections.filter(s => s.content.trim()).length) || 0}
                        </div>
                        <div className="text-xs text-gray-600">Avg Words/Section</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">
                          {acceptedSuggestions.length}
                        </div>
                        <div className="text-xs text-gray-600">Improvements Applied</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm font-medium">Section Progress</h4>
                      {project.content.sections.map((section) => (
                        <div key={section.id} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{section.title}</span>
                            <span>
                              {section.content.split(' ').length} words
                              {section.wordLimit && ` / ${section.wordLimit}`}
                            </span>
                          </div>
                          <Progress 
                            value={section.wordLimit ? 
                              Math.min(100, (section.content.split(' ').length / section.wordLimit) * 100) :
                              section.content.trim() ? 100 : 0
                            } 
                            className="h-1" 
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">AI Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Strong Progress</p>
                        <p className="text-gray-600 text-xs">
                          Your writing quality has improved by 15% with AI suggestions
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Lightbulb className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Focus Area</p>
                        <p className="text-gray-600 text-xs">
                          Consider adding more quantitative evidence to strengthen arguments
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Target className="h-4 w-4 text-blue-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium">Next Steps</p>
                        <p className="text-gray-600 text-xs">
                          Complete the methodology section to reach 80% overall progress
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Show AI Panel Button (when hidden) */}
      {!showAIPanel && (
        <div className="xl:col-span-4">
          <Button
            variant="outline"
            onClick={() => setShowAIPanel(true)}
            className="w-full flex items-center space-x-2"
          >
            <Eye className="h-4 w-4" />
            <span>Show AI Assistant</span>
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper function to create mock project data
function createMockProject(): WritingProject {
  return {
    id: 'project-001',
    title: 'Enterprise Ireland Innovation Fund Application',
    type: 'grant_application',
    grantId: 'grant-001',
    content: {
      sections: [
        {
          id: 'section-1',
          title: 'Executive Summary',
          content: 'Our innovative technology platform represents a significant advancement in the field of artificial intelligence, specifically targeting the challenges faced by SMEs in Ireland. Through this project, we aim to develop and deploy a comprehensive solution that will not only address current market gaps but also position Ireland as a leader in AI innovation.',
          type: 'introduction',
          wordLimit: 500,
          required: true,
          aiAnalysis: {
            readabilityScore: 85,
            coherenceScore: 78,
            persuasivenessScore: 82,
            clarityScore: 80,
            completenessScore: 75,
            suggestions: [
              'Add specific metrics to quantify the market opportunity',
              'Include mention of competitive advantages'
            ],
            improvements: []
          },
          alternatives: [],
          comments: []
        },
        {
          id: 'section-2',
          title: 'Project Objectives',
          content: '',
          type: 'objectives',
          wordLimit: 750,
          required: true,
          aiAnalysis: {
            readabilityScore: 0,
            coherenceScore: 0,
            persuasivenessScore: 0,
            clarityScore: 0,
            completenessScore: 0,
            suggestions: [],
            improvements: []
          },
          alternatives: [],
          comments: []
        },
        {
          id: 'section-3',
          title: 'Methodology',
          content: '',
          type: 'methodology',
          wordLimit: 1000,
          required: true,
          aiAnalysis: {
            readabilityScore: 0,
            coherenceScore: 0,
            persuasivenessScore: 0,
            clarityScore: 0,
            completenessScore: 0,
            suggestions: [],
            improvements: []
          },
          alternatives: [],
          comments: []
        },
        {
          id: 'section-4',
          title: 'Budget Justification',
          content: '',
          type: 'budget',
          wordLimit: 600,
          required: true,
          aiAnalysis: {
            readabilityScore: 0,
            coherenceScore: 0,
            persuasivenessScore: 0,
            clarityScore: 0,
            completenessScore: 0,
            suggestions: [],
            improvements: []
          },
          alternatives: [],
          comments: []
        },
        {
          id: 'section-5',
          title: 'Timeline',
          content: '',
          type: 'timeline',
          wordLimit: 400,
          required: false,
          aiAnalysis: {
            readabilityScore: 0,
            coherenceScore: 0,
            persuasivenessScore: 0,
            clarityScore: 0,
            completenessScore: 0,
            suggestions: [],
            improvements: []
          },
          alternatives: [],
          comments: []
        }
      ],
      metadata: {
        wordCount: 87,
        lastModified: new Date(),
        version: 1,
        collaborators: []
      }
    },
    aiSettings: {
      tone: 'professional',
      style: 'formal',
      complexity: 'moderate',
      audienceLevel: 'expert',
      focusAreas: ['innovation', 'impact', 'feasibility']
    },
    status: 'draft',
    qualityScore: 72,
    suggestions: []
  }
}