export interface DocumentRepository {
  id: string
  name: string
  description: string
  type: 'grant_application' | 'proposal' | 'report' | 'template' | 'general'
  ownerId: string
  collaborators: RepositoryCollaborator[]
  branches: DocumentBranch[]
  defaultBranch: string
  isPrivate: boolean
  settings: RepositorySettings
  metadata: {
    createdAt: Date
    updatedAt: Date
    lastCommit: string
    totalCommits: number
    totalBranches: number
    size: number // in bytes
    language: string[]
    tags: string[]
  }
  statistics: RepositoryStatistics
}

export interface RepositoryCollaborator {
  userId: string
  role: 'owner' | 'admin' | 'write' | 'read'
  permissions: RepositoryPermission[]
  addedAt: Date
  addedBy: string
  isActive: boolean
}

export interface RepositoryPermission {
  action: 'read' | 'write' | 'admin' | 'merge' | 'delete'
  resource: 'repository' | 'branch' | 'commit' | 'tag' | 'settings'
  granted: boolean
}

export interface RepositorySettings {
  allowMergeCommits: boolean
  allowSquashMerging: boolean
  allowRebaseMerging: boolean
  deleteBranchOnMerge: boolean
  requireReviewBeforeMerge: boolean
  requiredReviewers: number
  allowForcePush: boolean
  protectedBranches: string[]
  automaticBackup: boolean
  retentionPolicy: {
    keepCommits: number
    keepBranches: number
    archiveAfterDays: number
  }
}

export interface RepositoryStatistics {
  commits: {
    total: number
    thisWeek: number
    thisMonth: number
    byAuthor: { userId: string; count: number }[]
  }
  branches: {
    active: number
    merged: number
    stale: number
  }
  contributors: {
    total: number
    active: number
    lastActive: Date
  }
  activity: ActivityMetric[]
}

export interface ActivityMetric {
  date: Date
  commits: number
  additions: number
  deletions: number
  contributors: string[]
}

export interface DocumentBranch {
  id: string
  name: string
  description?: string
  type: 'main' | 'feature' | 'hotfix' | 'release' | 'experimental'
  parentBranch?: string
  createdBy: string
  createdAt: Date
  lastCommit: string
  isProtected: boolean
  isActive: boolean
  mergeTarget?: string
  commits: DocumentCommit[]
  pullRequests: PullRequest[]
  tags: BranchTag[]
}

export interface DocumentCommit {
  id: string
  hash: string
  message: string
  description?: string
  author: CommitAuthor
  timestamp: Date
  parentCommits: string[]
  branch: string
  changes: DocumentChange[]
  tags: string[]
  metadata: {
    filesChanged: number
    additions: number
    deletions: number
    size: number
    isMergeCommit: boolean
    isRevert: boolean
  }
  verification: CommitVerification
  annotations: CommitAnnotation[]
}

export interface CommitAuthor {
  userId: string
  name: string
  email: string
  avatar?: string
  timestamp: Date
}

export interface DocumentChange {
  id: string
  type: 'added' | 'modified' | 'deleted' | 'renamed' | 'moved'
  path: string
  oldPath?: string
  content: ContentChange
  metadata: {
    size: number
    lines: number
    binary: boolean
    encoding: string
  }
}

export interface ContentChange {
  additions: LineChange[]
  deletions: LineChange[]
  hunks: DiffHunk[]
  isBinary: boolean
  isTruncated: boolean
  similarity?: number // for renames/moves
}

export interface LineChange {
  lineNumber: number
  content: string
  type: 'added' | 'deleted' | 'context'
  highlighted?: boolean
}

export interface DiffHunk {
  id: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: LineChange[]
  context: {
    before: string[]
    after: string[]
  }
}

export interface CommitVerification {
  verified: boolean
  reason: 'valid' | 'invalid' | 'unverified' | 'unknown_key' | 'malformed'
  signature?: string
  payload?: string
  verifiedAt?: Date
  verifiedBy?: string
}

export interface CommitAnnotation {
  id: string
  type: 'note' | 'warning' | 'error' | 'info'
  title: string
  message: string
  line?: number
  path?: string
  author: string
  timestamp: Date
  resolved: boolean
}

