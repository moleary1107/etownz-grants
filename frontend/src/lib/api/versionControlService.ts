import { 
  DocumentRepository, 
  DocumentBranch, 
  DocumentCommit, 
  PullRequest,
  MergeOperation,
  ComparisonResult,
  BlameInfo,
  DocumentHistory,
  VersionControlAnalytics,
  VersionControlSearch,
  SearchResult
} from '../../types/versionControl'

export class VersionControlService {
  private baseUrl: string

  constructor(baseUrl: string = '/api/version-control') {
    this.baseUrl = baseUrl
  }

  // Repository Management
  async getRepositories(filters?: {
    type?: string[]
    owner?: string
    collaborator?: string
    private?: boolean
    archived?: boolean
  }): Promise<DocumentRepository[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.type) params.append('type', filters.type.join(','))
      if (filters.owner) params.append('owner', filters.owner)
      if (filters.collaborator) params.append('collaborator', filters.collaborator)
      if (filters.private !== undefined) params.append('private', filters.private.toString())
      if (filters.archived !== undefined) params.append('archived', filters.archived.toString())
    }

    const response = await fetch(`${this.baseUrl}/repositories?${params}`)
    if (!response.ok) throw new Error('Failed to fetch repositories')
    return response.json()
  }

  async getRepository(id: string): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories/${id}`)
    if (!response.ok) throw new Error('Failed to fetch repository')
    return response.json()
  }

  async createRepository(repository: {
    name: string
    description: string
    type: DocumentRepository['type']
    isPrivate?: boolean
    collaborators?: { userId: string; role: string }[]
    settings?: Partial<DocumentRepository['settings']>
  }): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(repository)
    })
    if (!response.ok) throw new Error('Failed to create repository')
    return response.json()
  }

  async updateRepository(id: string, updates: Partial<DocumentRepository>): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update repository')
    return response.json()
  }

  async deleteRepository(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete repository')
  }

  async forkRepository(id: string, options: {
    name?: string
    description?: string
    private?: boolean
  }): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories/${id}/fork`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) throw new Error('Failed to fork repository')
    return response.json()
  }

  async archiveRepository(id: string): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories/${id}/archive`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to archive repository')
    return response.json()
  }

  // Branch Management
  async getBranches(repositoryId: string, filters?: {
    active?: boolean
    protected?: boolean
    merged?: boolean
  }): Promise<DocumentBranch[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.active !== undefined) params.append('active', filters.active.toString())
      if (filters.protected !== undefined) params.append('protected', filters.protected.toString())
      if (filters.merged !== undefined) params.append('merged', filters.merged.toString())
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/branches?${params}`)
    if (!response.ok) throw new Error('Failed to fetch branches')
    return response.json()
  }

  async getBranch(repositoryId: string, branchName: string): Promise<DocumentBranch> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/branches/${branchName}`)
    if (!response.ok) throw new Error('Failed to fetch branch')
    return response.json()
  }

  async createBranch(repositoryId: string, branch: {
    name: string
    sourceBranch: string
    description?: string
    type?: DocumentBranch['type']
  }): Promise<DocumentBranch> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/branches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(branch)
    })
    if (!response.ok) throw new Error('Failed to create branch')
    return response.json()
  }

  async deleteBranch(repositoryId: string, branchName: string, force?: boolean): Promise<void> {
    const params = new URLSearchParams()
    if (force) params.append('force', 'true')

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/branches/${branchName}?${params}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete branch')
  }

  async protectBranch(repositoryId: string, branchName: string, rules: {
    requiredReviews?: number
    dismissStaleReviews?: boolean
    requireCodeOwnerReviews?: boolean
    restrictPushes?: boolean
    allowedUsers?: string[]
  }): Promise<DocumentBranch> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/branches/${branchName}/protection`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(rules)
    })
    if (!response.ok) throw new Error('Failed to protect branch')
    return response.json()
  }

  // Commit Management
  async getCommits(repositoryId: string, options?: {
    branch?: string
    path?: string
    author?: string
    since?: Date
    until?: Date
    limit?: number
    offset?: number
  }): Promise<DocumentCommit[]> {
    const params = new URLSearchParams()
    if (options) {
      if (options.branch) params.append('branch', options.branch)
      if (options.path) params.append('path', options.path)
      if (options.author) params.append('author', options.author)
      if (options.since) params.append('since', options.since.toISOString())
      if (options.until) params.append('until', options.until.toISOString())
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.offset) params.append('offset', options.offset.toString())
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits?${params}`)
    if (!response.ok) throw new Error('Failed to fetch commits')
    return response.json()
  }

  async getCommit(repositoryId: string, commitHash: string): Promise<DocumentCommit> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits/${commitHash}`)
    if (!response.ok) throw new Error('Failed to fetch commit')
    return response.json()
  }

  async createCommit(repositoryId: string, commit: {
    message: string
    description?: string
    branch: string
    changes: any[]
    parentCommits?: string[]
  }): Promise<DocumentCommit> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commit)
    })
    if (!response.ok) throw new Error('Failed to create commit')
    return response.json()
  }

  async revertCommit(repositoryId: string, commitHash: string, options?: {
    branch?: string
    message?: string
  }): Promise<DocumentCommit> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits/${commitHash}/revert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) throw new Error('Failed to revert commit')
    return response.json()
  }

  async cherryPickCommit(repositoryId: string, commitHash: string, targetBranch: string): Promise<DocumentCommit> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits/${commitHash}/cherry-pick`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetBranch })
    })
    if (!response.ok) throw new Error('Failed to cherry-pick commit')
    return response.json()
  }

  // Pull Request Management
  async getPullRequests(repositoryId: string, filters?: {
    state?: 'open' | 'closed' | 'merged' | 'all'
    author?: string
    assignee?: string
    reviewer?: string
    label?: string[]
  }): Promise<PullRequest[]> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.state) params.append('state', filters.state)
      if (filters.author) params.append('author', filters.author)
      if (filters.assignee) params.append('assignee', filters.assignee)
      if (filters.reviewer) params.append('reviewer', filters.reviewer)
      if (filters.label) params.append('label', filters.label.join(','))
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls?${params}`)
    if (!response.ok) throw new Error('Failed to fetch pull requests')
    return response.json()
  }

  async getPullRequest(repositoryId: string, number: number): Promise<PullRequest> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls/${number}`)
    if (!response.ok) throw new Error('Failed to fetch pull request')
    return response.json()
  }

  async createPullRequest(repositoryId: string, pullRequest: {
    title: string
    description: string
    sourceBranch: string
    targetBranch: string
    assignees?: string[]
    reviewers?: string[]
    labels?: string[]
    draft?: boolean
  }): Promise<PullRequest> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pullRequest)
    })
    if (!response.ok) throw new Error('Failed to create pull request')
    return response.json()
  }

  async updatePullRequest(repositoryId: string, number: number, updates: Partial<PullRequest>): Promise<PullRequest> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls/${number}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    })
    if (!response.ok) throw new Error('Failed to update pull request')
    return response.json()
  }

  async mergePullRequest(repositoryId: string, number: number, options?: {
    mergeMethod?: 'merge' | 'squash' | 'rebase'
    commitMessage?: string
    commitDescription?: string
    deleteBranch?: boolean
  }): Promise<PullRequest> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls/${number}/merge`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) throw new Error('Failed to merge pull request')
    return response.json()
  }

  async closePullRequest(repositoryId: string, number: number): Promise<PullRequest> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/pulls/${number}/close`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to close pull request')
    return response.json()
  }

  // Merge Operations
  async mergeBranches(repositoryId: string, operation: {
    sourceBranch: string
    targetBranch: string
    strategy?: MergeOperation['strategy']['type']
    message?: string
    squash?: boolean
    fastForward?: boolean
  }): Promise<MergeOperation> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(operation)
    })
    if (!response.ok) throw new Error('Failed to merge branches')
    return response.json()
  }

  async getMergeOperation(repositoryId: string, operationId: string): Promise<MergeOperation> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/merge/${operationId}`)
    if (!response.ok) throw new Error('Failed to fetch merge operation')
    return response.json()
  }

  async resolveMergeConflicts(repositoryId: string, operationId: string, resolutions: {
    path: string
    content: string
  }[]): Promise<MergeOperation> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/merge/${operationId}/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resolutions })
    })
    if (!response.ok) throw new Error('Failed to resolve merge conflicts')
    return response.json()
  }

  async abortMerge(repositoryId: string, operationId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/merge/${operationId}/abort`, {
      method: 'POST'
    })
    if (!response.ok) throw new Error('Failed to abort merge')
  }

  // Comparison and Diff
  async compareCommits(repositoryId: string, baseCommit: string, compareCommit: string): Promise<ComparisonResult> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/compare/${baseCommit}...${compareCommit}`)
    if (!response.ok) throw new Error('Failed to compare commits')
    return response.json()
  }

  async compareBranches(repositoryId: string, baseBranch: string, compareBranch: string): Promise<ComparisonResult> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/compare/${baseBranch}...${compareBranch}`)
    if (!response.ok) throw new Error('Failed to compare branches')
    return response.json()
  }

  async getFileDiff(repositoryId: string, commitHash: string, path: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/commits/${commitHash}/diff/${encodeURIComponent(path)}`)
    if (!response.ok) throw new Error('Failed to fetch file diff')
    return response.json()
  }

  async getBlameInfo(repositoryId: string, path: string, branch?: string): Promise<BlameInfo> {
    const params = new URLSearchParams()
    if (branch) params.append('branch', branch)

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/blame/${encodeURIComponent(path)}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch blame info')
    return response.json()
  }

  // Document History
  async getDocumentHistory(repositoryId: string, path: string, options?: {
    limit?: number
    since?: Date
    until?: Date
  }): Promise<DocumentHistory> {
    const params = new URLSearchParams()
    if (options) {
      if (options.limit) params.append('limit', options.limit.toString())
      if (options.since) params.append('since', options.since.toISOString())
      if (options.until) params.append('until', options.until.toISOString())
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/history/${encodeURIComponent(path)}?${params}`)
    if (!response.ok) throw new Error('Failed to fetch document history')
    return response.json()
  }

  // Tags
  async getTags(repositoryId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/tags`)
    if (!response.ok) throw new Error('Failed to fetch tags')
    return response.json()
  }

  async createTag(repositoryId: string, tag: {
    name: string
    commit: string
    message?: string
    type?: 'lightweight' | 'annotated'
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tag)
    })
    if (!response.ok) throw new Error('Failed to create tag')
    return response.json()
  }

  async deleteTag(repositoryId: string, tagName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/tags/${tagName}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete tag')
  }

  // Collaborators and Permissions
  async getCollaborators(repositoryId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/collaborators`)
    if (!response.ok) throw new Error('Failed to fetch collaborators')
    return response.json()
  }

  async addCollaborator(repositoryId: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/collaborators`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role })
    })
    if (!response.ok) throw new Error('Failed to add collaborator')
    return response.json()
  }

  async updateCollaborator(repositoryId: string, userId: string, role: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/collaborators/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    })
    if (!response.ok) throw new Error('Failed to update collaborator')
    return response.json()
  }

  async removeCollaborator(repositoryId: string, userId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/collaborators/${userId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to remove collaborator')
  }

  // Search
  async search(query: VersionControlSearch): Promise<SearchResult[]> {
    const response = await fetch(`${this.baseUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query)
    })
    if (!response.ok) throw new Error('Failed to search')
    return response.json()
  }

  async searchCommits(repositoryId: string, query: string, options?: {
    branch?: string
    author?: string
    dateRange?: { start: Date; end: Date }
  }): Promise<DocumentCommit[]> {
    const params = new URLSearchParams()
    params.append('q', query)
    if (options) {
      if (options.branch) params.append('branch', options.branch)
      if (options.author) params.append('author', options.author)
      if (options.dateRange) {
        params.append('since', options.dateRange.start.toISOString())
        params.append('until', options.dateRange.end.toISOString())
      }
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/search/commits?${params}`)
    if (!response.ok) throw new Error('Failed to search commits')
    return response.json()
  }

  async searchFiles(repositoryId: string, query: string, options?: {
    branch?: string
    path?: string
    extension?: string
  }): Promise<any[]> {
    const params = new URLSearchParams()
    params.append('q', query)
    if (options) {
      if (options.branch) params.append('branch', options.branch)
      if (options.path) params.append('path', options.path)
      if (options.extension) params.append('extension', options.extension)
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/search/files?${params}`)
    if (!response.ok) throw new Error('Failed to search files')
    return response.json()
  }

  // Analytics
  async getAnalytics(filters?: {
    repositories?: string[]
    dateRange?: { start: Date; end: Date }
    groupBy?: 'repository' | 'user' | 'branch'
  }): Promise<VersionControlAnalytics> {
    const params = new URLSearchParams()
    if (filters) {
      if (filters.repositories) params.append('repositories', filters.repositories.join(','))
      if (filters.groupBy) params.append('groupBy', filters.groupBy)
      if (filters.dateRange) {
        params.append('since', filters.dateRange.start.toISOString())
        params.append('until', filters.dateRange.end.toISOString())
      }
    }

    const response = await fetch(`${this.baseUrl}/analytics?${params}`)
    if (!response.ok) throw new Error('Failed to fetch analytics')
    return response.json()
  }

  async getRepositoryAnalytics(repositoryId: string, dateRange?: { start: Date; end: Date }): Promise<any> {
    const params = new URLSearchParams()
    if (dateRange) {
      params.append('since', dateRange.start.toISOString())
      params.append('until', dateRange.end.toISOString())
    }

    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/analytics?${params}`)
    if (!response.ok) throw new Error('Failed to fetch repository analytics')
    return response.json()
  }

  // Backup and Restore
  async createBackup(repositoryId: string, options?: {
    includeHistory?: boolean
    compression?: boolean
    encryption?: boolean
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) throw new Error('Failed to create backup')
    return response.json()
  }

  async getBackups(repositoryId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/backups`)
    if (!response.ok) throw new Error('Failed to fetch backups')
    return response.json()
  }

  async restoreFromBackup(repositoryId: string, backupId: string, options?: {
    targetBranch?: string
    preserveHistory?: boolean
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/restore/${backupId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options)
    })
    if (!response.ok) throw new Error('Failed to restore from backup')
    return response.json()
  }

  // Webhooks and Events
  async getWebhooks(repositoryId: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/webhooks`)
    if (!response.ok) throw new Error('Failed to fetch webhooks')
    return response.json()
  }

  async createWebhook(repositoryId: string, webhook: {
    url: string
    events: string[]
    secret?: string
    active?: boolean
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/webhooks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhook)
    })
    if (!response.ok) throw new Error('Failed to create webhook')
    return response.json()
  }

  async deleteWebhook(repositoryId: string, webhookId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/webhooks/${webhookId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete webhook')
  }

  // Export and Import
  async exportRepository(repositoryId: string, format: 'git' | 'zip' | 'tar'): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/repositories/${repositoryId}/export/${format}`)
    if (!response.ok) throw new Error('Failed to export repository')
    return response.blob()
  }

  async importRepository(data: FormData): Promise<DocumentRepository> {
    const response = await fetch(`${this.baseUrl}/repositories/import`, {
      method: 'POST',
      body: data
    })
    if (!response.ok) throw new Error('Failed to import repository')
    return response.json()
  }
}