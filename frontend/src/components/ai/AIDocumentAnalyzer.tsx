"use client"

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Upload,
  FileText,
  Brain,
  CheckCircle,
  AlertTriangle,
  Eye,
  Trash2,
  Search,
  Clock,
  Calendar,
  DollarSign,
  Target,
  Zap,
  RefreshCw,
  FileCheck,
  FileX,
  Loader2,
  Sparkles,
  BookOpen,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  Star,
  X,
  Building
} from 'lucide-react'
import { User } from '../../lib/auth'

interface DocumentAnalysisResult {
  id: string
  filename: string
  fileSize: number
  uploadDate: Date
  analysisStatus: 'pending' | 'processing' | 'completed' | 'failed'
  analysisProgress: number
  extractedData: {
    title: string
    funder: string
    deadline?: Date
    eligibilityCriteria: string[]
    requirements: RequirementItem[]
    fundingAmount: {
      min?: number
      max?: number
      currency: string
    }
    applicationDeadlines: DeadlineItem[]
    contactInformation: ContactInfo[]
    keyDates: KeyDate[]
    documentType: 'grant_guidelines' | 'call_for_proposals' | 'application_form' | 'eligibility_document' | 'other'
    confidence: number
  }
  insights: {
    matchScore: number
    recommendations: string[]
    risks: string[]
    opportunities: string[]
    competitionLevel: 'low' | 'medium' | 'high'
    applicationComplexity: 'simple' | 'moderate' | 'complex'
  }
  aiSummary: string
  extractedText: string
  processedSections: DocumentSection[]
}

interface RequirementItem {
  id: string
  category: 'eligibility' | 'documentation' | 'technical' | 'financial' | 'legal'
  title: string
  description: string
  mandatory: boolean
  deadline?: Date
  estimatedEffort: 'low' | 'medium' | 'high'
  dependencies: string[]
}

