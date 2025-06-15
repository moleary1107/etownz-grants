"use client"

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { 
  Settings,
  Play,
  Pause,
  Clock,
  CheckCircle,
  Activity,
  TrendingUp,
  Plus,
  Edit3,
  Copy,
  Eye,
  Search,
  RefreshCw,
  Gauge,
  Lightbulb,
  Cpu,
  Shield,
  Workflow
} from '@/lib/icons'
import { User as UserType } from '../../lib/auth'
import { 
  WorkflowTemplate, 
  WorkflowInstance, 
  WorkflowAnalytics,
  AutomationRule
} from '../../types/workflow'

interface WorkflowAutomationHubProps {
  user: UserType
  onWorkflowStart?: (templateId: string) => void
  className?: string
}

export function WorkflowAutomationHub({ 
  user, 
  onWorkflowStart,
  className = "" 
}: WorkflowAutomationHubProps) {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [instances, setInstances] = useState<WorkflowInstance[]>([])
  const [automationRules, setAutomationRules] = useState<AutomationRule[]>([])
  const [analytics, setAnalytics] = useState<WorkflowAnalytics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentView, setCurrentView] = useState<'dashboard' | 'templates' | 'instances' | 'automation' | 'analytics'>('dashboard')
  // const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)

  // Initialize with mock data
  useEffect(() => {
    loadWorkflowData()
    if (autoRefresh) {
      const interval = setInterval(loadWorkflowData, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadWorkflowData = useCallback(async () => {
    setIsLoading(true)
    
    // Simulate API loading
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    setTemplates(createMockTemplates())
    setInstances(createMockInstances())
    setAutomationRules(createMockAutomationRules())
    setAnalytics(createMockAnalytics())
    
    setIsLoading(false)
  }, [])

  const createWorkflowInstance = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (!template) return

    // Simulate workflow creation
    const newInstance: WorkflowInstance = {
      id: `instance-${Date.now()}`,
      templateId,
      name: `${template.name} - ${new Date().toLocaleDateString()}`,
      description: template.description,
      status: 'in_progress',
      progress: 0,
      currentStage: template.stages[0]?.id || '',
      assignedTeam: [
        {
          userId: user.id,
          role: 'owner',
          permissions: ['read', 'write', 'admin'],
          joinedDate: new Date(),
          isActive: true
        }
      ],
      startDate: new Date(),
      estimatedEndDate: new Date(Date.now() + template.estimatedDuration * 24 * 60 * 60 * 1000),
      metadata: {
        createdBy: user.id,
        priority: 'medium',
        tags: ['auto-created']
      },
      stages: template.stages.map(stage => ({
        id: `stage-instance-${Date.now()}-${stage.id}`,
        templateStageId: stage.id,
        name: stage.name,
        status: 'not_started',
        progress: 0,
        tasks: stage.tasks.map(task => ({
          id: `task-instance-${Date.now()}-${task.id}`,
          templateTaskId: task.id,
          title: task.title,
          description: task.description,
          status: 'not_started',
          priority: task.priority,
          progress: 0,
          timeTracked: 0,
          timeEstimate: task.estimatedHours,
          comments: [],
          attachments: [],
          dependencies: [],
          automationHistory: []
        })),
        approvals: [],
        blockers: []
      })),
      events: [{
        id: `event-${Date.now()}`,
        type: 'workflow_started',
        timestamp: new Date(),
        userId: user.id,
        description: 'Workflow instance created and started',
        metadata: { templateId }
      }],
      metrics: {
        totalTasks: template.stages.reduce((sum, stage) => sum + stage.tasks.length, 0),
        completedTasks: 0,
        overdueTasks: 0,
        blockedTasks: 0,
        averageTaskCompletion: 0,
        totalTimeSpent: 0,
        estimatedTimeRemaining: template.stages.reduce((sum, stage) => 
          sum + stage.tasks.reduce((taskSum, task) => taskSum + task.estimatedHours, 0), 0
        ),
        velocityTrend: [],
        participationMetrics: []
      }
    }

    setInstances(prev => [newInstance, ...prev])
    
    if (onWorkflowStart) {
      onWorkflowStart(templateId)
    }

    // Trigger auto-assignment rules
    executeAutoAssignmentRules(newInstance)
  }

  const executeAutoAssignmentRules = async (instance: WorkflowInstance) => {
    // Simulate auto-assignment based on rules
    const updatedStages = instance.stages.map(stage => ({
      ...stage,
      tasks: stage.tasks.map(task => {
        if (task.status === 'not_started') {
          // Simple round-robin assignment for demo
          const teamMembers = instance.assignedTeam.filter(member => member.isActive)
          const assignedMember = teamMembers[Math.floor(Math.random() * teamMembers.length)]
          
          return {
            ...task,
            status: 'assigned' as const,
            assignedTo: assignedMember.userId,
            assignedDate: new Date()
          }
        }
        return task
      })
    }))

    setInstances(prev => prev.map(inst => 
      inst.id === instance.id 
        ? { ...inst, stages: updatedStages }
        : inst
    ))
  }

  const pauseWorkflow = (instanceId: string) => {
    setInstances(prev => prev.map(inst => 
      inst.id === instanceId 
        ? { ...inst, status: 'paused' as const }
        : inst
    ))
  }

  const resumeWorkflow = (instanceId: string) => {
    setInstances(prev => prev.map(inst => 
      inst.id === instanceId 
        ? { ...inst, status: 'in_progress' as const }
        : inst
    ))
  }

  const completeTask = (instanceId: string, taskId: string) => {
    setInstances(prev => prev.map(inst => {
      if (inst.id === instanceId) {
        const updatedStages = inst.stages.map(stage => ({
          ...stage,
          tasks: stage.tasks.map(task => 
            task.id === taskId 
              ? { ...task, status: 'completed' as const, completedDate: new Date(), progress: 100 }
              : task
          )
        }))
        
        // Calculate overall progress
        const allTasks = updatedStages.flatMap(stage => stage.tasks)
        const completedTasks = allTasks.filter(task => task.status === 'completed')
        const progress = Math.round((completedTasks.length / allTasks.length) * 100)
        
        return {
          ...inst,
          stages: updatedStages,
          progress,
          metrics: {
            ...inst.metrics,
            completedTasks: completedTasks.length
          }
        }
      }
      return inst
    }))
  }

  // Filter and search functionality
  const filteredInstances = useMemo(() => {
    return instances.filter(instance => {
      // Status filter
      if (filterStatus !== 'all' && instance.status !== filterStatus) {
        return false
      }
      
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        return (
          instance.name.toLowerCase().includes(searchLower) ||
          instance.description.toLowerCase().includes(searchLower) ||
          instance.metadata.tags.some(tag => tag.toLowerCase().includes(searchLower))
        )
      }
      
      return true
    })
  }, [instances, filterStatus, searchQuery])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'in_progress': return 'text-blue-600 bg-blue-100'
      case 'paused': return 'text-yellow-600 bg-yellow-100'
      case 'cancelled': return 'text-red-600 bg-red-100'
      case 'failed': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'low': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Workflow className="h-6 w-6 mr-2 text-purple-600" />
            Workflow Automation Hub
          </h2>
          <p className="text-gray-600 mt-1">
            Automated task assignment, progress tracking, and workflow orchestration
          </p>
        </div>
        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? 'bg-green-50 border-green-300' : ''}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadWorkflowData}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCurrentView('templates')}>
            <Plus className="h-4 w-4 mr-1" />
            New Workflow
          </Button>
        </div>
      </div>

      <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as 'dashboard' | 'templates' | 'instances' | 'automation' | 'analytics')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="instances">Workflows</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Activity className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Workflows</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {instances.filter(i => i.status === 'in_progress').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Completed Today</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {instances.reduce((sum, inst) => sum + inst.metrics.completedTasks, 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Avg Completion</p>
                    <p className="text-2xl font-bold text-gray-900">2.3 days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Efficiency</p>
                    <p className="text-2xl font-bold text-gray-900">94%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Workflows</CardTitle>
                <CardDescription>Latest workflow activities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {instances.slice(0, 5).map((instance) => (
                    <div key={instance.id} className="flex items-center justify-between p-3 border rounded-lg hover:shadow-sm transition-shadow">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{instance.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {instance.currentStage} • {instance.progress}% complete
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(instance.status)}>
                          {instance.status}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Automation Rules</CardTitle>
                <CardDescription>Active automation rules</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {automationRules.slice(0, 5).map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{rule.name}</h4>
                        <p className="text-xs text-gray-600 mt-1">
                          Executed {rule.executionCount} times
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Workflow Templates</h3>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Template
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Duration:</span>
                      <span>{template.estimatedDuration} days</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Stages:</span>
                      <span>{template.stages.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tasks:</span>
                      <span>{template.stages.reduce((sum, stage) => sum + stage.tasks.length, 0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Used:</span>
                      <span>{template.metadata.usageCount} times</span>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={() => createWorkflowInstance(template.id)}
                      >
                        <Play className="h-4 w-4 mr-1" />
                        Start
                      </Button>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Instances Tab */}
        <TabsContent value="instances" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search workflows..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="not_started">Not Started</option>
                  <option value="in_progress">In Progress</option>
                  <option value="paused">Paused</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Workflow Instances */}
          <div className="space-y-4">
            {filteredInstances.map((instance) => (
              <Card key={instance.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h3 className="text-lg font-semibold">{instance.name}</h3>
                        <Badge className={getStatusColor(instance.status)}>
                          {instance.status}
                        </Badge>
                        <Badge className={getPriorityColor(instance.metadata.priority)}>
                          {instance.metadata.priority}
                        </Badge>
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-4">{instance.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Progress</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Progress value={instance.progress} className="flex-1" />
                            <span className="text-sm font-medium">{instance.progress}%</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Tasks</p>
                          <p className="text-sm font-medium mt-1">
                            {instance.metrics.completedTasks} / {instance.metrics.totalTasks}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Team</p>
                          <p className="text-sm font-medium mt-1">
                            {instance.assignedTeam.filter(m => m.isActive).length} members
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Due Date</p>
                          <p className="text-sm font-medium mt-1">
                            {instance.estimatedEndDate.toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      {/* Recent Tasks */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-900">Recent Tasks</h4>
                        {instance.stages.flatMap(stage => stage.tasks).slice(0, 3).map((task) => (
                          <div key={task.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <div className={`w-2 h-2 rounded-full ${
                                task.status === 'completed' ? 'bg-green-500' :
                                task.status === 'in_progress' ? 'bg-blue-500' :
                                task.status === 'assigned' ? 'bg-yellow-500' : 'bg-gray-300'
                              }`} />
                              <span className="text-sm">{task.title}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              {task.assignedTo && (
                                <Badge variant="outline" className="text-xs">
                                  {task.assignedTo === user.id ? 'You' : 'Assigned'}
                                </Badge>
                              )}
                              {task.status !== 'completed' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => completeTask(instance.id, task.id)}
                                  className="h-6 px-2"
                                >
                                  <CheckCircle className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col space-y-2 ml-6">
                      {instance.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pauseWorkflow(instance.id)}
                        >
                          <Pause className="h-4 w-4 mr-1" />
                          Pause
                        </Button>
                      )}
                      {instance.status === 'paused' && (
                        <Button
                          size="sm"
                          onClick={() => resumeWorkflow(instance.id)}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Automation Rules</h3>
            <Button>
              <Plus className="h-4 w-4 mr-1" />
              Create Rule
            </Button>
          </div>

          <div className="space-y-4">
            {automationRules.map((rule) => (
              <Card key={rule.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold">{rule.name}</h4>
                        <Badge className={rule.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge variant="outline">Priority: {rule.priority}</Badge>
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{rule.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Trigger</p>
                          <p className="font-medium">{rule.trigger.event}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Executions</p>
                          <p className="font-medium">{rule.executionCount}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Last Executed</p>
                          <p className="font-medium">
                            {rule.lastExecuted ? rule.lastExecuted.toLocaleDateString() : 'Never'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline">
                        {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Gauge className="h-8 w-8 mx-auto text-blue-600 mb-2" />
                      <p className="text-2xl font-bold text-blue-600">
                        {Math.round(analytics.efficiency.onTimeDeliveryRate)}%
                      </p>
                      <p className="text-sm text-gray-600">On-Time Delivery</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <TrendingUp className="h-8 w-8 mx-auto text-green-600 mb-2" />
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round(analytics.efficiency.processingVelocity)}
                      </p>
                      <p className="text-sm text-gray-600">Tasks/Day</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Shield className="h-8 w-8 mx-auto text-purple-600 mb-2" />
                      <p className="text-2xl font-bold text-purple-600">
                        {Math.round(analytics.quality.complianceScore)}%
                      </p>
                      <p className="text-sm text-gray-600">Compliance Score</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <Cpu className="h-8 w-8 mx-auto text-orange-600 mb-2" />
                      <p className="text-2xl font-bold text-orange-600">
                        {Math.round(analytics.efficiency.automationSavings)}h
                      </p>
                      <p className="text-sm text-gray-600">Time Saved</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts and Detailed Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Performance Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.trends.efficiencyTrend.slice(-7).map((point, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">
                            {point.date.toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-2">
                            <Progress value={point.value} className="w-20" />
                            <span className="text-sm font-medium">{point.value}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Resource Utilization</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.resource.utilization.map((resource) => (
                        <div key={resource.userId} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{resource.userId === user.id ? 'You' : `User ${resource.userId.slice(-4)}`}</span>
                            <span>{Math.round(resource.utilizationRate)}%</span>
                          </div>
                          <Progress value={resource.utilizationRate} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Bottleneck Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Bottleneck Analysis</CardTitle>
                  <CardDescription>Areas that need attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.efficiency.bottleneckAnalysis.map((bottleneck, index) => (
                      <div key={index} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{bottleneck.stage} - {bottleneck.task}</h4>
                          <p className="text-sm text-gray-600 mt-1">
                            Average delay: {bottleneck.averageDelay}h • Frequency: {bottleneck.frequency}
                          </p>
                          <div className="mt-2">
                            <Badge className={
                              bottleneck.impact === 'high' ? 'bg-red-100 text-red-800' :
                              bottleneck.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {bottleneck.impact} impact
                            </Badge>
                          </div>
                          {bottleneck.recommendations.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Recommendations:</p>
                              <ul className="text-xs text-gray-700 space-y-1">
                                {bottleneck.recommendations.map((rec, recIndex) => (
                                  <li key={recIndex} className="flex items-start">
                                    <Lightbulb className="h-3 w-3 mt-0.5 mr-1 text-yellow-500" />
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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
function createMockTemplates(): WorkflowTemplate[] {
  return [
    {
      id: 'template-1',
      name: 'Grant Application Workflow',
      description: 'Standard workflow for grant application preparation and submission',
      category: 'grant_application',
      estimatedDuration: 14,
      complexity: 'moderate',
      stages: [
        {
          id: 'stage-1',
          name: 'Research & Planning',
          description: 'Initial research and project planning phase',
          order: 1,
          type: 'sequential',
          estimatedDuration: 24,
          requiredRoles: ['researcher', 'project_manager'],
          tasks: [
            {
              id: 'task-1',
              title: 'Grant Opportunity Research',
              description: 'Research and identify suitable grant opportunities',
              type: 'research',
              priority: 'high',
              estimatedHours: 8,
              dependencies: [],
              assignmentRules: [{
                id: 'rule-1',
                type: 'role_based',
                criteria: { requiredRoles: ['researcher'] },
                fallbackRules: [],
                weight: 1
              }],
              automationTriggers: [],
              completionCriteria: [],
              resources: [],
              status: 'not_started',
              timeTracked: 0,
              progress: 0
            }
          ],
          conditions: [],
          approvals: [],
          automations: []
        }
      ],
      triggers: [],
      rules: [],
      metadata: {
        createdBy: 'admin',
        createdAt: new Date('2024-01-01'),
        lastModified: new Date(),
        version: 1,
        isActive: true,
        usageCount: 23
      }
    },
    {
      id: 'template-2',
      name: 'Proposal Review Process',
      description: 'Multi-stage review and approval process for proposals',
      category: 'review_process',
      estimatedDuration: 7,
      complexity: 'simple',
      stages: [
        {
          id: 'stage-2',
          name: 'Initial Review',
          description: 'First stage proposal review',
          order: 1,
          type: 'parallel',
          estimatedDuration: 16,
          requiredRoles: ['reviewer'],
          tasks: [
            {
              id: 'task-2',
              title: 'Technical Review',
              description: 'Review technical aspects of the proposal',
              type: 'review',
              priority: 'medium',
              estimatedHours: 4,
              dependencies: [],
              assignmentRules: [{
                id: 'rule-2',
                type: 'skill_based',
                criteria: { requiredSkills: ['technical_review'] },
                fallbackRules: [],
                weight: 1
              }],
              automationTriggers: [],
              completionCriteria: [],
              resources: [],
              status: 'not_started',
              timeTracked: 0,
              progress: 0
            }
          ],
          conditions: [],
          approvals: [],
          automations: []
        }
      ],
      triggers: [],
      rules: [],
      metadata: {
        createdBy: 'admin',
        createdAt: new Date('2024-01-15'),
        lastModified: new Date(),
        version: 1,
        isActive: true,
        usageCount: 15
      }
    }
  ]
}

function createMockInstances(): WorkflowInstance[] {
  return [
    {
      id: 'instance-1',
      templateId: 'template-1',
      name: 'Enterprise Ireland HPSU Application',
      description: 'Application for High Potential Start-Up funding',
      status: 'in_progress',
      progress: 65,
      currentStage: 'stage-1',
      assignedTeam: [
        {
          userId: 'user-1',
          role: 'owner',
          permissions: ['read', 'write', 'admin'],
          joinedDate: new Date('2024-01-10'),
          isActive: true
        }
      ],
      startDate: new Date('2024-01-10'),
      estimatedEndDate: new Date('2024-01-24'),
      metadata: {
        grantId: 'grant-1',
        createdBy: 'user-1',
        priority: 'high',
        tags: ['enterprise-ireland', 'startup']
      },
      stages: [
        {
          id: 'stage-instance-1',
          templateStageId: 'stage-1',
          name: 'Research & Planning',
          status: 'in_progress',
          progress: 65,
          startDate: new Date('2024-01-10'),
          tasks: [
            {
              id: 'task-instance-1',
              templateTaskId: 'task-1',
              title: 'Grant Opportunity Research',
              description: 'Research and identify suitable grant opportunities',
              status: 'completed',
              assignedTo: 'user-1',
              assignedDate: new Date('2024-01-10'),
              completedDate: new Date('2024-01-12'),
              priority: 'high',
              progress: 100,
              timeTracked: 8,
              timeEstimate: 8,
              comments: [],
              attachments: [],
              dependencies: [],
              automationHistory: []
            }
          ],
          approvals: [],
          blockers: []
        }
      ],
      events: [],
      metrics: {
        totalTasks: 1,
        completedTasks: 1,
        overdueTasks: 0,
        blockedTasks: 0,
        averageTaskCompletion: 8,
        totalTimeSpent: 8,
        estimatedTimeRemaining: 32,
        velocityTrend: [1, 1.2, 1.5, 1.8],
        participationMetrics: []
      }
    }
  ]
}

function createMockAutomationRules(): AutomationRule[] {
  return [
    {
      id: 'rule-1',
      name: 'Auto-assign Research Tasks',
      description: 'Automatically assign research tasks to available researchers',
      trigger: {
        event: 'task_created',
        source: 'task',
        conditions: { type: 'research' }
      },
      conditions: [
        {
          field: 'task.type',
          operator: 'equals',
          value: 'research'
        }
      ],
      actions: [
        {
          type: 'assign_task',
          parameters: { role: 'researcher', method: 'round_robin' },
          delay: 0,
          retries: 3
        }
      ],
      priority: 1,
      isActive: true,
      executionCount: 45,
      lastExecuted: new Date('2024-01-15')
    },
    {
      id: 'rule-2',
      name: 'Deadline Reminder Notifications',
      description: 'Send notifications 24 hours before task deadlines',
      trigger: {
        event: 'deadline_approaching',
        source: 'system',
        conditions: { hours_before: 24 }
      },
      conditions: [
        {
          field: 'task.status',
          operator: 'not_equals',
          value: 'completed'
        }
      ],
      actions: [
        {
          type: 'send_notification',
          parameters: { 
            type: 'deadline_reminder',
            recipients: ['assigned_user', 'project_manager']
          },
          delay: 0,
          retries: 1
        }
      ],
      priority: 2,
      isActive: true,
      executionCount: 128,
      lastExecuted: new Date('2024-01-16')
    }
  ]
}

function createMockAnalytics(): WorkflowAnalytics {
  return {
    efficiency: {
      averageCompletionTime: 2.3,
      onTimeDeliveryRate: 87,
      automationSavings: 156,
      bottleneckAnalysis: [
        {
          stage: 'Review',
          task: 'Technical Review',
          averageDelay: 6,
          frequency: 12,
          impact: 'medium',
          recommendations: [
            'Assign backup reviewers for peak periods',
            'Implement automated initial screening'
          ]
        }
      ],
      processingVelocity: 8.5
    },
    quality: {
      defectRate: 3.2,
      reworkRate: 8.1,
      approvalRate: 92.5,
      clientSatisfaction: 4.7,
      complianceScore: 96
    },
    resource: {
      utilization: [
        {
          userId: 'user-1',
          utilizationRate: 85,
          capacity: 40,
          workload: 34,
          efficiency: 92
        },
        {
          userId: 'user-2',
          utilizationRate: 72,
          capacity: 40,
          workload: 29,
          efficiency: 88
        }
      ],
      costPerTask: 125,
      roi: 285,
      skillGapAnalysis: []
    },
    timeline: {
      scheduleVariance: 12,
      criticalPathDelay: 2,
      milestoneCompletion: [],
      forecastAccuracy: 89
    },
    trends: {
      productivityTrend: [],
      qualityTrend: [],
      efficiencyTrend: [
        { date: new Date('2024-01-10'), value: 82 },
        { date: new Date('2024-01-11'), value: 85 },
        { date: new Date('2024-01-12'), value: 87 },
        { date: new Date('2024-01-13'), value: 84 },
        { date: new Date('2024-01-14'), value: 89 },
        { date: new Date('2024-01-15'), value: 91 },
        { date: new Date('2024-01-16'), value: 88 }
      ],
      volumeTrend: []
    }
  }
}