export interface BranchTag {
  id: string
  name: string
  type: 'version' | 'release' | 'milestone' | 'custom'
  description?: string
  commit: string
  createdBy: string
  createdAt: Date
  protected: boolean
  metadata: Record<string, unknown>
}

export interface PullRequest {
  id: string
  number: number
  title: string
  description: string
  state: 'open' | 'closed' | 'merged' | 'draft'
  author: string
  assignees: string[]
  reviewers: PullRequestReviewer[]
  sourceBranch: string
  targetBranch: string
  commits: string[]
  changes: DocumentChange[]
  comments: PullRequestComment[]
  reviews: PullRequestReview[]
  labels: string[]
  milestone?: string
  createdAt: Date
  updatedAt: Date
  mergedAt?: Date
  closedAt?: Date
  metadata: {
    conflicts: boolean
    mergeable: boolean
    checksStatus: 'pending' | 'success' | 'failure' | 'error'
    changedFiles: number
    additions: number
    deletions: number
  }
}

export interface PullRequestReviewer {
  userId: string
  status: 'requested' | 'pending' | 'approved' | 'changes_requested' | 'dismissed'
  reviewedAt?: Date
  required: boolean
}

export interface PullRequestComment {
  id: string
  author: string
  content: string
  path?: string
  line?: number
  timestamp: Date
  type: 'general' | 'review' | 'suggestion' | 'question'
  resolved: boolean
  replies: PullRequestComment[]
  reactions: CommentReaction[]
}

export interface CommentReaction {
  emoji: string
  users: string[]
  count: number
}

export interface PullRequestReview {
  id: string
  reviewer: string
  state: 'pending' | 'approved' | 'changes_requested' | 'commented'
  body: string
  submittedAt: Date
  comments: ReviewComment[]
}

export interface ReviewComment {
  id: string
  path: string
  line: number
  originalLine?: number
  side: 'LEFT' | 'RIGHT'
  body: string
  author: string
  timestamp: Date
  resolved: boolean
  suggestions: CodeSuggestion[]
}

export interface CodeSuggestion {
  id: string
  originalCode: string
  suggestedCode: string
  reason: string
  applied: boolean
  appliedBy?: string
  appliedAt?: Date
}

export interface DocumentVersion {
  id: string
  documentId: string
  version: string
  commit: string
  branch: string
  content: DocumentContent
  metadata: VersionMetadata
  snapshot: DocumentSnapshot
}

export interface DocumentContent {
  sections: DocumentSection[]
  assets: DocumentAsset[]
  metadata: ContentMetadata
  formatting: FormattingInfo
}

export interface DocumentSection {
  id: string
  title: string
  content: string
  type: 'text' | 'table' | 'image' | 'chart' | 'code' | 'reference'
  order: number
  parent?: string
  children: string[]
  annotations: SectionAnnotation[]
  formatting: SectionFormatting
}

export interface DocumentAsset {
  id: string
  name: string
  type: 'image' | 'chart' | 'table' | 'attachment' | 'reference'
  path: string
  size: number
  checksum: string
  metadata: AssetMetadata
}

export interface AssetMetadata {
  mimeType: string
  dimensions?: { width: number; height: number }
  duration?: number
  encoding?: string
  created: Date
  modified: Date
  tags: string[]
}

export interface ContentMetadata {
  wordCount: number
  characterCount: number
  pageCount: number
  readingTime: number
  language: string
  lastModified: Date
  checksum: string
}

export interface FormattingInfo {
  styles: StyleDefinition[]
  theme: string
  template: string
  customCSS?: string
}

export interface StyleDefinition {
  selector: string
  properties: Record<string, string>
  scope: 'global' | 'section' | 'inline'
}

export interface SectionAnnotation {
  id: string
  type: 'comment' | 'suggestion' | 'requirement' | 'warning'
  content: string
  author: string
  timestamp: Date
  resolved: boolean
  position: {
    start: number
    end: number
  }
}