interface DeadlineItem {
  id: string
  title: string
  date: Date
  type: 'application' | 'documentation' | 'report' | 'milestone'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

interface ContactInfo {
  name?: string
  role?: string
  email?: string
  phone?: string
  organization: string
  type: 'primary' | 'secondary' | 'technical' | 'administrative'
}

interface KeyDate {
  id: string
  title: string
  date: Date
  type: 'deadline' | 'info_session' | 'workshop' | 'evaluation' | 'award'
  description: string
}

interface DocumentSection {
  id: string
  title: string
  content: string
  type: 'header' | 'paragraph' | 'list' | 'table' | 'form'
  confidence: number
  extractedEntities: string[]
}

interface AIDocumentAnalyzerProps {
  user: User
  onAnalysisComplete?: (result: DocumentAnalysisResult) => void
  className?: string
}

export function AIDocumentAnalyzer({ 
  onAnalysisComplete,
  className = "" 
}: AIDocumentAnalyzerProps) {
  const [documents, setDocuments] = useState<DocumentAnalysisResult[]>([])
  const [selectedDocument, setSelectedDocument] = useState<DocumentAnalysisResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [,] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [filterType, setFilterType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentView, setCurrentView] = useState<'upload' | 'results' | 'insights'>('upload')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock data for demonstration
  useEffect(() => {
    const mockDocument: DocumentAnalysisResult = {
      id: 'doc-001',
      filename: 'Enterprise_Ireland_Innovation_Fund_2024.pdf',
      fileSize: 2487596,
      uploadDate: new Date('2024-01-15'),
      analysisStatus: 'completed',
      analysisProgress: 100,
      extractedData: {
        title: 'Enterprise Ireland Innovation Fund 2024',
        funder: 'Enterprise Ireland',
        deadline: new Date('2024-06-15'),
        eligibilityCriteria: [
          'Irish registered company',
          'Minimum 10 employees',
          'Revenue between €1M - €50M',
          'Innovation-focused project',
          'Technology commercialization potential'
        ],
        requirements: [
          {
            id: 'req-001',
            category: 'eligibility',
            title: 'Company Registration',
            description: 'Valid Irish company registration certificate',
            mandatory: true,
            estimatedEffort: 'low',
            dependencies: []
          },
          {
            id: 'req-002',
            category: 'financial',
            title: 'Financial Statements',
            description: 'Audited financial statements for last 3 years',
            mandatory: true,
            estimatedEffort: 'medium',
            dependencies: []
          },
          {
            id: 'req-003',
            category: 'technical',
            title: 'Innovation Plan',
            description: 'Detailed technical innovation plan with IP strategy',
            mandatory: true,
            estimatedEffort: 'high',
            dependencies: ['req-001']
          }
        ],
        fundingAmount: {
          min: 25000,
          max: 200000,
          currency: 'EUR'
        },
        applicationDeadlines: [
          {
            id: 'deadline-001',
            title: 'Final Application Submission',
            date: new Date('2024-06-15'),
            type: 'application',
            priority: 'critical',
            description: 'Complete application package must be submitted'
          },
          {
            id: 'deadline-002',
            title: 'Supporting Documentation',
            date: new Date('2024-06-10'),
            type: 'documentation',
            priority: 'high',
            description: 'All supporting documents must be uploaded'
          }
        ],
        contactInformation: [
          {
            name: 'Dr. Sarah O\'Connor',
            role: 'Programme Manager',
            email: 'sarah.oconnor@enterprise-ireland.com',
            phone: '+353 1 727 2000',
            organization: 'Enterprise Ireland',
            type: 'primary'
          }
        ],
        keyDates: [
          {
            id: 'date-001',
            title: 'Information Session',
            date: new Date('2024-03-15'),
            type: 'info_session',
            description: 'Virtual information session for applicants'
          }
        ],
        documentType: 'grant_guidelines',
        confidence: 92
      },
      insights: {
        matchScore: 78,
        recommendations: [
          'Strong match for your technology company profile',
          'Consider partnering with research institutions to strengthen application',
          'Emphasize IP commercialization potential in your proposal'
        ],
        risks: [
          'High competition expected (150+ applications typically)',
          'Strict technical evaluation criteria',
          'Limited funding available this round'
        ],
        opportunities: [
          'Follow-on funding available for successful projects',
          'Access to Enterprise Ireland mentor network',
          'International market expansion support included'
        ],
        competitionLevel: 'high',
        applicationComplexity: 'complex'
      },
      aiSummary: 'This is a highly competitive innovation fund targeting Irish SMEs with significant technology commercialization potential. The fund offers substantial financial support (€25K-€200K) but requires comprehensive documentation and a strong innovation plan. Best suited for companies with proven technology and clear market opportunity.',
      extractedText: '',
      processedSections: []
    }
    
    setDocuments([mockDocument])
  }, [])

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return

    setIsUploading(true)
    setUploadProgress(0)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        setUploadProgress(progress)
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Create new document entry
      const newDocument: DocumentAnalysisResult = {
        id: `doc-${Date.now()}-${i}`,
        filename: file.name,
        fileSize: file.size,
        uploadDate: new Date(),
        analysisStatus: 'pending',
        analysisProgress: 0,
        extractedData: {
          title: '',
          funder: '',
          eligibilityCriteria: [],
          requirements: [],
          fundingAmount: { currency: 'EUR' },
          applicationDeadlines: [],
          contactInformation: [],
          keyDates: [],
          documentType: 'other',
          confidence: 0
        },
        insights: {
          matchScore: 0,
          recommendations: [],
          risks: [],
          opportunities: [],
          competitionLevel: 'medium',
          applicationComplexity: 'moderate'
        },
        aiSummary: '',
        extractedText: '',
        processedSections: []
      }

      setDocuments(prev => [...prev, newDocument])
      
      // Start analysis
      startDocumentAnalysis(newDocument.id)
    }

