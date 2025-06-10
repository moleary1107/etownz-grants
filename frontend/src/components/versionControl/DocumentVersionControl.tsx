"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  GitBranch,
  GitCommit,
  GitMerge,
  GitPullRequest,
  History,
  ArrowLeftRight,
  Tag,
  Archive,
  Download,
  Upload,
  Copy,
  Edit3,
  Eye,
  Users,
  Calendar,
  FileText,
  Folder,
  Plus,
  Minus,
  RotateCcw,
  Save,
  Share2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Filter,
  Settings,
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Code,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Star,
  Flag,
  Bookmark,
  ExternalLink,
  RefreshCw,
  Trash2,
  Info,
  Zap,
  Shield,
  Database,
  Cloud,
  HardDrive,
  Network,
  Activity,
  BarChart3,
  TrendingUp,
  PieChart,
  User
} from 'lucide-react'
import { User as UserType } from '../../lib/auth'
import { 
  DocumentRepository, 
  DocumentBranch, 
  DocumentCommit, 
  PullRequest,
  MergeConflict,
  ComparisonResult,
  VersionControlAnalytics
} from '../../types/versionControl'

interface DocumentVersionControlProps {
  user: UserType
  repositoryId?: string
  onRepositoryCreate?: (repository: DocumentRepository) => void
  onCommit?: (repositoryId: string, message: string, changes: any[]) => void
  onBranchCreate?: (repositoryId: string, branchName: string, sourceBranch: string) => void
  onMerge?: (repositoryId: string, sourceBranch: string, targetBranch: string) => void
  className?: string
}