export interface SectionFormatting {
  style: string
  alignment: 'left' | 'center' | 'right' | 'justify'
  indent: number
  spacing: {
    before: number
    after: number
    line: number
  }
  font: {
    family: string
    size: number
    weight: 'normal' | 'bold'
    style: 'normal' | 'italic'
  }
}

export interface VersionMetadata {
  createdBy: string
  createdAt: Date
  description: string
  tags: string[]
  milestone?: string
  approved: boolean
  approvedBy?: string
  approvedAt?: Date
  locked: boolean
  lockedBy?: string
  lockedAt?: Date
}

export interface DocumentSnapshot {
  timestamp: Date
  size: number
  checksum: string
  compression: string
  storageLocation: string
  backupLocations: string[]
  retention: {
    keepUntil: Date
    autoDelete: boolean
    archived: boolean
  }
}

export interface MergeOperation {
  id: string
  type: 'merge' | 'rebase' | 'squash'
  sourceBranch: string
  targetBranch: string
  baseCommit: string
  mergeCommit?: string
  strategy: MergeStrategy
  conflicts: MergeConflict[]
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'aborted'
  initiatedBy: string
  initiatedAt: Date
  completedAt?: Date
  metadata: {
    autoMerge: boolean
    requiresReview: boolean
    checksRequired: boolean
    conflictResolution: 'automatic' | 'manual' | 'assisted'
  }
}

export interface MergeStrategy {
  type: 'recursive' | 'ours' | 'theirs' | 'octopus' | 'resolve' | 'subtree'
  options: MergeOptions
}

export interface MergeOptions {
  fastForward: boolean
  squash: boolean
  noCommit: boolean
  strategy?: string
  ignoreWhitespace: boolean
  renameThreshold: number
}

export interface MergeConflict {
  id: string
  path: string
  type: 'content' | 'rename' | 'delete' | 'binary'
  status: 'unresolved' | 'resolved' | 'accepted_current' | 'accepted_incoming'
  ourContent: string
  theirContent: string
  baseContent: string
  resolvedContent?: string
  resolvedBy?: string
  resolvedAt?: Date
  markers: ConflictMarker[]
}

export interface ConflictMarker {
  type: 'start' | 'separator' | 'end'
  line: number
  content: string
}

export interface ComparisonResult {
  id: string
  baseCommit: string
  compareCommit: string
  status: 'identical' | 'different' | 'conflicted' | 'error'
  summary: ComparisonSummary
  files: FileComparison[]
  statistics: ComparisonStatistics
  generatedAt: Date
}

export interface ComparisonSummary {
  filesChanged: number
  additions: number
  deletions: number
  renames: number
  ahead: number
  behind: number
  diverged: boolean
}

export interface FileComparison {
  path: string
  oldPath?: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'unchanged'
  changes: ContentChange
  similarity?: number
  binary: boolean
}

export interface ComparisonStatistics {
  changedLines: number
  addedLines: number
  deletedLines: number
  unchangedLines: number
  similarity: number
  complexity: 'low' | 'medium' | 'high'
}

export interface BlameInfo {
  path: string
  commit: string
  lines: BlameLine[]
  generatedAt: Date
}

export interface BlameLine {
  lineNumber: number
  content: string
  commit: string
  author: string
  timestamp: Date
  originalLine: number
  previousCommit?: string
}

export interface DocumentHistory {
  documentId: string
  path: string
  commits: HistoryCommit[]
  branches: string[]
  tags: string[]
  totalVersions: number
  oldestVersion: Date
  newestVersion: Date
  primaryAuthors: { userId: string; contributions: number }[]
}

export interface HistoryCommit {
  commit: string
  message: string
  author: string
  timestamp: Date
  branch: string
  changes: ChangeType[]
  size: number
}

export interface ChangeType {
  type: 'content' | 'structure' | 'formatting' | 'metadata'
  description: string
  impact: 'major' | 'minor' | 'patch'
}

export interface BackupConfiguration {
  enabled: boolean
  frequency: 'realtime' | 'hourly' | 'daily' | 'weekly'
  retention: {
    hourly: number
    daily: number
    weekly: number
    monthly: number
  }
  destinations: BackupDestination[]
  compression: boolean
  encryption: boolean
  verification: boolean
}

