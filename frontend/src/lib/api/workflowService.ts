import { 
  WorkflowTemplate, 
  WorkflowInstance, 
  AutomationRule, 
  WorkflowAnalytics,
  WorkflowTaskInstance 
} from '../../types/workflow'

export class WorkflowService {
  private baseUrl: string

  constructor(baseUrl: string = '/api/workflow') {
    this.baseUrl = baseUrl
  }

  // Workflow Templates
  async getTemplates(): Promise<WorkflowTemplate[]> {
    const response = await fetch(`${this.baseUrl}/templates`)
    if (!response.ok) throw new Error('Failed to fetch workflow templates')
    return response.json()
  }

  async getTemplate(id: string): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`)
    if (!response.ok) throw new Error('Failed to fetch workflow template')
    return response.json()
  }

  async createTemplate(template: Omit<WorkflowTemplate, 'id' | 'metadata'>): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    })
    if (!response.ok) throw new Error('Failed to create workflow template')
    return response.json()
  }

  async updateTemplate(id: string, template: Partial<WorkflowTemplate>): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(template)
    })
    if (!response.ok) throw new Error('Failed to update workflow template')
    return response.json()
  }

  async deleteTemplate(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/templates/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete workflow template')
  }

  async cloneTemplate(id: string, name: string): Promise<WorkflowTemplate> {
    const response = await fetch(`${this.baseUrl}/templates/${id}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    })
    if (!response.ok) throw new Error('Failed to clone workflow template')
    return response.json()
  }

  // Workflow Instances
  async getInstances(filters?: {
    status?: string[]
    assignedTo?: string
    templateId?: string
    priority?: string[]
    dateRange?: { start: Date; end: Date }
  }): Promise<WorkflowInstance[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.status) params.append('status', filters.status.join(','))
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo)
      if (filters.templateId) params.append('templateId', filters.templateId)
      if (filters.priority) params.append('priority', filters.priority.join(','))
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString())
        params.append('endDate', filters.dateRange.end.toISOString())
      }
    }

    const response = await fetch(`${this.baseUrl}/instances?${params}`)
    if (!response.ok) throw new Error('Failed to fetch workflow instances')
    return response.json()
  }

  async getInstance(id: string): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${id}`)
    if (!response.ok) throw new Error('Failed to fetch workflow instance')
    return response.json()
  }

  async createInstance(templateId: string, config: {
    name?: string
    description?: string
    assignedTeam?: string[]
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    dueDate?: Date
    metadata?: Record<string, unknown>
  }): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId, ...config })
    })
    if (!response.ok) throw new Error('Failed to create workflow instance')
    return response.json()
  }

  async updateInstance(id: string, updates: Partial<WorkflowInstance>): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update workflow instance')
    return response.json()
  }

  async pauseInstance(id: string): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${id}/pause`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to pause workflow instance')
    return response.json()
  }

  async resumeInstance(id: string): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${id}/resume`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to resume workflow instance')
    return response.json()
  }

  async cancelInstance(id: string, reason?: string): Promise<WorkflowInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${id}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    })
    if (!response.ok) throw new Error('Failed to cancel workflow instance')
    return response.json()
  }

  // Task Management
  async getTasks(instanceId: string, filters?: {
    status?: string[]
    assignedTo?: string
    priority?: string[]
    overdue?: boolean
  }): Promise<WorkflowTaskInstance[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.status) params.append('status', filters.status.join(','))
      if (filters.assignedTo) params.append('assignedTo', filters.assignedTo)
      if (filters.priority) params.append('priority', filters.priority.join(','))
      if (filters.overdue !== undefined) params.append('overdue', filters.overdue.toString())
    }

    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks?${params}`)
    if (!response.ok) throw new Error('Failed to fetch tasks')
    return response.json()
  }

  async getTask(instanceId: string, taskId: string): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}`)
    if (!response.ok) throw new Error('Failed to fetch task')
    return response.json()
  }

  async assignTask(instanceId: string, taskId: string, assignTo: string, options?: {
    reassign?: boolean
    notifyAssignee?: boolean
    comment?: string
  }): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignTo, ...options })
    })
    if (!response.ok) throw new Error('Failed to assign task')
    return response.json()
  }

  async updateTaskStatus(instanceId: string, taskId: string, status: string, options?: {
    comment?: string
    timeLogged?: number
    attachments?: string[]
  }): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, ...options })
    })
    if (!response.ok) throw new Error('Failed to update task status')
    return response.json()
  }

  async updateTaskProgress(instanceId: string, taskId: string, progress: number, options?: {
    comment?: string
    timeLogged?: number
    estimatedTimeRemaining?: number
  }): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progress, ...options })
    })
    if (!response.ok) throw new Error('Failed to update task progress')
    return response.json()
  }

  async addTaskComment(instanceId: string, taskId: string, comment: {
    content: string
    type?: 'comment' | 'question' | 'blocker' | 'update'
    mentions?: string[]
    attachments?: string[]
  }): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    })
    if (!response.ok) throw new Error('Failed to add task comment')
    return response.json()
  }

  async logTime(instanceId: string, taskId: string, timeLog: {
    hours: number
    description?: string
    date?: Date
    billable?: boolean
  }): Promise<WorkflowTaskInstance> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/tasks/${taskId}/time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(timeLog)
    })
    if (!response.ok) throw new Error('Failed to log time')
    return response.json()
  }

  // Automation Rules
  async getAutomationRules(): Promise<AutomationRule[]> {
    const response = await fetch(`${this.baseUrl}/automation/rules`)
    if (!response.ok) throw new Error('Failed to fetch automation rules')
    return response.json()
  }

  async getAutomationRule(id: string): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${id}`)
    if (!response.ok) throw new Error('Failed to fetch automation rule')
    return response.json()
  }

  async createAutomationRule(rule: Omit<AutomationRule, 'id' | 'executionCount' | 'lastExecuted'>): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    })
    if (!response.ok) throw new Error('Failed to create automation rule')
    return response.json()
  }

  async updateAutomationRule(id: string, rule: Partial<AutomationRule>): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rule)
    })
    if (!response.ok) throw new Error('Failed to update automation rule')
    return response.json()
  }

  async deleteAutomationRule(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete automation rule')
  }

  async toggleAutomationRule(id: string, isActive: boolean): Promise<AutomationRule> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive })
    })
    if (!response.ok) throw new Error('Failed to toggle automation rule')
    return response.json()
  }

  async testAutomationRule(id: string, testData?: Record<string, unknown>): Promise<{
    success: boolean
    result: Record<string, unknown>
    errors?: string[]
  }> {
    const response = await fetch(`${this.baseUrl}/automation/rules/${id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testData })
    })
    if (!response.ok) throw new Error('Failed to test automation rule')
    return response.json()
  }

  async getAutomationHistory(filters?: {
    ruleId?: string
    instanceId?: string
    status?: 'success' | 'failed' | 'partial'
    dateRange?: { start: Date; end: Date }
    limit?: number
  }): Promise<Array<{
    id: string
    ruleId: string
    instanceId: string
    status: 'success' | 'failed' | 'partial'
    executedAt: string
    result?: Record<string, unknown>
    error?: string
  }>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.ruleId) params.append('ruleId', filters.ruleId)
      if (filters.instanceId) params.append('instanceId', filters.instanceId)
      if (filters.status) params.append('status', filters.status)
      if (filters.limit) params.append('limit', filters.limit.toString())
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString())
        params.append('endDate', filters.dateRange.end.toISOString())
      }
    }

    const response = await fetch(`${this.baseUrl}/automation/history?${params}`)
    if (!response.ok) throw new Error('Failed to fetch automation history')
    return response.json()
  }

  // Analytics and Reporting
  async getWorkflowAnalytics(filters?: {
    templateIds?: string[]
    dateRange?: { start: Date; end: Date }
    groupBy?: 'template' | 'user' | 'department' | 'priority'
  }): Promise<WorkflowAnalytics> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.templateIds) params.append('templateIds', filters.templateIds.join(','))
      if (filters.groupBy) params.append('groupBy', filters.groupBy)
      if (filters.dateRange) {
        params.append('startDate', filters.dateRange.start.toISOString())
        params.append('endDate', filters.dateRange.end.toISOString())
      }
    }

    const response = await fetch(`${this.baseUrl}/analytics?${params}`)
    if (!response.ok) throw new Error('Failed to fetch workflow analytics')
    return response.json()
  }

  async getProductivityReport(userId?: string, dateRange?: { start: Date; end: Date }): Promise<{
    userId?: string
    period: { start: string; end: string }
    tasksCompleted: number
    hoursLogged: number
    averageCompletionTime: number
    productivityScore: number
    trends: {
      tasksPerDay: number[]
      hoursPerDay: number[]
      completionRates: number[]
    }
    topCategories: Array<{ category: string; count: number; hours: number }>
  }> {
    const params = new URLSearchParams()
    if (userId) params.append('userId', userId)
    if (dateRange) {
      params.append('startDate', dateRange.start.toISOString())
      params.append('endDate', dateRange.end.toISOString())
    }

    const response = await fetch(`${this.baseUrl}/reports/productivity?${params}`)
    if (!response.ok) throw new Error('Failed to fetch productivity report')
    return response.json()
  }

  async getBottleneckAnalysis(templateId?: string): Promise<{
    templateId?: string
    bottlenecks: Array<{
      taskName: string
      averageTime: number
      frequency: number
      impact: 'high' | 'medium' | 'low'
      suggestions: string[]
    }>
    workflow: {
      totalSteps: number
      averageCompletionTime: number
      efficiency: number
    }
    recommendations: string[]
  }> {
    const params = new URLSearchParams()
    if (templateId) params.append('templateId', templateId)

    const response = await fetch(`${this.baseUrl}/reports/bottlenecks?${params}`)
    if (!response.ok) throw new Error('Failed to fetch bottleneck analysis')
    return response.json()
  }

  async getCapacityReport(department?: string): Promise<{
    department?: string
    currentCapacity: {
      totalTeamMembers: number
      activeWorkflows: number
      utilizationRate: number
    }
    workload: Array<{
      userId: string
      userName: string
      activeTasks: number
      completionRate: number
      availability: number
    }>
    projections: {
      nextWeek: { expectedWorkload: number; capacity: number }
      nextMonth: { expectedWorkload: number; capacity: number }
    }
  }> {
    const params = new URLSearchParams()
    if (department) params.append('department', department)

    const response = await fetch(`${this.baseUrl}/reports/capacity?${params}`)
    if (!response.ok) throw new Error('Failed to fetch capacity report')
    return response.json()
  }

  async exportWorkflowData(format: 'csv' | 'excel' | 'pdf', filters?: {
    templateIds?: string[]
    dateRange?: { start: Date; end: Date }
    status?: string[]
    assignedTo?: string
    includeMetrics?: boolean
    includeComments?: boolean
  }): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/export/${format}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    })
    if (!response.ok) throw new Error('Failed to export workflow data')
    return response.blob()
  }

  // Notifications and Events
  async getNotifications(userId: string, filters?: {
    type?: string[]
    read?: boolean
    limit?: number
  }): Promise<Array<{
    id: string
    type: 'task_assigned' | 'deadline_approaching' | 'status_change' | 'comment_added' | 'workflow_completed'
    title: string
    message: string
    read: boolean
    createdAt: string
    metadata?: Record<string, unknown>
  }>> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.type) params.append('type', filters.type.join(','))
      if (filters.read !== undefined) params.append('read', filters.read.toString())
      if (filters.limit) params.append('limit', filters.limit.toString())
    }

    const response = await fetch(`${this.baseUrl}/notifications/${userId}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch notifications')
    return response.json()
  }

  async markNotificationRead(notificationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/notifications/${notificationId}/read`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to mark notification as read')
  }

  async subscribeToWorkflow(instanceId: string, events?: string[]): Promise<void> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events })
    })
    if (!response.ok) throw new Error('Failed to subscribe to workflow')
  }

  async unsubscribeFromWorkflow(instanceId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/instances/${instanceId}/unsubscribe`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to unsubscribe from workflow')
  }

  // Bulk Operations
  async bulkAssignTasks(assignments: Array<{
    instanceId: string
    taskId: string
    assignTo: string
  }>): Promise<{ success: number; failed: number; errors: Array<{
    taskId: string
    instanceId: string
    error: string
    code?: string
  }> }> {
    const response = await fetch(`${this.baseUrl}/tasks/bulk-assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments })
    })
    if (!response.ok) throw new Error('Failed to bulk assign tasks')
    return response.json()
  }

  async bulkUpdateStatus(updates: Array<{
    instanceId: string
    taskId: string
    status: string
    comment?: string
  }>): Promise<{ success: number; failed: number; errors: Array<{
    taskId: string
    instanceId: string
    error: string
    code?: string
  }> }> {
    const response = await fetch(`${this.baseUrl}/tasks/bulk-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    })
    if (!response.ok) throw new Error('Failed to bulk update task status')
    return response.json()
  }

  // Integration Endpoints
  async syncWithExternalSystem(system: string, config: {
    apiKey?: string
    endpoint?: string
    mappings?: Record<string, string>
    syncDirection?: 'import' | 'export' | 'bidirectional'
    options?: Record<string, unknown>
  }): Promise<{
    success: boolean
    syncedItems: number
    errors: string[]
    lastSyncAt: string
  }> {
    const response = await fetch(`${this.baseUrl}/integrations/${system}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error(`Failed to sync with ${system}`)
    return response.json()
  }

  async getIntegrationStatus(system: string): Promise<{
    system: string
    connected: boolean
    lastSync?: string
    status: 'active' | 'error' | 'disconnected'
    configuration: {
      endpoint?: string
      version?: string
      capabilities: string[]
    }
    metrics: {
      totalSyncs: number
      successRate: number
      lastError?: string
    }
  }> {
    const response = await fetch(`${this.baseUrl}/integrations/${system}/status`)
    if (!response.ok) throw new Error(`Failed to get ${system} integration status`)
    return response.json()
  }

  async configureIntegration(system: string, config: {
    apiKey?: string
    endpoint?: string
    settings?: Record<string, unknown>
    enabledFeatures?: string[]
    webhookUrl?: string
  }): Promise<{
    success: boolean
    system: string
    configuration: Record<string, unknown>
    testConnection: boolean
    message: string
  }> {
    const response = await fetch(`${this.baseUrl}/integrations/${system}/configure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config)
    })
    if (!response.ok) throw new Error(`Failed to configure ${system} integration`)
    return response.json()
  }
}