export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'grant_application' | 'proposal_writing' | 'compliance_check' | 'review_process' | 'submission' | 'custom'
  estimatedDuration: number // in days
  complexity: 'simple' | 'moderate' | 'complex'
  stages: WorkflowStage[]
  triggers: WorkflowTrigger[]
  rules: AutomationRule[]
  metadata: {
    createdBy: string
    createdAt: Date
    lastModified: Date
    version: number
    isActive: boolean
    usageCount: number
  }
}

export interface WorkflowStage {
  id: string
  name: string
  description: string
  order: number
  type: 'sequential' | 'parallel' | 'conditional'
  estimatedDuration: number // in hours
  requiredRoles: string[]
  tasks: WorkflowTask[]
  conditions: StageCondition[]
  approvals: ApprovalRequirement[]
  automations: StageAutomation[]
}

export interface WorkflowTask {
  id: string
  title: string
  description: string
  type: 'document_creation' | 'review' | 'approval' | 'data_entry' | 'research' | 'submission' | 'custom'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  estimatedHours: number
  dependencies: string[] // task IDs
  assignmentRules: TaskAssignmentRule[]
  automationTriggers: TaskAutomationTrigger[]
  completionCriteria: CompletionCriteria[]
  resources: TaskResource[]
  status: 'not_started' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled'
  assignedTo?: string
  assignedDate?: Date
  dueDate?: Date
  completedDate?: Date
  timeTracked: number
  progress: number // 0-100
}

export interface WorkflowTrigger {
  id: string
  name: string
  type: 'time_based' | 'event_based' | 'condition_based' | 'manual'
  condition: TriggerCondition
  actions: TriggerAction[]
  isActive: boolean
}

export interface AutomationRule {
  id: string
  name: string
  description: string
  trigger: RuleTrigger
  conditions: RuleCondition[]
  actions: RuleAction[]
  priority: number
  isActive: boolean
  executionCount: number
  lastExecuted?: Date
}

export interface TaskAssignmentRule {
  id: string
  type: 'role_based' | 'workload_based' | 'skill_based' | 'round_robin' | 'manual'
  criteria: AssignmentCriteria
  fallbackRules: TaskAssignmentRule[]
  weight: number
}

export interface AssignmentCriteria {
  requiredRoles?: string[]
  requiredSkills?: string[]
  maxWorkload?: number
  excludeUsers?: string[]
  preferredUsers?: string[]
  departmentRestrictions?: string[]
}

export interface StageCondition {
  id: string
  type: 'all_tasks_complete' | 'approval_received' | 'deadline_reached' | 'custom_condition'
  parameters: Record<string, any>
  isRequired: boolean
}

export interface ApprovalRequirement {
  id: string
  name: string
  type: 'single_approver' | 'multiple_approvers' | 'consensus' | 'escalation'
  approvers: ApprovalUser[]
  rules: ApprovalRule[]
  escalationRules: EscalationRule[]
  timeoutHours: number
}

export interface ApprovalUser {
  userId: string
  role: string
  isRequired: boolean
  weight: number
}

export interface ApprovalRule {
  condition: string
  action: 'approve' | 'reject' | 'escalate' | 'request_changes'
  parameters: Record<string, any>
}

export interface EscalationRule {
  triggerAfterHours: number
  escalateTo: string[]
  notificationMessage: string
  autoApprove: boolean
}

export interface StageAutomation {
  id: string
  trigger: 'stage_start' | 'stage_complete' | 'stage_timeout' | 'task_complete'
  actions: AutomationAction[]
  delay: number
  isActive: boolean
}

export interface TaskAutomationTrigger {
  id: string
  event: 'task_assigned' | 'task_started' | 'task_completed' | 'task_overdue' | 'task_blocked'
  conditions: TaskCondition[]
  actions: TaskAction[]
  delay: number
}

export interface CompletionCriteria {
  type: 'document_uploaded' | 'form_completed' | 'approval_received' | 'external_validation' | 'custom'
  parameters: Record<string, any>
  isRequired: boolean
  validationRules: ValidationRule[]
}

export interface TaskResource {
  id: string
  name: string
  type: 'document' | 'template' | 'checklist' | 'reference' | 'tool' | 'external_link'
  url?: string
  description: string
  isRequired: boolean
}

export interface TriggerCondition {
  type: 'time' | 'date' | 'event' | 'status_change' | 'user_action' | 'external_api'
  parameters: Record<string, any>
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'matches'
  value: any
}

export interface TriggerAction {
  type: 'create_task' | 'assign_task' | 'send_notification' | 'update_status' | 'run_automation' | 'external_api_call'
  parameters: Record<string, any>
  delay: number
}

export interface RuleTrigger {
  event: string
  source: 'task' | 'stage' | 'workflow' | 'user' | 'system' | 'external'
  conditions: Record<string, any>
}

export interface RuleCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in'
  value: any
  logicalOperator?: 'and' | 'or'
}

export interface RuleAction {
  type: 'assign_task' | 'create_notification' | 'update_field' | 'send_email' | 'webhook' | 'escalate'
  parameters: Record<string, any>
  delay: number
  retries: number
}

export interface TaskCondition {
  field: string
  operator: string
  value: any
}

export interface TaskAction {
  type: 'notify' | 'escalate' | 'reassign' | 'extend_deadline' | 'add_comment' | 'update_priority'
  parameters: Record<string, any>
}

export interface ValidationRule {
  type: 'required_field' | 'file_format' | 'file_size' | 'data_validation' | 'external_check'
  parameters: Record<string, any>
  errorMessage: string
}

export interface AutomationAction {
  type: 'create_task' | 'send_notification' | 'update_status' | 'assign_user' | 'run_script' | 'api_call'
  parameters: Record<string, any>
  retries: number
  timeout: number
}