export interface BackupDestination {
  id: string
  type: 'local' | 'cloud' | 'remote'
  location: string
  credentials?: string
  enabled: boolean
  priority: number
}

export interface RestoreOperation {
  id: string
  type: 'full' | 'partial' | 'point_in_time'
  sourceBackup: string
  targetPath: string
  timestamp: Date
  requestedBy: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  estimatedTime?: number
  options: RestoreOptions
}

export interface RestoreOptions {
  overwriteExisting: boolean
  preserveHistory: boolean
  restorePermissions: boolean
  createBranch: boolean
  targetBranch?: string
  excludePaths: string[]
  includePaths: string[]
}

// Analytics and Reporting Types
export interface VersionControlAnalytics {
  repositories: RepositoryAnalytics
  activity: ActivityAnalytics
  performance: PerformanceAnalytics
  usage: UsageAnalytics
  quality: QualityAnalytics
}

export interface RepositoryAnalytics {
  total: number
  active: number
  archived: number
  private: number
  public: number
  byType: { type: string; count: number }[]
  growth: { date: Date; count: number }[]
  topRepositories: { id: string; name: string; activity: number }[]
}

export interface ActivityAnalytics {
  commits: {
    total: number
    thisWeek: number
    trend: { date: Date; count: number }[]
    byAuthor: { userId: string; count: number }[]
  }
  pullRequests: {
    open: number
    merged: number
    closed: number
    averageTimeToMerge: number
  }
  branches: {
    created: number
    merged: number
    deleted: number
    active: number
  }
}

export interface PerformanceAnalytics {
  averageCommitSize: number
  mergeTime: {
    average: number
    percentiles: { p50: number; p90: number; p95: number }
  }
  conflictRate: number
  resolutionTime: number
  storageUsage: {
    total: number
    growth: { date: Date; size: number }[]
    byRepository: { id: string; size: number }[]
  }
}

export interface UsageAnalytics {
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
    trend: { date: Date; count: number }[]
  }
  features: {
    branching: number
    merging: number
    tagging: number
    pullRequests: number
  }
  devices: {
    desktop: number
    mobile: number
    tablet: number
  }
}

export interface QualityAnalytics {
  codeReviewCoverage: number
  averageReviewTime: number
  defectRate: number
  hotspots: {
    files: { path: string; changes: number; conflicts: number }[]
    authors: { userId: string; conflicts: number; quality: number }[]
  }
  trends: {
    quality: { date: Date; score: number }[]
    stability: { date: Date; score: number }[]
  }
}

// Search and Filter Types
export interface VersionControlSearch {
  query: string
  filters: SearchFilters
  scope: SearchScope
  options: SearchOptions
}

export interface SearchFilters {
  repositories?: string[]
  branches?: string[]
  authors?: string[]
  dateRange?: { start: Date; end: Date }
  fileTypes?: string[]
  changeTypes?: ChangeType['type'][]
  commitTypes?: string[]
}

export interface SearchScope {
  include: SearchTarget[]
  exclude: SearchTarget[]
}

export interface SearchTarget {
  type: 'commits' | 'files' | 'comments' | 'pull_requests' | 'issues'
  repositories?: string[]
  branches?: string[]
}

export interface SearchOptions {
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
  includeHistory: boolean
  maxResults: number
  sortBy: 'relevance' | 'date' | 'author' | 'repository'
  sortOrder: 'asc' | 'desc'
}

export interface SearchResult {
  id: string
  type: 'commit' | 'file' | 'comment' | 'pull_request'
  repository: string
  branch: string
  title: string
  content: string
  matches: SearchMatch[]
  metadata: SearchResultMetadata
  score: number
}

export interface SearchMatch {
  line: number
  content: string
  highlights: { start: number; end: number }[]
  context: { before: string[]; after: string[] }
}

export interface SearchResultMetadata {
  path?: string
  commit?: string
  author?: string
  timestamp?: Date
  size?: number
  language?: string
}