    setIsUploading(false)
    setUploadProgress(0)
  }

  const startDocumentAnalysis = async (documentId: string) => {
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, analysisStatus: 'processing' as const }
        : doc
    ))

    // Simulate analysis progress
    for (let progress = 0; progress <= 100; progress += 5) {
      setDocuments(prev => prev.map(doc => 
        doc.id === documentId 
          ? { ...doc, analysisProgress: progress }
          : doc
      ))
      await new Promise(resolve => setTimeout(resolve, 200))
    }

    // Complete analysis with mock results
    const analysisResult = await generateMockAnalysis(documentId)
    
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId 
        ? { ...doc, ...analysisResult, analysisStatus: 'completed' as const }
        : doc
    ))

    if (onAnalysisComplete) {
      const completedDoc = documents.find(d => d.id === documentId)
      if (completedDoc) {
        onAnalysisComplete({ ...completedDoc, ...analysisResult })
      }
    }
  }

  const generateMockAnalysis = async (documentId: string): Promise<Partial<DocumentAnalysisResult>> => {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return {
      extractedData: {
        title: 'AI-Analyzed Grant Document',
        funder: 'Identified Funding Organization',
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        eligibilityCriteria: [
          'Organization type requirements identified',
          'Geographic eligibility criteria found',
          'Sector-specific requirements detected'
        ],
        requirements: [
          {
            id: `req-${documentId}-1`,
            category: 'documentation',
            title: 'Required Documentation',
            description: 'Standard application documents identified by AI',
            mandatory: true,
            estimatedEffort: 'medium',
            dependencies: []
          }
        ],
        fundingAmount: {
          min: 10000,
          max: 100000,
          currency: 'EUR'
        },
        applicationDeadlines: [
          {
            id: `deadline-${documentId}-1`,
            title: 'Application Deadline',
            date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            type: 'application',
            priority: 'high',
            description: 'Main application deadline identified'
          }
        ],
        contactInformation: [
          {
            organization: 'Grant Administrator',
            type: 'primary',
            email: 'contact@grantorganization.com'
          }
        ],
        keyDates: [],
        documentType: 'grant_guidelines',
        confidence: 85
      },
      insights: {
        matchScore: 72,
        recommendations: [
          'Good potential match based on document analysis',
          'Review specific eligibility criteria carefully'
        ],
        risks: [
          'Competitive application process likely',
          'Multiple documentation requirements'
        ],
        opportunities: [
          'Well-structured funding opportunity',
          'Clear application guidelines provided'
        ],
        competitionLevel: 'medium',
        applicationComplexity: 'moderate'
      },
      aiSummary: 'AI-powered analysis has identified this as a standard grant opportunity with moderate complexity. The document contains clear guidelines and requirements that have been successfully extracted and structured for your review.'
    }
  }

  const deleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    if (selectedDocument?.id === documentId) {
      setSelectedDocument(null)
    }
  }

  const reanalyzeDocument = (documentId: string) => {
    startDocumentAnalysis(documentId)
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = !searchQuery || 
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.extractedData.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.extractedData.funder.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesFilter = filterType === 'all' || 
      doc.extractedData.documentType === filterType ||
      doc.analysisStatus === filterType

    return matchesSearch && matchesFilter
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'processing': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'failed': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Brain className="h-6 w-6 mr-2 text-purple-600" />
            AI Document Analyzer
          </h2>
          <p className="text-gray-600 mt-1">
            Automatically extract requirements, deadlines, and insights from grant documents
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('upload')}
            className={currentView === 'upload' ? 'bg-blue-50' : ''}
          >
            <Upload className="h-4 w-4 mr-1" />
            Upload
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('results')}
            className={currentView === 'results' ? 'bg-blue-50' : ''}
          >
            <FileText className="h-4 w-4 mr-1" />
            Results
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentView('insights')}
            className={currentView === 'insights' ? 'bg-blue-50' : ''}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            Insights
          </Button>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'upload' | 'results' | 'insights')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload">Document Upload</TabsTrigger>
          <TabsTrigger value="results">Analysis Results</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Upload className="h-5 w-5 mr-2" />
                Upload Grant Documents
              </CardTitle>
              <CardDescription>
                Upload PDF, Word, or text documents for AI-powered analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileUpload(e.dataTransfer.files)
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                
                {isUploading ? (
                  <div className="space-y-4">
                    <Loader2 className="h-8 w-8 mx-auto text-blue-600 animate-spin" />
                    <div>
                      <p className="text-lg font-medium text-gray-900 mb-2">Uploading...</p>
                      <Progress value={uploadProgress} className="w-full max-w-xs mx-auto" />
                      <p className="text-sm text-gray-500 mt-1">{uploadProgress}% complete</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">
                        Drop files here or click to browse
                      </p>
                      <p className="text-gray-500">
                        Supports PDF, Word documents, and text files up to 10MB
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Supported formats */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-red-500 mb-2" />
                  <p className="text-sm font-medium">PDF</p>
                  <p className="text-xs text-gray-500">Grant guidelines</p>
                </div>
                <div className="text-center">
                  <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
                  <p className="text-sm font-medium">Word</p>
                  <p className="text-xs text-gray-500">Application forms</p>
                </div>
                <div className="text-center">
                  <BookOpen className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm font-medium">Text</p>
                  <p className="text-xs text-gray-500">Requirements</p>
                </div>
                <div className="text-center">
                  <FileCheck className="h-8 w-8 mx-auto text-purple-500 mb-2" />
                  <p className="text-sm font-medium">Any</p>
                  <p className="text-xs text-gray-500">Auto-detect</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Uploads */}
          {documents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {documents.slice(-3).map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium">{doc.filename}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.fileSize)} • {doc.uploadDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className={getStatusColor(doc.analysisStatus)}>
                        {doc.analysisStatus}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Results Tab */}
        <TabsContent value="results" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search documents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Documents</option>
                  <option value="grant_guidelines">Grant Guidelines</option>
                  <option value="call_for_proposals">Call for Proposals</option>
                  <option value="application_form">Application Forms</option>
                  <option value="completed">Completed Analysis</option>
                  <option value="processing">Processing</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Document List */}
          <div className="grid gap-6">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold">{doc.filename}</h3>
                        <Badge className={getStatusColor(doc.analysisStatus)}>
                          {doc.analysisStatus}
                        </Badge>
                        {doc.extractedData.confidence > 0 && (
                          <Badge variant="outline">
                            {doc.extractedData.confidence}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      {doc.extractedData.title && (
                        <p className="text-gray-600 mb-2">{doc.extractedData.title}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span>{doc.extractedData.funder || 'Analyzing...'}</span>
                        </div>
                        {doc.extractedData.deadline && (
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{doc.extractedData.deadline.toLocaleDateString()}</span>
                          </div>
                        )}
                        {doc.extractedData.fundingAmount.min && doc.extractedData.fundingAmount.max && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span>
                              {doc.extractedData.fundingAmount.min.toLocaleString()} - {doc.extractedData.fundingAmount.max.toLocaleString()} {doc.extractedData.fundingAmount.currency}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar for Processing Documents */}
                      {doc.analysisStatus === 'processing' && (
                        <div className="mt-4">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Analysis Progress</span>
                            <span>{doc.analysisProgress}%</span>
                          </div>
                          <Progress value={doc.analysisProgress} className="h-2" />
                        </div>
                      )}

                      {/* Analysis Results Preview */}
                      {doc.analysisStatus === 'completed' && (
                        <div className="mt-4 space-y-3">
                          {/* Quick Stats */}
                          <div className="flex items-center space-x-4 text-sm">
                            <div className="flex items-center space-x-1">
                              <Target className="h-4 w-4 text-blue-600" />
                              <span>Match: {doc.insights.matchScore}%</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span>{doc.extractedData.requirements.length} requirements</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span>{doc.extractedData.applicationDeadlines.length} deadlines</span>
                            </div>
                            <div className={`flex items-center space-x-1 ${getCompetitionColor(doc.insights.competitionLevel)}`}>
                              <Zap className="h-4 w-4" />
                              <span>{doc.insights.competitionLevel} competition</span>
                            </div>
                          </div>

                          {/* AI Summary */}
                          {doc.aiSummary && (
                            <div className="bg-blue-50 p-3 rounded-lg">
                              <p className="text-sm text-blue-900">{doc.aiSummary}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col space-y-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedDocument(doc)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {doc.analysisStatus === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => reanalyzeDocument(doc.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Re-analyze
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredDocuments.length === 0 && (
              <div className="text-center py-12">
                <FileX className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                <p className="text-gray-600 mb-4">
                  {searchQuery || filterType !== 'all' 
                    ? 'Try adjusting your search criteria or filters'
                    : 'Upload your first document to get started with AI analysis'
                  }
                </p>
                <Button onClick={() => setCurrentView('upload')}>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-6">
          {selectedDocument && selectedDocument.analysisStatus === 'completed' ? (
            <div className="grid gap-6">
              {/* Document Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                    Document Analysis Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedDocument.insights.matchScore}%</div>
                      <div className="text-sm text-gray-600">Match Score</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedDocument.extractedData.confidence}%</div>
                      <div className="text-sm text-gray-600">Extraction Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedDocument.extractedData.requirements.length}</div>
                      <div className="text-sm text-gray-600">Requirements Found</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedDocument.extractedData.applicationDeadlines.length}</div>
                      <div className="text-sm text-gray-600">Key Deadlines</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Extracted Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle>Extracted Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDocument.extractedData.requirements.map((req) => (
                      <div key={req.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h4 className="font-medium">{req.title}</h4>
                              <Badge variant="outline">{req.category}</Badge>
                              {req.mandatory && (
                                <Badge className="bg-red-100 text-red-800">Required</Badge>
                              )}
                              <Badge variant="outline">{req.estimatedEffort} effort</Badge>
                            </div>
                            <p className="text-sm text-gray-600">{req.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* AI Insights */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-700">
                      <TrendingUp className="h-5 w-5 mr-2" />
                      Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedDocument.insights.opportunities.map((opportunity, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <Star className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Risk Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {selectedDocument.insights.risks.map((risk, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{risk}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {selectedDocument.insights.recommendations.map((recommendation, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                        <Brain className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-blue-900">{recommendation}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12">
              <Brain className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Analysis Selected</h3>
              <p className="text-gray-600 mb-4">
                Select a completed document analysis from the Results tab to view detailed insights
              </p>
              <Button onClick={() => setCurrentView('results')}>
                <ArrowRight className="h-4 w-4 mr-2" />
                View Results
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Detail Modal */}
      {selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">{selectedDocument.filename}</h2>
                <Button variant="ghost" onClick={() => setSelectedDocument(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Document details would go here */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Extracted Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div><strong>Title:</strong> {selectedDocument.extractedData.title}</div>
                    <div><strong>Funder:</strong> {selectedDocument.extractedData.funder}</div>
                    <div><strong>Document Type:</strong> {selectedDocument.extractedData.documentType}</div>
                    <div><strong>Confidence:</strong> {selectedDocument.extractedData.confidence}%</div>
                  </div>
                </div>
                
                {selectedDocument.extractedData.eligibilityCriteria.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Eligibility Criteria</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      {selectedDocument.extractedData.eligibilityCriteria.map((criteria, index) => (
                        <li key={index}>{criteria}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}