export interface WorkflowInstance {
  id: string
  templateId: string
  name: string
  description: string
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled' | 'failed'
  progress: number
  currentStage: string
  assignedTeam: WorkflowParticipant[]
  startDate: Date
  estimatedEndDate: Date
  actualEndDate?: Date
  metadata: {
    grantId?: string
    projectId?: string
    createdBy: string
    priority: 'low' | 'medium' | 'high' | 'urgent'
    tags: string[]
  }
  stages: WorkflowStageInstance[]
  events: WorkflowEvent[]
  metrics: WorkflowMetrics
}

export interface WorkflowParticipant {
  userId: string
  role: string
  permissions: string[]
  joinedDate: Date
  isActive: boolean
}

export interface WorkflowStageInstance {
  id: string
  templateStageId: string
  name: string
  status: 'not_started' | 'in_progress' | 'review' | 'completed' | 'skipped' | 'failed'
  progress: number
  startDate?: Date
  endDate?: Date
  tasks: WorkflowTaskInstance[]
  approvals: ApprovalInstance[]
  blockers: WorkflowBlocker[]
}

export interface WorkflowTaskInstance {
  id: string
  templateTaskId: string
  title: string
  description: string
  status: 'not_started' | 'assigned' | 'in_progress' | 'review' | 'completed' | 'blocked' | 'cancelled'
  assignedTo?: string
  assignedDate?: Date
  startDate?: Date
  dueDate?: Date
  completedDate?: Date
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  timeTracked: number
  timeEstimate: number
  comments: TaskComment[]
  attachments: TaskAttachment[]
  dependencies: TaskDependency[]
  automationHistory: AutomationExecution[]
}

export interface ApprovalInstance {
  id: string
  templateApprovalId: string
  name: string
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'expired'
  requestDate: Date
  responseDate?: Date
  approvers: ApprovalResponse[]
  comments: string
  escalationLevel: number
}

export interface ApprovalResponse {
  userId: string
  decision: 'approved' | 'rejected' | 'abstain'
  timestamp: Date
  comments: string
  weight: number
}

export interface WorkflowBlocker {
  id: string
  type: 'dependency' | 'resource' | 'approval' | 'external' | 'technical'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  blockedTasks: string[]
  reportedBy: string
  reportedDate: Date
  resolvedDate?: Date
  resolution?: string
}

export interface WorkflowEvent {
  id: string
  type: 'workflow_started' | 'stage_completed' | 'task_assigned' | 'task_completed' | 'approval_received' | 'automation_executed' | 'blocker_reported'
  timestamp: Date
  userId: string
  description: string
  metadata: Record<string, any>
}

export interface WorkflowMetrics {
  totalTasks: number
  completedTasks: number
  overdueTasks: number
  blockedTasks: number
  averageTaskCompletion: number
  totalTimeSpent: number
  estimatedTimeRemaining: number
  velocityTrend: number[]
  participationMetrics: ParticipationMetric[]
}

export interface ParticipationMetric {
  userId: string
  tasksAssigned: number
  tasksCompleted: number
  averageCompletionTime: number
  qualityScore: number
  lastActivity: Date
}

export interface TaskComment {
  id: string
  userId: string
  content: string
  timestamp: Date
  type: 'comment' | 'question' | 'blocker' | 'update'
  mentions: string[]
  attachments: string[]
}

export interface TaskAttachment {
  id: string
  name: string
  type: string
  size: number
  uploadedBy: string
  uploadedDate: Date
  url: string
}

export interface TaskDependency {
  id: string
  taskId: string
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
  lag: number
  status: 'pending' | 'satisfied' | 'blocked'
}

export interface AutomationExecution {
  id: string
  ruleId: string
  executedAt: Date
  status: 'success' | 'failed' | 'partial'
  result: string
  duration: number
  retryCount: number
}

// Analytics and Reporting Types
export interface WorkflowAnalytics {
  efficiency: EfficiencyMetrics
  quality: QualityMetrics
  resource: ResourceMetrics
  timeline: TimelineMetrics
  trends: TrendMetrics
}

export interface EfficiencyMetrics {
  averageCompletionTime: number
  onTimeDeliveryRate: number
  automationSavings: number
  bottleneckAnalysis: BottleneckMetric[]
  processingVelocity: number
}

export interface QualityMetrics {
  defectRate: number
  reworkRate: number
  approvalRate: number
  clientSatisfaction: number
  complianceScore: number
}

export interface ResourceMetrics {
  utilization: ResourceUtilization[]
  costPerTask: number
  roi: number
  skillGapAnalysis: SkillGap[]
}

export interface TimelineMetrics {
  scheduleVariance: number
  criticalPathDelay: number
  milestoneCompletion: MilestoneMetric[]
  forecastAccuracy: number
}

export interface TrendMetrics {
  productivityTrend: TrendPoint[]
  qualityTrend: TrendPoint[]
  efficiencyTrend: TrendPoint[]
  volumeTrend: TrendPoint[]
}

export interface BottleneckMetric {
  stage: string
  task: string
  averageDelay: number
  frequency: number
  impact: 'low' | 'medium' | 'high'
  recommendations: string[]
}

export interface ResourceUtilization {
  userId: string
  utilizationRate: number
  capacity: number
  workload: number
  efficiency: number
}

export interface SkillGap {
  skill: string
  required: number
  available: number
  gap: number
  priority: 'low' | 'medium' | 'high'
}

export interface MilestoneMetric {
  name: string
  plannedDate: Date
  actualDate?: Date
  status: 'upcoming' | 'on_track' | 'delayed' | 'completed'
  variance: number
}

export interface TrendPoint {
  date: Date
  value: number
  target?: number
}