export function DocumentVersionControl({ 
  user, 
  repositoryId,
  onRepositoryCreate,
  onCommit,
  onBranchCreate,
  onMerge,
  className = "" 
}: DocumentVersionControlProps) {
  const [repositories, setRepositories] = useState<DocumentRepository[]>([])
  const [selectedRepository, setSelectedRepository] = useState<DocumentRepository | null>(null)
  const [currentBranch, setCurrentBranch] = useState<string>('main')
  const [commits, setCommits] = useState<DocumentCommit[]>([])
  const [pullRequests, setPullRequests] = useState<PullRequest[]>([])
  const [analytics, setAnalytics] = useState<VersionControlAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<'repositories' | 'branches' | 'commits' | 'pullrequests' | 'compare' | 'analytics'>('repositories')
  const [selectedCommits, setSelectedCommits] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [conflicts, setConflicts] = useState<MergeConflict[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOptions, setFilterOptions] = useState({
    author: '',
    dateRange: '',
    branch: '',
    type: ''
  })

  // Initialize with mock data
  useEffect(() => {
    loadRepositories()
    loadAnalytics()
  }, [])

  useEffect(() => {
    if (selectedRepository) {
      loadCommits(selectedRepository.id, currentBranch)
      loadPullRequests(selectedRepository.id)
    }
  }, [selectedRepository, currentBranch])

  const loadRepositories = useCallback(async () => {
    setIsLoading(true)
    
    // Simulate API loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const mockRepositories = createMockRepositories()
    setRepositories(mockRepositories)
    
    if (repositoryId) {
      const repo = mockRepositories.find(r => r.id === repositoryId)
      if (repo) {
        setSelectedRepository(repo)
      }
    } else if (mockRepositories.length > 0) {
      setSelectedRepository(mockRepositories[0])
    }
    
    setIsLoading(false)
  }, [repositoryId])

  const loadCommits = useCallback(async (repoId: string, branch: string) => {
    // Simulate loading commits for specific repository and branch
    await new Promise(resolve => setTimeout(resolve, 500))
    setCommits(createMockCommits(branch))
  }, [])

  const loadPullRequests = useCallback(async (repoId: string) => {
    // Simulate loading pull requests
    await new Promise(resolve => setTimeout(resolve, 500))
    setPullRequests(createMockPullRequests())
  }, [])

  const loadAnalytics = useCallback(async () => {
    // Simulate loading analytics
    await new Promise(resolve => setTimeout(resolve, 800))
    setAnalytics(createMockAnalytics())
  }, [])

  const createBranch = async (branchName: string, sourceBranch: string) => {
    if (!selectedRepository) return

    const newBranch: DocumentBranch = {
      id: `branch-${Date.now()}`,
      name: branchName,
      description: `Feature branch for ${branchName}`,
      type: 'feature',
      parentBranch: sourceBranch,
      createdBy: user.id,
      createdAt: new Date(),
      lastCommit: '',
      isProtected: false,
      isActive: true,
      commits: [],
      pullRequests: [],
      tags: []
    }

    setSelectedRepository(prev => prev ? {
      ...prev,
      branches: [...prev.branches, newBranch]
    } : null)

    if (onBranchCreate) {
      onBranchCreate(selectedRepository.id, branchName, sourceBranch)
    }
  }

  const createCommit = async (message: string, description: string) => {
    if (!selectedRepository) return

    const newCommit: DocumentCommit = {
      id: `commit-${Date.now()}`,
      hash: generateCommitHash(),
      message,
      description,
      author: {
        userId: user.id,
        name: user.name,
        email: user.email || `${user.name.toLowerCase()}@example.com`,
        timestamp: new Date()
      },
      timestamp: new Date(),
      parentCommits: commits.length > 0 ? [commits[0].id] : [],
      branch: currentBranch,
      changes: [
        {
          id: `change-${Date.now()}`,
          type: 'modified',
          path: 'documents/grant-application.md',
          content: {
            additions: [
              { lineNumber: 1, content: '+ Added new content section', type: 'added' }
            ],
            deletions: [],
            hunks: [],
            isBinary: false,
            isTruncated: false
          },
          metadata: {
            size: 1024,
            lines: 45,
            binary: false,
            encoding: 'utf-8'
          }
        }
      ],
      tags: [],
      metadata: {
        filesChanged: 1,
        additions: 15,
        deletions: 3,
        size: 1024,
        isMergeCommit: false,
        isRevert: false
      },
      verification: {
        verified: true,
        reason: 'valid'
      },
      annotations: []
    }

    setCommits(prev => [newCommit, ...prev])

    if (onCommit) {
      onCommit(selectedRepository.id, message, newCommit.changes)
    }
  }

  const mergeBranches = async (sourceBranch: string, targetBranch: string) => {
    if (!selectedRepository) return

    // Simulate merge operation
    const mergeCommit: DocumentCommit = {
      id: `merge-${Date.now()}`,
      hash: generateCommitHash(),
      message: `Merge branch '${sourceBranch}' into '${targetBranch}'`,
      author: {
        userId: user.id,
        name: user.name,
        email: user.email || `${user.name.toLowerCase()}@example.com`,
        timestamp: new Date()
      },
      timestamp: new Date(),
      parentCommits: [commits[0]?.id || '', commits[1]?.id || ''],
      branch: targetBranch,
      changes: [],
      tags: [],
      metadata: {
        filesChanged: 2,
        additions: 25,
        deletions: 8,
        size: 2048,
        isMergeCommit: true,
        isRevert: false
      },
      verification: {
        verified: true,
        reason: 'valid'
      },
      annotations: []
    }

    setCommits(prev => [mergeCommit, ...prev])

    if (onMerge) {
      onMerge(selectedRepository.id, sourceBranch, targetBranch)
    }
  }

  const revertCommit = async (commitId: string) => {
    const originalCommit = commits.find(c => c.id === commitId)
    if (!originalCommit) return

    const revertCommit: DocumentCommit = {
      id: `revert-${Date.now()}`,
      hash: generateCommitHash(),
      message: `Revert "${originalCommit.message}"`,
      description: `This reverts commit ${originalCommit.hash}`,
      author: {
        userId: user.id,
        name: user.name,
        email: user.email || `${user.name.toLowerCase()}@example.com`,
        timestamp: new Date()
      },
      timestamp: new Date(),
      parentCommits: [commits[0].id],
      branch: currentBranch,
      changes: originalCommit.changes.map(change => ({
        ...change,
        id: `revert-${change.id}`,
        type: change.type === 'added' ? 'deleted' : change.type === 'deleted' ? 'added' : 'modified',
        content: {
          ...change.content,
          additions: change.content.deletions,
          deletions: change.content.additions
        }
      })),
      tags: ['revert'],
      metadata: {
        filesChanged: originalCommit.metadata.filesChanged,
        additions: originalCommit.metadata.deletions,
        deletions: originalCommit.metadata.additions,
        size: originalCommit.metadata.size,
        isMergeCommit: false,
        isRevert: true
      },
      verification: {
        verified: true,
        reason: 'valid'
      },
      annotations: []
    }

    setCommits(prev => [revertCommit, ...prev])
  }

  const generateCommitHash = () => {
    return Math.random().toString(36).substr(2, 8) + Math.random().toString(36).substr(2, 8)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-green-600 bg-green-100'
      case 'merged': return 'text-blue-600 bg-blue-100'
      case 'closed': return 'text-gray-600 bg-gray-100'
      case 'draft': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'added': return 'text-green-600'
      case 'deleted': return 'text-red-600'
      case 'modified': return 'text-blue-600'
      case 'renamed': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const filteredCommits = useMemo(() => {
    return commits.filter(commit => {
      if (searchQuery && !commit.message.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !commit.author.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false
      }
      
      if (filterOptions.author && commit.author.name !== filterOptions.author) {
        return false
      }
      
      if (filterOptions.branch && commit.branch !== filterOptions.branch) {
        return false
      }
      
      return true
    })
  }, [commits, searchQuery, filterOptions])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <GitBranch className="h-6 w-6 mr-2 text-green-600" />
            Document Version Control
          </h2>
          <p className="text-gray-600 mt-1">
            Git-like versioning system for grant documents and proposals
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompareMode(!compareMode)}
            className={compareMode ? 'bg-blue-50 border-blue-300' : ''}
          >
            <ArrowLeftRight className="h-4 w-4 mr-1" />
            Compare
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRepositories}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Repository
          </Button>
        </div>
      </div>

      {/* Repository Selector */}
      {repositories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedRepository?.id || ''}
                  onChange={(e) => {
                    const repo = repositories.find(r => r.id === e.target.value)
                    setSelectedRepository(repo || null)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {repositories.map((repo) => (
                    <option key={repo.id} value={repo.id}>
                      {repo.name} ({repo.type})
                    </option>
                  ))}
                </select>
                
                {selectedRepository && (
                  <select
                    value={currentBranch}
                    onChange={(e) => setCurrentBranch(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {selectedRepository.branches.map((branch) => (
                      <option key={branch.id} value={branch.name}>
                        {branch.name} {branch.name === selectedRepository.defaultBranch && '(default)'}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {selectedRepository && (
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <GitCommit className="h-4 w-4 mr-1" />
                    {selectedRepository.metadata.totalCommits} commits
                  </span>
                  <span className="flex items-center">
                    <GitBranch className="h-4 w-4 mr-1" />
                    {selectedRepository.metadata.totalBranches} branches
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {selectedRepository.collaborators.length} collaborators
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as any)} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="branches">Branches</TabsTrigger>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="pullrequests">Pull Requests</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Repositories Tab */}
        <TabsContent value="repositories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {repositories.map((repository) => (
              <Card key={repository.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => setSelectedRepository(repository)}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center">
                        <Folder className="h-4 w-4 mr-2 text-blue-600" />
                        {repository.name}
                        {repository.isPrivate && <Lock className="h-3 w-3 ml-2 text-gray-500" />}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {repository.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{repository.type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Commits:</span>
                        <span className="ml-2 font-medium">{repository.metadata.totalCommits}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Branches:</span>
                        <span className="ml-2 font-medium">{repository.metadata.totalBranches}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Size:</span>
                        <span className="ml-2 font-medium">{(repository.metadata.size / 1024).toFixed(1)} KB</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Updated:</span>
                        <span className="ml-2 font-medium">{repository.metadata.updatedAt.toLocaleDateString()}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {repository.metadata.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-6">
          {selectedRepository && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Branches</h3>
                <Button size="sm" onClick={() => createBranch(`feature-${Date.now()}`, currentBranch)}>
                  <GitBranch className="h-4 w-4 mr-1" />
                  New Branch
                </Button>
              </div>

              <div className="space-y-4">
                {selectedRepository.branches.map((branch) => (
                  <Card key={branch.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h4 className="font-medium">{branch.name}</h4>
                            {branch.name === selectedRepository.defaultBranch && (
                              <Badge variant="outline">default</Badge>
                            )}
                            {branch.isProtected && (
                              <Badge className="bg-yellow-100 text-yellow-800">protected</Badge>
                            )}
                            <Badge variant="outline">{branch.type}</Badge>
                          </div>
                          {branch.description && (
                            <p className="text-sm text-gray-600 mb-2">{branch.description}</p>
                          )}
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>Updated {branch.createdAt.toLocaleDateString()}</span>
                            <span>{branch.commits.length} commits</span>
                            <span>by {branch.createdBy}</span>
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentBranch(branch.name)}
                            disabled={currentBranch === branch.name}
                          >
                            {currentBranch === branch.name ? 'Current' : 'Switch'}
                          </Button>
                          {branch.name !== selectedRepository.defaultBranch && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => mergeBranches(branch.name, selectedRepository.defaultBranch)}
                            >
                              <GitMerge className="h-4 w-4 mr-1" />
                              Merge
                            </Button>
                          )}
                          <Button size="sm" variant="outline">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* Commits Tab */}
        <TabsContent value="commits" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search commits..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <Button
                  onClick={() => createCommit('Update document content', 'Added new sections and improved formatting')}
                  disabled={!selectedRepository}
                >
                  <GitCommit className="h-4 w-4 mr-1" />
                  New Commit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Commit List */}
          <div className="space-y-4">
            {filteredCommits.map((commit) => (
              <Card key={commit.id} className={`hover:shadow-md transition-shadow ${
                selectedCommits.includes(commit.id) ? 'ring-2 ring-blue-500' : ''
              }`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {compareMode && (
                        <input
                          type="checkbox"
                          checked={selectedCommits.includes(commit.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCommits(prev => [...prev, commit.id].slice(-2))
                            } else {
                              setSelectedCommits(prev => prev.filter(id => id !== commit.id))
                            }
                          }}
                          className="mr-3 mt-1"
                        />
                      )}
                      
                      <div className="flex items-start space-x-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-1">{commit.message}</h4>
                          {commit.description && (
                            <p className="text-sm text-gray-600 mb-2">{commit.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                            <span className="flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {commit.author.name}
                            </span>
                            <span className="flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {commit.timestamp.toLocaleDateString()}
                            </span>
                            <span className="flex items-center">
                              <GitBranch className="h-3 w-3 mr-1" />
                              {commit.branch}
                            </span>
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {commit.hash}
                            </span>
                          </div>

                          <div className="flex items-center space-x-4 text-sm">
                            <span className="text-green-600">
                              +{commit.metadata.additions} additions
                            </span>
                            <span className="text-red-600">
                              -{commit.metadata.deletions} deletions
                            </span>
                            <span className="text-gray-600">
                              {commit.metadata.filesChanged} files changed
                            </span>
                          </div>

                          {commit.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {commit.tags.map((tag, index) => (
                                <Badge key={index} variant="outline" className="text-xs">{tag}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => revertCommit(commit.id)}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Show changes preview */}
                  {commit.changes.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-2">Changed Files:</h5>
                      <div className="space-y-1">
                        {commit.changes.map((change) => (
                          <div key={change.id} className="flex items-center space-x-2 text-sm">
                            <span className={`${getChangeTypeColor(change.type)} font-medium`}>
                              {change.type}
                            </span>
                            <span className="font-mono text-gray-600">{change.path}</span>
                            <span className="text-gray-500">
                              (+{change.content.additions.length} -{change.content.deletions.length})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pull Requests Tab */}
        <TabsContent value="pullrequests" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Pull Requests</h3>
            <Button size="sm">
              <GitPullRequest className="h-4 w-4 mr-1" />
              New Pull Request
            </Button>
          </div>

          <div className="space-y-4">
            {pullRequests.map((pr) => (
              <Card key={pr.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">#{pr.number} {pr.title}</h4>
                        <Badge className={getStatusColor(pr.state)}>{pr.state}</Badge>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-3">{pr.description}</p>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-3">
                        <span>by {pr.author}</span>
                        <span>wants to merge {pr.commits.length} commits</span>
                        <span>from {pr.sourceBranch} into {pr.targetBranch}</span>
                        <span>{pr.createdAt.toLocaleDateString()}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-green-600">+{pr.metadata.additions}</span>
                        <span className="text-red-600">-{pr.metadata.deletions}</span>
                        <span className="text-gray-600">{pr.metadata.changedFiles} files</span>
                        {pr.metadata.conflicts && (
                          <span className="text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Conflicts
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        Review
                      </Button>
                      {pr.state === 'open' && pr.metadata.mergeable && (
                        <Button size="sm">
                          <GitMerge className="h-4 w-4 mr-1" />
                          Merge
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Compare Tab */}
        <TabsContent value="compare" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Compare Commits</CardTitle>
              <CardDescription>
                Select two commits to see the differences between them
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedCommits.length === 2 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCommits.map((commitId, index) => {
                      const commit = commits.find(c => c.id === commitId)
                      return commit ? (
                        <div key={commitId} className="p-4 border rounded-lg">
                          <h4 className="font-medium">{index === 0 ? 'Base' : 'Compare'}</h4>
                          <p className="text-sm text-gray-600 mt-1">{commit.message}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {commit.author.name} • {commit.timestamp.toLocaleDateString()}
                          </p>
                          <span className="inline-block mt-2 font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                            {commit.hash}
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                  
                  <div className="flex justify-center">
                    <Button>
                      <ArrowLeftRight className="h-4 w-4 mr-1" />
                      Compare Changes
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <ArrowLeftRight className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p>Select exactly 2 commits from the Commits tab to compare them</p>
                  <p className="text-sm mt-1">
                    {selectedCommits.length === 0 && 'No commits selected'}
                    {selectedCommits.length === 1 && '1 commit selected, select 1 more'}
                    {selectedCommits.length > 2 && `${selectedCommits.length} commits selected, select only 2`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Database className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-600">{analytics.repositories.total}</p>
                      <p className="text-sm text-gray-600">Total Repositories</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <GitCommit className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-600">{analytics.activity.commits.total}</p>
                      <p className="text-sm text-gray-600">Total Commits</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Users className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-600">{analytics.usage.activeUsers.weekly}</p>
                      <p className="text-sm text-gray-600">Active Users</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(analytics.performance.averageCommitSize / 1024)}KB
                      </p>
                      <p className="text-sm text-gray-600">Avg Commit Size</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Trends */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Commit Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.activity.commits.trend.slice(-7).map((point, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {point.date.toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Progress value={(point.count / 20) * 100} className="w-20" />
                            <span className="text-sm font-medium">{point.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Repository Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.repositories.byType.map((item) => (
                        <div key={item.type} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 capitalize">{item.type}</span>
                          <div className="flex items-center space-x-2">
                            <Progress value={(item.count / analytics.repositories.total) * 100} className="w-20" />
                            <span className="text-sm font-medium">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Performance Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <h4 className="font-medium text-gray-900">Merge Time</h4>
                      <p className="text-2xl font-bold text-blue-600 mt-1">
                        {analytics.performance.mergeTime.average}h
                      </p>
                      <p className="text-sm text-gray-600">Average</p>
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium text-gray-900">Conflict Rate</h4>
                      <p className="text-2xl font-bold text-yellow-600 mt-1">
                        {analytics.performance.conflictRate}%
                      </p>
                      <p className="text-sm text-gray-600">Of merges</p>
                    </div>
                    <div className="text-center">
                      <h4 className="font-medium text-gray-900">Storage Usage</h4>
                      <p className="text-2xl font-bold text-purple-600 mt-1">
                        {(analytics.performance.storageUsage.total / (1024 * 1024)).toFixed(1)}MB
                      </p>
                      <p className="text-sm text-gray-600">Total</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Mock data creation functions
function createMockRepositories(): DocumentRepository[] {
  return [
    {
      id: 'repo-1',
      name: 'Grant Application Template',
      description: 'Standardized template for grant applications with version control',
      type: 'template',
      ownerId: 'user-1',
      collaborators: [
        {
          userId: 'user-1',
          role: 'owner',
          permissions: [
            { action: 'admin', resource: 'repository', granted: true }
          ],
          addedAt: new Date('2024-01-01'),
          addedBy: 'user-1',
          isActive: true
        }
      ],
      branches: [
        {
          id: 'branch-main',
          name: 'main',
          type: 'main',
          createdBy: 'user-1',
          createdAt: new Date('2024-01-01'),
          lastCommit: 'commit-1',
          isProtected: true,
          isActive: true,
          commits: [],
          pullRequests: [],
          tags: []
        },
        {
          id: 'branch-feature',
          name: 'feature/enhanced-budget-section',
          type: 'feature',
          parentBranch: 'main',
          createdBy: 'user-2',
          createdAt: new Date('2024-01-10'),
          lastCommit: 'commit-2',
          isProtected: false,
          isActive: true,
          commits: [],
          pullRequests: [],
          tags: []
        }
      ],
      defaultBranch: 'main',
      isPrivate: false,
      settings: {
        allowMergeCommits: true,
        allowSquashMerging: true,
        allowRebaseMerging: false,
        deleteBranchOnMerge: true,
        requireReviewBeforeMerge: true,
        requiredReviewers: 1,
        allowForcePush: false,
        protectedBranches: ['main'],
        automaticBackup: true,
        retentionPolicy: {
          keepCommits: 1000,
          keepBranches: 50,
          archiveAfterDays: 365
        }
      },
      metadata: {
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        lastCommit: 'abc123def',
        totalCommits: 25,
        totalBranches: 3,
        size: 102400,
        language: ['markdown', 'json'],
        tags: ['template', 'grant', 'application']
      },
      statistics: {
        commits: {
          total: 25,
          thisWeek: 3,
          thisMonth: 8,
          byAuthor: [
            { userId: 'user-1', count: 15 },
            { userId: 'user-2', count: 10 }
          ]
        },
        branches: {
          active: 2,
          merged: 5,
          stale: 1
        },
        contributors: {
          total: 3,
          active: 2,
          lastActive: new Date('2024-01-15')
        },
        activity: []
      }
    }
  ]
}

function createMockCommits(branch: string): DocumentCommit[] {
  return [
    {
      id: 'commit-1',
      hash: 'abc123def456',
      message: 'Add comprehensive budget justification section',
      description: 'Expanded the budget section with detailed line items and justifications for each expense category',
      author: {
        userId: 'user-1',
        name: 'John Smith',
        email: 'john@example.com',
        timestamp: new Date('2024-01-15T10:30:00')
      },
      timestamp: new Date('2024-01-15T10:30:00'),
      parentCommits: ['commit-0'],
      branch,
      changes: [
        {
          id: 'change-1',
          type: 'modified',
          path: 'sections/budget.md',
          content: {
            additions: [
              { lineNumber: 15, content: '## Detailed Budget Breakdown', type: 'added' },
              { lineNumber: 16, content: '### Personnel Costs', type: 'added' }
            ],
            deletions: [
              { lineNumber: 10, content: '# Budget', type: 'deleted' }
            ],
            hunks: [],
            isBinary: false,
            isTruncated: false
          },
          metadata: {
            size: 2048,
            lines: 45,
            binary: false,
            encoding: 'utf-8'
          }
        }
      ],
      tags: ['feature', 'budget'],
      metadata: {
        filesChanged: 1,
        additions: 25,
        deletions: 3,
        size: 2048,
        isMergeCommit: false,
        isRevert: false
      },
      verification: {
        verified: true,
        reason: 'valid'
      },
      annotations: []
    },
    {
      id: 'commit-2',
      hash: 'def456ghi789',
      message: 'Update project timeline and milestones',
      author: {
        userId: 'user-2',
        name: 'Jane Doe',
        email: 'jane@example.com',
        timestamp: new Date('2024-01-14T14:20:00')
      },
      timestamp: new Date('2024-01-14T14:20:00'),
      parentCommits: ['commit-1'],
      branch,
      changes: [
        {
          id: 'change-2',
          type: 'modified',
          path: 'sections/timeline.md',
          content: {
            additions: [
              { lineNumber: 8, content: '- Q2 2024: Phase 1 completion', type: 'added' }
            ],
            deletions: [],
            hunks: [],
            isBinary: false,
            isTruncated: false
          },
          metadata: {
            size: 1024,
            lines: 30,
            binary: false,
            encoding: 'utf-8'
          }
        }
      ],
      tags: ['timeline'],
      metadata: {
        filesChanged: 1,
        additions: 12,
        deletions: 0,
        size: 1024,
        isMergeCommit: false,
        isRevert: false
      },
      verification: {
        verified: true,
        reason: 'valid'
      },
      annotations: []
    }
  ]
}

function createMockPullRequests(): PullRequest[] {
  return [
    {
      id: 'pr-1',
      number: 1,
      title: 'Enhance budget section with detailed breakdown',
      description: 'This PR adds a comprehensive budget breakdown with line-item details and justifications for each expense category.',
      state: 'open',
      author: 'user-2',
      assignees: ['user-1'],
      reviewers: [
        {
          userId: 'user-1',
          status: 'requested',
          required: true
        }
      ],
      sourceBranch: 'feature/enhanced-budget-section',
      targetBranch: 'main',
      commits: ['commit-1', 'commit-2'],
      changes: [],
      comments: [],
      reviews: [],
      labels: ['enhancement', 'budget'],
      createdAt: new Date('2024-01-10'),
      updatedAt: new Date('2024-01-15'),
      metadata: {
        conflicts: false,
        mergeable: true,
        checksStatus: 'success',
        changedFiles: 2,
        additions: 37,
        deletions: 3
      }
    }
  ]
}

function createMockAnalytics(): VersionControlAnalytics {
  return {
    repositories: {
      total: 12,
      active: 8,
      archived: 2,
      private: 5,
      public: 7,
      byType: [
        { type: 'grant_application', count: 6 },
        { type: 'proposal', count: 3 },
        { type: 'template', count: 2 },
        { type: 'general', count: 1 }
      ],
      growth: [
        { date: new Date('2024-01-01'), count: 8 },
        { date: new Date('2024-01-08'), count: 10 },
        { date: new Date('2024-01-15'), count: 12 }
      ],
      topRepositories: [
        { id: 'repo-1', name: 'Grant Application Template', activity: 25 }
      ]
    },
    activity: {
      commits: {
        total: 156,
        thisWeek: 12,
        trend: [
          { date: new Date('2024-01-10'), count: 8 },
          { date: new Date('2024-01-11'), count: 12 },
          { date: new Date('2024-01-12'), count: 6 },
          { date: new Date('2024-01-13'), count: 15 },
          { date: new Date('2024-01-14'), count: 9 },
          { date: new Date('2024-01-15'), count: 11 },
          { date: new Date('2024-01-16'), count: 7 }
        ],
        byAuthor: [
          { userId: 'user-1', count: 45 },
          { userId: 'user-2', count: 38 }
        ]
      },
      pullRequests: {
        open: 3,
        merged: 15,
        closed: 2,
        averageTimeToMerge: 2.5
      },
      branches: {
        created: 8,
        merged: 12,
        deleted: 5,
        active: 15
      }
    },
    performance: {
      averageCommitSize: 1536,
      mergeTime: {
        average: 2.5,
        percentiles: { p50: 2.0, p90: 4.5, p95: 6.0 }
      },
      conflictRate: 8.5,
      resolutionTime: 1.2,
      storageUsage: {
        total: 52428800,
        growth: [
          { date: new Date('2024-01-01'), size: 45000000 },
          { date: new Date('2024-01-15'), size: 52428800 }
        ],
        byRepository: [
          { id: 'repo-1', size: 15728640 }
        ]
      }
    },
    usage: {
      activeUsers: {
        daily: 8,
        weekly: 15,
        monthly: 25,
        trend: [
          { date: new Date('2024-01-10'), count: 6 },
          { date: new Date('2024-01-15'), count: 8 }
        ]
      },
      features: {
        branching: 45,
        merging: 32,
        tagging: 12,
        pullRequests: 18
      },
      devices: {
        desktop: 18,
        mobile: 5,
        tablet: 2
      }
    },
    quality: {
      codeReviewCoverage: 85,
      averageReviewTime: 4.2,
      defectRate: 2.1,
      hotspots: {
        files: [
          { path: 'sections/budget.md', changes: 15, conflicts: 2 }
        ],
        authors: [
          { userId: 'user-1', conflicts: 3, quality: 92 }
        ]
      },
      trends: {
        quality: [
          { date: new Date('2024-01-10'), score: 88 },
          { date: new Date('2024-01-15'), score: 92 }
        ],
        stability: [
          { date: new Date('2024-01-10'), score: 94 },
          { date: new Date('2024-01-15'), score: 96 }
        ]
      }
    }
  }
}